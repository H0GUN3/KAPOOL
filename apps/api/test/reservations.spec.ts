import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { hashLocalDemoPassword } from '../src/auth/password';
import { PrismaService } from '../src/prisma/prisma.service';

const createdAt = new Date('2026-01-01T00:00:00.000Z');
const updatedAt = new Date('2026-01-01T00:05:00.000Z');

const makeProfile = (userId: string, label: string) => ({
  id: `${userId}-profile`,
  userId,
  name: `Demo ${label}`,
  nickname: `${label} One`,
  schoolEmail: `${userId}@kapool.local`,
  department: label === 'Driver' ? 'Business Administration' : 'Computer Engineering',
  phone: label === 'Driver' ? '010-0000-2002' : '010-0000-1001',
  homeRegion: 'Gunsan',
  createdAt,
  updatedAt,
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
    updatedAt,
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
  updatedAt,
};

const makeRide = (overrides: Record<string, unknown> = {}) => ({
  id: 'ride-1',
  from: '전주',
  to: '군산대',
  departureTime: new Date('2026-06-01T09:00:00.000Z'),
  seats: 3,
  fare: 5000,
  status: 'open',
  driverId: 'driver-1',
  vehicleId: 'vehicle-1',
  waypoints: ['팔복동', '개정IC'],
  createdAt,
  updatedAt,
  driver: makeUser('driver'),
  vehicle,
  ...overrides,
});

const makeSettlement = (overrides: Record<string, unknown> = {}) => ({
  id: 'payment-1',
  rideId: 'ride-1',
  reservationId: 'reservation-1',
  payerId: 'passenger-1',
  receiverId: 'driver-1',
  amount: 5000,
  status: 'unpaid',
  note: null,
  createdAt,
  updatedAt,
  ...overrides,
});

const makeReservation = (overrides: Record<string, unknown> = {}) => ({
  id: 'reservation-1',
  rideId: 'ride-1',
  passengerId: 'passenger-1',
  status: 'pending',
  seatsRequested: 1,
  message: 'I can meet at the main gate.',
  createdAt,
  updatedAt,
  ride: makeRide(),
  passenger: makeUser('passenger'),
  settlements: [],
  ...overrides,
});

const chatRoom = {
  id: 'room-1',
  rideId: 'ride-1',
  reservationId: 'reservation-1',
  participantIds: ['driver-1', 'passenger-1'],
  createdAt,
  updatedAt,
};

describe('Reservation approval and internal payment compatibility endpoints', () => {
  let app: INestApplication;
  let transactionMock: jest.Mock;
  let userFindUnique: jest.Mock;
  let rideFindUnique: jest.Mock;
  let rideUpdateMany: jest.Mock;
  let rideUpdate: jest.Mock;
  let reservationFindMany: jest.Mock;
  let reservationFindUnique: jest.Mock;
  let reservationCreate: jest.Mock;
  let reservationUpdateMany: jest.Mock;
  let reservationUpdate: jest.Mock;
  let settlementFindFirst: jest.Mock;
  let settlementCreate: jest.Mock;
  let settlementUpdate: jest.Mock;
  let chatRoomFindFirst: jest.Mock;
  let chatRoomFindUnique: jest.Mock;
  let chatRoomCreate: jest.Mock;
  let chatRoomUpdate: jest.Mock;
  let chatMessageCreate: jest.Mock;

  beforeAll(async () => {
    transactionMock = jest.fn();
    userFindUnique = jest.fn();
    rideFindUnique = jest.fn();
    rideUpdateMany = jest.fn();
    rideUpdate = jest.fn();
    reservationFindMany = jest.fn();
    reservationFindUnique = jest.fn();
    reservationCreate = jest.fn();
    reservationUpdateMany = jest.fn();
    reservationUpdate = jest.fn();
    settlementFindFirst = jest.fn();
    settlementCreate = jest.fn();
    settlementUpdate = jest.fn();
    chatRoomFindFirst = jest.fn();
    chatRoomFindUnique = jest.fn();
    chatRoomCreate = jest.fn();
    chatRoomUpdate = jest.fn();
    chatMessageCreate = jest.fn();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $transaction: transactionMock,
        $disconnect: jest.fn(),
        $queryRaw: jest.fn(),
        user: { findUnique: userFindUnique },
        ride: { findUnique: rideFindUnique, updateMany: rideUpdateMany, update: rideUpdate },
        reservation: {
          findMany: reservationFindMany,
          findUnique: reservationFindUnique,
          create: reservationCreate,
          updateMany: reservationUpdateMany,
          update: reservationUpdate,
        },
        settlementRecord: {
          findFirst: settlementFindFirst,
          create: settlementCreate,
          update: settlementUpdate,
        },
        chatRoom: {
          findFirst: chatRoomFindFirst,
          findUnique: chatRoomFindUnique,
          create: chatRoomCreate,
          update: chatRoomUpdate,
        },
        chatMessage: { create: chatMessageCreate },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    transactionMock.mockReset();
    transactionMock.mockImplementation((callback) => callback({
      ride: { findUnique: rideFindUnique, updateMany: rideUpdateMany, update: rideUpdate },
      reservation: { updateMany: reservationUpdateMany },
      settlementRecord: { findFirst: settlementFindFirst, create: settlementCreate },
    }));
    userFindUnique.mockReset();
    rideFindUnique.mockReset();
    rideUpdateMany.mockReset();
    rideUpdate.mockReset();
    reservationFindMany.mockReset();
    reservationFindUnique.mockReset();
    reservationCreate.mockReset();
    reservationUpdateMany.mockReset();
    reservationUpdate.mockReset();
    settlementFindFirst.mockReset();
    settlementCreate.mockReset();
    settlementUpdate.mockReset();
    chatRoomFindFirst.mockReset();
    chatRoomFindUnique.mockReset();
    chatRoomCreate.mockReset();
    chatRoomUpdate.mockReset();
    chatMessageCreate.mockReset();
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

  it('lets a passenger create a pending reservation without private fields', async () => {
    const token = await loginAs(makeUser('passenger'));
    rideFindUnique.mockResolvedValueOnce(makeRide());
    reservationCreate.mockResolvedValueOnce(makeReservation());

    const response = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ rideId: 'ride-1', seatsRequested: 1, message: 'I can meet at the main gate.' })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 'reservation-1',
      rideId: 'ride-1',
      passengerId: 'passenger-1',
      status: 'pending',
      seatsRequested: 1,
    });
    expect(JSON.stringify(response.body)).not.toContain('010-0000');
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain('1205');
  });

  it('lets a driver approve a pending reservation and keeps internal payment tracking compatible', async () => {
    const token = await loginAs(makeUser('driver'));
    reservationFindUnique
      .mockResolvedValueOnce(makeReservation())
      .mockResolvedValueOnce(makeReservation({ status: 'approved', settlements: [makeSettlement()] }));
    reservationUpdateMany.mockResolvedValueOnce({ count: 1 });
    rideUpdateMany.mockResolvedValueOnce({ count: 1 });
    rideFindUnique.mockResolvedValueOnce({ seats: 2 });
    settlementFindFirst.mockResolvedValueOnce(null);
    settlementCreate.mockResolvedValueOnce(makeSettlement());
    chatRoomFindFirst.mockResolvedValueOnce(null);
    chatRoomCreate.mockResolvedValueOnce(chatRoom);

    const response = await request(app.getHttpServer())
      .patch('/reservations/reservation-1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'approved' })
      .expect(200);

    expect(reservationUpdateMany).toHaveBeenCalledWith({
      where: { id: 'reservation-1', status: 'pending' },
      data: { status: 'approved' },
    });
    expect(rideUpdateMany).toHaveBeenCalledWith({
      where: { id: 'ride-1', status: 'open', seats: { gte: 1 } },
      data: { seats: { decrement: 1 } },
    });
    expect(settlementCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'unpaid' }) }));
    expect(chatRoomCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        rideId: 'ride-1',
        reservationId: 'reservation-1',
        participantIds: ['driver-1', 'passenger-1'],
      }),
    }));
    expect(response.body.status).toBe('approved');
  });

  it('rejects approval when concurrent approvals consume the remaining seats', async () => {
    const token = await loginAs(makeUser('driver'));
    reservationFindUnique.mockResolvedValueOnce(makeReservation());
    reservationUpdateMany.mockResolvedValueOnce({ count: 1 });
    rideUpdateMany.mockResolvedValueOnce({ count: 0 });

    await request(app.getHttpServer())
      .patch('/reservations/reservation-1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'approved' })
      .expect(400);

    expect(settlementCreate).not.toHaveBeenCalled();
  });

  it('lets a driver reject a pending reservation', async () => {
    const token = await loginAs(makeUser('driver'));
    reservationFindUnique
      .mockResolvedValueOnce(makeReservation())
      .mockResolvedValueOnce(makeReservation({ status: 'rejected' }));

    const response = await request(app.getHttpServer())
      .patch('/reservations/reservation-1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'rejected' })
      .expect(200);

    expect(response.body.status).toBe('rejected');
  });

  it('lets a driver list reservations for their rides', async () => {
    const token = await loginAs(makeUser('driver'));
    reservationFindMany.mockResolvedValueOnce([makeReservation()]);

    const response = await request(app.getHttpServer())
      .get('/reservations')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(reservationFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { ride: { driverId: 'driver-1' } },
    }));
    expect(response.body).toEqual([
      expect.objectContaining({
        id: 'reservation-1',
        status: 'pending',
        passenger: expect.objectContaining({ nickname: 'Passenger One' }),
      }),
    ]);
  });

  it('lets a driver list reservations for a specific own ride', async () => {
    const token = await loginAs(makeUser('driver'));
    reservationFindMany.mockResolvedValueOnce([makeReservation()]);

    const response = await request(app.getHttpServer())
      .get('/reservations')
      .query({ rideId: 'ride-1' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(reservationFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { ride: { driverId: 'driver-1' }, rideId: 'ride-1' },
    }));
    expect(response.body[0]).toMatchObject({
      id: 'reservation-1',
      status: 'pending',
      passenger: { nickname: 'Passenger One' },
    });
  });

  it('lets a driver complete an approved reservation and send transfer instructions to chat only', async () => {
    const token = await loginAs(makeUser('driver'));
    reservationFindUnique
      .mockResolvedValueOnce(makeReservation({ status: 'approved', settlements: [makeSettlement()] }))
      .mockResolvedValueOnce(makeReservation({ status: 'completed', settlements: [makeSettlement()] }));
    reservationUpdate.mockResolvedValueOnce(makeReservation({ status: 'completed', settlements: [makeSettlement()] }));
    chatRoomFindFirst.mockResolvedValueOnce(chatRoom);
    chatRoomFindUnique.mockResolvedValueOnce({ ...chatRoom, ride: makeRide(), messages: [] });
    chatMessageCreate.mockResolvedValueOnce({
      id: 'message-transfer',
      roomId: 'room-1',
      senderId: 'driver-1',
      type: 'other',
      text: '차주 송금 안내: 예금주 이도윤 / 은행 카풀은행 / 계좌 123-456-7890. 송금은 KAPOOL 앱 밖에서 차주와 직접 확인해 주세요.',
      createdAt,
      sender: makeUser('driver'),
    });

    const response = await request(app.getHttpServer())
      .patch('/reservations/reservation-1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'completed',
        transferInstruction:
          '  차주 송금 안내: 예금주 이도윤 / 은행 카풀은행 / 계좌 123-456-7890. 송금은 KAPOOL 앱 밖에서 차주와 직접 확인해 주세요.  ',
      })
      .expect(200);

    expect(reservationUpdate).toHaveBeenCalledWith({
      where: { id: 'reservation-1' },
      data: { status: 'completed' },
    });
    expect(chatMessageCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        roomId: 'room-1',
        senderId: 'driver-1',
        type: 'other',
        text: '차주 송금 안내: 예금주 이도윤 / 은행 카풀은행 / 계좌 123-456-7890. 송금은 KAPOOL 앱 밖에서 차주와 직접 확인해 주세요.',
      },
    }));
    expect(settlementCreate).not.toHaveBeenCalled();
    expect(settlementUpdate).not.toHaveBeenCalled();
    expect(response.body.status).toBe('completed');
  });

  it('denies passengers from completing a reservation or sending transfer instructions', async () => {
    const token = await loginAs(makeUser('passenger'));
    reservationFindUnique.mockResolvedValueOnce(makeReservation({ status: 'approved', settlements: [makeSettlement()] }));

    await request(app.getHttpServer())
      .patch('/reservations/reservation-1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed', transferInstruction: 'Unauthorized transfer instruction.' })
      .expect(403);

    expect(reservationUpdate).not.toHaveBeenCalled();
    expect(chatMessageCreate).not.toHaveBeenCalled();
  });

  it.each(['pending', 'rejected', 'cancelled'] as const)(
    'rejects completion from %s reservations without chat or payment side effects',
    async (status) => {
      const token = await loginAs(makeUser('driver'));
      reservationFindUnique.mockResolvedValueOnce(makeReservation({ status }));

      await request(app.getHttpServer())
        .patch('/reservations/reservation-1/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'completed', transferInstruction: 'Transfer after completion.' })
        .expect(400);

      expect(reservationUpdate).not.toHaveBeenCalled();
      expect(chatMessageCreate).not.toHaveBeenCalled();
      expect(settlementCreate).not.toHaveBeenCalled();
      expect(settlementUpdate).not.toHaveBeenCalled();
    },
  );

  it('lets a passenger cancel an eligible own reservation', async () => {
    const token = await loginAs(makeUser('passenger'));
    reservationFindUnique
      .mockResolvedValueOnce(makeReservation())
      .mockResolvedValueOnce(makeReservation({ status: 'cancelled' }));

    const response = await request(app.getHttpServer())
      .patch('/reservations/reservation-1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'cancelled' })
      .expect(200);

    expect(response.body.status).toBe('cancelled');
  });

  it('lets an approved participant update the internal manual payment status endpoint', async () => {
    const token = await loginAs(makeUser('driver'));
    reservationFindUnique
      .mockResolvedValueOnce(makeReservation({ status: 'approved', settlements: [makeSettlement()] }))
      .mockResolvedValueOnce(makeReservation({ status: 'approved', settlements: [makeSettlement({ status: 'paid' })] }));
    settlementFindFirst.mockResolvedValueOnce(makeSettlement());
    settlementUpdate.mockResolvedValueOnce(makeSettlement({ status: 'paid' }));

    const response = await request(app.getHttpServer())
      .patch('/reservations/reservation-1/payment')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'paid', note: 'Confirmed manually.' })
      .expect(200);

    expect(settlementUpdate).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: { status: 'paid', note: 'Confirmed manually.' },
    });
    expect(response.body.payment.status).toBe('paid');
  });

  it('rejects invalid reservation transitions', async () => {
    const token = await loginAs(makeUser('driver'));
    reservationFindUnique.mockResolvedValueOnce(makeReservation({ status: 'completed' }));

    await request(app.getHttpServer())
      .patch('/reservations/reservation-1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'pending' })
      .expect(400);
  });

  it('does not expose approved-only info for an unapproved passenger reservation', async () => {
    const token = await loginAs(makeUser('passenger'));
    reservationFindUnique.mockResolvedValueOnce(makeReservation({ status: 'pending' }));

    const response = await request(app.getHttpServer())
      .get('/reservations/reservation-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.approvedInfo).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('010-0000');
    expect(JSON.stringify(response.body)).not.toContain('1205');
  });

  it('shows approved passengers only allowed partial vehicle info and internal payment metadata', async () => {
    const token = await loginAs(makeUser('passenger'));
    reservationFindUnique.mockResolvedValueOnce(makeReservation({ status: 'approved', settlements: [makeSettlement()] }));

    const response = await request(app.getHttpServer())
      .get('/reservations/reservation-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.approvedInfo).toMatchObject({
      driver: { nickname: 'Driver One', department: 'Business Administration' },
      vehicle: { model: 'Hyundai Avante', color: 'White', capacity: 4 },
    });
    expect(response.body.payment.status).toBe('unpaid');
    expect(JSON.stringify(response.body)).not.toContain('010-0000');
    expect(JSON.stringify(response.body)).not.toContain('1205');
  });

  it('denies unrelated users private reservation access', async () => {
    const token = await loginAs(makeUser('passenger', 'passenger-2'));
    reservationFindUnique.mockResolvedValueOnce(makeReservation());

    await request(app.getHttpServer())
      .get('/reservations/reservation-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});
