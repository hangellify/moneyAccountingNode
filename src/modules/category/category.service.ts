import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import { Category } from '../../entities/category.entity';
import { PlaningHorizon } from '../../entities/planing-horizon.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { BulkCreateCategoryDto } from './dto/bulk-create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CategoryBaseResponseDto } from './dto/category-base-response.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: EntityRepository<Category>,
    @InjectRepository(PlaningHorizon)
    private readonly planingHorizonRepository: EntityRepository<PlaningHorizon>,
    private readonly em: EntityManager,
  ) {}

  /**
   * Create a new category and link it to a planning horizon
   * Planning horizon must belong to the user through budget
   */
  async createCategory(
    userId: string,
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    // Verify that the planning horizon exists and belongs to the user
    const planingHorizon = await this.planingHorizonRepository.findOne({
      id: createCategoryDto.planing_horizon_id,
      budget: { user: { id: userId }, deleted_at: null },
      is_archived: false,
      deleted_at: null,
    });

    if (!planingHorizon) {
      throw new NotFoundException(
        `Planning horizon with ID ${createCategoryDto.planing_horizon_id} not found or does not belong to this user`,
      );
    }

    const category = new Category();
    category.name = createCategoryDto.name;
    category.description = createCategoryDto.description;

    // Link category to planning horizon
    category.planingHorizons.add(planingHorizon);

    await this.em.persist(category).flush();

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      created_at: category.created_at,
      updated_at: category.updated_at,
    };
  }

  /**
   * Bulk create categories for a planning horizon
   * This is the only way to create categories (as per requirements)
   */
  async bulkCreateCategories(
    userId: string,
    bulkCreateCategoryDto: BulkCreateCategoryDto,
  ): Promise<CategoryResponseDto[]> {
    // Verify that the planning horizon exists and belongs to the user
    const planingHorizon = await this.planingHorizonRepository.findOne({
      id: bulkCreateCategoryDto.planing_horizon_id,
      budget: { user: { id: userId }, deleted_at: null },
      is_archived: false,
      deleted_at: null,
    });

    if (!planingHorizon) {
      throw new NotFoundException(
        `Planning horizon with ID ${bulkCreateCategoryDto.planing_horizon_id} not found or does not belong to this user`,
      );
    }

    const categories: Category[] = [];

    for (const categoryItem of bulkCreateCategoryDto.categories) {
      const category = new Category();
      category.name = categoryItem.name;
      category.description = categoryItem.description;
      category.planingHorizons.add(planingHorizon);
      categories.push(category);
    }

    await this.em.persist(categories).flush();

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      created_at: category.created_at,
      updated_at: category.updated_at,
    }));
  }

  /**
   * Get a category by ID
   * Only returns category if it belongs to the user through planning horizon -> budget
   * Includes sub-categories in the response
   */
  async getCategory(id: string, userId: string): Promise<CategoryResponseDto> {
    // First, get the category
    const category = await this.categoryRepository.findOne(
      {
        id,
        deleted_at: null,
      },
      {
        populate: ['planingHorizons', 'subCategories'],
      },
    );

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category is linked to at least one planning horizon that belongs to the user
    if (!category.planingHorizons.isInitialized()) {
      await category.planingHorizons.loadItems();
    }
    const planingHorizonIds = category.planingHorizons
      .getItems()
      .map((ph) => ph.id);
    const userPlaningHorizons = await this.planingHorizonRepository.find({
      id: { $in: planingHorizonIds },
      budget: { user: { id: userId }, deleted_at: null },
      is_archived: false,
      deleted_at: null,
    });

    if (userPlaningHorizons.length === 0) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Load and map sub-categories
    const subCategories = [];
    if (!category.subCategories.isInitialized()) {
      await category.subCategories.loadItems();
    }
    for (const subCategory of category.subCategories) {
      if (!subCategory.deleted_at) {
        subCategories.push({
          id: subCategory.id,
          name: subCategory.name,
          description: subCategory.description,
          category_id: category.id,
          created_at: subCategory.created_at,
          updated_at: subCategory.updated_at,
        });
      }
    }

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      created_at: category.created_at,
      updated_at: category.updated_at,
      sub_categories: subCategories,
    };
  }

  /**
   * Get all categories for a user
   * Returns categories that belong to planning horizons that belong to budgets that belong to the user
   * Does not include sub-categories in the response
   */
  async getAllUserCategories(
    userId: string,
  ): Promise<CategoryBaseResponseDto[]> {
    // First, get all planning horizons for the user
    const userPlaningHorizons = await this.planingHorizonRepository.find(
      {
        budget: { user: { id: userId }, deleted_at: null },
        is_archived: false,
        deleted_at: null,
      },
      {
        populate: ['categories'],
      },
    );

    // Collect all unique categories from these planning horizons
    const uniqueCategories = new Map<string, Category>();
    for (const planingHorizon of userPlaningHorizons) {
      if (planingHorizon.categories.isInitialized()) {
        for (const category of planingHorizon.categories) {
          if (!category.deleted_at && !uniqueCategories.has(category.id)) {
            uniqueCategories.set(category.id, category);
          }
        }
      }
    }

    return Array.from(uniqueCategories.values()).map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      created_at: category.created_at,
      updated_at: category.updated_at,
    }));
  }

  /**
   * Update a category by ID
   * Only updates category if it belongs to the user through planning horizon -> budget
   */
  async updateCategory(
    id: string,
    userId: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    // First, get the category
    const category = await this.categoryRepository.findOne(
      {
        id,
        deleted_at: null,
      },
      {
        populate: ['planingHorizons'],
      },
    );

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category is linked to at least one planning horizon that belongs to the user
    if (!category.planingHorizons.isInitialized()) {
      await category.planingHorizons.loadItems();
    }
    const planingHorizonIds = category.planingHorizons
      .getItems()
      .map((ph) => ph.id);
    const userPlaningHorizons = await this.planingHorizonRepository.find({
      id: { $in: planingHorizonIds },
      budget: { user: { id: userId }, deleted_at: null },
      is_archived: false,
      deleted_at: null,
    });

    if (userPlaningHorizons.length === 0) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Update only provided fields
    if (updateCategoryDto.name !== undefined) {
      category.name = updateCategoryDto.name;
    }

    if (updateCategoryDto.description !== undefined) {
      category.description = updateCategoryDto.description;
    }

    await this.em.persist(category).flush();

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      created_at: category.created_at,
      updated_at: category.updated_at,
    };
  }

  /**
   * Soft delete a category by setting deleted_at timestamp
   * Only deletes category if it belongs to the user through planning horizon -> budget
   */
  async deleteCategory(id: string, userId: string): Promise<void> {
    // First, get the category
    const category = await this.categoryRepository.findOne(
      {
        id,
        deleted_at: null,
      },
      {
        populate: ['planingHorizons'],
      },
    );

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category is linked to at least one planning horizon that belongs to the user
    if (!category.planingHorizons.isInitialized()) {
      await category.planingHorizons.loadItems();
    }
    const planingHorizonIds = category.planingHorizons
      .getItems()
      .map((ph) => ph.id);
    const userPlaningHorizons = await this.planingHorizonRepository.find({
      id: { $in: planingHorizonIds },
      budget: { user: { id: userId }, deleted_at: null },
      is_archived: false,
      deleted_at: null,
    });

    if (userPlaningHorizons.length === 0) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category is already soft deleted
    if (category.deleted_at) {
      throw new BadRequestException(
        `Category with ID ${id} is already deleted`,
      );
    }

    category.deleted_at = new Date();
    await this.em.persist(category).flush();
  }
}
