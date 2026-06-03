import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CategoryDefaultsService } from '../category/category-defaults.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserController {
  constructor(
    private readonly categoryDefaultsService: CategoryDefaultsService,
  ) {}

  @Post('me/seed-default-categories')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Seed (or restore) the default category tree for a household. Idempotent.',
  })
  @ApiQuery({ name: 'household_id', required: true, type: String })
  async seedDefaultCategories(
    @Query('household_id') householdId: string,
  ): Promise<void> {
    await this.categoryDefaultsService.seedForHousehold(householdId);
  }
}
