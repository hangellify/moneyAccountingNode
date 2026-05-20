/* eslint-disable @typescript-eslint/unbound-method */
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { BudgetService } from './budget.service';
import { Budget } from '../../entities/budget.entity';
import { User } from '../../entities/user.entity';

function makeService() {
  const budgetRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  } as unknown as EntityRepository<Budget>;
  const userRepo = {
    findOneOrFail: jest.fn(),
  } as unknown as EntityRepository<User>;
  const em = {
    persist: jest.fn().mockReturnThis(),
    flush: jest.fn().mockResolvedValue(undefined),
  } as unknown as EntityManager;
  return { service: new BudgetService(budgetRepo, userRepo, em), budgetRepo };
}

describe('BudgetService.listBudgets', () => {
  it('returns non-deleted budgets for the user', async () => {
    const { service, budgetRepo } = makeService();
    const budgets = [
      {
        id: 'b1',
        name: 'Monthly',
        description: undefined,
        created_at: new Date(),
      },
    ] as unknown as Budget[];
    (budgetRepo.find as jest.Mock).mockResolvedValue(budgets);

    const result = await service.listBudgets('user-1');

    expect(result).toHaveLength(1);
    expect(budgetRepo.find as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ user: { id: 'user-1' }, deleted_at: null }),
    );
  });
});
