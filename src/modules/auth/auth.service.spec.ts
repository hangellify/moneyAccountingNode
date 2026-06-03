import { JwtService } from '@nestjs/jwt';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { AuthService } from './auth.service';
import { CategoryDefaultsService } from '../category/category-defaults.service';
import { User } from '../../entities/user.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { Session } from '../../entities/session.entity';
import { Log } from '../../entities/log.entity';

/* eslint-disable @typescript-eslint/no-unsafe-return */

interface Deps {
  seedForUser: jest.Mock;
}

function makeService(opts?: Partial<Deps>): {
  service: AuthService;
  deps: Deps;
} {
  const seedForUser =
    opts?.seedForUser ??
    jest.fn().mockResolvedValue({
      categoriesCreated: 12,
      subCategoriesCreated: 70,
    });

  // env vars used by issueTokensForSession
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-xxxxxx';
  process.env.JWT_REFRESH_SECRET =
    'test-refresh-secret-at-least-32-chars-long-xxxxxx';
  process.env.JWT_EXPIRES_IN_MS = '900000';
  process.env.JWT_REFRESH_EXPIRES_IN_MS = '604800000';

  // Repository mocks: findOne returns null (no existing user) for user; create returns the entity passed.
  const userRepo = {
    findOne: jest.fn().mockResolvedValue(null),
  } as unknown as EntityRepository<User>;
  const refreshTokenRepo = {
    create: jest.fn().mockImplementation((data) => data),
  } as unknown as EntityRepository<RefreshToken>;
  const sessionRepo = {
    create: jest
      .fn()
      .mockImplementation((data) => ({ id: 'session-id', ...data })),
  } as unknown as EntityRepository<Session>;
  const logRepo = {
    create: jest.fn().mockImplementation((data) => data),
  } as unknown as EntityRepository<Log>;

  // EntityManager: persist().flush() chain. Side-effect: assigns an id to the user before flush returns.
  const em = {
    persist: jest.fn().mockImplementation((entity: { id?: string }) => {
      if (entity && typeof entity === 'object' && !entity.id) {
        entity.id = 'user-' + Math.random().toString(36).slice(2);
      }
      return { flush: jest.fn().mockResolvedValue(undefined) };
    }),
    flush: jest.fn().mockResolvedValue(undefined),
    transactional: jest
      .fn()
      .mockImplementation((fn: (txEm: EntityManager) => Promise<unknown>) =>
        fn(em as unknown as EntityManager),
      ),
  } as unknown as EntityManager;

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
    verify: jest.fn(),
  } as unknown as JwtService;

  const service = new AuthService(
    userRepo,
    refreshTokenRepo,
    sessionRepo,
    logRepo,
    em,
    jwtService,
    { seedForUser } as unknown as CategoryDefaultsService,
  );
  return { service, deps: { seedForUser } };
}

describe('AuthService.register seeder hook', () => {
  it('seeds default categories for the new user after persist', async () => {
    const { service, deps } = makeService();
    await service.register(
      {
        email: 'new-user@test',
        password: 'supersecret-password',
        first_name: 'Test',
      } as never,
      '1.2.3.4',
      'jest',
    );
    expect(deps.seedForUser).toHaveBeenCalledTimes(1);
    expect(deps.seedForUser).toHaveBeenCalledWith(expect.any(String));
  });

  it('does NOT fail registration when seedForUser throws', async () => {
    const { service } = makeService({
      seedForUser: jest.fn().mockRejectedValue(new Error('db down')),
    });
    const tokens = await service.register(
      {
        email: 'new-user-2@test',
        password: 'supersecret-password',
        first_name: 'Test2',
      } as never,
      '1.2.3.4',
      'jest',
    );
    expect(tokens.access_token).toBeDefined();
  });
});
/* eslint-enable @typescript-eslint/no-unsafe-return */
