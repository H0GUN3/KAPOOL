import { Controller, Get, Inject, Param, Req, UseGuards } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(@Inject(ChatService) private readonly chatService: ChatService) {}

  @Get('rooms/current')
  async getCurrentRoom(@Req() request: AuthenticatedRequest) {
    return this.chatService.getCurrentChat(request.user?.sub ?? '');
  }

  @Get('rooms')
  async listRooms(@Req() request: AuthenticatedRequest) {
    return this.chatService.listRooms(request.user?.sub ?? '');
  }

  @Get('rooms/ride/:rideId')
  async getRideRoom(@Req() request: AuthenticatedRequest, @Param('rideId') rideId: string) {
    return this.chatService.getRideChat(request.user?.sub ?? '', rideId);
  }

  @Get('rooms/request/:rideRequestId')
  async getRideRequestRoom(@Req() request: AuthenticatedRequest, @Param('rideRequestId') rideRequestId: string) {
    return this.chatService.getRideRequestChat(
      request.user?.sub ?? '',
      (request.user?.role ?? 'passenger') as UserRole,
      rideRequestId,
    );
  }

  @Get('rooms/:roomId/history')
  async getRoomHistory(@Req() request: AuthenticatedRequest, @Param('roomId') roomId: string) {
    return this.chatService.getRoomHistory(request.user?.sub ?? '', roomId);
  }
}
