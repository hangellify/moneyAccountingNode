import { Test } from '@nestjs/testing';
import { UserController } from './user.controller';
import { CategoryDefaultsService } from '../category/category-defaults.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('UserController', () => {
  let controller: UserController;
  const seedForUser = jest.fn();

  beforeEach(async () => {
    seedForUser.mockReset();
    const mod = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: CategoryDefaultsService, useValue: { seedForUser } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = mod.get(UserController);
  });

  it('seedDefaultCategories delegates to the service and returns snake_case counts', async () => {
    seedForUser.mockResolvedValue({
      categoriesCreated: 3,
      subCategoriesCreated: 15,
    });
    const res = await controller.seedDefaultCategories({
      id: 'user-42',
    } as never);
    expect(seedForUser).toHaveBeenCalledWith('user-42');
    expect(res).toEqual({ categories_created: 3, sub_categories_created: 15 });
  });
});
