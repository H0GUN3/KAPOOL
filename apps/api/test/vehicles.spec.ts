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
  department: 'Computer Engineering',
  phone: null,
  homeRegion: 'Gunsan',
  createdAt,
  updatedAt,
});

const makeUser = (role: 'passenger' | 'driver' | 'admin') => {
  const id = `${role}-1`;
  const label = role.charAt(0).toUpperCase() + role.slice(1);

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
    profile: makeProfile(id, label),
  };
};

const makeVehicle = (overrides: Record<string, unknown> = {}) => ({
  id: 'vehicle-1',
  ownerId: 'driver-1',
  model: 'Hyundai Avante',
  color: 'White',
  capacity: 4,
  plateLastFour: '1205',
  photoDataUrl: 'data:image/png;base64,a2Fwb29s',
  createdAt,
  updatedAt,
  ...overrides,
});

describe('Vehicle information endpoints', () => {
  let app: INestApplication;
  let userFindUnique: jest.Mock;
  let vehicleFindFirst: jest.Mock;
  let vehicleCreate: jest.Mock;
  let vehicleUpdate: jest.Mock;

  beforeAll(async () => {
    userFindUnique = jest.fn();
    vehicleFindFirst = jest.fn();
    vehicleCreate = jest.fn();
    vehicleUpdate = jest.fn();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $disconnect: jest.fn(),
        $queryRaw: jest.fn(),
        user: { findUnique: userFindUnique },
        vehicle: {
          findFirst: vehicleFindFirst,
          create: vehicleCreate,
          update: vehicleUpdate,
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    userFindUnique.mockReset();
    vehicleFindFirst.mockReset();
    vehicleCreate.mockReset();
    vehicleUpdate.mockReset();
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

  it('returns the current user vehicle including owner-only photo and plate fields', async () => {
    const token = await loginAs('driver');
    vehicleFindFirst.mockResolvedValueOnce(makeVehicle());

    const response = await request(app.getHttpServer())
      .get('/vehicles/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(vehicleFindFirst).toHaveBeenCalledWith({
      where: { ownerId: 'driver-1' },
      orderBy: { updatedAt: 'desc' },
    });
    expect(response.body).toMatchObject({
      id: 'vehicle-1',
      ownerId: 'driver-1',
      model: 'Hyundai Avante',
      color: 'White',
      capacity: 4,
      plateLastFour: '1205',
      photoDataUrl: 'data:image/png;base64,a2Fwb29s',
    });
  });

  it('creates a vehicle when the user does not have one yet', async () => {
    const token = await loginAs('passenger');
    vehicleFindFirst.mockResolvedValueOnce(null);
    vehicleCreate.mockResolvedValueOnce(makeVehicle({ ownerId: 'passenger-1', model: 'Kia Ray', plateLastFour: null, photoDataUrl: null }));

    const response = await request(app.getHttpServer())
      .put('/vehicles/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ model: ' Kia Ray ', color: ' Mint ', capacity: 4 })
      .expect(200);

    expect(vehicleCreate).toHaveBeenCalledWith({
      data: {
        ownerId: 'passenger-1',
        model: 'Kia Ray',
        color: 'Mint',
        capacity: 4,
        plateLastFour: null,
        photoDataUrl: null,
      },
    });
    expect(response.body).toMatchObject({ ownerId: 'passenger-1', model: 'Kia Ray' });
  });

  it('updates an existing vehicle with a validated photo data url', async () => {
    const token = await loginAs('driver');
    vehicleFindFirst.mockResolvedValueOnce(makeVehicle());
    vehicleUpdate.mockResolvedValueOnce(makeVehicle({ color: 'Black', photoDataUrl: 'data:image/webp;base64,a2Fwb29s' }));

    await request(app.getHttpServer())
      .put('/vehicles/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ model: 'Hyundai Avante', color: 'Black', capacity: 4, plateLastFour: '1205', photoDataUrl: 'data:image/webp;base64,a2Fwb29s' })
      .expect(200);

    expect(vehicleUpdate).toHaveBeenCalledWith({
      where: { id: 'vehicle-1' },
      data: {
        model: 'Hyundai Avante',
        color: 'Black',
        capacity: 4,
        plateLastFour: '1205',
        photoDataUrl: 'data:image/webp;base64,a2Fwb29s',
      },
    });
  });

  it('rejects admin vehicle management and invalid photo payloads', async () => {
    const adminToken = await loginAs('admin');

    await request(app.getHttpServer())
      .get('/vehicles/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);

    const passengerToken = await loginAs('passenger');

    await request(app.getHttpServer())
      .put('/vehicles/me')
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({ model: 'Ray', color: 'Mint', capacity: 4, photoDataUrl: 'not-an-image' })
      .expect(400);

    expect(vehicleCreate).not.toHaveBeenCalled();
    expect(vehicleUpdate).not.toHaveBeenCalled();
  });
});
