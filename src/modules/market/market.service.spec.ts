/* eslint-disable @typescript-eslint/unbound-method */
import { NotFoundException } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { MarketService } from './market.service';
import { Market } from '../../entities/market.entity';
import { User } from '../../entities/user.entity';
import { CreateMarketDto } from './dto/create-market.dto';
import { UpdateMarketDto } from './dto/update-market.dto';

function makeService() {
  const marketRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  } as unknown as EntityRepository<Market>;

  const userRepo = {
    findOneOrFail: jest.fn(),
  } as unknown as EntityRepository<User>;

  const em = {
    persist: jest.fn().mockReturnThis(),
    flush: jest.fn().mockResolvedValue(undefined),
  } as unknown as EntityManager;

  const service = new MarketService(marketRepo, userRepo, em);
  return { service, marketRepo, userRepo, em };
}

const userId = 'user-1';
const marketId = 'market-1';

describe('MarketService', () => {
  describe('createMarket', () => {
    it('creates and returns the new market', async () => {
      const { service, userRepo, em } = makeService();
      const user = { id: userId } as User;
      (userRepo.findOneOrFail as jest.Mock).mockResolvedValue(user);
      (em.persist as jest.Mock).mockReturnThis();

      const dto: CreateMarketDto = {
        name: 'Lidl',
        city: 'Bucharest',
        country: 'RO',
      };
      const result = await service.createMarket(userId, dto);

      expect(result.name).toBe('Lidl');
      expect(result.city).toBe('Bucharest');
      expect(result.country).toBe('RO');
      expect(em.flush as jest.Mock).toHaveBeenCalled();
    });
  });

  describe('listMarkets', () => {
    it('returns non-deleted markets for the user', async () => {
      const { service, marketRepo } = makeService();
      const markets = [
        {
          id: 'm1',
          name: 'Lidl',
          city: 'Bucharest',
          country: 'RO',
          created_at: new Date(),
        },
      ] as unknown as Market[];
      (marketRepo.find as jest.Mock).mockResolvedValue(markets);

      const result = await service.listMarkets(userId);
      expect(result).toHaveLength(1);
      expect(marketRepo.find as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ user: { id: userId }, deleted_at: null }),
      );
    });
  });

  describe('getMarket', () => {
    it('returns a market by id for the correct user', async () => {
      const { service, marketRepo } = makeService();
      const market = {
        id: marketId,
        name: 'Lidl',
        city: 'Bucharest',
        country: 'RO',
        created_at: new Date(),
      } as unknown as Market;
      (marketRepo.findOne as jest.Mock).mockResolvedValue(market);

      const result = await service.getMarket(marketId, userId);
      expect(result.id).toBe(marketId);
    });

    it('throws NotFoundException when market not found', async () => {
      const { service, marketRepo } = makeService();
      (marketRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getMarket(marketId, userId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateMarket', () => {
    it('updates fields and returns updated market', async () => {
      const { service, marketRepo, em } = makeService();
      const market = {
        id: marketId,
        name: 'Lidl',
        city: 'Bucharest',
        country: 'RO',
        created_at: new Date(),
      } as unknown as Market;
      (marketRepo.findOne as jest.Mock).mockResolvedValue(market);

      const dto: UpdateMarketDto = { name: 'Penny' };
      const result = await service.updateMarket(marketId, userId, dto);

      expect(result.name).toBe('Penny');
      expect(em.flush as jest.Mock).toHaveBeenCalled();
    });

    it('throws NotFoundException when market not found', async () => {
      const { service, marketRepo } = makeService();
      (marketRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateMarket(marketId, userId, {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('softDeleteMarket', () => {
    it('sets deleted_at and flushes', async () => {
      const { service, marketRepo, em } = makeService();
      const market = {
        id: marketId,
        deleted_at: undefined,
      } as unknown as Market;
      (marketRepo.findOne as jest.Mock).mockResolvedValue(market);

      await service.softDeleteMarket(marketId, userId);

      expect(market.deleted_at).toBeInstanceOf(Date);
      expect(em.flush as jest.Mock).toHaveBeenCalled();
    });

    it('throws NotFoundException when market not found', async () => {
      const { service, marketRepo } = makeService();
      (marketRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.softDeleteMarket(marketId, userId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
