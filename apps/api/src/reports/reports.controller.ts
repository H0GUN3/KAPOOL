import { Body, Controller, Inject, Post, Req, UseGuards } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import type { CreateReportBody } from './reports.service';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reportsService: ReportsService) {}

  @Post()
  async createReport(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.reportsService.createReport(
      request.user?.sub ?? '',
      (request.user?.role ?? 'passenger') as UserRole,
      (body ?? {}) as CreateReportBody,
    );
  }
}
