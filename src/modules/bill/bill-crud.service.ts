import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import { Bill } from '../../entities/bill.entity';
import { BillSubCategory } from '../../entities/bill-sub-category.entity';
import { Market } from '../../entities/market.entity';
import { SubCategory } from '../../entities/sub-category.entity';
import { User } from '../../entities/user.entity';
import { BillStatus } from '../../types/bill-status.enum';
import { Currency } from '../../types/currency.enum';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { ConfirmBillDto } from './dto/confirm-bill.dto';
import type { ParsedBillResponseDto } from './dto/parsed-bill-response.dto';
import { BillResponseDto, BillMarketRefDto } from './dto/bill-response.dto';
import {
  BillDetailResponseDto,
  BillItemResponseDto,
} from './dto/bill-detail-response.dto';

@Injectable()
export class BillCrudService {
  constructor(
    @InjectRepository(Bill)
    private readonly billRepository: EntityRepository<Bill>,
    @InjectRepository(Market)
    private readonly marketRepository: EntityRepository<Market>,
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: EntityRepository<SubCategory>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private readonly em: EntityManager,
  ) {}

  async createBill(
    userId: string,
    dto: CreateBillDto,
  ): Promise<BillDetailResponseDto> {
    const user = await this.userRepository.findOneOrFail({ id: userId });

    let market: Market | null = null;
    if (dto.market_id) {
      market = await this.marketRepository.findOne({
        id: dto.market_id,
        user: { id: userId },
        deleted_at: null,
      });
      if (!market) {
        throw new BadRequestException(
          `Market with ID ${dto.market_id} not found or belongs to another user`,
        );
      }
    }

    const bill = new Bill();
    bill.user = user;
    bill.bill_date = new Date(dto.bill_date);
    bill.amount = dto.total_amount;
    bill.description = dto.description;
    bill.currency = dto.currency;
    if (market) bill.market = market;

    const bscEntities: BillSubCategory[] = [];
    for (const item of dto.items) {
      const subCat = await this.subCategoryRepository.findOne(
        {
          id: item.sub_category_id,
          deleted_at: null,
          category: { user: { id: userId }, deleted_at: null },
        },
        { populate: ['category'] },
      );
      if (!subCat) {
        throw new BadRequestException(
          `SubCategory with ID ${item.sub_category_id} not found or belongs to another user`,
        );
      }
      const bsc = new BillSubCategory();
      bsc.bill = bill;
      bsc.sub_category = subCat;
      bsc.product_count = item.product_count;
      bsc.amount = item.amount;
      if (item.product_weight !== undefined)
        bsc.product_weight = item.product_weight;
      bscEntities.push(bsc);
    }

    this.em.persist(bill);
    for (const bsc of bscEntities) this.em.persist(bsc);
    await this.em.flush();
    return this.toDetailDto(bill, bscEntities);
  }

  async listBills(userId: string): Promise<BillResponseDto[]> {
    const bills = await this.billRepository.find(
      { user: { id: userId }, status: BillStatus.CONFIRMED, deleted_at: null },
      { populate: ['market'] },
    );
    return bills.map((b) => this.toListDto(b));
  }

  async getBill(id: string, userId: string): Promise<BillDetailResponseDto> {
    const bill = await this.billRepository.findOne(
      { id, user: { id: userId }, deleted_at: null },
      { populate: ['market', 'billSubCategories.sub_category.category'] },
    );
    if (!bill) throw new NotFoundException(`Bill with ID ${id} not found`);
    return this.toDetailDto(bill, bill.billSubCategories.getItems());
  }

  async updateBill(
    id: string,
    userId: string,
    dto: UpdateBillDto,
  ): Promise<BillResponseDto> {
    const bill = await this.billRepository.findOne(
      { id, user: { id: userId }, deleted_at: null },
      { populate: ['market'] },
    );
    if (!bill) throw new NotFoundException(`Bill with ID ${id} not found`);

    if (dto.market_id !== undefined) {
      const market = await this.marketRepository.findOne({
        id: dto.market_id,
        user: { id: userId },
        deleted_at: null,
      });
      if (!market) {
        throw new BadRequestException(
          `Market with ID ${dto.market_id} not found or belongs to another user`,
        );
      }
      bill.market = market;
    }
    if (dto.bill_date !== undefined) bill.bill_date = new Date(dto.bill_date);
    if (dto.currency !== undefined) bill.currency = dto.currency;
    if (dto.total_amount !== undefined) bill.amount = dto.total_amount;
    if (dto.description !== undefined) bill.description = dto.description;

    await this.em.persist(bill).flush();
    return this.toListDto(bill);
  }

  async softDeleteBill(id: string, userId: string): Promise<void> {
    const bill = await this.billRepository.findOne({
      id,
      user: { id: userId },
      deleted_at: null,
    });
    if (!bill) throw new NotFoundException(`Bill with ID ${id} not found`);
    bill.deleted_at = new Date();
    await this.em.persist(bill).flush();
  }

  async createDraftFromParsed(
    userId: string,
    dto: ParsedBillResponseDto,
  ): Promise<string> {
    const bill = new Bill();
    bill.user = this.em.getReference(User, userId);
    bill.status = BillStatus.DRAFT;
    bill.market_name_raw = dto.market_name ?? undefined;
    bill.bill_date = dto.bill_date ? new Date(dto.bill_date) : new Date();
    bill.amount = dto.total_amount ?? 0;
    bill.currency = dto.currency
      ? (dto.currency as unknown as Currency)
      : undefined;

    // Merge items by sub_category id (AI may return same category twice)
    const merged = new Map<
      string,
      { amount: number; product_count: number; weight_kg?: number }
    >();
    for (const item of dto.items) {
      if (!item.sub_category) continue;
      const id = item.sub_category.id;
      const existing = merged.get(id);
      if (existing) {
        existing.amount += item.final_price;
        existing.product_count += item.quantity ?? 1;
      } else {
        merged.set(id, {
          amount: item.final_price,
          product_count: item.quantity ?? 1,
          weight_kg: item.weight_kg ?? undefined,
        });
      }
    }

    this.em.persist(bill);

    for (const [subCatId, data] of merged) {
      const bsc = new BillSubCategory();
      bsc.bill = bill;
      bsc.sub_category = this.em.getReference(SubCategory, subCatId);
      bsc.product_count = data.product_count;
      bsc.amount = data.amount;
      if (data.weight_kg !== undefined) bsc.product_weight = data.weight_kg;
      this.em.persist(bsc);
    }

    await this.em.flush();
    return bill.id;
  }

  async listDrafts(userId: string): Promise<BillResponseDto[]> {
    const bills = await this.billRepository.find(
      { user: { id: userId }, status: BillStatus.DRAFT, deleted_at: null },
      { populate: ['market'] },
    );
    return bills.map((b) => this.toListDto(b));
  }

  async confirmBill(
    id: string,
    userId: string,
    dto: ConfirmBillDto,
  ): Promise<BillDetailResponseDto> {
    const bill = await this.billRepository.findOne(
      { id, user: { id: userId }, status: BillStatus.DRAFT, deleted_at: null },
      { populate: ['market'] },
    );
    if (!bill)
      throw new NotFoundException(`Draft bill with ID ${id} not found`);

    // Resolve market
    if (dto.market_id) {
      const market = await this.marketRepository.findOne({
        id: dto.market_id,
        user: { id: userId },
        deleted_at: null,
      });
      if (!market) {
        throw new BadRequestException(
          `Market with ID ${dto.market_id} not found or belongs to another user`,
        );
      }
      bill.market = market;
    } else if (dto.new_market) {
      bill.market = await this.findOrCreateMarket(userId, dto.new_market);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      bill.market = null as any;
    }

    // Apply overrides
    if (dto.bill_date !== undefined) bill.bill_date = new Date(dto.bill_date);
    if (dto.currency !== undefined) bill.currency = dto.currency;
    if (dto.total_amount !== undefined) bill.amount = dto.total_amount;
    if (dto.description !== undefined) bill.description = dto.description;

    // Replace items
    await this.em.nativeDelete(BillSubCategory, { bill: id });

    const bscEntities: BillSubCategory[] = [];
    for (const item of dto.items) {
      const subCat = await this.subCategoryRepository.findOne(
        {
          id: item.sub_category_id,
          deleted_at: null,
          category: { user: { id: userId }, deleted_at: null },
        },
        { populate: ['category'] },
      );
      if (!subCat) {
        throw new BadRequestException(
          `SubCategory with ID ${item.sub_category_id} not found or belongs to another user`,
        );
      }
      const bsc = new BillSubCategory();
      bsc.bill = bill;
      bsc.sub_category = subCat;
      bsc.product_count = item.product_count;
      bsc.amount = item.amount;
      if (item.product_weight !== undefined)
        bsc.product_weight = item.product_weight;
      bscEntities.push(bsc);
    }

    bill.status = BillStatus.CONFIRMED;
    this.em.persist(bill);
    for (const bsc of bscEntities) this.em.persist(bsc);
    await this.em.flush();

    return this.toDetailDto(bill, bscEntities);
  }

  private async findOrCreateMarket(
    userId: string,
    dto: { name: string; city?: string; country?: string; address?: string },
  ): Promise<Market> {
    const existing = await this.marketRepository.findOne({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      name: { $ilike: dto.name } as any,
      user: { id: userId },
      deleted_at: null,
    });
    if (existing) return existing;

    const market = new Market();
    market.name = dto.name;
    market.city = dto.city;
    market.country = dto.country;
    market.address = dto.address;
    market.user = this.em.getReference(User, userId);
    this.em.persist(market);
    return market;
  }

  private toMarketRef(market?: Market): BillMarketRefDto | undefined {
    if (!market) return undefined;
    return { id: market.id, name: market.name, city: market.city };
  }

  private toListDto(bill: Bill): BillResponseDto {
    return {
      id: bill.id,
      bill_date: bill.bill_date,
      currency: bill.currency,
      total_amount: bill.amount,
      description: bill.description,
      market: this.toMarketRef(bill.market),
      created_at: bill.created_at,
    };
  }

  private toDetailDto(
    bill: Bill,
    items: BillSubCategory[],
  ): BillDetailResponseDto {
    return {
      ...this.toListDto(bill),
      items: items.map(
        (bsc): BillItemResponseDto => ({
          sub_category: bsc.sub_category
            ? {
                id: bsc.sub_category.id,
                name: bsc.sub_category.name,
                category_name: bsc.sub_category.category?.name ?? '',
              }
            : null,
          product_count: bsc.product_count,
          amount: bsc.amount,
          product_weight: bsc.product_weight,
        }),
      ),
    };
  }
}
