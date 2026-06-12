import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { hashLocalDemoPassword } from '../src/auth/password';
import { PrismaService } from '../src/prisma/prisma.service';

const createdAt = new Date('2026-01-01T00:00:00.000Z');
const updatedAt = new Date('2026-01-02T00:00:00.000Z');

const makeProfile = (userId: string, label: string, phone: string) => ({
  id: `${userId}-profile`,
  userId,
  name: `Demo ${label}`,
  nickname: `${label} One`,
  schoolEmail: `${userId}@kapool.local`,
  department: label === 'Driver' ? 'Business Administration' : 'Computer Engineering',
  phone,
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
    profile: makeProfile(id, label, role === 'admin' ? '010-0000-3003' : '010-0000-1001'),
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
  waypoints: ['팔복동'],
  createdAt,
  updatedAt,
  driver: makeUser('driver'),
  vehicle,
};

const reservation = {
  id: 'reservation-1',
  rideId: 'ride-1',
  passengerId: 'passenger-1',
  status: 'approved',
  seatsRequested: 1,
  message: 'I can meet at the main gate.',
  createdAt,
  updatedAt,
  ride,
  passenger: makeUser('passenger'),
  settlements: [],
};

const chatRoom = {
  id: 'room-1',
  rideId: 'ride-1',
  reservationId: 'reservation-1',
  participantIds: ['driver-1', 'passenger-1'],
  createdAt,
  updatedAt,
};

const paymentRecord = {
  id: 'payment-1',
  rideId: 'ride-1',
  reservationId: 'reservation-1',
  payerId: 'passenger-1',
  receiverId: 'driver-1',
  amount: 5000,
  status: 'unpaid',
  note: 'Cash settlement expected after arrival.',
  createdAt,
  updatedAt,
};

const report = {
  id: 'report-1',
  type: 'inappropriate_chat',
  status: 'open',
  reporterId: 'passenger-1',
  rideId: 'ride-1',
  reservationId: 'reservation-1',
  chatRoomId: 'room-1',
  paymentRecordId: null,
  subjectUserId: 'driver-1',
  description: '채팅에서 부적절한 표현이 있었습니다.',
  adminNote: null,
  createdAt,
  updatedAt,
};

const reportDetail = {
  ...report,
  reporter: makeUser('passenger'),
  subjectUser: makeUser('driver'),
  ride,
  reservation,
  chatRoom: {
    ...chatRoom,
    messages: [
      {
        id: 'message-1',
        roomId: 'room-1',
        senderId: 'driver-1',
        type: 'other',
        text: 'Please be at the main gate five minutes early.',
        createdAt,
        sender: makeUser('driver'),
      },
    ],
  },
  paymentRecord,
  messages: [],
};

describe('Report creation and admin report review', () => {
  let app: INestApplication;
  let userFindUnique: jest.Mock;
  let reportCreate: jest.Mock;
  let reportFindMany: jest.Mock;
  let reportFindUnique: jest.Mock;
  let reportUpdate: jest.Mock;
  let reportMessageCreate: jest.Mock;
  let chatRoomFindUnique: jest.Mock;
  let chatRoomCreate: jest.Mock;
  let chatRoomUpdate: jest.Mock;
  let chatMessageCreate: jest.Mock;
  let reservationFindUnique: jest.Mock;
  let rideFindUnique: jest.Mock;
  let settlementFindUnique: jest.Mock;

  beforeAll(async () => {
    userFindUnique = jest.fn();
    reportCreate = jest.fn();
    reportFindMany = jest.fn();
    reportFindUnique = jest.fn();
    reportUpdate = jest.fn();
    reportMessageCreate = jest.fn();
    chatRoomFindUnique = jest.fn();
    chatRoomCreate = jest.fn();
    chatRoomUpdate = jest.fn();
    chatMessageCreate = jest.fn();
    reservationFindUnique = jest.fn();
    rideFindUnique = jest.fn();
    settlementFindUnique = jest.fn();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({
        $disconnect: jest.fn(),
        $queryRaw: jest.fn(),
        user: { findUnique: userFindUnique },
        report: { create: reportCreate, findMany: reportFindMany, findUnique: reportFindUnique, update: reportUpdate },
        reportMessage: { create: reportMessageCreate },
        chatRoom: { findUnique: chatRoomFindUnique, create: chatRoomCreate, update: chatRoomUpdate },
        chatMessage: { create: chatMessageCreate },
        reservation: { findUnique: reservationFindUnique },
        ride: { findUnique: rideFindUnique },
        settlementRecord: { findUnique: settlementFindUnique },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    userFindUnique.mockReset();
    reportCreate.mockReset();
    reportFindMany.mockReset();
    reportFindUnique.mockReset();
    reportUpdate.mockReset();
    reportMessageCreate.mockReset();
    chatRoomFindUnique.mockReset();
    chatRoomCreate.mockReset();
    chatRoomUpdate.mockReset();
    chatMessageCreate.mockReset();
    reservationFindUnique.mockReset();
    rideFindUnique.mockReset();
    settlementFindUnique.mockReset();
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

  it('creates a report from an authorized chat context without private leaks', async () => {
    const token = await loginAs(makeUser('passenger'));
    chatRoomFindUnique.mockResolvedValueOnce(chatRoom);
    reservationFindUnique.mockResolvedValueOnce(reservation);
    rideFindUnique.mockResolvedValueOnce({ ...ride, reservations: [reservation] });
    reportCreate.mockResolvedValueOnce(report);

    const response = await request(app.getHttpServer())
      .post('/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'inappropriate_chat',
        rideId: 'ride-1',
        reservationId: 'reservation-1',
        chatRoomId: 'room-1',
        subjectUserId: 'driver-1',
        description: '채팅에서 부적절한 표현이 있었습니다.',
      })
      .expect(201);

    expect(reportCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ reporterId: 'passenger-1', chatRoomId: 'room-1' }),
    }));
    expect(response.body).toMatchObject({ id: 'report-1', type: 'inappropriate_chat', status: 'open' });
    expect(JSON.stringify(response.body)).not.toContain('010-0000');
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain('1205');
  });

  it('denies reports whose subject is unrelated to the authorized context', async () => {
    const token = await loginAs(makeUser('passenger'));
    chatRoomFindUnique.mockResolvedValueOnce(chatRoom);
    reservationFindUnique.mockResolvedValueOnce(reservation);
    rideFindUnique.mockResolvedValueOnce({ ...ride, reservations: [reservation] });

    await request(app.getHttpServer())
      .post('/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'inappropriate_chat',
        rideId: 'ride-1',
        reservationId: 'reservation-1',
        chatRoomId: 'room-1',
        subjectUserId: 'unrelated-user',
        description: '채팅에서 부적절한 표현이 있었습니다.',
      })
      .expect(403);

    expect(reportCreate).not.toHaveBeenCalled();
  });

  it('denies non-admin access to admin report list', async () => {
    const token = await loginAs(makeUser('passenger'));

    await request(app.getHttpServer())
      .get('/admin/reports')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('lets admins list, inspect, and update report status with scoped context only', async () => {
    const token = await loginAs(makeUser('admin'));
    reportFindMany.mockResolvedValueOnce([{ ...report, reporter: makeUser('passenger'), subjectUser: makeUser('driver'), ride }]);
    const resolvedReportDetail = {
      ...reportDetail,
      status: 'resolved',
      adminNote: '처리 완료',
    };
    reportFindUnique
      .mockResolvedValueOnce(reportDetail)
      .mockResolvedValueOnce(reportDetail)
      .mockResolvedValueOnce(resolvedReportDetail);
    reportUpdate.mockResolvedValueOnce({ ...report, status: 'resolved', adminNote: '처리 완료' });

    const listResponse = await request(app.getHttpServer())
      .get('/admin/reports')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const detailResponse = await request(app.getHttpServer())
      .get('/admin/reports/report-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const updateResponse = await request(app.getHttpServer())
      .patch('/admin/reports/report-1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'resolved', adminNote: '처리 완료' })
      .expect(200);

    expect(listResponse.body[0]).toMatchObject({ id: 'report-1', reporter: { nickname: 'Passenger One' } });
    expect(detailResponse.body).toMatchObject({
      report: { id: 'report-1' },
      chatRoom: { id: 'room-1' },
      chatMessages: [expect.objectContaining({ roomId: 'room-1', text: 'Please be at the main gate five minutes early.' })],
    });
    expect(updateResponse.body.report).toMatchObject({ status: 'resolved', adminNote: '처리 완료' });
    expect(reportUpdate).toHaveBeenCalledWith({
      where: { id: 'report-1' },
      data: { status: 'resolved', adminNote: '처리 완료' },
    });

    const combined = JSON.stringify([listResponse.body, detailResponse.body, updateResponse.body]);
    expect(combined).toContain('010-0000-1001');
    expect(combined).not.toContain('passwordHash');
    expect(combined).not.toContain('1205');
    expect(combined).not.toContain('plateLastFour');
    expect(detailResponse.body.chatMessages.every((message: { roomId: string }) => message.roomId === 'room-1')).toBe(true);
  });

  it('lets admins append operation messages to a report', async () => {
    const token = await loginAs(makeUser('admin'));
    const messageDetail = {
      ...reportDetail,
      messages: [
        {
          id: 'operation-message-1',
          reportId: 'report-1',
          senderId: 'admin-1',
          text: '신고 내용을 확인했습니다. 추가 확인이 필요하면 답변해 주세요.',
          createdAt,
          sender: makeUser('admin'),
        },
      ],
    };
    reportFindUnique
      .mockResolvedValueOnce(reportDetail)
      .mockResolvedValueOnce(messageDetail);
    reportMessageCreate.mockResolvedValueOnce(messageDetail.messages[0]);
    chatRoomCreate.mockResolvedValueOnce({ id: 'operation-room-1', participantIds: ['passenger-1', 'admin-1'] });
    reportUpdate.mockResolvedValueOnce({ ...report, operationChatRoomId: 'operation-room-1' });
    chatMessageCreate.mockResolvedValueOnce({ id: 'chat-message-1' });

    const response = await request(app.getHttpServer())
      .post('/admin/reports/report-1/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: '신고 내용을 확인했습니다. 추가 확인이 필요하면 답변해 주세요.' })
      .expect(201);

    expect(reportMessageCreate).toHaveBeenCalledWith({
      data: {
        reportId: 'report-1',
        senderId: 'admin-1',
        text: '신고 내용을 확인했습니다. 추가 확인이 필요하면 답변해 주세요.',
      },
    });
    expect(chatRoomCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ participantIds: ['passenger-1', 'admin-1'] }),
    }));
    expect(reportUpdate).toHaveBeenCalledWith({
      where: { id: 'report-1' },
      data: { operationChatRoomId: 'operation-room-1' },
    });
    expect(chatMessageCreate).toHaveBeenCalledWith({
      data: {
        roomId: 'operation-room-1',
        senderId: 'admin-1',
        type: 'other',
        text: '신고 내용을 확인했습니다. 추가 확인이 필요하면 답변해 주세요.',
      },
    });
    expect(response.body.operationMessages).toEqual([
      expect.objectContaining({ reportId: 'report-1', senderName: 'Admin One' }),
    ]);
  });

  it('has no unrestricted admin chat browsing endpoint', async () => {
    const token = await loginAs(makeUser('admin'));

    await request(app.getHttpServer())
      .get('/admin/chat/rooms')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
