import { Body, Controller, Get, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import type { CreateReportMessageBody, UpdateReportStatusBody } from '../reports/reports.service';
import { ReportsService } from '../reports/reports.service';

@Controller('admin')
@UseGuards(AuthGuard)
@Roles('admin')
export class AdminController {
  constructor(@Inject(ReportsService) private readonly reportsService: ReportsService) {}

  @Get('auth-check')
  getAuthCheck(@Req() request: AuthenticatedRequest) {
    return {
      ok: true,
      userId: request.user?.sub,
      role: request.user?.role,
    };
  }

  @Get('reports')
  async listReports() {
    return this.reportsService.listAdminReports();
  }

  @Patch('reports/:id/status')
  async updateReport(@Param('id') id: string, @Body() body: unknown) {
    return this.reportsService.updateAdminReport(id, (body ?? {}) as UpdateReportStatusBody);
  }

  @Post('reports/:id/messages')
  async createReportMessage(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.reportsService.createAdminReportMessage(
      id,
      request.user?.sub ?? '',
      (body ?? {}) as CreateReportMessageBody,
    );
  }

  @Get('reports/:id')
  async getReport(@Param('id') id: string) {
    return this.reportsService.getAdminReport(id);
  }
}
