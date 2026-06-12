import { createHash, timingSafeEqual } from 'node:crypto';

const localHashPrefix = 'sha256-local-demo:';

export function hashLocalDemoPassword(password: string): string {
  return `${localHashPrefix}${createHash('sha256').update(password, 'utf8').digest('hex')}`;
}

export function verifyLocalDemoPassword(password: string, passwordHash: string): boolean {
  const expected = hashLocalDemoPassword(password);

  if (!passwordHash.startsWith(localHashPrefix)) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(passwordHash));
}
