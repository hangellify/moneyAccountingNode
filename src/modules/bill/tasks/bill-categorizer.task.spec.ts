import { BillCategorizerTask } from './bill-categorizer.task';
import type { EntityRepository } from '@mikro-orm/core';
import type { SubCategory } from '../../../entities/sub-category.entity';

const USER_ID = '00000000-0000-0000-0000-0000000000aa';

describe('BillCategorizerTask', () => {
  let repo: { find: jest.Mock };
  let task: BillCategorizerTask;

  beforeEach(() => {
    repo = {
      find: jest.fn().mockResolvedValue([
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Bread',
          category: { name: 'Bakery' },
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Tomatoes',
          category: { name: 'Produce' },
        },
      ]),
    };
    task = new BillCategorizerTask(
      repo as unknown as EntityRepository<SubCategory>,
    );
  });

  it('declares text + json capabilities only (no vision)', () => {
    expect(task.requiredCapabilities.has('text')).toBe(true);
    expect(task.requiredCapabilities.has('json')).toBe(true);
    expect(task.requiredCapabilities.has('vision')).toBe(false);
  });

  it('names itself bill.categorize', () => {
    expect(task.name).toBe('bill.categorize');
  });

  it('queries only non-deleted subcategories with populated category', async () => {
    await task.buildRequest({
      items: [
        {
          name: 'BREAD',
          quantity: 1,
          unit: 'piece',
          weight_kg: null,
          price_per_kg: null,
          final_price: 1,
        },
      ],
      userId: USER_ID,
    });
    expect(repo.find).toHaveBeenCalledWith(
      { deleted_at: null, category: { user: { id: USER_ID } } },
      { populate: ['category'] },
    );
  });

  it('renders subcategories as "id | Category > SubCategory" and lists items by index', async () => {
    const req = await task.buildRequest({
      items: [
        {
          name: 'BREAD',
          quantity: 1,
          unit: 'piece',
          weight_kg: null,
          price_per_kg: null,
          final_price: 1,
        },
        {
          name: 'TOMATOES',
          quantity: null,
          unit: 'kg',
          weight_kg: 1.2,
          price_per_kg: 3.5,
          final_price: 4.2,
        },
      ],
      userId: USER_ID,
    });
    const user = req.messages.find((m) => m.role === 'user');
    expect(user?.text).toContain(
      '11111111-1111-1111-1111-111111111111 | Bakery > Bread',
    );
    expect(user?.text).toContain(
      '22222222-2222-2222-2222-222222222222 | Produce > Tomatoes',
    );
    expect(user?.text).toMatch(/0:\s*BREAD/);
    expect(user?.text).toMatch(/1:\s*TOMATOES/);
  });
});
