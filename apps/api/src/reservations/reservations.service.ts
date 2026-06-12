import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaymentStatus, Prisma, ReservationStatus, UserRole } from '@prisma/client';

import { ChatService } from '../chat/chat.service';
import { PrismaService } from '../prisma/prisma.service';

const reservationStatuses: ReservationStatus[] = ['pending', 'approved', 'rejected', 'cancelled', 'completed'];
const paymentStatuses: PaymentStatus[] = ['unpaid', 'paid', 'disputed', 'waived'];

export interface CreateReservationBody {
  rideId?: string;
  seatsRequested?: number;
  message?: string;
}

export interface UpdateReservationStatusBody {
  status?: ReservationStatus;
  transferInstruction?: string;
}

export interface UpdatePaymentStatusBody {
  status?: PaymentStatus;
  note?: string;
}

type ReservationWithRelations = Prisma.ReservationGetPayload<{
  include: {
    passenger: { include: { profile: true } };
    ride: { include: { driver: { include: { profile: true } }; vehicle: true } };
    settlements: { orderBy: { updatedAt: 'desc' }; take: 1 };
  };
}>;

type RideWithRelations = Prisma.RideGetPayload<{
  include: { driver: { include: { profile: true } }; vehicle: true };
}>;

@Injectable()
export class ReservationsService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(ChatService) private readonly chatService: ChatService,
  ) {}

  async listReservations(userId: string, role: UserRole, rideId?: string) {
    if (role === 'admin') {
      throw new ForbiddenException({ error: 'reservation_access_denied' });
    }

    const reservations = await this.prismaService.reservation.findMany({
      where: {
        ...(role === 'driver' ? { ride: { driverId: userId } } : { passengerId: userId }),
        ...(rideId ? { rideId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: this.reservationInclude,
    });

    return reservations.map((reservation) => this.toReservationResponse(reservation, userId));
  }

  async getReservation(userId: string, role: UserRole, id: string) {
    const reservation = await this.findReservationById(id);

    if (!reservation) {
      throw new NotFoundException({ error: 'reservation_not_found' });
    }

    this.assertCanViewReservation(reservation, userId, role);
    return this.toReservationResponse(reservation, userId);
  }

  async createReservation(passengerId: string, body: CreateReservationBody) {
    const rideId = body.rideId?.trim();
    const seatsRequested = this.parsePositiveInteger(body.seatsRequested, 'seatsRequested');

    if (!rideId) {
      throw new BadRequestException({ error: 'invalid_reservation_payload' });
    }

    const ride = await this.prismaService.ride.findUnique({
      where: { id: rideId },
      include: { driver: { include: { profile: true } }, vehicle: true },
    });

    if (!ride) {
      throw new NotFoundException({ error: 'ride_not_found' });
    }

    if (ride.driverId === passengerId) {
      throw new BadRequestException({ error: 'cannot_reserve_own_ride' });
    }

    if (ride.status !== 'open' || seatsRequested > ride.seats) {
      throw new BadRequestException({ error: 'ride_not_reservable' });
    }

    try {
      const reservation = await this.prismaService.reservation.create({
        data: {
          rideId,
          passengerId,
          status: 'pending',
          seatsRequested,
          message: body.message?.trim() || null,
        },
        include: this.reservationInclude,
      });

      return this.toReservationResponse(reservation, passengerId);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException({ error: 'reservation_already_exists' });
      }

      throw error;
    }
  }

  async updateReservationStatus(userId: string, role: UserRole, id: string, body: UpdateReservationStatusBody) {
    const status = this.parseReservationStatus(body.status);
    const reservation = await this.findReservationById(id);

    if (!reservation) {
      throw new NotFoundException({ error: 'reservation_not_found' });
    }

    if (status === 'cancelled') {
      return this.cancelReservation(userId, reservation);
    }

    this.assertDriverOwnsRide(reservation, userId, role);

    if (status === 'approved') {
      return this.approveReservation(userId, reservation);
    }

    if (status === 'rejected') {
      return this.rejectReservation(userId, reservation);
    }

    if (status === 'completed') {
      return this.completeReservation(userId, reservation, body.transferInstruction);
    }

    throw new BadRequestException({ error: 'invalid_reservation_transition' });
  }

  async updatePaymentStatus(userId: string, role: UserRole, id: string, body: UpdatePaymentStatusBody) {
    const status = this.parsePaymentStatus(body.status);
    const reservation = await this.findReservationById(id);

    if (!reservation) {
      throw new NotFoundException({ error: 'reservation_not_found' });
    }

    if (reservation.passengerId !== userId && reservation.ride.driverId !== userId) {
      throw new ForbiddenException({ error: 'reservation_access_denied' });
    }

    if (role === 'admin' || !['approved', 'completed'].includes(reservation.status)) {
      throw new BadRequestException({ error: 'payment_status_not_allowed' });
    }

    const settlement = await this.ensureSettlement(reservation);
    await this.prismaService.settlementRecord.update({
      where: { id: settlement.id },
      data: {
        status,
        ...(body.note !== undefined ? { note: body.note.trim() || null } : {}),
      },
    });

    return this.getReservation(userId, role, id);
  }

  private async approveReservation(userId: string, reservation: ReservationWithRelations) {
    if (reservation.status !== 'pending') {
      throw new BadRequestException({ error: 'invalid_reservation_transition' });
    }

    await this.prismaService.$transaction(async (tx) => {
      const reservationUpdate = await tx.reservation.updateMany({
        where: { id: reservation.id, status: 'pending' },
        data: { status: 'approved' },
      });

      if (reservationUpdate.count !== 1) {
        throw new BadRequestException({ error: 'invalid_reservation_transition' });
      }

      const rideUpdate = await tx.ride.updateMany({
        where: { id: reservation.rideId, status: 'open', seats: { gte: reservation.seatsRequested } },
        data: { seats: { decrement: reservation.seatsRequested } },
      });

      if (rideUpdate.count !== 1) {
        throw new BadRequestException({ error: 'insufficient_seats' });
      }

      const updatedRide = await tx.ride.findUnique({
        where: { id: reservation.rideId },
        select: { seats: true },
      });

      if (updatedRide?.seats === 0) {
        await tx.ride.update({
          where: { id: reservation.rideId },
          data: { status: 'full' },
        });
      }

      const current = await tx.settlementRecord.findFirst({
        where: { reservationId: reservation.id },
        orderBy: { updatedAt: 'desc' },
      });

      if (!current) {
        await tx.settlementRecord.create({
          data: {
            rideId: reservation.rideId,
            reservationId: reservation.id,
            payerId: reservation.passengerId,
            receiverId: reservation.ride.driverId,
            amount: reservation.ride.fare * reservation.seatsRequested,
            status: 'unpaid',
            note: 'Manual transfer record for approved reservation.',
          },
        });
      }
    });

    await this.chatService.ensureReservationRoom({ ...reservation, status: 'approved' });

    return this.getReservation(userId, 'driver', reservation.id);
  }

  private async rejectReservation(userId: string, reservation: ReservationWithRelations) {
    if (reservation.status !== 'pending') {
      throw new BadRequestException({ error: 'invalid_reservation_transition' });
    }

    await this.prismaService.reservation.update({
      where: { id: reservation.id },
      data: { status: 'rejected' },
    });

    return this.getReservation(userId, 'driver', reservation.id);
  }

  private async completeReservation(userId: string, reservation: ReservationWithRelations, transferInstruction?: string) {
    if (reservation.status !== 'approved') {
      throw new BadRequestException({ error: 'invalid_reservation_transition' });
    }

    const trimmedInstruction = transferInstruction?.trim();

    await this.prismaService.reservation.update({
      where: { id: reservation.id },
      data: { status: 'completed' },
    });

    if (trimmedInstruction) {
      await this.chatService.createReservationMessage(userId, { ...reservation, status: 'completed' }, trimmedInstruction);
    }

    return this.getReservation(userId, 'driver', reservation.id);
  }

  private async cancelReservation(userId: string, reservation: ReservationWithRelations) {
    if (reservation.passengerId !== userId) {
      throw new ForbiddenException({ error: 'reservation_access_denied' });
    }

    if (!['pending', 'approved'].includes(reservation.status)) {
      throw new BadRequestException({ error: 'invalid_reservation_transition' });
    }

    await this.prismaService.reservation.update({
      where: { id: reservation.id },
      data: { status: 'cancelled' },
    });

    if (reservation.status === 'approved') {
      await this.prismaService.ride.update({
        where: { id: reservation.rideId },
        data: {
          seats: { increment: reservation.seatsRequested },
          status: reservation.ride.status === 'full' ? 'open' : reservation.ride.status,
        },
      });
    }

    return this.getReservation(userId, 'passenger', reservation.id);
  }

  private async ensureSettlement(reservation: ReservationWithRelations) {
    const current = await this.prismaService.settlementRecord.findFirst({
      where: { reservationId: reservation.id },
      orderBy: { updatedAt: 'desc' },
    });

    if (current) {
      return current;
    }

    return this.prismaService.settlementRecord.create({
      data: {
        rideId: reservation.rideId,
        reservationId: reservation.id,
        payerId: reservation.passengerId,
        receiverId: reservation.ride.driverId,
        amount: reservation.ride.fare * reservation.seatsRequested,
        status: 'unpaid',
        note: 'Manual transfer record for approved reservation.',
      },
    });
  }

  private async findReservationById(id: string) {
    return this.prismaService.reservation.findUnique({
      where: { id },
      include: this.reservationInclude,
    });
  }

  private assertCanViewReservation(reservation: ReservationWithRelations, userId: string, role: UserRole) {
    if (role === 'admin' || (reservation.passengerId !== userId && reservation.ride.driverId !== userId)) {
      throw new ForbiddenException({ error: 'reservation_access_denied' });
    }
  }

  private assertDriverOwnsRide(reservation: ReservationWithRelations, userId: string, role: UserRole) {
    if (role !== 'driver' || reservation.ride.driverId !== userId) {
      throw new ForbiddenException({ error: 'reservation_access_denied' });
    }
  }

  private parseReservationStatus(value: ReservationStatus | undefined): ReservationStatus {
    if (!value || !reservationStatuses.includes(value)) {
      throw new BadRequestException({ error: 'invalid_reservation_status' });
    }

    return value;
  }

  private parsePaymentStatus(value: PaymentStatus | undefined): PaymentStatus {
    if (!value || !paymentStatuses.includes(value)) {
      throw new BadRequestException({ error: 'invalid_payment_status' });
    }

    return value;
  }

  private parsePositiveInteger(value: number | undefined, field: string): number {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException({ error: `invalid_${field}` });
    }

    return parsed;
  }

  private toReservationResponse(reservation: ReservationWithRelations, viewerId: string) {
    const latestPayment = reservation.settlements[0];
    const isApprovedParticipant = ['approved', 'completed'].includes(reservation.status)
      && (reservation.passengerId === viewerId || reservation.ride.driverId === viewerId);

    return {
      id: reservation.id,
      rideId: reservation.rideId,
      passengerId: reservation.passengerId,
      status: reservation.status,
      seatsRequested: reservation.seatsRequested,
      message: reservation.message ?? undefined,
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString(),
      ride: this.toPublicRide(reservation.ride),
      passenger: reservation.ride.driverId === viewerId ? this.toPublicUser(reservation.passenger) : undefined,
      payment: latestPayment
        ? {
            id: latestPayment.id,
            rideId: latestPayment.rideId,
            reservationId: latestPayment.reservationId,
            payerId: latestPayment.payerId,
            receiverId: latestPayment.receiverId,
            amount: latestPayment.amount,
            status: latestPayment.status,
            note: latestPayment.note ?? undefined,
            updatedAt: latestPayment.updatedAt.toISOString(),
          }
        : undefined,
      approvedInfo: isApprovedParticipant
        ? {
            driver: this.toPublicUser(reservation.ride.driver),
            vehicle: reservation.ride.vehicle
              ? {
                  model: reservation.ride.vehicle.model,
                  color: reservation.ride.vehicle.color,
                  capacity: reservation.ride.vehicle.capacity,
                }
              : undefined,
          }
        : undefined,
    };
  }

  private toPublicRide(ride: RideWithRelations) {
    const driverProfile = ride.driver.profile;

    return {
      id: ride.id,
      from: ride.from,
      to: ride.to,
      departureTime: ride.departureTime.toISOString(),
      seats: ride.seats,
      fare: ride.fare,
      status: ride.status,
      driverId: ride.driverId,
      driver: driverProfile?.nickname || driverProfile?.name || 'KAPOOL 차주',
      driverDepartment: driverProfile?.department,
      driverPhotoDataUrl: driverProfile?.photoDataUrl ?? undefined,
      waypoints: ride.waypoints,
      vehicle: ride.vehicle
        ? {
            model: ride.vehicle.model,
            color: ride.vehicle.color,
            capacity: ride.vehicle.capacity,
          }
        : undefined,
    };
  }

  private toPublicUser(user: ReservationWithRelations['passenger']) {
    return {
      id: user.id,
      nickname: user.profile?.nickname || user.profile?.name || 'KAPOOL 사용자',
      department: user.profile?.department ?? '학과 정보 준비중',
      homeRegion: user.profile?.homeRegion ?? undefined,
      photoDataUrl: user.profile?.photoDataUrl ?? undefined,
    };
  }

  private isUniqueConstraintError(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }

  private readonly reservationInclude = {
    passenger: { include: { profile: true } },
    ride: { include: { driver: { include: { profile: true } }, vehicle: true } },
    settlements: { orderBy: { updatedAt: 'desc' }, take: 1 },
  } satisfies Prisma.ReservationInclude;
}
