import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { hashLocalDemoPassword } from '../src/auth/password';
import { PrismaService } from '../src/prisma/prisma.service';

const createdAt = new Date('2026-01-01T00:00:00.000Z');
const updatedAt = new Date('2026-01-01T00:05:00.000Z');

const makeProfile = (userId: string, roleLabel: string) => ({
  id: `${userId}-profile`,
  userId,
  name: `Demo ${roleLabel}`,
  nickname: `${roleLabel} One`,
  schoolEmail: `${userId}@kapool.local`,
  department: roleLabel === 'Driver' ? 'Business Administration' : 'Computer Engineering',
  phone: '010-0000-0000',
  homeRegion: 'Gunsan',
  createdAt,
  updatedAt,
});

const makeUser = (role: 'passenger' | 'driver' | 'admin') => {
  const id = `${role}-1`;
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  return {
    id,
    email: `${role}@kapool.local`,
    passwordHash: hashLocalDemoPassword('kapool-local-demo'),
    role,
    isAdmin: role === 'admin',
    isSuspended: false,
    adminNote: null,
    createdAt,
    updatedAt,
    profile: makeProfile(id, roleLabel),
  };
};

const makeRideRequest = (overrides: Record<string, unknown> = {}) => ({
  id: 'ride-request-1',
  passengerId: 'passenger-1',
  from: '전주 효자동',
  to: '군산대학교 정문',
  time: '2026-06-12 08:20',
  content: '금요일 1교시 전에 도착할 수 있는 카풀을 찾습니다.',
  createdAt,
  updatedAt,
  passwordHash: 'must-not-leak',
  passenger: makeUser('passenger'),
  ...overrides,
});

describe('Ride request endpoints', () => {
  let app: INestApplication;
  let userFindUnique: jest.Mock;
  let rideRequestFindMany: jest.Mock;
  let rideRequestCreate: jest.Mock;
  let chatRoomFindFirst: jest.Mock;
  let chatRoomCreate: jest.Mock;
  let chatRoomUpdate: jest.Mock;

  beforeAll(async () => {
    userFindUnique = jest.fn();
    rideRequestFindMany = jest.fn();
    rideRequestCreate = jest.fn();
    chatRoomFindFirst = jest.fn();
    chatRoomCreate = jest.fn();
    chatRoomUpdate = jest.fn();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $disconnect: jest.fn(),
        $queryRaw: jest.fn(),
        user: { findUnique: userFindUnique },
        rideRequest: {
          findMany: rideRequestFindMany,
          create: rideRequestCreate,
        },
        chatRoom: {
          findFirst: chatRoomFindFirst,
          create: chatRoomCreate,
          update: chatRoomUpdate,
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    userFindUnique.mockReset();
    rideRequestFindMany.mockReset();
    rideRequestCreate.mockReset();
    chatRoomFindFirst.mockReset();
    chatRoomCreate.mockReset();
    chatRoomUpdate.mockReset();
  });

  afterAll(async () => {
    await app?.close();
  });

  async function loginAs(role: 'passenger' | 'driver' | 'admin') {
    userFindUnique.mockResolvedValueOnce(makeUser(role));

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `${role}@kapool.local`, password: 'kapool-local-demo' })
      .expect(201);

    return response.body.accessToken as string;
  }

  it('requires authentication for the ride request list', async () => {
    await request(app.getHttpServer()).get('/ride-requests').expect(401);
  });

  it('returns an authenticated public ride request list without private fields', async () => {
    const token = await loginAs('driver');
    rideRequestFindMany.mockResolvedValueOnce([makeRideRequest()]);

    const response = await request(app.getHttpServer())
      .get('/ride-requests')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(rideRequestFindMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
    expect(response.body).toEqual([
      {
        id: 'ride-request-1',
        passengerId: 'passenger-1',
        from: '전주 효자동',
        to: '군산대학교 정문',
        time: '2026-06-12 08:20',
        content: '금요일 1교시 전에 도착할 수 있는 카풀을 찾습니다.',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain('010-0000');
  });

  it('lets passengers create a trimmed public ride request', async () => {
    const token = await loginAs('passenger');
    rideRequestCreate.mockResolvedValueOnce(makeRideRequest({
      id: 'ride-request-new',
      from: '익산 영등동',
      to: '군산대학교 황룡도서관',
      time: '2026-06-12 09:00',
      content: '도서관 앞 하차를 희망합니다.',
    }));
    chatRoomFindFirst.mockResolvedValueOnce(null);
    chatRoomCreate.mockResolvedValueOnce({
      id: 'room-request-new',
      rideRequestId: 'ride-request-new',
      participantIds: ['passenger-1'],
      createdAt,
      updatedAt,
    });

    const response = await request(app.getHttpServer())
      .post('/ride-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        from: ' 익산 영등동 ',
        to: ' 군산대학교 황룡도서관 ',
        time: ' 2026-06-12 09:00 ',
        content: ' 도서관 앞 하차를 희망합니다. ',
      })
      .expect(201);

    expect(rideRequestCreate).toHaveBeenCalledWith({
      data: {
        passengerId: 'passenger-1',
        from: '익산 영등동',
        to: '군산대학교 황룡도서관',
        time: '2026-06-12 09:00',
        content: '도서관 앞 하차를 희망합니다.',
      },
    });
    expect(chatRoomCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        rideRequestId: 'ride-request-new',
        participantIds: ['passenger-1'],
      }),
    }));
    expect(response.body).toMatchObject({
      id: 'ride-request-new',
      passengerId: 'passenger-1',
      from: '익산 영등동',
      to: '군산대학교 황룡도서관',
      time: '2026-06-12 09:00',
      content: '도서관 앞 하차를 희망합니다.',
    });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });

  it('lets drivers create a trimmed public ride request', async () => {
    const token = await loginAs('driver');
    rideRequestCreate.mockResolvedValueOnce(makeRideRequest({
      id: 'ride-request-driver',
      passengerId: 'driver-1',
      from: '군산 수송동',
      to: '군산대학교 공대 5호관',
      time: '2026-06-12 18:30',
      content: '퇴근 시간대에 함께 탈 차를 찾습니다.',
    }));
    chatRoomFindFirst.mockResolvedValueOnce(null);
    chatRoomCreate.mockResolvedValueOnce({
      id: 'room-request-driver',
      rideRequestId: 'ride-request-driver',
      participantIds: ['driver-1'],
      createdAt,
      updatedAt,
    });

    const response = await request(app.getHttpServer())
      .post('/ride-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        from: ' 군산 수송동 ',
        to: ' 군산대학교 공대 5호관 ',
        time: ' 2026-06-12 18:30 ',
        content: ' 퇴근 시간대에 함께 탈 차를 찾습니다. ',
      })
      .expect(201);

    expect(rideRequestCreate).toHaveBeenCalledWith({
      data: {
        passengerId: 'driver-1',
        from: '군산 수송동',
        to: '군산대학교 공대 5호관',
        time: '2026-06-12 18:30',
        content: '퇴근 시간대에 함께 탈 차를 찾습니다.',
      },
    });
    expect(chatRoomCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        rideRequestId: 'ride-request-driver',
        participantIds: ['driver-1'],
      }),
    }));
    expect(response.body).toMatchObject({
      id: 'ride-request-driver',
      passengerId: 'driver-1',
      from: '군산 수송동',
      to: '군산대학교 공대 5호관',
      time: '2026-06-12 18:30',
      content: '퇴근 시간대에 함께 탈 차를 찾습니다.',
    });
  });

  it('forbids admins from creating ride requests', async () => {
    const token = await loginAs('admin');

    await request(app.getHttpServer())
      .post('/ride-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ from: '전주', to: '군산대', time: '2026-06-12 08:20', content: '요청합니다.' })
      .expect(403);

    expect(rideRequestCreate).not.toHaveBeenCalled();
  });

  it('rejects invalid passenger posts before creating a record', async () => {
    const token = await loginAs('passenger');

    await request(app.getHttpServer())
      .post('/ride-requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ from: ' ', to: '군산대', time: '2026-06-12 08:20', content: '요청합니다.' })
      .expect(400);

    expect(rideRequestCreate).not.toHaveBeenCalled();
  });
});
