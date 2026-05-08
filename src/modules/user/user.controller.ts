import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CategoryDefaultsService } from '../category/category-defaults.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { SeedDefaultsResponseDto } from './dto/seed-defaults-response.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserController {
  constructor(private readonly categoryDefaults: CategoryDefaultsService) {}

  @Post('me/seed-default-categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Seed (or restore) the default category tree for the current user. Idempotent.',
  })
  @ApiOkResponse({ type: SeedDefaultsResponseDto })
  async seedDefaultCategories(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SeedDefaultsResponseDto> {
    const { categoriesCreated, subCategoriesCreated } =
      await this.categoryDefaults.seedForUser(user.id);
    return {
      categories_created: categoriesCreated,
      sub_categories_created: subCategoriesCreated,
    };
  }
}
