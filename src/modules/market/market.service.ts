import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import { Market } from '../../entities/market.entity';
import { User } from '../../entities/user.entity';
import { CreateMarketDto } from './dto/create-market.dto';
import { UpdateMarketDto } from './dto/update-market.dto';
import { MarketResponseDto } from './dto/market-response.dto';

@Injectable()
export class MarketService {
  constructor(
    @InjectRepository(Market)
    private readonly marketRepository: EntityRepository<Market>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private readonly em: EntityManager,
  ) {}

  async createMarket(
    userId: string,
    dto: CreateMarketDto,
  ): Promise<MarketResponseDto> {
    const user = await this.userRepository.findOneOrFail({ id: userId });
    const market = new Market();
    market.name = dto.name;
    market.city = dto.city;
    market.country = dto.country;
    market.address = dto.address;
    market.user = user;
    await this.em.persist(market).flush();
    return this.toDto(market);
  }

  async listMarkets(userId: string): Promise<MarketResponseDto[]> {
    const markets = await this.marketRepository.find({
      user: { id: userId },
      deleted_at: null,
    });
    return markets.map((m) => this.toDto(m));
  }

  async getMarket(id: string, userId: string): Promise<MarketResponseDto> {
    const market = await this.marketRepository.findOne({
      id,
      user: { id: userId },
      deleted_at: null,
    });
    if (!market) throw new NotFoundException(`Market with ID ${id} not found`);
    return this.toDto(market);
  }

  async updateMarket(
    id: string,
    userId: string,
    dto: UpdateMarketDto,
  ): Promise<MarketResponseDto> {
    const market = await this.marketRepository.findOne({
      id,
      user: { id: userId },
      deleted_at: null,
    });
    if (!market) throw new NotFoundException(`Market with ID ${id} not found`);
    if (dto.name !== undefined) market.name = dto.name;
    if (dto.city !== undefined) market.city = dto.city;
    if (dto.country !== undefined) market.country = dto.country;
    if (dto.address !== undefined) market.address = dto.address;
    await this.em.persist(market).flush();
    return this.toDto(market);
  }

  async softDeleteMarket(id: string, userId: string): Promise<void> {
    const market = await this.marketRepository.findOne({
      id,
      user: { id: userId },
      deleted_at: null,
    });
    if (!market) throw new NotFoundException(`Market with ID ${id} not found`);
    market.deleted_at = new Date();
    await this.em.persist(market).flush();
  }

  private toDto(market: Market): MarketResponseDto {
    return {
      id: market.id,
      name: market.name,
      address: market.address,
      city: market.city,
      country: market.country,
      created_at: market.created_at,
    };
  }
}
