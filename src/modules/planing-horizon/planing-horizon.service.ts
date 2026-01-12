import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import { PlaningHorizon } from '../../entities/planing-horizon.entity';
import { Budget } from '../../entities/budget.entity';
import { CreatePlaningHorizonDto } from './dto/create-planing-horizon.dto';
import { UpdatePlaningHorizonDto } from './dto/update-planing-horizon.dto';
import { PlaningHorizonResponseDto } from './dto/planing-horizon-response.dto';

@Injectable()
export class PlaningHorizonService {
  constructor(
    @InjectRepository(PlaningHorizon)
    private readonly planingHorizonRepository: EntityRepository<PlaningHorizon>,
    @InjectRepository(Budget)
    private readonly budgetRepository: EntityRepository<Budget>,
    private readonly em: EntityManager,
  ) {}

  /**
   * Create a new planning horizon for a user
   * Name must be unique per user (excluding archived planning horizons)
   * Budget must belong to the user
   */
  async createPlaningHorizon(
    userId: string,
    createPlaningHorizonDto: CreatePlaningHorizonDto,
  ): Promise<PlaningHorizonResponseDto> {
    // Verify that the budget exists and belongs to the user
    const budget = await this.budgetRepository.findOne({
      id: createPlaningHorizonDto.budget_id,
      user: { id: userId },
      deleted_at: null,
    });

    if (!budget) {
      throw new NotFoundException(
        `Budget with ID ${createPlaningHorizonDto.budget_id} not found or does not belong to this user`,
      );
    }

    // Check if planning horizon with same name already exists for this user (excluding archived)
    // We need to check through the budget relationship
    const existingPlaningHorizon = await this.planingHorizonRepository.findOne({
      budget: { user: { id: userId }, deleted_at: null },
      name: createPlaningHorizonDto.name,
      is_archived: false,
      deleted_at: null,
    });

    if (existingPlaningHorizon) {
      throw new BadRequestException(
        `Planning horizon with name "${createPlaningHorizonDto.name}" already exists for this user`,
      );
    }

    const planingHorizon = new PlaningHorizon();
    planingHorizon.name = createPlaningHorizonDto.name;
    planingHorizon.description = createPlaningHorizonDto.description;
    planingHorizon.amount = createPlaningHorizonDto.amount;
    planingHorizon.currency = createPlaningHorizonDto.currency;
    planingHorizon.period_type = createPlaningHorizonDto.period_type;
    planingHorizon.budget = budget;
    planingHorizon.is_archived = false;

    await this.em.persist(planingHorizon).flush();

    return {
      id: planingHorizon.id,
      name: planingHorizon.name,
      description: planingHorizon.description,
      amount: Number(planingHorizon.amount),
      currency: planingHorizon.currency,
      period_type: planingHorizon.period_type,
      created_at: planingHorizon.created_at,
      updated_at: planingHorizon.updated_at,
      is_archived: planingHorizon.is_archived,
      budget_id: planingHorizon.budget.id,
    };
  }

  /**
   * Get a planning horizon by ID (excluding archived and soft-deleted)
   * Only returns planning horizon if it belongs to the user through budget
   */
  async getPlaningHorizon(
    id: string,
    userId: string,
  ): Promise<PlaningHorizonResponseDto> {
    const planingHorizon = await this.planingHorizonRepository.findOne(
      {
        id,
        budget: { user: { id: userId }, deleted_at: null },
        is_archived: false,
        deleted_at: null,
      },
      {
        populate: ['budget'],
        fields: [
          'id',
          'name',
          'description',
          'amount',
          'currency',
          'period_type',
          'created_at',
          'updated_at',
          'is_archived',
          'deleted_at',
          'budget.id',
        ],
      },
    );

    if (!planingHorizon) {
      throw new NotFoundException(`Planning horizon with ID ${id} not found`);
    }

    return {
      id: planingHorizon.id,
      name: planingHorizon.name,
      description: planingHorizon.description,
      amount: Number(planingHorizon.amount),
      currency: planingHorizon.currency,
      period_type: planingHorizon.period_type,
      created_at: planingHorizon.created_at,
      updated_at: planingHorizon.updated_at,
      is_archived: planingHorizon.is_archived,
      budget_id: planingHorizon.budget.id,
    };
  }

  /**
   * Update a planning horizon by ID (only non-archived planning horizons can be updated)
   * Only updates planning horizon if it belongs to the user through budget
   */
  async updatePlaningHorizon(
    id: string,
    userId: string,
    updatePlaningHorizonDto: UpdatePlaningHorizonDto,
  ): Promise<PlaningHorizonResponseDto> {
    const planingHorizon = await this.planingHorizonRepository.findOne(
      {
        id,
        budget: { user: { id: userId }, deleted_at: null },
        is_archived: false,
        deleted_at: null,
      },
      { populate: ['budget'] },
    );

    if (!planingHorizon) {
      throw new NotFoundException(`Planning horizon with ID ${id} not found`);
    }

    // If name is being updated, check uniqueness per user
    if (
      updatePlaningHorizonDto.name !== undefined &&
      updatePlaningHorizonDto.name !== planingHorizon.name
    ) {
      const existingPlaningHorizon =
        await this.planingHorizonRepository.findOne({
          budget: { user: { id: userId }, deleted_at: null },
          name: updatePlaningHorizonDto.name,
          is_archived: false,
          deleted_at: null,
        });

      // If a planning horizon with the same name exists and it's not the current one
      if (existingPlaningHorizon && existingPlaningHorizon.id !== id) {
        throw new BadRequestException(
          `Planning horizon with name "${updatePlaningHorizonDto.name}" already exists for this user`,
        );
      }
    }

    // Update only provided fields
    if (updatePlaningHorizonDto.name !== undefined) {
      planingHorizon.name = updatePlaningHorizonDto.name;
    }

    if (updatePlaningHorizonDto.description !== undefined) {
      planingHorizon.description = updatePlaningHorizonDto.description;
    }

    if (updatePlaningHorizonDto.amount !== undefined) {
      planingHorizon.amount = updatePlaningHorizonDto.amount;
    }

    if (updatePlaningHorizonDto.currency !== undefined) {
      planingHorizon.currency = updatePlaningHorizonDto.currency;
    }

    if (updatePlaningHorizonDto.period_type !== undefined) {
      planingHorizon.period_type = updatePlaningHorizonDto.period_type;
    }

    await this.em.persist(planingHorizon).flush();

    return {
      id: planingHorizon.id,
      name: planingHorizon.name,
      description: planingHorizon.description,
      amount: Number(planingHorizon.amount),
      currency: planingHorizon.currency,
      period_type: planingHorizon.period_type,
      created_at: planingHorizon.created_at,
      updated_at: planingHorizon.updated_at,
      is_archived: planingHorizon.is_archived,
      budget_id: planingHorizon.budget.id,
    };
  }

  /**
   * Soft delete a planning horizon by setting is_archived to true
   * Only archives planning horizon if it belongs to the user through budget
   */
  async softDeletePlaningHorizon(id: string, userId: string): Promise<void> {
    const planingHorizon = await this.planingHorizonRepository.findOne({
      id,
      budget: { user: { id: userId }, deleted_at: null },
      is_archived: false,
      deleted_at: null,
    });

    if (!planingHorizon) {
      throw new NotFoundException(`Planning horizon with ID ${id} not found`);
    }

    // Check if planning horizon is already archived
    if (planingHorizon.is_archived) {
      throw new BadRequestException(
        `Planning horizon with ID ${id} is already archived`,
      );
    }

    planingHorizon.is_archived = true;
    await this.em.persist(planingHorizon).flush();
  }
}
