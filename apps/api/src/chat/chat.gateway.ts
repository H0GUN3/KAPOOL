import { Inject } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import type { AuthTokenPayload } from '../auth/token.service';
import { TokenService } from '../auth/token.service';
import { ChatService } from './chat.service';

interface JoinChatPayload {
  rideId?: string;
  roomId?: string;
}

interface SendChatPayload {
  roomId?: string;
  text?: string;
}

type ChatSocket = Socket & { data: { user?: AuthTokenPayload } };

@WebSocketGateway({ cors: { origin: true, credentials: false } })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    @Inject(ChatService) private readonly chatService: ChatService,
    @Inject(TokenService) private readonly tokenService: TokenService,
  ) {}

  handleConnection(client: ChatSocket) {
    const token = this.extractToken(client);
    const payload = token ? this.tokenService.verifyToken(token) : null;

    if (!payload) {
      client.emit('chat:error', { error: 'authentication_required' });
      client.disconnect(true);
      return;
    }

    client.data.user = payload;
  }

  @SubscribeMessage('chat:join')
  async handleJoin(@ConnectedSocket() client: ChatSocket, @MessageBody() payload: JoinChatPayload) {
    const user = this.getUser(client);
    const history = payload.roomId
      ? await this.chatService.getRoomHistory(user.sub, payload.roomId)
      : await this.chatService.getRideChat(user.sub, payload.rideId ?? '');
    const roomName = this.socketRoomName(history.room.id);

    await client.join(roomName);
    client.emit('chat:joined', history);
    return history;
  }

  @SubscribeMessage('chat:send')
  async handleSend(@ConnectedSocket() client: ChatSocket, @MessageBody() payload: SendChatPayload) {
    const user = this.getUser(client);
    const roomId = payload.roomId ?? '';
    const senderMessage = await this.chatService.createMessage(user.sub, roomId, payload.text ?? '');
    const sockets = await this.server.in(this.socketRoomName(roomId)).fetchSockets();

    await Promise.all(sockets.map(async (socket) => {
      const viewerId = (socket.data as { user?: AuthTokenPayload }).user?.sub;
      const message = viewerId ? await this.chatService.serializeMessageForViewer(senderMessage.id, viewerId) : senderMessage;
      socket.emit('chat:message', message);
    }));

    return senderMessage;
  }

  private getUser(client: ChatSocket) {
    if (!client.data.user) {
      client.disconnect(true);
      throw new Error('authentication_required');
    }

    return client.data.user;
  }

  private extractToken(client: Socket) {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string') {
      return authToken;
    }

    const authorization = client.handshake.headers.authorization;
    const headerValue = Array.isArray(authorization) ? authorization[0] : authorization;

    return headerValue?.startsWith('Bearer ') ? headerValue.slice('Bearer '.length).trim() : null;
  }

  private socketRoomName(roomId: string) {
    return `chat:${roomId}`;
  }
}
