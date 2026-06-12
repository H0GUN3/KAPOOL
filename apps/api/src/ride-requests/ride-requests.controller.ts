import { Body, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import type { CreateRideRequestBody } from './ride-requests.service';
import { RideRequestsService } from './ride-requests.service';

@Controller('ride-requests')
@UseGuards(AuthGuard)
export class RideRequestsController {
  constructor(@Inject(RideRequestsService) private readonly rideRequestsService: RideRequestsService) {}

  @Get()
  async listRideRequests() {
    return this.rideRequestsService.listRideRequests();
  }

  @Post()
  @Roles('passenger', 'driver')
  async createRideRequest(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.rideRequestsService.createRideRequest(request.user?.sub ?? '', (body ?? {}) as CreateRideRequestBody);
  }
}
