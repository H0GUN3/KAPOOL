import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

const fixedRegionFares: Record<string, number> = {
  전주: 5000,
  익산: 4000,
  군산: 3000,
};

export interface CreateRideBody {
  from?: string;
  to?: string;
  departureTime?: string;
  seats?: number;
  fareRegion?: string;
  waypoints?: string[];
  vehicle?: {
    model?: string;
    color?: string;
    capacity?: number;
    plateLastFour?: string;
  };
}

type RideWithPublicRelations = Prisma.RideGetPayload<{
  include: {
    driver: { include: { profile: true } };
    vehicle: true;
  };
}>;

@Injectable()
export class RidesService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listRides() {
    await this.closeExpiredRides();

    const rides = await this.prismaService.ride.findMany({
      where: { status: { not: 'closed' } },
      orderBy: { departureTime: 'asc' },
      include: {
        driver: { include: { profile: true } },
        vehicle: true,
      },
    });

    return rides.map((ride) => this.toPublicRide(ride));
  }

  async getRide(id: string) {
    await this.closeExpiredRides();

    const ride = await this.findRideById(id);

    if (!ride) {
      throw new NotFoundException({ error: 'ride_not_found' });
    }

    return this.toPublicRide(ride);
  }

  async createRide(driverId: string, body: CreateRideBody) {
    const from = body.from?.trim();
    const to = body.to?.trim();
    const departureTime = this.parseDepartureTime(body.departureTime);
    const seats = this.parsePositiveInteger(body.seats, 'seats');
    const fareRegion = body.fareRegion?.trim();
    const fare = fareRegion ? fixedRegionFares[fareRegion] : undefined;
    const vehicle = body.vehicle;
    const vehicleCapacity = this.parsePositiveInteger(vehicle?.capacity, 'vehicle.capacity');

    if (!from || !to || !fareRegion || fare === undefined) {
      throw new BadRequestException({ error: 'invalid_ride_payload' });
    }

    if (!vehicle?.model?.trim() || !vehicle.color?.trim()) {
      throw new BadRequestException({ error: 'invalid_vehicle_payload' });
    }

    if (seats > vehicleCapacity) {
      throw new BadRequestException({ error: 'seats_exceed_vehicle_capacity' });
    }

    const createdVehicle = await this.prismaService.vehicle.create({
      data: {
        ownerId: driverId,
        model: vehicle.model.trim(),
        color: vehicle.color.trim(),
        capacity: vehicleCapacity,
        plateLastFour: vehicle.plateLastFour?.trim() || null,
      },
    });

    const ride = await this.prismaService.ride.create({
      data: {
        from,
        to,
        departureTime,
        seats,
        fare,
        status: 'open',
        driverId,
        vehicleId: createdVehicle.id,
        waypoints: body.waypoints?.map((waypoint) => waypoint.trim()).filter(Boolean) ?? [],
      },
      include: {
        driver: { include: { profile: true } },
        vehicle: true,
      },
    }) as RideWithPublicRelations;

    return this.toPublicRide(ride);
  }

  private async findRideById(id: string) {
    return this.prismaService.ride.findUnique({
      where: { id },
      include: {
        driver: { include: { profile: true } },
        vehicle: true,
      },
    });
  }

  private async closeExpiredRides(now = new Date()) {
    await this.prismaService.ride.updateMany({
      where: {
        departureTime: { lt: now },
        status: { in: ['open', 'full'] },
      },
      data: { status: 'closed' },
    });
  }

  private parseDepartureTime(value: string | undefined): Date {
    const departureTime = value ? new Date(value) : null;

    if (!departureTime || Number.isNaN(departureTime.getTime())) {
      throw new BadRequestException({ error: 'invalid_departure_time' });
    }

    return departureTime;
  }

  private parsePositiveInteger(value: number | undefined, field: string): number {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException({ error: `invalid_${field}` });
    }

    return parsed;
  }

  private toPublicRide(ride: RideWithPublicRelations) {
    const driverProfile = ride.driver.profile;
    const driverLabel = driverProfile?.nickname || driverProfile?.name || 'KAPOOL 차주';

    return {
      id: ride.id,
      from: ride.from,
      to: ride.to,
      departureTime: ride.departureTime.toISOString(),
      seats: ride.seats,
      fare: ride.fare,
      status: ride.status,
      driverId: ride.driverId,
      driver: driverLabel,
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
}
