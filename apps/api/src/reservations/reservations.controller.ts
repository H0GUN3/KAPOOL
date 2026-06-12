import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import type { CreateReservationBody, UpdatePaymentStatusBody, UpdateReservationStatusBody } from './reservations.service';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
@UseGuards(AuthGuard)
export class ReservationsController {
  constructor(@Inject(ReservationsService) private readonly reservationsService: ReservationsService) {}

  @Get()
  async listReservations(@Req() request: AuthenticatedRequest, @Query('rideId') rideId?: string) {
    return this.reservationsService.listReservations(
      request.user?.sub ?? '',
      (request.user?.role ?? 'passenger') as UserRole,
      rideId,
    );
  }

  @Get(':id')
  async getReservation(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.reservationsService.getReservation(
      request.user?.sub ?? '',
      (request.user?.role ?? 'passenger') as UserRole,
      id,
    );
  }

  @Post()
  @Roles('passenger')
  async createReservation(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.reservationsService.createReservation(request.user?.sub ?? '', (body ?? {}) as CreateReservationBody);
  }

  @Patch(':id/status')
  async updateReservationStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.reservationsService.updateReservationStatus(
      request.user?.sub ?? '',
      (request.user?.role ?? 'passenger') as UserRole,
      id,
      (body ?? {}) as UpdateReservationStatusBody,
    );
  }

  @Patch(':id/payment')
  async updatePaymentStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.reservationsService.updatePaymentStatus(
      request.user?.sub ?? '',
      (request.user?.role ?? 'passenger') as UserRole,
      id,
      (body ?? {}) as UpdatePaymentStatusBody,
    );
  }
}
