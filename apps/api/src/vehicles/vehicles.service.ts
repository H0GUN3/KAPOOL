import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface UpsertVehicleBody {
  model?: unknown;
  color?: unknown;
  capacity?: unknown;
  plateLastFour?: unknown;
  photoDataUrl?: unknown;
}

type VehiclePayload = {
  model: string;
  color: string;
  capacity: number;
  plateLastFour: string | null;
  photoDataUrl: string | null;
};

type VehicleRecord = {
  id: string;
  ownerId: string;
  model: string;
  color: string;
  capacity: number;
  plateLastFour: string | null;
  photoDataUrl?: string | null;
};

@Injectable()
export class VehiclesService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async getMyVehicle(ownerId: string, role: UserRole) {
    this.assertCanManageVehicle(role);

    const vehicle = await this.prismaService.vehicle.findFirst({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
    });

    return vehicle ? this.toVehicleResponse(vehicle) : null;
  }

  async upsertMyVehicle(ownerId: string, role: UserRole, body: UpsertVehicleBody) {
    this.assertCanManageVehicle(role);
    const data = this.parseVehicleBody(body);
    const currentVehicle = await this.prismaService.vehicle.findFirst({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
    });

    const vehicle = currentVehicle
      ? await this.prismaService.vehicle.update({
          where: { id: currentVehicle.id },
          data,
        })
      : await this.prismaService.vehicle.create({
          data: { ownerId, ...data },
        });

    return this.toVehicleResponse(vehicle);
  }

  private assertCanManageVehicle(role: UserRole) {
    if (role === 'admin') {
      throw new ForbiddenException({ error: 'vehicle_access_denied' });
    }
  }

  private parseVehicleBody(body: UpsertVehicleBody): VehiclePayload {
    if (typeof body !== 'object' || body === null) {
      throw new BadRequestException({ error: 'invalid_vehicle_payload' });
    }

    const model = this.parseRequiredString(body.model, 'model');
    const color = this.parseRequiredString(body.color, 'color');
    const capacity = Number(body.capacity);

    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 8) {
      throw new BadRequestException({ error: 'invalid_capacity' });
    }

    const plateLastFour = this.parseOptionalString(body.plateLastFour, 'plateLastFour');
    const photoDataUrl = this.parsePhotoDataUrl(body.photoDataUrl);

    if (plateLastFour && !/^\d{4}$/.test(plateLastFour)) {
      throw new BadRequestException({ error: 'invalid_plateLastFour' });
    }

    return {
      model,
      color,
      capacity,
      plateLastFour: plateLastFour || null,
      photoDataUrl: photoDataUrl || null,
    };
  }

  private parseRequiredString(value: unknown, field: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException({ error: `invalid_${field}` });
    }

    return value.trim();
  }

  private parseOptionalString(value: unknown, field: string) {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException({ error: `invalid_${field}` });
    }

    return value.trim() || undefined;
  }

  private parsePhotoDataUrl(value: unknown) {
    const photoDataUrl = this.parseOptionalString(value, 'photoDataUrl');

    if (!photoDataUrl) {
      return undefined;
    }

    if (photoDataUrl.length > 750_000 || !/^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(photoDataUrl)) {
      throw new BadRequestException({ error: 'invalid_photoDataUrl' });
    }

    return photoDataUrl;
  }

  private toVehicleResponse(vehicle: VehicleRecord) {
    return {
      id: vehicle.id,
      ownerId: vehicle.ownerId,
      model: vehicle.model,
      color: vehicle.color,
      capacity: vehicle.capacity,
      plateLastFour: vehicle.plateLastFour ?? undefined,
      photoDataUrl: vehicle.photoDataUrl ?? undefined,
    };
  }
}
