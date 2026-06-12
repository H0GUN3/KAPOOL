import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { ChatService } from '../chat/chat.service';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateRideRequestBody {
  from?: unknown;
  to?: unknown;
  time?: unknown;
  content?: unknown;
}

interface RideRequestRecord {
  id: string;
  passengerId: string;
  from: string;
  to: string;
  time: string;
  content: string;
  createdAt: Date;
}

@Injectable()
export class RideRequestsService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(ChatService) private readonly chatService: ChatService,
  ) {}

  async listRideRequests() {
    const rideRequests = await this.prismaService.rideRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return rideRequests.map((rideRequest) => this.toPublicRideRequest(rideRequest));
  }

  async createRideRequest(passengerId: string, body: CreateRideRequestBody) {
    const data = this.parseCreateBody(body);
    const rideRequest = await this.prismaService.rideRequest.create({
      data: {
        passengerId,
        ...data,
      },
    });

    await this.chatService.ensureRideRequestRoom(rideRequest, passengerId);

    return this.toPublicRideRequest(rideRequest);
  }

  private parseCreateBody(body: CreateRideRequestBody) {
    if (typeof body !== 'object' || body === null) {
      throw new BadRequestException({ error: 'invalid_ride_request_payload' });
    }

    return {
      from: this.parseRequiredString(body.from, 'from'),
      to: this.parseRequiredString(body.to, 'to'),
      time: this.parseRequiredString(body.time, 'time'),
      content: this.parseRequiredString(body.content, 'content'),
    };
  }

  private parseRequiredString(value: unknown, field: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException({ error: `invalid_${field}` });
    }

    return value.trim();
  }

  private toPublicRideRequest(rideRequest: RideRequestRecord) {
    return {
      id: rideRequest.id,
      passengerId: rideRequest.passengerId,
      from: rideRequest.from,
      to: rideRequest.to,
      time: rideRequest.time,
      content: rideRequest.content,
      createdAt: rideRequest.createdAt.toISOString(),
    };
  }
}
