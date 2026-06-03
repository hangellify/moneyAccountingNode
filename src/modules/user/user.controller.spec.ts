import { Test } from '@nestjs/testing';
import { UserController } from './user.controller';
import { CategoryDefaultsService } from '../category/category-defaults.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('UserController', () => {
  let controller: UserController;
  const seedForHousehold = jest.fn();

  beforeEach(async () => {
    seedForHousehold.mockReset();
    const mod = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: CategoryDefaultsService, useValue: { seedForHousehold } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = mod.get(UserController);
  });

  it('seedDefaultCategories delegates to the service with the given household_id', async () => {
    seedForHousehold.mockResolvedValue({
      categoriesCreated: 3,
      subCategoriesCreated: 15,
    });
    await controller.seedDefaultCategories('hh-42');
    expect(seedForHousehold).toHaveBeenCalledWith('hh-42');
  });
});
