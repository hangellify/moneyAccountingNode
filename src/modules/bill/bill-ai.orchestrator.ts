import { Injectable } from '@nestjs/common';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import { BillParserTask } from './tasks/bill-parser.task';
import { BillCategorizerTask } from './tasks/bill-categorizer.task';
import { ParsedBill } from './tasks/schemas/parsed-bill.schema';
import { CategorizedBill } from './tasks/schemas/categorized-bill.schema';

@Injectable()
export class BillAiOrchestrator {
  constructor(
    private readonly gateway: AiGatewayService,
    private readonly parser: BillParserTask,
    private readonly categorizer: BillCategorizerTask,
  ) {}

  async parseAndCategorize(
    image: Buffer,
    mediaType: 'image/png' | 'image/jpeg' | 'image/webp',
    userId: string,
    hint?: string,
  ): Promise<{ parsed: ParsedBill; categorized: CategorizedBill }> {
    const parsed = await this.gateway.run(
      this.parser,
      { image, mediaType, hint },
      { userId },
    );
    const categorized = await this.gateway.run(
      this.categorizer,
      { items: parsed.items },
      { userId },
    );
    return { parsed, categorized };
  }
}
