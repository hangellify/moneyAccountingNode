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
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetResponseDto } from './dto/budget-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import {
  ApiCreateBudgetResponses,
  ApiGetBudgetResponses,
  ApiUpdateBudgetResponses,
  ApiDeleteBudgetResponses,
} from './decorators/api-responses.decorator';

@ApiTags('budgets')
@Controller('budgets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new budget' })
  @ApiCreateBudgetResponses()
  async createBudget(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createBudgetDto: CreateBudgetDto,
  ): Promise<BudgetResponseDto> {
    return this.budgetService.createBudget(user.id, createBudgetDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a budget by ID' })
  @ApiParam({
    name: 'id',
    description: 'Budget unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiGetBudgetResponses()
  async getBudget(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<BudgetResponseDto> {
    return this.budgetService.getBudget(id, user.id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a budget by ID' })
  @ApiParam({
    name: 'id',
    description: 'Budget unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiUpdateBudgetResponses()
  async updateBudget(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateBudgetDto: UpdateBudgetDto,
  ): Promise<BudgetResponseDto> {
    return this.budgetService.updateBudget(id, user.id, updateBudgetDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a budget by ID' })
  @ApiParam({
    name: 'id',
    description: 'Budget unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiDeleteBudgetResponses()
  async deleteBudget(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.budgetService.softDeleteBudget(id, user.id);
  }
}
