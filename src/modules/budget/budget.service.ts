import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import { Budget } from '../../entities/budget.entity';
import { User } from '../../entities/user.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetResponseDto } from './dto/budget-response.dto';

@Injectable()
export class BudgetService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetRepository: EntityRepository<Budget>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private readonly em: EntityManager,
  ) {}

  /**
   * Create a new budget for a user
   * Name must be unique per user (excluding soft-deleted budgets)
   */
  async createBudget(
    userId: string,
    createBudgetDto: CreateBudgetDto,
  ): Promise<BudgetResponseDto> {
    // Check if budget with same name already exists for this user (excluding soft-deleted)
    const existingBudget = await this.budgetRepository.findOne({
      user: { id: userId },
      name: createBudgetDto.name,
      deleted_at: null,
    });

    if (existingBudget) {
      throw new BadRequestException(
        `Budget with name "${createBudgetDto.name}" already exists for this user`,
      );
    }

    const user = await this.userRepository.findOneOrFail({ id: userId });

    const budget = new Budget();
    budget.name = createBudgetDto.name;
    budget.description = createBudgetDto.description;
    budget.user = user;

    await this.em.persistAndFlush(budget);

    return {
      id: budget.id,
      name: budget.name,
      description: budget.description,
      created_at: budget.created_at,
      deleted_at: budget.deleted_at,
    };
  }

  /**
   * Get a budget by ID (excluding soft-deleted budgets)
   * Only returns budget if it belongs to the user
   */
  async getBudget(id: string, userId: string): Promise<BudgetResponseDto> {
    const budget = await this.budgetRepository.findOne(
      {
        id,
        user: { id: userId },
        deleted_at: null, // Only get non-deleted budgets
      },
      {
        fields: ['id', 'name', 'description', 'created_at', 'deleted_at'],
      },
    );

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    return {
      id: budget.id,
      name: budget.name,
      description: budget.description,
      created_at: budget.created_at,
      deleted_at: budget.deleted_at,
    };
  }

  /**
   * Update a budget by ID (only non-deleted budgets can be updated)
   * Only updates budget if it belongs to the user
   */
  async updateBudget(
    id: string,
    userId: string,
    updateBudgetDto: UpdateBudgetDto,
  ): Promise<BudgetResponseDto> {
    const budget = await this.budgetRepository.findOne({
      id,
      user: { id: userId },
      deleted_at: null, // Only update non-deleted budgets
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    // If name is being updated, check uniqueness per user
    if (
      updateBudgetDto.name !== undefined &&
      updateBudgetDto.name !== budget.name
    ) {
      const existingBudget = await this.budgetRepository.findOne({
        user: { id: userId },
        name: updateBudgetDto.name,
        deleted_at: null,
      });

      // If a budget with the same name exists and it's not the current budget
      if (existingBudget && existingBudget.id !== id) {
        throw new BadRequestException(
          `Budget with name "${updateBudgetDto.name}" already exists for this user`,
        );
      }
    }

    // Update only provided fields
    if (updateBudgetDto.name !== undefined) {
      budget.name = updateBudgetDto.name;
    }

    if (updateBudgetDto.description !== undefined) {
      budget.description = updateBudgetDto.description;
    }

    await this.em.persistAndFlush(budget);

    return {
      id: budget.id,
      name: budget.name,
      description: budget.description,
      created_at: budget.created_at,
      deleted_at: budget.deleted_at,
    };
  }

  /**
   * Soft delete a budget by setting deleted_at timestamp
   * Only deletes budget if it belongs to the user
   */
  async softDeleteBudget(id: string, userId: string): Promise<void> {
    const budget = await this.budgetRepository.findOne({
      id,
      user: { id: userId },
      deleted_at: null, // Only soft delete non-deleted budgets
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    // Check if budget is already soft deleted
    if (budget.deleted_at) {
      throw new BadRequestException(`Budget with ID ${id} is already deleted`);
    }

    budget.deleted_at = new Date();
    await this.em.persistAndFlush(budget);
  }
}
