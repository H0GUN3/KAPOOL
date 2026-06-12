import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { hashLocalDemoPassword } from '../src/auth/password';
import { PrismaService } from '../src/prisma/prisma.service';

const createdAt = new Date('2026-01-01T00:00:00.000Z');

const makeProfile = (userId: string, roleLabel: string) => ({
  id: `${userId}-profile`,
  userId,
  name: `Demo ${roleLabel}`,
  nickname: `${roleLabel} One`,
  schoolEmail: `${roleLabel.toLowerCase()}@kapool.local`,
  department: roleLabel === 'Driver' ? 'Business Administration' : 'Computer Engineering',
  phone: '010-0000-0000',
    homeRegion: 'Gunsan',
    photoDataUrl: roleLabel === 'Driver' ? 'data:image/jpeg;base64,ZHJpdmVy' : null,
    createdAt,
  updatedAt: createdAt,
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
    updatedAt: createdAt,
    profile: makeProfile(id, roleLabel),
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
  updatedAt: createdAt,
  driver: makeUser('driver'),
  vehicle,
  ...overrides,
});

describe('Ride endpoints', () => {
  let app: INestApplication;
  let userFindUnique: jest.Mock;
  let rideFindMany: jest.Mock;
  let rideFindUnique: jest.Mock;
  let rideCreate: jest.Mock;
  let rideUpdateMany: jest.Mock;
  let vehicleCreate: jest.Mock;

  beforeAll(async () => {
    userFindUnique = jest.fn();
    rideFindMany = jest.fn();
    rideFindUnique = jest.fn();
    rideCreate = jest.fn();
    rideUpdateMany = jest.fn();
    vehicleCreate = jest.fn();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $disconnect: jest.fn(),
        $queryRaw: jest.fn(),
        user: { findUnique: userFindUnique },
        ride: {
          findMany: rideFindMany,
          findUnique: rideFindUnique,
          create: rideCreate,
          updateMany: rideUpdateMany,
        },
        vehicle: { create: vehicleCreate },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    userFindUnique.mockReset();
    rideFindMany.mockReset();
    rideFindUnique.mockReset();
    rideCreate.mockReset();
    rideUpdateMany.mockReset();
    rideUpdateMany.mockResolvedValue({ count: 0 });
    vehicleCreate.mockReset();
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

  it('requires authentication for the ride list', async () => {
    await request(app.getHttpServer()).get('/rides').expect(401);
  });

  it('returns a public seeded ride list without private fields', async () => {
    const token = await loginAs('passenger');
    rideFindMany.mockResolvedValueOnce([makeRide()]);

    const response = await request(app.getHttpServer())
      .get('/rides')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: 'ride-1',
      from: '전주',
      to: '군산대',
      fare: 5000,
      driver: 'Driver One',
      driverDepartment: 'Business Administration',
      driverPhotoDataUrl: 'data:image/jpeg;base64,ZHJpdmVy',
      vehicle: {
        model: 'Hyundai Avante',
        color: 'White',
        capacity: 4,
      },
    });
    expect(rideFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: { not: 'closed' } },
    }));
    expect(JSON.stringify(response.body)).not.toContain('phone');
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain('1205');
  });

  it('closes expired open and full rides before returning the ride list', async () => {
    const token = await loginAs('passenger');
    rideFindMany.mockResolvedValueOnce([
      makeRide({
        id: 'expired-ride',
        departureTime: new Date('2026-01-01T09:00:00.000Z'),
        status: 'closed',
      }),
    ]);

    const response = await request(app.getHttpServer())
      .get('/rides')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(rideUpdateMany).toHaveBeenCalledWith({
      where: {
        departureTime: { lt: expect.any(Date) },
        status: { in: ['open', 'full'] },
      },
      data: { status: 'closed' },
    });
    expect(response.body[0]).toMatchObject({ id: 'expired-ride', status: 'closed' });
  });

  it('returns ride detail by id', async () => {
    const token = await loginAs('passenger');
    rideFindUnique.mockResolvedValueOnce(makeRide({ id: 'ride-detail' }));

    const response = await request(app.getHttpServer())
      .get('/rides/ride-detail')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.id).toBe('ride-detail');
    expect(response.body.waypoints).toEqual(['팔복동', '개정IC']);
  });

  it('closes expired rides before returning ride detail', async () => {
    const token = await loginAs('passenger');
    rideFindUnique.mockResolvedValueOnce(makeRide({ id: 'expired-detail', status: 'closed' }));

    const response = await request(app.getHttpServer())
      .get('/rides/expired-detail')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(rideUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'closed' } }));
    expect(response.body).toMatchObject({ id: 'expired-detail', status: 'closed' });
  });

  it('projects current driver profile fields on ride detail', async () => {
    const token = await loginAs('passenger');
    rideFindUnique.mockResolvedValueOnce(makeRide({
      id: 'ride-current-driver',
      driver: {
        ...makeUser('driver'),
        profile: {
          ...makeProfile('driver-1', 'Driver'),
          nickname: 'Updated Driver',
          department: 'Future Mobility',
          photoDataUrl: 'data:image/webp;base64,Y3VycmVudA==',
        },
      },
    }));

    const response = await request(app.getHttpServer())
      .get('/rides/ride-current-driver')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      driver: 'Updated Driver',
      driverDepartment: 'Future Mobility',
      driverPhotoDataUrl: 'data:image/webp;base64,Y3VycmVudA==',
    });
  });

  it('returns 404 for a missing ride detail', async () => {
    const token = await loginAs('passenger');
    rideFindUnique.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .get('/rides/missing')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('forbids passenger ride creation', async () => {
    const token = await loginAs('passenger');

    await request(app.getHttpServer())
      .post('/rides')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(403);
  });

  it('lets a driver create a ride with fixed region fare and public vehicle summary', async () => {
    const token = await loginAs('driver');
    vehicleCreate.mockResolvedValueOnce({ ...vehicle, id: 'new-vehicle', plateLastFour: '1234' });
    rideCreate.mockResolvedValueOnce(
      makeRide({
        id: 'new-ride',
        from: '익산',
        fare: 4000,
        vehicle: { ...vehicle, id: 'new-vehicle', plateLastFour: '1234' },
      }),
    );

    const response = await request(app.getHttpServer())
      .post('/rides')
      .set('Authorization', `Bearer ${token}`)
      .send({
        from: '익산',
        to: '군산대',
        departureTime: '2026-06-03T08:30:00.000Z',
        seats: 3,
        fareRegion: '익산',
        waypoints: ['익산역'],
        vehicle: {
          model: 'Kia K5',
          color: 'Black',
          capacity: 4,
          plateLastFour: '1234',
        },
      })
      .expect(201);

    expect(vehicleCreate).toHaveBeenCalledWith({
      data: {
        ownerId: 'driver-1',
        model: 'Kia K5',
        color: 'Black',
        capacity: 4,
        plateLastFour: '1234',
      },
    });
    expect(rideCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          driverId: 'driver-1',
          fare: 4000,
          vehicleId: 'new-vehicle',
          status: 'open',
        }),
      }),
    );
    expect(response.body).toMatchObject({ id: 'new-ride', fare: 4000 });
    expect(JSON.stringify(response.body)).not.toContain('1234');
  });

  it('rejects the 기타 fare region for MVP creation', async () => {
    const token = await loginAs('driver');

    await request(app.getHttpServer())
      .post('/rides')
      .set('Authorization', `Bearer ${token}`)
      .send({
        from: '기타',
        to: '군산대',
        departureTime: '2026-06-03T08:30:00.000Z',
        seats: 3,
        fareRegion: '기타',
        vehicle: {
          model: 'Kia K5',
          color: 'Black',
          capacity: 4,
        },
      })
      .expect(400);
  });
});
