import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Health endpoints', () => {
  let app: INestApplication;
  let queryRaw: jest.Mock;

  beforeAll(async () => {
    queryRaw = jest.fn().mockResolvedValue([{ one: 1 }]);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $disconnect: jest.fn(),
        $queryRaw: queryRaw,
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns the API health payload', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({
        status: 'ok',
        service: '@kapool/api',
        version: '0.0.0',
      });
  });

  it('returns an ok database health payload when PostgreSQL responds', async () => {
    await request(app.getHttpServer())
      .get('/health/db')
      .expect(200)
      .expect({
        status: 'ok',
        service: 'postgres',
      });
  });

  it('returns a controlled database-unavailable payload without throwing', async () => {
    queryRaw.mockRejectedValueOnce(new Error('offline'));

    await request(app.getHttpServer())
      .get('/health/db')
      .expect(200)
      .expect({
        status: 'unavailable',
        service: 'postgres',
        error: 'database_unavailable',
      });
  });
});
