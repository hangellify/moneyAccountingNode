import { AuthController } from './auth.controller';

describe('AuthController – @Throttle metadata', () => {
  const THROTTLER_NAME = 'default';
  // 'THROTTLER:LIMIT' / 'THROTTLER:TTL' are not re-exported from @nestjs/throttler's public API
  const THROTTLER_LIMIT_KEY = 'THROTTLER:LIMIT';
  const THROTTLER_TTL_KEY = 'THROTTLER:TTL';
  const EXPECTED_LIMIT = 10;
  const EXPECTED_TTL = 60_000;

  it.each([
    ['login', 'login' as const],
    ['register', 'register' as const],
    ['refresh', 'refresh' as const],
  ])('%s has throttle limit of 10 req/60s', (_name, methodName) => {
    const method = AuthController.prototype[methodName];
    const limit: unknown = Reflect.getMetadata(
      THROTTLER_LIMIT_KEY + THROTTLER_NAME,
      method,
    );
    expect(limit).toBe(EXPECTED_LIMIT);
  });

  it.each([
    ['login', 'login' as const],
    ['register', 'register' as const],
    ['refresh', 'refresh' as const],
  ])('%s has throttle ttl of 60s', (_name, methodName) => {
    const method = AuthController.prototype[methodName];
    const ttl: unknown = Reflect.getMetadata(
      THROTTLER_TTL_KEY + THROTTLER_NAME,
      method,
    );
    expect(ttl).toBe(EXPECTED_TTL);
  });
});
