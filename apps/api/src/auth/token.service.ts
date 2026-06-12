import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import type { AuthUserRole } from './auth-role';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: AuthUserRole;
  isAdmin: boolean;
  exp: number;
}

const tokenTtlSeconds = 60 * 60;
const jwtHeader = {
  alg: 'HS256',
  typ: 'JWT',
} as const;

@Injectable()
export class TokenService {
  issueToken(payload: Omit<AuthTokenPayload, 'exp'>): string {
    const tokenPayload: AuthTokenPayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + tokenTtlSeconds,
    };
    const encodedHeader = this.encode(jwtHeader);
    const encodedPayload = this.encode(tokenPayload);
    const signature = this.sign(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  verifyToken(token: string): AuthTokenPayload | null {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = this.sign(`${encodedHeader}.${encodedPayload}`);

    if (!this.safeEquals(signature, expectedSignature)) {
      return null;
    }

    try {
      const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8')) as {
        alg?: string;
        typ?: string;
      };

      if (header.alg !== 'HS256' || header.typ !== 'JWT') {
        return null;
      }

      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as AuthTokenPayload;

      if (!payload.sub || !payload.email || !payload.role || payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  private encode(payload: object): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  private sign(encodedPayload: string): string {
    return createHmac('sha256', process.env.AUTH_TOKEN_SECRET ?? 'kapool-local-mvp-token-secret')
      .update(encodedPayload)
      .digest('base64url');
  }

  private safeEquals(value: string, expected: string): boolean {
    const valueBuffer = Buffer.from(value);
    const expectedBuffer = Buffer.from(expected);

    return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer);
  }
}
