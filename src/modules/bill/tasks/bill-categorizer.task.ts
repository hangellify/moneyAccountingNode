import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { z } from 'zod';
import { AiTask, TaskRequest } from '../../ai-gateway/types/ai-task';
import { Capability } from '../../ai-gateway/types/capability';
import { SubCategory } from '../../../entities/sub-category.entity';
import {
  CategorizedBill,
  CategorizedBillSchema,
} from './schemas/categorized-bill.schema';
import { ParsedBillItemSchema } from './schemas/parsed-bill.schema';
import { BILL_CATEGORIZER_SYSTEM_PROMPT } from './prompts';

const InputSchema = z.object({
  items: z.array(ParsedBillItemSchema),
});
type Input = z.infer<typeof InputSchema>;

@Injectable()
export class BillCategorizerTask extends AiTask<Input, CategorizedBill> {
  readonly name = 'bill.categorize';
  readonly requiredCapabilities = new Set<Capability>(['text', 'json']);
  readonly inputSchema = InputSchema;
  readonly outputSchema = CategorizedBillSchema;
  override readonly temperature = 0;

  constructor(
    @InjectRepository(SubCategory)
    private readonly subCategoryRepo: EntityRepository<SubCategory>,
  ) {
    super();
  }

  async buildRequest(input: Input): Promise<TaskRequest> {
    const subs = await this.subCategoryRepo.find(
      { deleted_at: null },
      { populate: ['category'] },
    );
    const tree = this.renderTree(subs);
    const itemsText = input.items.map((it, i) => `${i}: ${it.name}`).join('\n');

    return {
      messages: [
        { role: 'system', text: BILL_CATEGORIZER_SYSTEM_PROMPT },
        {
          role: 'user',
          text:
            `Available categories (sub_category_id | category > sub_category):\n${tree}\n\n` +
            `Items to classify (index: name):\n${itemsText}\n\n` +
            `For each item, return the matching sub_category_id (UUID from the list), or null if no confident match.`,
        },
      ],
    };
  }

  private renderTree(subs: SubCategory[]): string {
    return subs
      .map((s) => `${s.id} | ${s.category.name} > ${s.name}`)
      .join('\n');
  }
}
