import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { hashLocalDemoPassword } from '../src/auth/password';
import { PrismaService } from '../src/prisma/prisma.service';

const baseProfile = {
  id: 'profile-1',
  userId: 'passenger-1',
  name: 'Demo Passenger',
  nickname: 'Passenger One',
  schoolEmail: 'passenger@kapool.local',
  department: 'Computer Engineering',
  phone: '010-0000-1001',
  homeRegion: 'Gunsan',
  photoDataUrl: 'data:image/png;base64,cHJvZmlsZQ==',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'passenger-1',
  email: 'passenger@kapool.local',
  passwordHash: hashLocalDemoPassword('kapool-local-demo'),
  role: 'passenger',
  isAdmin: false,
  isSuspended: false,
  adminNote: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  profile: baseProfile,
  ...overrides,
});

describe('Auth and access control endpoints', () => {
  let app: INestApplication;
  let findUnique: jest.Mock;
  let userCreate: jest.Mock;
  let profileUpdate: jest.Mock;

  beforeAll(async () => {
    findUnique = jest.fn();
    userCreate = jest.fn();
    profileUpdate = jest.fn();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $disconnect: jest.fn(),
        $queryRaw: jest.fn(),
        user: {
          findUnique,
          create: userCreate,
        },
        profile: {
          update: profileUpdate,
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    findUnique.mockReset();
    userCreate.mockReset();
    profileUpdate.mockReset();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('issues a token for a seeded demo user and excludes private fields', async () => {
    findUnique.mockResolvedValueOnce(makeUser());

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'passenger@kapool.local', password: 'kapool-local-demo' })
      .expect(201);

    expect(response.body.accessToken).toEqual(expect.any(String));
    const [header, payload, signature] = response.body.accessToken.split('.');
    expect([header, payload, signature]).toHaveLength(3);
    expect(JSON.parse(Buffer.from(header, 'base64url').toString('utf8'))).toMatchObject({
      alg: 'HS256',
      typ: 'JWT',
    });
    expect(response.body.tokenType).toBe('Bearer');
    expect(response.body.user).toMatchObject({
      id: 'passenger-1',
      email: 'passenger@kapool.local',
      role: 'passenger',
      isAdmin: false,
      profile: {
        name: 'Demo Passenger',
        nickname: 'Passenger One',
        schoolEmail: 'passenger@kapool.local',
        department: 'Computer Engineering',
        homeRegion: 'Gunsan',
        photoDataUrl: 'data:image/png;base64,cHJvZmlsZQ==',
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain('010-0000-1001');
    expect(JSON.stringify(response.body)).not.toContain('plateLastFour');
  });

  it('rejects invalid credentials', async () => {
    findUnique.mockResolvedValueOnce(makeUser());

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'passenger@kapool.local', password: 'wrong-password' })
      .expect(401);
  });

  it('creates a passenger account and returns an auth session without private fields', async () => {
    const signupProfile = {
      ...baseProfile,
      id: 'profile-signup-passenger',
      userId: 'signup-passenger-1',
      name: 'New Passenger',
      nickname: 'Signup Passenger',
      schoolEmail: 'new-passenger@kunsan.ac.kr',
      department: 'Computer Engineering',
      phone: null,
      homeRegion: 'Iksan',
    };
    userCreate.mockResolvedValueOnce(
      makeUser({
        id: 'signup-passenger-1',
        email: 'new-passenger@kapool.local',
        passwordHash: hashLocalDemoPassword('signup-password'),
        profile: signupProfile,
      }),
    );

    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: ' New-Passenger@kapool.local ',
        password: 'signup-password',
        role: 'passenger',
        name: ' New Passenger ',
        nickname: ' Signup Passenger ',
        schoolEmail: ' New-Passenger@kunsan.ac.kr ',
        department: ' Computer Engineering ',
        homeRegion: ' Iksan ',
      })
      .expect(201);

    expect(userCreate).toHaveBeenCalledWith({
      data: {
        email: 'new-passenger@kapool.local',
        passwordHash: hashLocalDemoPassword('signup-password'),
        role: 'passenger',
        isAdmin: false,
        profile: {
          create: {
            name: 'New Passenger',
            nickname: 'Signup Passenger',
            schoolEmail: 'new-passenger@kunsan.ac.kr',
            department: 'Computer Engineering',
            homeRegion: 'Iksan',
          },
        },
      },
      include: { profile: true },
    });
    expect(response.body.tokenType).toBe('Bearer');
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      id: 'signup-passenger-1',
      email: 'new-passenger@kapool.local',
      role: 'passenger',
      isAdmin: false,
      profile: {
        name: 'New Passenger',
        nickname: 'Signup Passenger',
        schoolEmail: 'new-passenger@kunsan.ac.kr',
        department: 'Computer Engineering',
        homeRegion: 'Iksan',
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain('phone');
    expect(JSON.stringify(response.body)).not.toContain('plateLastFour');
    expect(JSON.stringify(response.body)).not.toContain('bank');
    expect(JSON.stringify(response.body)).not.toContain('account');
  });

  it('creates a driver account without exposing vehicle or settlement details', async () => {
    const signupProfile = {
      ...baseProfile,
      id: 'profile-signup-driver',
      userId: 'signup-driver-1',
      name: 'New Driver',
      nickname: 'Signup Driver',
      schoolEmail: 'new-driver@kunsan.ac.kr',
      department: 'Automotive Engineering',
      phone: '010-9999-8888',
      homeRegion: null,
    };
    userCreate.mockResolvedValueOnce(
      makeUser({
        id: 'signup-driver-1',
        email: 'new-driver@kapool.local',
        role: 'driver',
        profile: signupProfile,
      }),
    );

    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'new-driver@kapool.local',
        password: 'driver-password',
        role: 'driver',
        name: 'New Driver',
        nickname: 'Signup Driver',
        schoolEmail: 'new-driver@kunsan.ac.kr',
        department: 'Automotive Engineering',
      })
      .expect(201);

    expect(userCreate).toHaveBeenCalledWith({
      data: {
        email: 'new-driver@kapool.local',
        passwordHash: hashLocalDemoPassword('driver-password'),
        role: 'driver',
        isAdmin: false,
        profile: {
          create: {
            name: 'New Driver',
            nickname: 'Signup Driver',
            schoolEmail: 'new-driver@kunsan.ac.kr',
            department: 'Automotive Engineering',
            homeRegion: undefined,
          },
        },
      },
      include: { profile: true },
    });
    expect(response.body.user).toMatchObject({
      id: 'signup-driver-1',
      email: 'new-driver@kapool.local',
      role: 'driver',
      isAdmin: false,
      profile: {
        name: 'New Driver',
        nickname: 'Signup Driver',
        schoolEmail: 'new-driver@kunsan.ac.kr',
        department: 'Automotive Engineering',
      },
    });
    expect(response.body.user.profile).not.toHaveProperty('homeRegion');
    expect(JSON.stringify(response.body)).not.toContain('010-9999-8888');
    expect(JSON.stringify(response.body)).not.toContain('plateLastFour');
    expect(JSON.stringify(response.body)).not.toContain('bank');
    expect(JSON.stringify(response.body)).not.toContain('account');
  });

  it('rejects admin signup', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'admin-signup@kapool.local',
        password: 'admin-password',
        role: 'admin',
        name: 'Admin Signup',
        nickname: 'Admin Signup',
        schoolEmail: 'admin-signup@kunsan.ac.kr',
        department: 'Administration',
      })
      .expect(400);

    expect(userCreate).not.toHaveBeenCalled();
  });

  it('returns conflict for duplicate signup email', async () => {
    userCreate.mockRejectedValueOnce({ code: 'P2002' });

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'passenger@kapool.local',
        password: 'signup-password',
        role: 'passenger',
        name: 'Duplicate Passenger',
        nickname: 'Duplicate',
        schoolEmail: 'duplicate@kunsan.ac.kr',
        department: 'Computer Engineering',
      })
      .expect(409)
      .expect(({ body }) => {
        expect(JSON.stringify(body)).toContain('account_already_exists');
      });
  });

  it('rejects signup when required fields are invalid', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'missing-name@kapool.local',
        password: 'signup-password',
        role: 'passenger',
        name: ' ',
        nickname: 'Missing Name',
        schoolEmail: 'missing-name@kunsan.ac.kr',
        department: 'Computer Engineering',
      })
      .expect(400);

    expect(userCreate).not.toHaveBeenCalled();
  });

  it('returns 401 for unauthenticated protected requests', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('returns the current user for an authenticated request without private fields', async () => {
    findUnique.mockResolvedValueOnce(makeUser()).mockResolvedValueOnce(makeUser());

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'passenger@kapool.local', password: 'kapool-local-demo' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(response.body.email).toBe('passenger@kapool.local');
    expect(response.body.profile.photoDataUrl).toBe('data:image/png;base64,cHJvZmlsZQ==');
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain('010-0000-1001');
  });

  it('updates the current user profile and returns the auth user shape', async () => {
    const updatedProfile = {
      ...baseProfile,
      name: 'Updated Passenger',
      nickname: 'Updated One',
      schoolEmail: 'updated@kapool.local',
      department: 'Mobility Engineering',
      phone: '010-1111-2222',
      homeRegion: null,
      photoDataUrl: 'data:image/webp;base64,dXBkYXRlZA==',
    };

    findUnique
      .mockResolvedValueOnce(makeUser())
      .mockResolvedValueOnce(makeUser());
    profileUpdate.mockResolvedValueOnce({
      ...updatedProfile,
      user: makeUser({ profile: updatedProfile }),
    });

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'passenger@kapool.local', password: 'kapool-local-demo' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch('/auth/me/profile')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        name: ' Updated Passenger ',
        nickname: ' Updated One ',
        schoolEmail: ' updated@kapool.local ',
        department: ' Mobility Engineering ',
        phone: '',
        homeRegion: '',
        photoDataUrl: ' data:image/webp;base64,dXBkYXRlZA== ',
      })
      .expect(200);

    expect(profileUpdate).toHaveBeenCalledWith({
      where: { userId: 'passenger-1' },
      data: {
        name: 'Updated Passenger',
        nickname: 'Updated One',
        schoolEmail: 'updated@kapool.local',
        department: 'Mobility Engineering',
        phone: null,
        homeRegion: null,
        photoDataUrl: 'data:image/webp;base64,dXBkYXRlZA==',
      },
      include: { user: true },
    });
    expect(response.body).toMatchObject({
      id: 'passenger-1',
      email: 'passenger@kapool.local',
      role: 'passenger',
      isAdmin: false,
      profile: {
        name: 'Updated Passenger',
        nickname: 'Updated One',
        schoolEmail: 'updated@kapool.local',
        department: 'Mobility Engineering',
        photoDataUrl: 'data:image/webp;base64,dXBkYXRlZA==',
      },
    });
    expect(response.body.profile).not.toHaveProperty('phone');
    expect(response.body.profile).not.toHaveProperty('homeRegion');
    expect(JSON.stringify(response.body)).not.toContain('010-1111-2222');
  });

  it('rejects invalid profile photo data URLs', async () => {
    findUnique.mockResolvedValueOnce(makeUser()).mockResolvedValueOnce(makeUser());

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'passenger@kapool.local', password: 'kapool-local-demo' })
      .expect(201);

    await request(app.getHttpServer())
      .patch('/auth/me/profile')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ photoDataUrl: 'data:image/gif;base64,AAAA' })
      .expect(400);

    expect(profileUpdate).not.toHaveBeenCalled();
  });

  it('rejects empty authenticated profile updates', async () => {
    findUnique.mockResolvedValueOnce(makeUser()).mockResolvedValueOnce(makeUser());

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'passenger@kapool.local', password: 'kapool-local-demo' })
      .expect(201);

    await request(app.getHttpServer())
      .patch('/auth/me/profile')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({})
      .expect(400);

    expect(profileUpdate).not.toHaveBeenCalled();
  });

  it('returns 403 when a non-admin accesses an admin endpoint', async () => {
    findUnique.mockResolvedValueOnce(makeUser());

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'passenger@kapool.local', password: 'kapool-local-demo' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/admin/auth-check')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);
  });

  it('allows an admin to access the minimal admin auth-check endpoint', async () => {
    findUnique.mockResolvedValueOnce(
      makeUser({
        id: 'admin-1',
        email: 'admin@kapool.local',
        role: 'admin',
        isAdmin: true,
        profile: {
          ...baseProfile,
          userId: 'admin-1',
          schoolEmail: 'admin@kapool.local',
          phone: '010-0000-3003',
        },
      }),
    );

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@kapool.local', password: 'kapool-local-demo' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/admin/auth-check')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200)
      .expect({ ok: true, userId: 'admin-1', role: 'admin' });
  });
});
