import { SetMetadata } from '@nestjs/common';
import type { AuthUserRole } from './auth-role';

export const ROLES_KEY = 'kapool:roles';

export const Roles = (...roles: AuthUserRole[]) => SetMetadata(ROLES_KEY, roles);
