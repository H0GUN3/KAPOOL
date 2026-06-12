import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedRequest } from './auth.types';
import type { AuthUserRole } from './auth-role';
import { ROLES_KEY } from './roles.decorator';
import { TokenService } from './token.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.getBearerToken(request);

    if (!token) {
      throw new UnauthorizedException({ error: 'authentication_required' });
    }

    const payload = this.tokenService.verifyToken(token);

    if (!payload) {
      throw new UnauthorizedException({ error: 'invalid_token' });
    }

    const requiredRoles = this.reflector.getAllAndOverride<AuthUserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles?.length && !requiredRoles.includes(payload.role)) {
      throw new ForbiddenException({ error: 'insufficient_role' });
    }

    request.user = payload;
    return true;
  }

  private getBearerToken(request: AuthenticatedRequest): string | null {
    const authorization = request.headers.authorization;
    const headerValue = Array.isArray(authorization) ? authorization[0] : authorization;

    if (!headerValue?.startsWith('Bearer ')) {
      return null;
    }

    return headerValue.slice('Bearer '.length).trim();
  }
}
