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
import { PlaningHorizonService } from './planing-horizon.service';
import { CreatePlaningHorizonDto } from './dto/create-planing-horizon.dto';
import { UpdatePlaningHorizonDto } from './dto/update-planing-horizon.dto';
import { PlaningHorizonResponseDto } from './dto/planing-horizon-response.dto';
import { PlaningHorizonBaseResponseDto } from './dto/planing-horizon-base-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import {
  ApiCreatePlaningHorizonResponses,
  ApiGetPlaningHorizonResponses,
  ApiUpdatePlaningHorizonResponses,
  ApiDeletePlaningHorizonResponses,
  ApiListPlaningHorizonsResponses,
} from './decorators/api-responses.decorator';

@ApiTags('planing-horizons')
@Controller('planing-horizons')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PlaningHorizonController {
  constructor(private readonly planingHorizonService: PlaningHorizonService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new planning horizon' })
  @ApiCreatePlaningHorizonResponses()
  async createPlaningHorizon(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createPlaningHorizonDto: CreatePlaningHorizonDto,
  ): Promise<PlaningHorizonBaseResponseDto> {
    return this.planingHorizonService.createPlaningHorizon(
      user.id,
      createPlaningHorizonDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all planning horizons for the current user' })
  @ApiListPlaningHorizonsResponses()
  async listPlaningHorizons(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PlaningHorizonBaseResponseDto[]> {
    return this.planingHorizonService.listPlaningHorizons(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a planning horizon by ID' })
  @ApiParam({
    name: 'id',
    description: 'Planning horizon unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiGetPlaningHorizonResponses()
  async getPlaningHorizon(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PlaningHorizonResponseDto> {
    return this.planingHorizonService.getPlaningHorizon(id, user.id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a planning horizon by ID' })
  @ApiParam({
    name: 'id',
    description: 'Planning horizon unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiUpdatePlaningHorizonResponses()
  async updatePlaningHorizon(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updatePlaningHorizonDto: UpdatePlaningHorizonDto,
  ): Promise<PlaningHorizonBaseResponseDto> {
    return this.planingHorizonService.updatePlaningHorizon(
      id,
      user.id,
      updatePlaningHorizonDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a planning horizon by ID' })
  @ApiParam({
    name: 'id',
    description: 'Planning horizon unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiDeletePlaningHorizonResponses()
  async deletePlaningHorizon(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.planingHorizonService.softDeletePlaningHorizon(id, user.id);
  }
}
