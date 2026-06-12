import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from './prisma/prisma.service';

export interface HealthResponse {
  status: 'ok';
  service: '@kapool/api';
  version: string;
}

export type DatabaseHealthResponse =
  | {
      status: 'ok';
      service: 'postgres';
    }
  | {
      status: 'unavailable';
      service: 'postgres';
      error: 'database_unavailable';
    };

@Injectable()
export class HealthService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: '@kapool/api',
      version: '0.0.0',
    };
  }

  async getDatabaseHealth(): Promise<DatabaseHealthResponse> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        service: 'postgres',
      };
    } catch {
      return {
        status: 'unavailable',
        service: 'postgres',
        error: 'database_unavailable',
      };
    }
  }
}
