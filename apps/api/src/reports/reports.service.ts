import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PaymentStatus, Prisma, ReportStatus, ReportType, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

const reportTypes: ReportType[] = ['settlement_missing', 'inappropriate_chat', 'safety_issue', 'account_auth'];
const reportStatuses: ReportStatus[] = ['open', 'in_review', 'resolved', 'dismissed'];

export interface CreateReportBody {
  type?: ReportType;
  rideId?: string;
  reservationId?: string;
  chatRoomId?: string;
  paymentRecordId?: string;
  subjectUserId?: string;
  description?: string;
}

export interface UpdateReportStatusBody {
  status?: ReportStatus;
  adminNote?: string;
}

export interface CreateReportMessageBody {
  text?: string;
}

type UserWithProfile = Prisma.UserGetPayload<{ include: { profile: true } }>;
type ReportWithListRelations = Prisma.ReportGetPayload<{
  include: {
    reporter: { include: { profile: true } };
    subjectUser: { include: { profile: true } };
    ride: { include: { driver: { include: { profile: true } } } };
  };
}>;
type ReportWithDetailRelations = Prisma.ReportGetPayload<{
  include: {
    reporter: { include: { profile: true } };
    subjectUser: { include: { profile: true } };
    ride: { include: { driver: { include: { profile: true } }; vehicle: true } };
    reservation: { include: { passenger: { include: { profile: true } } } };
    chatRoom: {
      include: {
        messages: { include: { sender: { include: { profile: true } } }; orderBy: { createdAt: 'asc' } };
      };
    };
    operationChatRoom: true;
    paymentRecord: true;
    messages: { include: { sender: { include: { profile: true } } }; orderBy: { createdAt: 'asc' } };
  };
}>;

@Injectable()
export class ReportsService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async createReport(reporterId: string, role: UserRole, body: CreateReportBody) {
    if (role === 'admin') {
      throw new ForbiddenException({ error: 'report_create_denied' });
    }

    const type = this.parseReportType(body.type);
    const description = body.description?.trim();
    const context = this.normalizeContext(body);

    if (!description || description.length < 4) {
      throw new BadRequestException({ error: 'invalid_report_description' });
    }

    if (!context.rideId && !context.reservationId && !context.chatRoomId && !context.paymentRecordId && !context.subjectUserId) {
      throw new BadRequestException({ error: 'report_context_required' });
    }

    await this.assertReporterCanUseContext(reporterId, context);

    const report = await this.prismaService.report.create({
      data: {
        type,
        reporterId,
        description,
        rideId: context.rideId,
        reservationId: context.reservationId,
        chatRoomId: context.chatRoomId,
        paymentRecordId: context.paymentRecordId,
        subjectUserId: context.subjectUserId,
      },
    });

    return this.toReportResponse(report);
  }

  async listAdminReports() {
    const reports = await this.prismaService.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { include: { profile: true } },
        subjectUser: { include: { profile: true } },
        ride: { include: { driver: { include: { profile: true } } } },
      },
    });

    return reports.map((report) => this.toAdminReportSummary(report));
  }

  async getAdminReport(id: string) {
    const report = await this.findReportDetail(id);

    if (!report) {
      throw new NotFoundException({ error: 'report_not_found' });
    }

    return this.toAdminReportDetail(report);
  }

  async updateAdminReport(id: string, body: UpdateReportStatusBody) {
    const status = this.parseReportStatus(body.status);
    const current = await this.findReportDetail(id);

    if (!current) {
      throw new NotFoundException({ error: 'report_not_found' });
    }

    await this.prismaService.report.update({
      where: { id },
      data: {
        status,
        ...(body.adminNote !== undefined ? { adminNote: body.adminNote.trim() || null } : {}),
      },
    });

    return this.getAdminReport(id);
  }

  async createAdminReportMessage(reportId: string, senderId: string, body: CreateReportMessageBody) {
    const text = body.text?.trim();

    if (!text || text.length < 2) {
      throw new BadRequestException({ error: 'invalid_report_message' });
    }

    const report = await this.prismaService.report.findUnique({ where: { id: reportId } });

    if (!report) {
      throw new NotFoundException({ error: 'report_not_found' });
    }

    const operationRoom = await this.ensureOperationChatRoom(report, senderId);

    await this.prismaService.reportMessage.create({
      data: {
        reportId,
        senderId,
        text,
      },
    });

    await this.prismaService.chatMessage.create({
      data: {
        roomId: operationRoom.id,
        senderId,
        type: 'other',
        text,
      },
    });

    return this.getAdminReport(reportId);
  }

  private async assertReporterCanUseContext(reporterId: string, context: NormalizedReportContext) {
    const allowedSubjectIds = new Set<string>();

    if (context.chatRoomId) {
      const room = await this.prismaService.chatRoom.findUnique({ where: { id: context.chatRoomId } });

      if (!room) {
        throw new NotFoundException({ error: 'chat_room_not_found' });
      }

      if (!room.participantIds.includes(reporterId)) {
        throw new ForbiddenException({ error: 'report_context_denied' });
      }

      room.participantIds.forEach((participantId) => allowedSubjectIds.add(participantId));
    }

    if (context.reservationId) {
      const reservation = await this.prismaService.reservation.findUnique({
        where: { id: context.reservationId },
        include: { ride: true, settlements: true },
      });

      if (!reservation) {
        throw new NotFoundException({ error: 'reservation_not_found' });
      }

      if (reservation.passengerId !== reporterId && reservation.ride.driverId !== reporterId) {
        throw new ForbiddenException({ error: 'report_context_denied' });
      }

      allowedSubjectIds.add(reservation.passengerId);
      allowedSubjectIds.add(reservation.ride.driverId);
    }

    if (context.paymentRecordId) {
      const payment = await this.prismaService.settlementRecord.findUnique({ where: { id: context.paymentRecordId } });

      if (!payment) {
        throw new NotFoundException({ error: 'payment_record_not_found' });
      }

      if (payment.payerId !== reporterId && payment.receiverId !== reporterId) {
        throw new ForbiddenException({ error: 'report_context_denied' });
      }

      allowedSubjectIds.add(payment.payerId);
      allowedSubjectIds.add(payment.receiverId);
    }

    if (context.rideId) {
      const ride = await this.prismaService.ride.findUnique({
        where: { id: context.rideId },
        include: { reservations: true },
      });

      if (!ride) {
        throw new NotFoundException({ error: 'ride_not_found' });
      }

      const isParticipant = ride.driverId === reporterId
        || ride.reservations.some((reservation) => reservation.passengerId === reporterId);

      if (!isParticipant) {
        throw new ForbiddenException({ error: 'report_context_denied' });
      }

      allowedSubjectIds.add(ride.driverId);
      ride.reservations.forEach((reservation) => allowedSubjectIds.add(reservation.passengerId));
    }

    if (context.subjectUserId && allowedSubjectIds.size > 0 && !allowedSubjectIds.has(context.subjectUserId)) {
      throw new ForbiddenException({ error: 'report_context_denied' });
    }
  }

  private findReportDetail(id: string) {
    return this.prismaService.report.findUnique({
      where: { id },
      include: {
        reporter: { include: { profile: true } },
        subjectUser: { include: { profile: true } },
        ride: { include: { driver: { include: { profile: true } }, vehicle: true } },
        reservation: { include: { passenger: { include: { profile: true } } } },
        chatRoom: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              include: { sender: { include: { profile: true } } },
            },
          },
        },
        operationChatRoom: true,
        paymentRecord: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { include: { profile: true } } },
        },
      },
    });
  }

  private normalizeContext(body: CreateReportBody): NormalizedReportContext {
    return {
      rideId: body.rideId?.trim() || undefined,
      reservationId: body.reservationId?.trim() || undefined,
      chatRoomId: body.chatRoomId?.trim() || undefined,
      paymentRecordId: body.paymentRecordId?.trim() || undefined,
      subjectUserId: body.subjectUserId?.trim() || undefined,
    };
  }

  private parseReportType(value: ReportType | undefined) {
    if (!value || !reportTypes.includes(value)) {
      throw new BadRequestException({ error: 'invalid_report_type' });
    }

    return value;
  }

  private parseReportStatus(value: ReportStatus | undefined) {
    if (!value || !reportStatuses.includes(value)) {
      throw new BadRequestException({ error: 'invalid_report_status' });
    }

    return value;
  }

  private toReportResponse(report: ReportFields) {
    return {
      id: report.id,
      type: report.type,
      status: report.status,
      reporterId: report.reporterId,
      rideId: report.rideId ?? undefined,
      reservationId: report.reservationId ?? undefined,
      chatRoomId: report.chatRoomId ?? undefined,
      paymentRecordId: report.paymentRecordId ?? undefined,
      subjectUserId: report.subjectUserId ?? undefined,
      description: report.description,
      adminNote: report.adminNote ?? undefined,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    };
  }

  private toAdminReportSummary(report: ReportWithListRelations) {
    return {
      ...this.toReportResponse(report),
      reporter: this.toPublicUser(report.reporter),
      subjectUser: report.subjectUser ? this.toPublicUser(report.subjectUser) : undefined,
      ride: report.ride
        ? {
            id: report.ride.id,
            from: report.ride.from,
            to: report.ride.to,
            departureTime: report.ride.departureTime.toISOString(),
            fare: report.ride.fare,
            driver: this.profileName(report.ride.driver),
            driverPhotoDataUrl: report.ride.driver.profile?.photoDataUrl ?? undefined,
          }
        : undefined,
    };
  }

  private toAdminReportDetail(report: ReportWithDetailRelations) {
    return {
      report: this.toReportResponse(report),
      reporter: this.toAdminUser(report.reporter),
      subjectUser: report.subjectUser ? this.toAdminUser(report.subjectUser) : undefined,
      ride: report.ride
        ? {
            id: report.ride.id,
            from: report.ride.from,
            to: report.ride.to,
            departureTime: report.ride.departureTime.toISOString(),
            seats: report.ride.seats,
            fare: report.ride.fare,
            status: report.ride.status,
            driverId: report.ride.driverId,
            driver: this.profileName(report.ride.driver),
            driverDepartment: report.ride.driver.profile?.department,
            driverPhotoDataUrl: report.ride.driver.profile?.photoDataUrl ?? undefined,
            waypoints: report.ride.waypoints,
            vehicle: report.ride.vehicle
              ? {
                  model: report.ride.vehicle.model,
                  color: report.ride.vehicle.color,
                  capacity: report.ride.vehicle.capacity,
                }
              : undefined,
          }
        : undefined,
      reservation: report.reservation
        ? {
            id: report.reservation.id,
            rideId: report.reservation.rideId,
            passengerId: report.reservation.passengerId,
            status: report.reservation.status,
            seatsRequested: report.reservation.seatsRequested,
            message: report.reservation.message ?? undefined,
            createdAt: report.reservation.createdAt.toISOString(),
            updatedAt: report.reservation.updatedAt.toISOString(),
            passenger: this.toPublicUser(report.reservation.passenger),
          }
        : undefined,
      chatRoom: report.chatRoom
        ? {
            id: report.chatRoom.id,
            rideId: report.chatRoom.rideId,
            reservationId: report.chatRoom.reservationId ?? undefined,
            participantIds: report.chatRoom.participantIds,
            createdAt: report.chatRoom.createdAt.toISOString(),
          }
        : undefined,
      operationChatRoom: report.operationChatRoom
        ? {
            id: report.operationChatRoom.id,
            participantIds: report.operationChatRoom.participantIds,
            createdAt: report.operationChatRoom.createdAt.toISOString(),
            updatedAt: report.operationChatRoom.updatedAt.toISOString(),
          }
        : undefined,
      chatMessages: report.chatRoom?.messages.map((message) => ({
        id: message.id,
        roomId: message.roomId,
        senderId: message.senderId ?? undefined,
        type: message.senderId === report.reporterId ? 'me' as const : message.type,
        text: message.text,
        createdAt: message.createdAt.toISOString(),
        ...(message.senderId && message.senderId !== report.reporterId
          ? { name: this.profileName(message.sender), idx: this.avatarIndex(message.senderId) }
          : {}),
      })) ?? undefined,
      operationMessages: report.messages.map((message) => ({
        id: message.id,
        reportId: message.reportId,
        senderId: message.senderId,
        senderName: this.profileName(message.sender),
        text: message.text,
        createdAt: message.createdAt.toISOString(),
      })),
      paymentRecord: report.paymentRecord ? this.toPaymentResponse(report.paymentRecord) : undefined,
    };
  }

  private async ensureOperationChatRoom(report: ReportFields, adminId: string) {
    if (report.operationChatRoomId) {
      return this.prismaService.chatRoom.update({
        where: { id: report.operationChatRoomId },
        data: { participantIds: { set: Array.from(new Set([report.reporterId, adminId])) } },
      });
    }

    const room = await this.prismaService.chatRoom.create({
      data: {
        participantIds: [report.reporterId, adminId],
        messages: {
          create: {
            type: 'system',
            text: '신고 운영 대화방이 열렸습니다.',
          },
        },
      },
    });

    await this.prismaService.report.update({
      where: { id: report.id },
      data: { operationChatRoomId: room.id },
    });

    return room;
  }

  private toPublicUser(user: UserWithProfile) {
    return {
      id: user.id,
      nickname: user.profile?.nickname || user.profile?.name || 'KAPOOL 사용자',
      department: user.profile?.department ?? '학과 정보 준비중',
      homeRegion: user.profile?.homeRegion ?? undefined,
      photoDataUrl: user.profile?.photoDataUrl ?? undefined,
    };
  }

  private toAdminUser(user: UserWithProfile) {
    return {
      id: user.id,
      role: user.role,
      name: user.profile?.name ?? 'KAPOOL 사용자',
      nickname: user.profile?.nickname || user.profile?.name || 'KAPOOL 사용자',
      schoolEmail: user.profile?.schoolEmail ?? user.email,
      department: user.profile?.department ?? '학과 정보 준비중',
      phone: user.profile?.phone ?? undefined,
      homeRegion: user.profile?.homeRegion ?? undefined,
      photoDataUrl: user.profile?.photoDataUrl ?? undefined,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private toPaymentResponse(payment: PaymentFields) {
    return {
      id: payment.id,
      rideId: payment.rideId,
      reservationId: payment.reservationId,
      payerId: payment.payerId,
      receiverId: payment.receiverId,
      amount: payment.amount,
      status: payment.status,
      note: payment.note ?? undefined,
      updatedAt: payment.updatedAt.toISOString(),
    };
  }

  private profileName(user: UserWithProfile | null) {
    return user?.profile?.nickname || user?.profile?.name || 'KAPOOL 사용자';
  }

  private avatarIndex(value: string) {
    return Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0) % 4;
  }
}

type NormalizedReportContext = {
  rideId: string | undefined;
  reservationId: string | undefined;
  chatRoomId: string | undefined;
  paymentRecordId: string | undefined;
  subjectUserId: string | undefined;
};
type ReportFields = {
  id: string;
  type: ReportType;
  status: ReportStatus;
  reporterId: string;
  rideId: string | null;
  reservationId: string | null;
  chatRoomId: string | null;
  operationChatRoomId?: string | null;
  paymentRecordId: string | null;
  subjectUserId: string | null;
  description: string;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
};
type PaymentFields = {
  id: string;
  rideId: string;
  reservationId: string;
  payerId: string;
  receiverId: string;
  amount: number;
  status: PaymentStatus;
  note: string | null;
  updatedAt: Date;
};
