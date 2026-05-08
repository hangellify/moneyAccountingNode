import { BillAiOrchestrator } from './bill-ai.orchestrator';
import type { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import type { BillParserTask } from './tasks/bill-parser.task';
import type { BillCategorizerTask } from './tasks/bill-categorizer.task';

describe('BillAiOrchestrator', () => {
  it('runs the parser, then the categorizer with the parser output, and returns both', async () => {
    const parsed = {
      market_name: 'Test',
      bill_date: '2026-05-08',
      currency: 'EUR',
      total_amount: 10,
      items: [
        {
          name: 'BREAD',
          quantity: 1,
          unit: 'piece',
          weight_kg: null,
          price_per_kg: null,
          final_price: 2,
        },
        {
          name: 'TOMATOES',
          quantity: null,
          unit: 'kg',
          weight_kg: 1,
          price_per_kg: 3,
          final_price: 3,
        },
      ],
      raw_extracted_text: '...',
    };
    const categorized = {
      items: [
        {
          item_index: 0,
          sub_category_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          confidence: 0.9,
        },
        { item_index: 1, sub_category_id: null, confidence: 0.2 },
      ],
    };

    const runMock = jest
      .fn()
      .mockResolvedValueOnce(parsed)
      .mockResolvedValueOnce(categorized);

    const parser = { name: 'bill.parse' } as unknown as BillParserTask;
    const categorizer = {
      name: 'bill.categorize',
    } as unknown as BillCategorizerTask;
    const gateway = { run: runMock } as unknown as AiGatewayService;

    const orchestrator = new BillAiOrchestrator(gateway, parser, categorizer);
    const buf = Buffer.from('img');
    const result = await orchestrator.parseAndCategorize(
      buf,
      'image/png',
      'user-123',
      'Lidl',
    );

    expect(result).toEqual({ parsed, categorized });
    expect(runMock).toHaveBeenCalledTimes(2);
    expect(runMock).toHaveBeenNthCalledWith(
      1,
      parser,
      { image: buf, mediaType: 'image/png', hint: 'Lidl' },
      { userId: 'user-123' },
    );
    expect(runMock).toHaveBeenNthCalledWith(
      2,
      categorizer,
      { items: parsed.items, userId: 'user-123' },
      { userId: 'user-123' },
    );
  });

  it('works without a hint', async () => {
    const runMock = jest
      .fn()
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [] });
    const parser = { name: 'bill.parse' } as unknown as BillParserTask;
    const categorizer = {
      name: 'bill.categorize',
    } as unknown as BillCategorizerTask;
    const gateway = { run: runMock } as unknown as AiGatewayService;

    const orchestrator = new BillAiOrchestrator(gateway, parser, categorizer);
    await orchestrator.parseAndCategorize(Buffer.from('x'), 'image/jpeg', 'u');

    expect(runMock).toHaveBeenNthCalledWith(
      1,
      parser,
      {
        image: expect.any(Buffer) as Buffer,
        mediaType: 'image/jpeg',
        hint: undefined,
      },
      { userId: 'u' },
    );
  });

  it('parseOnly calls only the parser and returns its ParsedBill directly', async () => {
    const parsed = {
      market_name: 'Lidl',
      bill_date: null,
      currency: null,
      total_amount: null,
      items: [],
      raw_extracted_text: '',
    };
    const runMock = jest.fn().mockResolvedValueOnce(parsed);
    const parser = { name: 'bill.parse' } as unknown as BillParserTask;
    const categorizer = {
      name: 'bill.categorize',
    } as unknown as BillCategorizerTask;
    const gateway = { run: runMock } as unknown as AiGatewayService;

    const orchestrator = new BillAiOrchestrator(gateway, parser, categorizer);
    const buf = Buffer.from('img');
    const res = await orchestrator.parseOnly(buf, 'image/jpeg', 'user-1');

    expect(res).toBe(parsed);
    expect(runMock).toHaveBeenCalledTimes(1);
    expect(runMock).toHaveBeenNthCalledWith(
      1,
      parser,
      { image: buf, mediaType: 'image/jpeg', hint: undefined },
      { userId: 'user-1' },
    );
  });
});
