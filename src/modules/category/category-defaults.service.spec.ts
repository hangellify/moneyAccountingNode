import { MikroORM, EntityManager } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Test } from '@nestjs/testing';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Category } from '../../entities/category.entity';
import { SubCategory } from '../../entities/sub-category.entity';
import { User } from '../../entities/user.entity';
import { Currency } from '../../types/currency.enum';
import { CategoryDefaultsService } from './category-defaults.service';
import { DEFAULT_CATEGORY_TREE } from './defaults';

jest.setTimeout(30_000);

const EMAIL_PREFIX = 'seed-spec-';

describe('CategoryDefaultsService', () => {
  let orm: MikroORM;
  let em: EntityManager;
  let service: CategoryDefaultsService;

  async function makeUser(label: string): Promise<User> {
    const fork = em.fork();
    const u = fork.create(User, {
      email: `${EMAIL_PREFIX}${label}-${Date.now()}-${Math.random()}@test`,
      first_name: 'Seed',
      password: 'supersecret-password-for-test',
      currency: Currency.EUR,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await fork.persist(u).flush();
    return u;
  }

  async function cleanupOwned(): Promise<void> {
    const fork = em.fork();
    // ON DELETE CASCADE on categories.user_id (and on sub_categories.category_id)
    // takes care of dependent rows.
    await fork.nativeDelete(User, { email: { $like: `${EMAIL_PREFIX}%` } });
  }

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [
        MikroOrmModule.forRoot({
          driver: PostgreSqlDriver,
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          dbName: process.env.DB_NAME || 'accounting',
          entities: ['./dist/**/*.entity.js'],
          entitiesTs: ['./src/**/*.entity.ts'],
          allowGlobalContext: true,
        }),
        MikroOrmModule.forFeature([Category, SubCategory]),
      ],
      providers: [CategoryDefaultsService],
    }).compile();
    orm = mod.get(MikroORM);
    em = orm.em;
    service = mod.get(CategoryDefaultsService);
  });

  beforeEach(cleanupOwned);
  afterAll(async () => {
    await cleanupOwned();
    await orm.close(true);
  });

  it('creates 12 categories and ~70 subcategories for a fresh user', async () => {
    const user = await makeUser('fresh');
    const { categoriesCreated, subCategoriesCreated } =
      await service.seedForUser(user.id);
    const expectedCats = DEFAULT_CATEGORY_TREE.length;
    const expectedSubs = DEFAULT_CATEGORY_TREE.reduce(
      (n, c) => n + c.subCategories.length,
      0,
    );
    expect(categoriesCreated).toBe(expectedCats);
    expect(subCategoriesCreated).toBe(expectedSubs);
  });

  it('is idempotent — running twice creates 0 new rows the second time', async () => {
    const user = await makeUser('idempotent');
    await service.seedForUser(user.id);
    const second = await service.seedForUser(user.id);
    expect(second.categoriesCreated).toBe(0);
    expect(second.subCategoriesCreated).toBe(0);
  });

  it('restores a deleted category with its full default subcategory set', async () => {
    const user = await makeUser('del-cat');
    await service.seedForUser(user.id);
    const fork = em.fork();
    const bread = await fork.findOneOrFail(
      Category,
      { user: { id: user.id }, name: 'Bread', deleted_at: null },
      { populate: ['subCategories'] },
    );
    bread.deleted_at = new Date();
    for (const sub of bread.subCategories) {
      sub.deleted_at = new Date();
    }
    await fork.flush();

    const res = await service.seedForUser(user.id);
    const breadDefaults = DEFAULT_CATEGORY_TREE.find(
      (c) => c.name === 'Bread',
    )!;
    expect(res.categoriesCreated).toBe(1);
    expect(res.subCategoriesCreated).toBe(breadDefaults.subCategories.length);
  });

  it('re-adds a deleted subcategory without touching its siblings', async () => {
    const user = await makeUser('del-sub');
    await service.seedForUser(user.id);
    const fork = em.fork();
    const bread = await fork.findOneOrFail(
      Category,
      { user: { id: user.id }, name: 'Bread', deleted_at: null },
      { populate: ['subCategories'] },
    );
    const pita = bread.subCategories.getItems().find((s) => s.name === 'pita')!;
    pita.deleted_at = new Date();
    await fork.flush();

    const res = await service.seedForUser(user.id);
    expect(res.categoriesCreated).toBe(0);
    expect(res.subCategoriesCreated).toBe(1);
  });

  it('preserves user-added subcategories and adds only missing defaults', async () => {
    const user = await makeUser('custom');
    const fork = em.fork();
    const bread = fork.create(Category, {
      name: 'Bread',
      user: fork.getReference(User, user.id),
      created_at: new Date(),
      updated_at: new Date(),
    });
    await fork.persist(bread).flush();
    for (const name of ['pita', 'tortilla']) {
      const sc = fork.create(SubCategory, {
        name,
        category: fork.getReference(Category, bread.id),
        created_at: new Date(),
        updated_at: new Date(),
      });
      fork.persist(sc);
    }
    await fork.flush();

    const res = await service.seedForUser(user.id);
    const breadDefaults = DEFAULT_CATEGORY_TREE.find(
      (c) => c.name === 'Bread',
    )!;
    expect(res.categoriesCreated).toBe(DEFAULT_CATEGORY_TREE.length - 1);
    const missingInBread = breadDefaults.subCategories.length - 1; // pita already there
    const allOtherSubs = DEFAULT_CATEGORY_TREE.filter(
      (c) => c.name !== 'Bread',
    ).reduce((n, c) => n + c.subCategories.length, 0);
    expect(res.subCategoriesCreated).toBe(missingInBread + allOtherSubs);

    const fork2 = em.fork();
    const tortilla = await fork2.findOne(SubCategory, { name: 'tortilla' });
    expect(tortilla).not.toBeNull();
  });
});
