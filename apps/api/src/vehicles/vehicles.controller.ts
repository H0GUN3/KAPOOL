import { Body, Controller, Get, Inject, Put, Req, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import type { UpsertVehicleBody } from './vehicles.service';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
@UseGuards(AuthGuard)
export class VehiclesController {
  constructor(@Inject(VehiclesService) private readonly vehiclesService: VehiclesService) {}

  @Get('me')
  async getMyVehicle(@Req() request: AuthenticatedRequest) {
    return this.vehiclesService.getMyVehicle(
      request.user?.sub ?? '',
      request.user?.role ?? 'passenger',
    );
  }

  @Put('me')
  async upsertMyVehicle(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.vehiclesService.upsertMyVehicle(
      request.user?.sub ?? '',
      request.user?.role ?? 'passenger',
      (body ?? {}) as UpsertVehicleBody,
    );
  }
}
