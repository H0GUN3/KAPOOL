import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';

import { AppModule } from '../src/app.module';
import { hashLocalDemoPassword } from '../src/auth/password';
import { PrismaService } from '../src/prisma/prisma.service';

const createdAt = new Date('2026-01-01T00:00:00.000Z');

const makeProfile = (userId: string, label: string) => ({
  id: `${userId}-profile`,
  userId,
  name: `Demo ${label}`,
  nickname: `${label} One`,
  schoolEmail: `${userId}@kapool.local`,
  department: label === 'Driver' ? 'Business Administration' : 'Computer Engineering',
  phone: '010-0000-1001',
  homeRegion: 'Gunsan',
  createdAt,
  updatedAt: createdAt,
});

const makeUser = (role: 'passenger' | 'driver' | 'admin', id = `${role}-1`) => {
  const label = role.charAt(0).toUpperCase() + role.slice(1);

  return {
    id,
    email: `${id}@kapool.local`,
    passwordHash: hashLocalDemoPassword('kapool-local-demo'),
    role,
    isAdmin: role === 'admin',
    isSuspended: false,
    adminNote: null,
    createdAt,
    updatedAt: createdAt,
    profile: makeProfile(id, label),
  };
};

const vehicle = {
  id: 'vehicle-1',
  ownerId: 'driver-1',
  model: 'Hyundai Avante',
  color: 'White',
  capacity: 4,
  plateLastFour: '1205',
  createdAt,
  updatedAt: createdAt,
};

const ride = {
  id: 'ride-1',
  from: '전주',
  to: '군산대',
  departureTime: new Date('2026-06-01T09:00:00.000Z'),
  seats: 2,
  fare: 5000,
  status: 'open',
  driverId: 'driver-1',
  vehicleId: 'vehicle-1',
  waypoints: ['팔복동', '개정IC'],
  createdAt,
  updatedAt: createdAt,
  driver: makeUser('driver'),
  vehicle,
};

const approvedReservation = {
  id: 'reservation-1',
  rideId: 'ride-1',
  passengerId: 'passenger-1',
  status: 'approved',
  seatsRequested: 1,
  message: 'I can meet at the main gate.',
  createdAt,
  updatedAt: createdAt,
  ride,
  passenger: makeUser('passenger'),
};

const chatRoom = {
  id: 'room-1',
  rideId: 'ride-1',
  reservationId: 'reservation-1',
  participantIds: ['driver-1', 'passenger-1'],
  createdAt,
  updatedAt: createdAt,
};

const rideRequest = {
  id: 'ride-request-1',
  passengerId: 'passenger-1',
  from: '군산대 정문',
  to: '나운동',
  time: '오늘 18:00',
  content: '수업 끝나고 같이 갈 차주를 찾습니다.',
  createdAt,
  updatedAt: createdAt,
};

const rideRequestRoom = {
  id: 'room-request-1',
  rideId: null,
  reservationId: null,
  rideRequestId: 'ride-request-1',
  participantIds: ['passenger-1'],
  createdAt,
  updatedAt: createdAt,
};

const seededMessages = [
  {
    id: 'message-system',
    roomId: 'room-1',
    senderId: null,
    type: 'system',
    text: 'Reservation approved. Chat room opened.',
    createdAt,
    sender: null,
  },
  {
    id: 'message-driver',
    roomId: 'room-1',
    senderId: 'driver-1',
    type: 'other',
    text: 'Please be at the main gate five minutes early.',
    createdAt,
    sender: makeUser('driver'),
  },
  {
    id: 'message-passenger',
    roomId: 'room-1',
    senderId: 'passenger-1',
    type: 'me',
    text: 'Confirmed. Thank you!',
    createdAt,
    sender: makeUser('passenger'),
  },
];

const roomWithMessages = {
  ...chatRoom,
  ride,
  messages: seededMessages,
};

describe('Persisted ride chat endpoints and gateway', () => {
  let app: INestApplication;
  let userFindUnique: jest.Mock;
  let reservationFindFirst: jest.Mock;
  let chatRoomFindFirst: jest.Mock;
  let chatRoomFindUnique: jest.Mock;
  let chatRoomCreate: jest.Mock;
  let chatRoomUpdate: jest.Mock;
  let chatMessageCreate: jest.Mock;
  let chatMessageFindUnique: jest.Mock;
  let rideRequestFindUnique: jest.Mock;
  let serverUrl: string;

  beforeAll(async () => {
    userFindUnique = jest.fn();
    reservationFindFirst = jest.fn();
    chatRoomFindFirst = jest.fn();
    chatRoomFindUnique = jest.fn();
    chatRoomCreate = jest.fn();
    chatRoomUpdate = jest.fn();
    chatMessageCreate = jest.fn();
    chatMessageFindUnique = jest.fn();
    rideRequestFindUnique = jest.fn();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $disconnect: jest.fn(),
        $queryRaw: jest.fn(),
        user: { findUnique: userFindUnique },
        reservation: { findFirst: reservationFindFirst },
        chatRoom: {
          findFirst: chatRoomFindFirst,
          findUnique: chatRoomFindUnique,
          create: chatRoomCreate,
          update: chatRoomUpdate,
        },
        chatMessage: {
          create: chatMessageCreate,
          findUnique: chatMessageFindUnique,
        },
        rideRequest: { findUnique: rideRequestFindUnique },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);

    const address = app.getHttpServer().address() as { port: number };
    serverUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    userFindUnique.mockReset();
    reservationFindFirst.mockReset();
    chatRoomFindFirst.mockReset();
    chatRoomFindUnique.mockReset();
    chatRoomCreate.mockReset();
    chatRoomUpdate.mockReset();
    chatMessageCreate.mockReset();
    chatMessageFindUnique.mockReset();
    rideRequestFindUnique.mockReset();
  });

  afterAll(async () => {
    await app?.close();
  });

  async function loginAs(user: ReturnType<typeof makeUser>) {
    userFindUnique.mockResolvedValueOnce(user);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'kapool-local-demo' })
      .expect(201);

    return response.body.accessToken as string;
  }

  function connectClient(token: string) {
    return io(serverUrl, {
      auth: { token },
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
    });
  }

  async function waitForConnect(socket: Socket) {
    if (socket.connected) return;
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
  }

  async function emitWithAck<T>(socket: Socket, event: string, payload: unknown) {
    return new Promise<T>((resolve, reject) => {
      socket.timeout(1000).emit(event, payload, (error: Error | null, response: T) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(response);
      });
    });
  }

  it('returns seeded persisted chat history for an approved participant', async () => {
    const token = await loginAs(makeUser('passenger'));
    reservationFindFirst.mockResolvedValueOnce(approvedReservation);
    chatRoomFindFirst.mockResolvedValueOnce(chatRoom);
    chatRoomFindUnique.mockResolvedValueOnce(roomWithMessages);

    const response = await request(app.getHttpServer())
      .get('/chat/rooms/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.room).toMatchObject({ id: 'room-1', rideId: 'ride-1' });
    expect(response.body.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'system', text: 'Reservation approved. Chat room opened.' }),
      expect.objectContaining({ type: 'other', senderId: 'driver-1', name: 'Driver One' }),
      expect.objectContaining({ type: 'me', senderId: 'passenger-1', text: 'Confirmed. Thank you!' }),
    ]));
    expect(JSON.stringify(response.body)).not.toContain('010-0000');
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain('1205');
  });

  it('creates an approved reservation chat when the driver enters before the passenger', async () => {
    const token = await loginAs(makeUser('driver'));
    const createdRoom = { ...chatRoom, messages: [] };

    reservationFindFirst.mockResolvedValueOnce(approvedReservation);
    chatRoomFindFirst.mockResolvedValueOnce(null);
    chatRoomCreate.mockResolvedValueOnce(createdRoom);
    chatRoomFindUnique.mockResolvedValueOnce({ ...createdRoom, ride, messages: [] });

    const response = await request(app.getHttpServer())
      .get('/chat/rooms/ride/ride-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.room).toMatchObject({
      id: 'room-1',
      rideId: 'ride-1',
      reservationId: 'reservation-1',
      participantIds: ['driver-1', 'passenger-1'],
    });
    expect(chatRoomCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        reservationId: 'reservation-1',
        participantIds: ['driver-1', 'passenger-1'],
      }),
    }));
  });

  it('repairs stale reservation chat participants before returning history', async () => {
    const token = await loginAs(makeUser('passenger'));
    const staleRoom = { ...chatRoom, participantIds: ['driver-1'] };
    const repairedRoom = { ...chatRoom, participantIds: ['driver-1', 'passenger-1'] };

    reservationFindFirst.mockResolvedValueOnce(approvedReservation);
    chatRoomFindFirst.mockResolvedValueOnce(staleRoom);
    chatRoomUpdate.mockResolvedValueOnce(repairedRoom);
    chatRoomFindUnique.mockResolvedValueOnce({ ...roomWithMessages, participantIds: repairedRoom.participantIds });

    const response = await request(app.getHttpServer())
      .get('/chat/rooms/ride/ride-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.room.participantIds).toEqual(['driver-1', 'passenger-1']);
    expect(chatRoomUpdate).toHaveBeenCalledWith({
      where: { id: 'room-1' },
      data: { participantIds: { set: ['driver-1', 'passenger-1'] } },
    });
  });

  it('keeps ride request chat enterable by the requester before a driver joins', async () => {
    const token = await loginAs(makeUser('passenger'));
    const createdRoom = { ...rideRequestRoom, messages: [], ride: null, rideRequest };

    rideRequestFindUnique.mockResolvedValueOnce(rideRequest);
    chatRoomFindFirst.mockResolvedValueOnce(null);
    chatRoomCreate.mockResolvedValueOnce({ ...rideRequestRoom, participantIds: ['passenger-1'] });
    chatRoomFindUnique.mockResolvedValueOnce(createdRoom);

    const response = await request(app.getHttpServer())
      .get('/chat/rooms/request/ride-request-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.room).toMatchObject({
      id: 'room-request-1',
      rideRequestId: 'ride-request-1',
      participantIds: ['passenger-1'],
    });
  });

  it('lets approved participants join, send, and persist a WebSocket message', async () => {
    const passengerToken = await loginAs(makeUser('passenger'));
    const driverToken = await loginAs(makeUser('driver'));
    const passengerSocket = connectClient(passengerToken);
    const driverSocket = connectClient(driverToken);

    try {
      await Promise.all([waitForConnect(passengerSocket), waitForConnect(driverSocket)]);
      reservationFindFirst
        .mockResolvedValueOnce(approvedReservation)
        .mockResolvedValueOnce(approvedReservation);
      chatRoomFindFirst
        .mockResolvedValueOnce(chatRoom)
        .mockResolvedValueOnce(chatRoom);
      chatRoomFindUnique
        .mockResolvedValueOnce(roomWithMessages)
        .mockResolvedValueOnce(roomWithMessages)
        .mockResolvedValueOnce(roomWithMessages);
      chatMessageCreate.mockResolvedValueOnce({
        id: 'message-new',
        roomId: 'room-1',
        senderId: 'passenger-1',
        type: 'other',
        text: 'I am at the main gate now.',
        createdAt,
        sender: makeUser('passenger'),
      });
      chatMessageFindUnique
        .mockResolvedValueOnce({
          id: 'message-new',
          roomId: 'room-1',
          senderId: 'passenger-1',
          type: 'other',
          text: 'I am at the main gate now.',
          createdAt,
          sender: makeUser('passenger'),
        })
        .mockResolvedValueOnce({
          id: 'message-new',
          roomId: 'room-1',
          senderId: 'passenger-1',
          type: 'other',
          text: 'I am at the main gate now.',
          createdAt,
          sender: makeUser('passenger'),
        });

      await emitWithAck(passengerSocket, 'chat:join', { rideId: 'ride-1' });
      await emitWithAck(driverSocket, 'chat:join', { rideId: 'ride-1' });
      const driverReceived = new Promise<unknown>((resolve) => driverSocket.once('chat:message', resolve));

      const ack = await emitWithAck<Record<string, unknown>>(passengerSocket, 'chat:send', {
        roomId: 'room-1',
        text: 'I am at the main gate now.',
      });

      await expect(driverReceived).resolves.toMatchObject({
        type: 'other',
        senderId: 'passenger-1',
        name: 'Passenger One',
        text: 'I am at the main gate now.',
      });
      expect(ack).toMatchObject({ type: 'me', senderId: 'passenger-1', text: 'I am at the main gate now.' });
      expect(chatMessageCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: {
          roomId: 'room-1',
          senderId: 'passenger-1',
          type: 'other',
          text: 'I am at the main gate now.',
        },
      }));
    } finally {
      passengerSocket.disconnect();
      driverSocket.disconnect();
    }
  });

  it('denies non-participant REST history and WebSocket join/send', async () => {
    const token = await loginAs(makeUser('passenger', 'passenger-2'));

    reservationFindFirst.mockResolvedValueOnce(null);
    await request(app.getHttpServer())
      .get('/chat/rooms/ride/ride-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    const socket = connectClient(token);

    try {
      await waitForConnect(socket);
      reservationFindFirst.mockResolvedValueOnce(null);
      chatRoomFindUnique.mockResolvedValueOnce(roomWithMessages);

      await expect(emitWithAck(socket, 'chat:join', { rideId: 'ride-1' })).rejects.toThrow();
      await expect(emitWithAck(socket, 'chat:send', { roomId: 'room-1', text: 'Denied message' })).rejects.toThrow();
      expect(chatMessageCreate).not.toHaveBeenCalled();
    } finally {
      socket.disconnect();
    }
  });
});
