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
import { MarketService } from './market.service';
import { CreateMarketDto } from './dto/create-market.dto';
import { UpdateMarketDto } from './dto/update-market.dto';
import { MarketResponseDto } from './dto/market-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import {
  ApiCreateMarketResponses,
  ApiListMarketsResponses,
  ApiGetMarketResponses,
  ApiUpdateMarketResponses,
  ApiDeleteMarketResponses,
} from './decorators/api-responses.decorator';

@ApiTags('markets')
@Controller('markets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new market' })
  @ApiCreateMarketResponses()
  async createMarket(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMarketDto,
  ): Promise<MarketResponseDto> {
    return this.marketService.createMarket(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all markets for the current user' })
  @ApiListMarketsResponses()
  async listMarkets(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MarketResponseDto[]> {
    return this.marketService.listMarkets(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a market by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiGetMarketResponses()
  async getMarket(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<MarketResponseDto> {
    return this.marketService.getMarket(id, user.id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a market by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiUpdateMarketResponses()
  async updateMarket(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMarketDto,
  ): Promise<MarketResponseDto> {
    return this.marketService.updateMarket(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a market by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiDeleteMarketResponses()
  async deleteMarket(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.marketService.softDeleteMarket(id, user.id);
  }
}
