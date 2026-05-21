/* eslint-disable @typescript-eslint/unbound-method */
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { BillCrudService } from './bill-crud.service';
import { Bill } from '../../entities/bill.entity';
import { BillSubCategory } from '../../entities/bill-sub-category.entity';
import { BillStatus } from '../../types/bill-status.enum';
import { Market } from '../../entities/market.entity';
import { SubCategory } from '../../entities/sub-category.entity';
import { User } from '../../entities/user.entity';
import { CreateBillDto } from './dto/create-bill.dto';
import { ConfirmBillDto } from './dto/confirm-bill.dto';
import { ParsedBillResponseDto } from './dto/parsed-bill-response.dto';
import { Currency } from '../../types/currency.enum';

function makeService() {
  const billRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  } as unknown as EntityRepository<Bill>;
  const marketRepo = {
    findOne: jest.fn(),
  } as unknown as EntityRepository<Market>;
  const subCategoryRepo = {
    findOne: jest.fn(),
  } as unknown as EntityRepository<SubCategory>;
  const userRepo = {
    findOneOrFail: jest.fn(),
  } as unknown as EntityRepository<User>;
  const em = {
    persist: jest.fn().mockReturnThis(),
    flush: jest.fn().mockResolvedValue(undefined),
    getReference: jest.fn().mockReturnValue({}),
    nativeDelete: jest.fn().mockResolvedValue(1),
  } as unknown as EntityManager;
  return {
    service: new BillCrudService(
      billRepo,
      marketRepo,
      subCategoryRepo,
      userRepo,
      em,
    ),
    billRepo,
    marketRepo,
    subCategoryRepo,
    userRepo,
    em,
  };
}

const userId = 'user-1';
const billId = 'bill-1';
const marketId = 'market-1';
const subCatId = 'subcat-1';

describe('BillCrudService', () => {
  describe('createBill', () => {
    it('creates a bill with items and returns the detail DTO', async () => {
      const { service, userRepo, marketRepo, subCategoryRepo, em } =
        makeService();
      (userRepo.findOneOrFail as jest.Mock).mockResolvedValue({ id: userId });
      (marketRepo.findOne as jest.Mock).mockResolvedValue({
        id: marketId,
        name: 'Lidl',
        city: 'Bucharest',
        user: { id: userId },
        deleted_at: null,
      });
      (subCategoryRepo.findOne as jest.Mock).mockResolvedValue({
        id: subCatId,
        name: 'bun',
        deleted_at: null,
        category: { name: 'Bread' },
        user: { id: userId },
      });

      const dto: CreateBillDto = {
        market_id: marketId,
        bill_date: '2026-05-19',
        currency: Currency.EUR,
        total_amount: 9.99,
        items: [{ sub_category_id: subCatId, product_count: 1, amount: 9.99 }],
      };

      const result = await service.createBill(userId, dto);
      expect(result.total_amount).toBe(9.99);
      expect(em.flush as jest.Mock).toHaveBeenCalled();
    });

    it('throws BadRequestException when market not found for user', async () => {
      const { service, userRepo, marketRepo } = makeService();
      (userRepo.findOneOrFail as jest.Mock).mockResolvedValue({ id: userId });
      (marketRepo.findOne as jest.Mock).mockResolvedValue(null);

      const dto: CreateBillDto = {
        market_id: marketId,
        bill_date: '2026-05-19',
        total_amount: 9.99,
        items: [],
      };

      await expect(service.createBill(userId, dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('listBills', () => {
    it('returns non-deleted bills for user', async () => {
      const { service, billRepo } = makeService();
      (billRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.listBills(userId);
      expect(result).toEqual([]);
      expect(billRepo.find as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: userId },
          status: BillStatus.CONFIRMED,
          deleted_at: null,
        }),
        expect.anything(),
      );
    });
  });

  describe('getBill', () => {
    it('throws NotFoundException when bill not found', async () => {
      const { service, billRepo } = makeService();
      (billRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getBill(billId, userId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('softDeleteBill', () => {
    it('sets deleted_at on the bill', async () => {
      const { service, billRepo, em } = makeService();
      const bill = { id: billId, deleted_at: undefined } as unknown as Bill;
      (billRepo.findOne as jest.Mock).mockResolvedValue(bill);

      await service.softDeleteBill(billId, userId);

      expect(bill.deleted_at).toBeInstanceOf(Date);
      expect(em.flush as jest.Mock).toHaveBeenCalled();
    });
  });

  describe('createDraftFromParsed', () => {
    it('saves a draft bill and returns its id', async () => {
      const { service, em } = makeService();

      // Simulate MikroORM populating bill.id after the INSERT (gen_random_uuid())
      let persistedBill: Bill | undefined;
      (em.persist as jest.Mock).mockImplementation((entity: unknown) => {
        if (entity instanceof Bill) persistedBill = entity;
        return em;
      });
      (em.flush as jest.Mock).mockImplementation(() => {
        if (persistedBill) persistedBill.id = 'generated-uuid';
        return Promise.resolve();
      });

      const parsed: ParsedBillResponseDto = {
        draft_id: '',
        market_name: 'Lidl',
        bill_date: '2026-05-19',
        currency: 'EUR',
        total_amount: 9.99,
        raw_extracted_text: '',
        items: [],
      };

      const draftId = await service.createDraftFromParsed(userId, parsed);

      expect(typeof draftId).toBe('string');
      expect(em.flush as jest.Mock).toHaveBeenCalled();
    });
  });

  describe('listDrafts', () => {
    it('returns draft bills for user', async () => {
      const { service, billRepo } = makeService();
      (billRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.listDrafts(userId);

      expect(result).toEqual([]);
      expect(billRepo.find as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: userId },
          status: BillStatus.DRAFT,
          deleted_at: null,
        }),
        expect.anything(),
      );
    });
  });

  describe('confirmBill', () => {
    it('confirms a draft bill and returns detail DTO', async () => {
      const { service, billRepo, subCategoryRepo, em } = makeService();
      const bill = {
        id: billId,
        status: BillStatus.DRAFT,
        amount: 9.99,
        bill_date: new Date(),
        created_at: new Date(),
        deleted_at: undefined,
        market: undefined,
      } as unknown as Bill;
      (billRepo.findOne as jest.Mock).mockResolvedValue(bill);
      (subCategoryRepo.findOne as jest.Mock).mockResolvedValue({
        id: subCatId,
        name: 'bun',
        deleted_at: null,
        category: { name: 'Bread' },
      });
      jest.spyOn(em, 'nativeDelete').mockResolvedValue(1);

      const dto: ConfirmBillDto = {
        total_amount: 12,
        items: [{ sub_category_id: subCatId, product_count: 1, amount: 12 }],
      };

      const result = await service.confirmBill(billId, userId, dto);

      expect(bill.status).toBe(BillStatus.CONFIRMED);
      expect(result.total_amount).toBe(12);
      expect(em.flush as jest.Mock).toHaveBeenCalled();
    });

    it('throws NotFoundException when draft not found', async () => {
      const { service, billRepo } = makeService();
      (billRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.confirmBill(billId, userId, { items: [] }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createDraftFromParsed', () => {
    it('persists items with null sub_category using raw_name and other fields', async () => {
      const { service, em } = makeService();
      const parsed: ParsedBillResponseDto = {
        draft_id: '',
        market_name: null,
        bill_date: null,
        currency: null,
        total_amount: 28.2,
        raw_extracted_text: '',
        items: [
          {
            name: 'Paine Pumpern',
            quantity: 1,
            unit: 'piece',
            weight_kg: null,
            price_per_kg: null,
            final_price: 28.2,
            sub_category: null,
            category_confidence: 0.34,
            category_reasoning: undefined,
          },
        ],
      };

      await service.createDraftFromParsed(userId, parsed);

      const calls = (em.persist as jest.Mock).mock.calls as [unknown][];
      // bill + 1 BillSubCategory for the uncategorized item
      expect(calls).toHaveLength(2);
      const bsc = calls[1][0] as BillSubCategory;
      expect(bsc.raw_name).toBe('Paine Pumpern');
      expect(bsc.unit).toBe('piece');
      expect(bsc.sub_category).toBeUndefined();
      expect(bsc.category_confidence).toBeCloseTo(0.34);
      expect(bsc.amount).toBeCloseTo(28.2);
    });

    it('sets all new fields for categorized items', async () => {
      const { service, em } = makeService();
      const parsed: ParsedBillResponseDto = {
        draft_id: '',
        market_name: null,
        bill_date: null,
        currency: null,
        total_amount: 88.39,
        raw_extracted_text: '',
        items: [
          {
            name: 'Carnaciori Ki',
            quantity: null,
            unit: 'kg',
            weight_kg: 0.539,
            price_per_kg: 164.3,
            final_price: 88.39,
            sub_category: {
              id: 'scat-1',
              name: 'sausages',
              category_name: 'Meat & Fish',
            },
            category_confidence: 0.95,
            category_reasoning: '"Carnaciori" are sausages.',
          },
        ],
      };

      await service.createDraftFromParsed(userId, parsed);

      const calls = (em.persist as jest.Mock).mock.calls as [unknown][];
      expect(calls).toHaveLength(2);
      const bsc = calls[1][0] as BillSubCategory;
      expect(bsc.raw_name).toBe('Carnaciori Ki');
      expect(bsc.unit).toBe('kg');
      expect(bsc.price_per_unit).toBeCloseTo(164.3);
      expect(bsc.category_confidence).toBeCloseTo(0.95);
      expect(bsc.category_reasoning).toBe('"Carnaciori" are sausages.');
      expect(bsc.product_weight).toBeCloseTo(0.539);
    });

    it('merges same sub_category items and takes raw_name from first', async () => {
      const { service, em } = makeService();
      const parsed: ParsedBillResponseDto = {
        draft_id: '',
        market_name: null,
        bill_date: null,
        currency: null,
        total_amount: 60,
        raw_extracted_text: '',
        items: [
          {
            name: 'Lapte 1L',
            quantity: 1,
            unit: 'piece',
            weight_kg: null,
            price_per_kg: null,
            final_price: 27.5,
            sub_category: {
              id: 'milk-id',
              name: 'milk',
              category_name: 'Dairy',
            },
            category_confidence: 0.96,
            category_reasoning: 'milk',
          },
          {
            name: 'Lapte 0.5L',
            quantity: 2,
            unit: 'piece',
            weight_kg: null,
            price_per_kg: null,
            final_price: 32.5,
            sub_category: {
              id: 'milk-id',
              name: 'milk',
              category_name: 'Dairy',
            },
            category_confidence: 0.96,
            category_reasoning: 'milk',
          },
        ],
      };

      await service.createDraftFromParsed(userId, parsed);

      const calls = (em.persist as jest.Mock).mock.calls as [unknown][];
      expect(calls).toHaveLength(2); // bill + 1 merged BillSubCategory
      const bsc = calls[1][0] as BillSubCategory;
      expect(bsc.raw_name).toBe('Lapte 1L'); // first item wins
      expect(bsc.amount).toBeCloseTo(60); // summed
      expect(bsc.product_count).toBe(3); // summed
      expect(bsc.category_confidence).toBeCloseTo(0.96); // from first item
      expect(bsc.category_reasoning).toBe('milk'); // from first item
    });

    it('handles a mix of categorized and uncategorized items producing separate rows', async () => {
      const { service, em } = makeService();
      const parsed: ParsedBillResponseDto = {
        draft_id: '',
        market_name: null,
        bill_date: null,
        currency: null,
        total_amount: 100,
        raw_extracted_text: '',
        items: [
          {
            name: 'Lapte 1L',
            quantity: 1,
            unit: 'piece',
            weight_kg: null,
            price_per_kg: null,
            final_price: 27.5,
            sub_category: {
              id: 'milk-id',
              name: 'milk',
              category_name: 'Dairy',
            },
            category_confidence: 0.96,
            category_reasoning: 'milk',
          },
          {
            name: 'Unknown item',
            quantity: 1,
            unit: null,
            weight_kg: null,
            price_per_kg: null,
            final_price: 72.5,
            sub_category: null,
            category_confidence: 0.1,
            category_reasoning: undefined,
          },
        ],
      };

      await service.createDraftFromParsed(userId, parsed);

      const calls = (em.persist as jest.Mock).mock.calls as [unknown][];
      // bill + 1 categorized BSC + 1 uncategorized BSC = 3 persist calls
      expect(calls).toHaveLength(3);
      const bsc1 = calls[1][0] as BillSubCategory;
      const bsc2 = calls[2][0] as BillSubCategory;
      expect(bsc1.raw_name).toBe('Lapte 1L');
      expect(bsc1.sub_category).toBeDefined();
      expect(bsc2.raw_name).toBe('Unknown item');
      expect(bsc2.sub_category).toBeUndefined();
    });
  });
});
