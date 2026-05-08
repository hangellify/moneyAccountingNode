import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Category } from '../../entities/category.entity';
import { SubCategory } from '../../entities/sub-category.entity';
import { User } from '../../entities/user.entity';
import { DEFAULT_CATEGORY_TREE } from './defaults';

export interface SeedCounts {
  categoriesCreated: number;
  subCategoriesCreated: number;
}

@Injectable()
export class CategoryDefaultsService {
  private readonly log = new Logger(CategoryDefaultsService.name);

  constructor(private readonly em: EntityManager) {}

  async seedForUser(userId: string): Promise<SeedCounts> {
    const em = this.em.fork();
    const existingCats = await em.find(
      Category,
      { user: { id: userId }, deleted_at: null },
      { populate: ['subCategories'] },
    );
    const byName = new Map<string, Category>(
      existingCats.map((c) => [c.name, c as Category]),
    );

    let categoriesCreated = 0;
    let subCategoriesCreated = 0;

    for (const node of DEFAULT_CATEGORY_TREE) {
      const existing = byName.get(node.name);
      if (!existing) {
        const category = em.create(Category, {
          name: node.name,
          user: em.getReference(User, userId),
          created_at: new Date(),
          updated_at: new Date(),
        });
        em.persist(category);
        categoriesCreated += 1;
        for (const sub of node.subCategories) {
          const sc = em.create(SubCategory, {
            name: sub.name,
            category,
            created_at: new Date(),
            updated_at: new Date(),
          });
          em.persist(sc);
          subCategoriesCreated += 1;
        }
      } else {
        const existingSubNames = new Set(
          existing.subCategories
            .getItems()
            .filter((s) => !s.deleted_at)
            .map((s) => s.name),
        );
        for (const sub of node.subCategories) {
          if (existingSubNames.has(sub.name)) continue;
          const sc = em.create(SubCategory, {
            name: sub.name,
            category: existing,
            created_at: new Date(),
            updated_at: new Date(),
          });
          em.persist(sc);
          subCategoriesCreated += 1;
        }
      }
    }

    await em.flush();
    this.log.log(
      `Seeded defaults for user ${userId}: +${categoriesCreated} categories, +${subCategoriesCreated} subcategories`,
    );
    return { categoriesCreated, subCategoriesCreated };
  }
}
