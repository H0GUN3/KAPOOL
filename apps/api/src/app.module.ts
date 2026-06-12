import { Module } from '@nestjs/common';

import { AdminController } from './admin/admin.controller';
import { AuthController } from './auth/auth.controller';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';
import { TokenService } from './auth/token.service';
import { ChatController } from './chat/chat.controller';
import { ChatGateway } from './chat/chat.gateway';
import { ChatService } from './chat/chat.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from './prisma/prisma.module';
import { RideRequestsController } from './ride-requests/ride-requests.controller';
import { RideRequestsService } from './ride-requests/ride-requests.service';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { ReservationsController } from './reservations/reservations.controller';
import { ReservationsService } from './reservations/reservations.service';
import { RidesController } from './rides/rides.controller';
import { RidesService } from './rides/rides.service';
import { VehiclesController } from './vehicles/vehicles.controller';
import { VehiclesService } from './vehicles/vehicles.service';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController, AuthController, AdminController, RidesController, RideRequestsController, ReservationsController, ChatController, ReportsController, VehiclesController],
  providers: [HealthService, AuthService, TokenService, AuthGuard, RidesService, RideRequestsService, ReservationsService, ChatService, ChatGateway, ReportsService, VehiclesService],
})
export class AppModule {}
