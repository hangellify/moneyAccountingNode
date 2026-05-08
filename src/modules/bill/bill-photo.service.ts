import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { SubCategory } from '../../entities/sub-category.entity';
import { BillAiOrchestrator } from './bill-ai.orchestrator';
import type { ParsedBill } from './tasks/schemas/parsed-bill.schema';
import type { CategorizedBill } from './tasks/schemas/categorized-bill.schema';
import type {
  ParsedBillResponseDto,
  ParsedBillItemResponseDto,
} from './dto/parsed-bill-response.dto';

@Injectable()
export class BillPhotoService {
  constructor(
    private readonly orchestrator: BillAiOrchestrator,
    @InjectRepository(SubCategory)
    private readonly subCategoryRepo: EntityRepository<SubCategory>,
  ) {}

  async parseAndCategorize(
    image: Buffer,
    mediaType: 'image/png' | 'image/jpeg' | 'image/webp',
    userId: string,
  ): Promise<ParsedBillResponseDto> {
    const userSubCount = await this.subCategoryRepo.count({
      deleted_at: null,
      category: { user: { id: userId } },
    });

    if (userSubCount === 0) {
      const parsed = await this.orchestrator.parseOnly(
        image,
        mediaType,
        userId,
      );
      return this.toResponseDto(parsed, null, new Map());
    }

    const { parsed, categorized } = await this.orchestrator.parseAndCategorize(
      image,
      mediaType,
      userId,
    );

    const subIds = categorized.items
      .map((i) => i.sub_category_id)
      .filter((id): id is string => id !== null);

    const subs = subIds.length
      ? await this.subCategoryRepo.find(
          {
            id: { $in: subIds },
            deleted_at: null,
            category: { user: { id: userId } },
          },
          { populate: ['category'] },
        )
      : [];
    const byId = new Map(subs.map((s) => [s.id, s]));

    return this.toResponseDto(parsed, categorized, byId);
  }

  private toResponseDto(
    parsed: ParsedBill,
    categorized: CategorizedBill | null,
    byId: Map<string, SubCategory>,
  ): ParsedBillResponseDto {
    const catByIdx = new Map(
      (categorized?.items ?? []).map((c) => [c.item_index, c]),
    );
    const items: ParsedBillItemResponseDto[] = parsed.items.map((it, idx) => {
      const cat = catByIdx.get(idx);
      const sub = cat?.sub_category_id
        ? byId.get(cat.sub_category_id)
        : undefined;
      return {
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        weight_kg: it.weight_kg,
        price_per_kg: it.price_per_kg,
        final_price: it.final_price,
        sub_category: sub
          ? { id: sub.id, name: sub.name, category_name: sub.category.name }
          : null,
        category_confidence: cat?.confidence ?? 0,
        category_reasoning: cat?.reasoning,
      };
    });
    return {
      market_name: parsed.market_name,
      bill_date: parsed.bill_date,
      currency: parsed.currency,
      total_amount: parsed.total_amount,
      items,
      raw_extracted_text: parsed.raw_extracted_text,
    };
  }
}
