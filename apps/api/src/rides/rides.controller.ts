import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import type { CreateRideBody } from './rides.service';
import { RidesService } from './rides.service';

@Controller('rides')
@UseGuards(AuthGuard)
export class RidesController {
  constructor(@Inject(RidesService) private readonly ridesService: RidesService) {}

  @Get()
  async listRides() {
    return this.ridesService.listRides();
  }

  @Get(':id')
  async getRide(@Param('id') id: string) {
    return this.ridesService.getRide(id);
  }

  @Post()
  @Roles('driver')
  async createRide(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.ridesService.createRide(request.user?.sub ?? '', (body ?? {}) as CreateRideBody);
  }
}
