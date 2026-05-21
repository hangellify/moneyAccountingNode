import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import { SubCategory } from '../../entities/sub-category.entity';
import { Category } from '../../entities/category.entity';
import { PlaningHorizon } from '../../entities/planing-horizon.entity';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { BulkCreateSubCategoryDto } from './dto/bulk-create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
import { SubCategoryResponseDto } from './dto/sub-category-response.dto';

@Injectable()
export class SubCategoryService {
  constructor(
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: EntityRepository<SubCategory>,
    @InjectRepository(Category)
    private readonly categoryRepository: EntityRepository<Category>,
    @InjectRepository(PlaningHorizon)
    private readonly planingHorizonRepository: EntityRepository<PlaningHorizon>,
    private readonly em: EntityManager,
  ) {}

  /**
   * Verify that a category belongs to the user through planning horizon -> budget
   */
  private async verifyCategoryBelongsToUser(
    categoryId: string,
    userId: string,
  ): Promise<Category> {
    const category = await this.categoryRepository.findOne(
      {
        id: categoryId,
        deleted_at: null,
      },
      {
        populate: ['planingHorizons'],
      },
    );

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
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
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    return category;
  }

  /**
   * Create a new sub-category and link it to a category
   * Category must belong to the user through planning horizon -> budget
   */
  async createSubCategory(
    userId: string,
    createSubCategoryDto: CreateSubCategoryDto,
  ): Promise<SubCategoryResponseDto> {
    // Verify that the category exists and belongs to the user
    const category = await this.verifyCategoryBelongsToUser(
      createSubCategoryDto.category_id,
      userId,
    );

    const subCategory = new SubCategory();
    subCategory.name = createSubCategoryDto.name;
    subCategory.description = createSubCategoryDto.description;
    subCategory.category = category;

    await this.em.persist(subCategory).flush();

    return {
      id: subCategory.id,
      name: subCategory.name,
      description: subCategory.description,
      category_id: subCategory.category.id,
      category_name: subCategory.category.name,
      created_at: subCategory.created_at,
      updated_at: subCategory.updated_at,
    };
  }

  /**
   * Bulk create sub-categories for a category
   * All sub-categories will be related to one category
   */
  async bulkCreateSubCategories(
    userId: string,
    bulkCreateSubCategoryDto: BulkCreateSubCategoryDto,
  ): Promise<SubCategoryResponseDto[]> {
    // Verify that the category exists and belongs to the user
    const category = await this.verifyCategoryBelongsToUser(
      bulkCreateSubCategoryDto.category_id,
      userId,
    );

    const subCategories: SubCategory[] = [];

    for (const subCategoryItem of bulkCreateSubCategoryDto.sub_categories) {
      const subCategory = new SubCategory();
      subCategory.name = subCategoryItem.name;
      subCategory.description = subCategoryItem.description;
      subCategory.category = category;
      subCategories.push(subCategory);
    }

    await this.em.persist(subCategories).flush();

    return subCategories.map((subCategory) => ({
      id: subCategory.id,
      name: subCategory.name,
      description: subCategory.description,
      category_id: subCategory.category.id,
      category_name: subCategory.category.name,
      created_at: subCategory.created_at,
      updated_at: subCategory.updated_at,
    }));
  }

  /**
   * Get a sub-category by ID
   * Only returns sub-category if it belongs to the user through category -> planning horizon -> budget
   */
  async getSubCategory(
    id: string,
    userId: string,
  ): Promise<SubCategoryResponseDto> {
    const subCategory = await this.subCategoryRepository.findOne(
      {
        id,
        deleted_at: null,
      },
      {
        populate: ['category'],
      },
    );

    if (!subCategory) {
      throw new NotFoundException(`Sub-category with ID ${id} not found`);
    }

    // Verify that the category belongs to the user
    await this.verifyCategoryBelongsToUser(subCategory.category.id, userId);

    return {
      id: subCategory.id,
      name: subCategory.name,
      description: subCategory.description,
      category_id: subCategory.category.id,
      category_name: subCategory.category.name,
      created_at: subCategory.created_at,
      updated_at: subCategory.updated_at,
    };
  }

  /**
   * Get all sub-categories for a user
   * Returns sub-categories that belong to categories that belong to planning horizons that belong to budgets that belong to the user
   */
  async getAllUserSubCategories(
    userId: string,
  ): Promise<SubCategoryResponseDto[]> {
    // Get all planning horizons for the user
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
    const uniqueCategoryIds = new Set<string>();
    for (const planingHorizon of userPlaningHorizons) {
      if (planingHorizon.categories.isInitialized()) {
        for (const category of planingHorizon.categories) {
          if (!category.deleted_at) {
            uniqueCategoryIds.add(category.id);
          }
        }
      }
    }

    // Get all sub-categories for these categories
    const subCategories = await this.subCategoryRepository.find(
      {
        category: { id: { $in: Array.from(uniqueCategoryIds) } },
        deleted_at: null,
      },
      {
        populate: ['category'],
      },
    );

    return subCategories.map((subCategory) => ({
      id: subCategory.id,
      name: subCategory.name,
      description: subCategory.description,
      category_id: subCategory.category.id,
      category_name: subCategory.category.name,
      created_at: subCategory.created_at,
      updated_at: subCategory.updated_at,
    }));
  }

  /**
   * Update a sub-category by ID
   * Only updates sub-category if it belongs to the user through category -> planning horizon -> budget
   */
  async updateSubCategory(
    id: string,
    userId: string,
    updateSubCategoryDto: UpdateSubCategoryDto,
  ): Promise<SubCategoryResponseDto> {
    const subCategory = await this.subCategoryRepository.findOne(
      {
        id,
        deleted_at: null,
      },
      {
        populate: ['category'],
      },
    );

    if (!subCategory) {
      throw new NotFoundException(`Sub-category with ID ${id} not found`);
    }

    // Verify that the category belongs to the user
    await this.verifyCategoryBelongsToUser(subCategory.category.id, userId);

    // Update only provided fields
    if (updateSubCategoryDto.name !== undefined) {
      subCategory.name = updateSubCategoryDto.name;
    }

    if (updateSubCategoryDto.description !== undefined) {
      subCategory.description = updateSubCategoryDto.description;
    }

    await this.em.persist(subCategory).flush();

    return {
      id: subCategory.id,
      name: subCategory.name,
      description: subCategory.description,
      category_id: subCategory.category.id,
      category_name: subCategory.category.name,
      created_at: subCategory.created_at,
      updated_at: subCategory.updated_at,
    };
  }

  /**
   * Soft delete a sub-category by setting deleted_at timestamp
   * Only deletes sub-category if it belongs to the user through category -> planning horizon -> budget
   */
  async softDeleteSubCategory(id: string, userId: string): Promise<void> {
    const subCategory = await this.subCategoryRepository.findOne(
      {
        id,
        deleted_at: null,
      },
      {
        populate: ['category'],
      },
    );

    if (!subCategory) {
      throw new NotFoundException(`Sub-category with ID ${id} not found`);
    }

    // Verify that the category belongs to the user
    await this.verifyCategoryBelongsToUser(subCategory.category.id, userId);

    // Check if sub-category is already soft deleted
    if (subCategory.deleted_at) {
      throw new BadRequestException(
        `Sub-category with ID ${id} is already deleted`,
      );
    }

    subCategory.deleted_at = new Date();
    await this.em.persist(subCategory).flush();
  }
}
