import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ChatMessage, ChatMessageType, Prisma, RideRequest, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

const activeReservationStatuses = ['approved', 'completed'] as const;

type AuthorizedReservation = Prisma.ReservationGetPayload<{
  include: {
    passenger: { include: { profile: true } };
    ride: { include: { driver: { include: { profile: true } }; vehicle: true } };
  };
}>;

type ChatRoomWithMessages = Prisma.ChatRoomGetPayload<{
  include: {
    ride: { include: { driver: { include: { profile: true } }; vehicle: true } };
    rideRequest: { include: { passenger: { include: { profile: true } } } };
    operationReports: true;
    messages: { include: { sender: { include: { profile: true } } }; orderBy: { createdAt: 'asc' } };
  };
}>;

type ChatMessageWithSender = ChatMessage & {
  sender?: {
    id: string;
    profile: {
      nickname: string;
      name: string;
      photoDataUrl: string | null;
    } | null;
  } | null;
};

type RideRequestChatSource = Pick<RideRequest, 'id' | 'passengerId'>;
type UserWithProfile = Prisma.UserGetPayload<{ include: { profile: true } }>;

@Injectable()
export class ChatService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listRooms(userId: string) {
    const rooms = await this.prismaService.chatRoom.findMany({
      where: {
        participantIds: { has: userId },
        OR: [
          { rideRequestId: { not: null } },
          { reservation: { is: { status: { in: [...activeReservationStatuses] } } } },
          { operationReports: { some: {} } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        ride: { include: { driver: { include: { profile: true } }, vehicle: true } },
        rideRequest: { include: { passenger: { include: { profile: true } } } },
        operationReports: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { include: { profile: true } } },
        },
      },
    });

    return rooms.map((room) => this.toRoomResponse(room));
  }

  async getCurrentChat(userId: string) {
    const reservation = await this.prismaService.reservation.findFirst({
      where: this.authorizedReservationWhere(userId),
      orderBy: { createdAt: 'asc' },
      include: this.authorizedReservationInclude,
    });

    if (!reservation) {
      throw new NotFoundException({ error: 'chat_room_not_found' });
    }

    const room = await this.ensureRoomForReservation(reservation);
    return this.getRoomHistory(userId, room.id);
  }

  async getRideChat(userId: string, rideId: string) {
    if (!rideId.trim()) {
      throw new BadRequestException({ error: 'invalid_ride_id' });
    }

    const reservation = await this.prismaService.reservation.findFirst({
      where: this.authorizedReservationWhere(userId, rideId),
      orderBy: { createdAt: 'asc' },
      include: this.authorizedReservationInclude,
    });

    if (!reservation) {
      throw new ForbiddenException({ error: 'chat_access_denied' });
    }

    const room = await this.ensureRoomForReservation(reservation);
    return this.getRoomHistory(userId, room.id);
  }

  async getRideRequestChat(userId: string, role: UserRole, rideRequestId: string) {
    const requestId = rideRequestId.trim();

    if (!requestId) {
      throw new BadRequestException({ error: 'invalid_ride_request_id' });
    }

    if (role === 'admin') {
      throw new ForbiddenException({ error: 'chat_access_denied' });
    }

    const rideRequest = await this.prismaService.rideRequest.findUnique({
      where: { id: requestId },
      include: { passenger: { include: { profile: true } } },
    });

    if (!rideRequest) {
      throw new NotFoundException({ error: 'ride_request_not_found' });
    }

    if (role === 'passenger' && rideRequest.passengerId !== userId) {
      throw new ForbiddenException({ error: 'chat_access_denied' });
    }

    const room = await this.ensureRoomForRideRequest(rideRequest, userId);
    return this.getRoomHistory(userId, room.id);
  }

  async getRoomHistory(userId: string, roomId: string) {
    const room = await this.findAuthorizedRoom(userId, roomId);

    return {
      room: this.toRoomResponse(room),
      messages: room.messages.map((message) => this.toMessageResponse(message, userId)),
    };
  }

  async createMessage(userId: string, roomId: string, text: string) {
    const trimmedText = text.trim();

    if (!trimmedText) {
      throw new BadRequestException({ error: 'invalid_chat_message' });
    }

    await this.findAuthorizedRoom(userId, roomId);
    const message = await this.prismaService.chatMessage.create({
      data: {
        roomId,
        senderId: userId,
        type: 'other',
        text: trimmedText,
      },
      include: { sender: { include: { profile: true } } },
    });

    return this.toMessageResponse(message, userId);
  }

  async createReservationMessage(userId: string, reservation: AuthorizedReservation, text: string) {
    const room = await this.ensureRoomForReservation(reservation);

    return this.createMessage(userId, room.id, text);
  }

  async ensureReservationRoom(reservation: AuthorizedReservation) {
    return this.ensureRoomForReservation(reservation);
  }

  async ensureRideRequestRoom(rideRequest: RideRequestChatSource, userId: string) {
    return this.ensureRoomForRideRequest(rideRequest, userId);
  }

  async serializeMessageForViewer(messageId: string, viewerId: string) {
    const message = await this.prismaService.chatMessage.findUnique({
      where: { id: messageId },
      include: { sender: { include: { profile: true } } },
    });

    if (!message) {
      throw new NotFoundException({ error: 'chat_message_not_found' });
    }

    return this.toMessageResponse(message, viewerId);
  }

  private async findAuthorizedRoom(userId: string, roomId: string): Promise<ChatRoomWithMessages> {
    const room = await this.prismaService.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        ride: { include: { driver: { include: { profile: true } }, vehicle: true } },
        rideRequest: { include: { passenger: { include: { profile: true } } } },
        operationReports: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { include: { profile: true } } },
        },
      },
    });

    if (!room) {
      throw new NotFoundException({ error: 'chat_room_not_found' });
    }

    if (!room.participantIds.includes(userId)) {
      throw new ForbiddenException({ error: 'chat_access_denied' });
    }

    return room;
  }

  private async ensureRoomForReservation(reservation: AuthorizedReservation) {
    const participantIds = this.reservationParticipantIds(reservation);
    const existingRoom = await this.prismaService.chatRoom.findFirst({
      where: { reservationId: reservation.id },
    });

    if (existingRoom) {
      return this.ensureParticipants(existingRoom.id, existingRoom.participantIds, participantIds);
    }

    return this.prismaService.chatRoom.create({
      data: {
        rideId: reservation.rideId,
        reservationId: reservation.id,
        participantIds,
        messages: {
          create: {
            type: 'system',
            text: 'Reservation approved. Chat room opened.',
          },
        },
      },
    });
  }

  private async ensureRoomForRideRequest(rideRequest: RideRequestChatSource, userId: string) {
    const existingRoom = await this.prismaService.chatRoom.findFirst({
      where: { rideRequestId: rideRequest.id },
    });

    if (existingRoom) {
      return this.ensureParticipant(existingRoom.id, existingRoom.participantIds, userId);
    }

    const participantIds = Array.from(new Set([rideRequest.passengerId, userId]));

    return this.prismaService.chatRoom.create({
      data: {
        rideRequestId: rideRequest.id,
        participantIds,
        messages: {
          create: {
            type: 'system',
            text: '카풀 요청 대화방이 열렸습니다.',
          },
        },
      },
    });
  }

  private async ensureParticipant(roomId: string, participantIds: string[], userId: string) {
    if (participantIds.includes(userId)) {
      return { id: roomId, participantIds };
    }

    return this.prismaService.chatRoom.update({
      where: { id: roomId },
      data: { participantIds: { push: userId } },
    });
  }

  private async ensureParticipants(roomId: string, currentParticipantIds: string[], requiredParticipantIds: string[]) {
    const nextParticipantIds = Array.from(new Set([...currentParticipantIds, ...requiredParticipantIds]));

    if (nextParticipantIds.length === currentParticipantIds.length) {
      return { id: roomId, participantIds: currentParticipantIds };
    }

    return this.prismaService.chatRoom.update({
      where: { id: roomId },
      data: { participantIds: { set: nextParticipantIds } },
    });
  }

  private reservationParticipantIds(reservation: AuthorizedReservation) {
    return Array.from(new Set([reservation.ride.driverId, reservation.passengerId]));
  }

  private authorizedReservationWhere(userId: string, rideId?: string): Prisma.ReservationWhereInput {
    return {
      status: { in: [...activeReservationStatuses] },
      ...(rideId ? { rideId } : {}),
      OR: [
        { passengerId: userId },
        { ride: { driverId: userId } },
      ],
    };
  }

  private toRoomResponse(room: ChatRoomWithMessages) {
    const driverProfile = room.ride?.driver.profile;

    return {
      id: room.id,
      rideId: room.rideId ?? undefined,
      reservationId: room.reservationId ?? undefined,
      rideRequestId: room.rideRequestId ?? undefined,
      participantIds: room.participantIds,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      ride: room.ride ? {
        id: room.ride.id,
        from: room.ride.from,
        to: room.ride.to,
        departureTime: room.ride.departureTime.toISOString(),
        fare: room.ride.fare,
        driver: driverProfile?.nickname || driverProfile?.name || 'KAPOOL 차주',
        driverPhotoDataUrl: driverProfile?.photoDataUrl ?? undefined,
        vehicle: room.ride.vehicle
          ? {
              model: room.ride.vehicle.model,
              color: room.ride.vehicle.color,
              capacity: room.ride.vehicle.capacity,
            }
          : undefined,
      } : undefined,
      rideRequest: room.rideRequest ? {
        id: room.rideRequest.id,
        passengerId: room.rideRequest.passengerId,
        from: room.rideRequest.from,
        to: room.rideRequest.to,
        time: room.rideRequest.time,
        content: room.rideRequest.content,
        createdAt: room.rideRequest.createdAt.toISOString(),
      } : undefined,
      requester: room.rideRequest?.passenger ? this.toPublicUser(room.rideRequest.passenger) : undefined,
      report: room.operationReports?.[0]
        ? {
            id: room.operationReports[0].id,
            type: room.operationReports[0].type,
            status: room.operationReports[0].status,
            description: room.operationReports[0].description,
          }
        : undefined,
    };
  }

  private toMessageResponse(message: ChatMessageWithSender, viewerId: string) {
    const baseMessage = {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId ?? undefined,
      text: message.text,
      createdAt: message.createdAt.toISOString(),
    };

    if (message.type === 'system' || message.type === 'sysinfo' || !message.senderId) {
      return { ...baseMessage, type: message.type as Extract<ChatMessageType, 'system' | 'sysinfo'> };
    }

    if (message.senderId === viewerId) {
      return { ...baseMessage, type: 'me' as const };
    }

    const profile = message.sender?.profile;

    return {
      ...baseMessage,
      type: 'other' as const,
      name: profile?.nickname || profile?.name || 'KAPOOL 사용자',
      idx: this.avatarIndex(message.senderId),
      photoDataUrl: profile?.photoDataUrl ?? undefined,
    };
  }

  private toPublicUser(user: UserWithProfile) {
    return {
      id: user.id,
      nickname: user.profile?.nickname || user.profile?.name || 'KAPOOL 사용자',
      department: user.profile?.department ?? '학과 정보 준비중',
      homeRegion: user.profile?.homeRegion ?? undefined,
      photoDataUrl: user.profile?.photoDataUrl ?? undefined,
    };
  }

  private avatarIndex(value: string) {
    return Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0) % 4;
  }

  private readonly authorizedReservationInclude = {
    passenger: { include: { profile: true } },
    ride: { include: { driver: { include: { profile: true } }, vehicle: true } },
  } satisfies Prisma.ReservationInclude;
}
