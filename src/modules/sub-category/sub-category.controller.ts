import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SubCategoryService } from './sub-category.service';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { BulkCreateSubCategoryDto } from './dto/bulk-create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
import { SubCategoryResponseDto } from './dto/sub-category-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import {
  ApiCreateSubCategoryResponses,
  ApiBulkCreateSubCategoryResponses,
  ApiGetSubCategoryResponses,
  ApiGetAllSubCategoriesResponses,
  ApiUpdateSubCategoryResponses,
  ApiDeleteSubCategoryResponses,
} from './decorators/api-responses.decorator';

@ApiTags('sub-categories')
@Controller('sub-categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SubCategoryController {
  constructor(private readonly subCategoryService: SubCategoryService) {}

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk create sub-categories for a category' })
  @ApiBulkCreateSubCategoryResponses()
  async bulkCreateSubCategories(
    @CurrentUser() user: AuthenticatedUser,
    @Body() bulkCreateSubCategoryDto: BulkCreateSubCategoryDto,
  ): Promise<SubCategoryResponseDto[]> {
    return this.subCategoryService.bulkCreateSubCategories(
      user.id,
      bulkCreateSubCategoryDto,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new sub-category' })
  @ApiCreateSubCategoryResponses()
  async createSubCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createSubCategoryDto: CreateSubCategoryDto,
  ): Promise<SubCategoryResponseDto> {
    return this.subCategoryService.createSubCategory(
      user.id,
      createSubCategoryDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all user sub-categories' })
  @ApiGetAllSubCategoriesResponses()
  async getAllUserSubCategories(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubCategoryResponseDto[]> {
    return this.subCategoryService.getAllUserSubCategories(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a sub-category by ID' })
  @ApiParam({
    name: 'id',
    description: 'Sub-category unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiGetSubCategoryResponses()
  async getSubCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<SubCategoryResponseDto> {
    return this.subCategoryService.getSubCategory(id, user.id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a sub-category by ID' })
  @ApiParam({
    name: 'id',
    description: 'Sub-category unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiUpdateSubCategoryResponses()
  async updateSubCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateSubCategoryDto: UpdateSubCategoryDto,
  ): Promise<SubCategoryResponseDto> {
    return this.subCategoryService.updateSubCategory(
      id,
      user.id,
      updateSubCategoryDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a sub-category by ID' })
  @ApiParam({
    name: 'id',
    description: 'Sub-category unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiDeleteSubCategoryResponses()
  async deleteSubCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.subCategoryService.softDeleteSubCategory(id, user.id);
  }
}
