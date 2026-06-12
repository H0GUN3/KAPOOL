import type { AuthTokenPayload } from './token.service';

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthTokenPayload;
}
