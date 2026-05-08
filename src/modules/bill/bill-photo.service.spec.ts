import { BillPhotoService } from './bill-photo.service';
import type { BillAiOrchestrator } from './bill-ai.orchestrator';
import type { EntityRepository } from '@mikro-orm/core';
import type { SubCategory } from '../../entities/sub-category.entity';

describe('BillPhotoService', () => {
  const USER_ID = 'user-1';

  function makeSubs() {
    return [
      { id: 'sub-a', name: 'bun', category: { name: 'Bread' } },
      { id: 'sub-b', name: 'milk', category: { name: 'Dairy' } },
    ];
  }

  function makeOrchestrator(opts: {
    parsed?: unknown;
    categorized?: unknown;
    parseOnlyResult?: unknown;
  }): BillAiOrchestrator {
    return {
      parseAndCategorize: jest.fn().mockResolvedValue({
        parsed: opts.parsed,
        categorized: opts.categorized,
      }),
      parseOnly: jest.fn().mockResolvedValue(opts.parseOnlyResult),
    } as never;
  }

  function makeRepo(
    found: unknown[],
    subCount = found.length,
  ): EntityRepository<SubCategory> {
    return {
      find: jest.fn().mockResolvedValue(found),
      count: jest.fn().mockResolvedValue(subCount),
    } as never;
  }

  it('merges parsed + categorized into a single item list with sub_category names', async () => {
    const parsed = {
      market_name: 'Lidl',
      bill_date: '2026-05-07',
      currency: 'EUR',
      total_amount: 3.5,
      items: [
        {
          name: 'BREAD',
          quantity: 1,
          unit: 'piece',
          weight_kg: null,
          price_per_kg: null,
          final_price: 1.2,
        },
        {
          name: 'MILK',
          quantity: 1,
          unit: 'piece',
          weight_kg: null,
          price_per_kg: null,
          final_price: 2.3,
        },
      ],
      raw_extracted_text: '...',
    };
    const categorized = {
      items: [
        {
          item_index: 0,
          sub_category_id: 'sub-a',
          confidence: 0.95,
          reasoning: 'bread',
        },
        { item_index: 1, sub_category_id: 'sub-b', confidence: 0.9 },
      ],
    };
    const svc = new BillPhotoService(
      makeOrchestrator({ parsed, categorized }),
      makeRepo(makeSubs(), 2),
    );
    const res = await svc.parseAndCategorize(
      Buffer.from('x'),
      'image/png',
      USER_ID,
    );
    expect(res.items).toHaveLength(2);
    expect(res.items[0].sub_category).toEqual({
      id: 'sub-a',
      name: 'bun',
      category_name: 'Bread',
    });
    expect(res.items[0].category_confidence).toBe(0.95);
    expect(res.items[0].category_reasoning).toBe('bread');
    expect(res.items[1].sub_category).toEqual({
      id: 'sub-b',
      name: 'milk',
      category_name: 'Dairy',
    });
  });

  it('sets sub_category null when categorizer returned null id', async () => {
    const parsed = {
      market_name: null,
      bill_date: null,
      currency: null,
      total_amount: null,
      items: [
        {
          name: 'UNKNOWN',
          quantity: 1,
          unit: 'piece',
          weight_kg: null,
          price_per_kg: null,
          final_price: 1,
        },
      ],
      raw_extracted_text: '',
    };
    const categorized = {
      items: [{ item_index: 0, sub_category_id: null, confidence: 0.1 }],
    };
    const svc = new BillPhotoService(
      makeOrchestrator({ parsed, categorized }),
      makeRepo([], 5),
    );
    const res = await svc.parseAndCategorize(
      Buffer.from('x'),
      'image/png',
      USER_ID,
    );
    expect(res.items[0].sub_category).toBeNull();
    expect(res.items[0].category_confidence).toBe(0.1);
  });

  it('defensively sets sub_category null when id does not resolve (hallucination)', async () => {
    const parsed = {
      market_name: null,
      bill_date: null,
      currency: null,
      total_amount: null,
      items: [
        {
          name: 'X',
          quantity: 1,
          unit: 'piece',
          weight_kg: null,
          price_per_kg: null,
          final_price: 1,
        },
      ],
      raw_extracted_text: '',
    };
    const categorized = {
      items: [{ item_index: 0, sub_category_id: 'ghost-id', confidence: 0.8 }],
    };
    const svc = new BillPhotoService(
      makeOrchestrator({ parsed, categorized }),
      makeRepo([], 5),
    );
    const res = await svc.parseAndCategorize(
      Buffer.from('x'),
      'image/png',
      USER_ID,
    );
    expect(res.items[0].sub_category).toBeNull();
  });

  it('short-circuits: when user has zero subcategories, skips categorizer call and returns null sub_category for every item', async () => {
    const parseOnlyResult = {
      market_name: null,
      bill_date: null,
      currency: null,
      total_amount: null,
      items: [
        {
          name: 'A',
          quantity: 1,
          unit: 'piece',
          weight_kg: null,
          price_per_kg: null,
          final_price: 1,
        },
        {
          name: 'B',
          quantity: 1,
          unit: 'piece',
          weight_kg: null,
          price_per_kg: null,
          final_price: 2,
        },
      ],
      raw_extracted_text: '',
    };
    const orchestrator = makeOrchestrator({ parseOnlyResult });
    const repo = makeRepo([], 0); // count === 0 → short-circuit

    const svc = new BillPhotoService(orchestrator, repo);
    const res = await svc.parseAndCategorize(
      Buffer.from('x'),
      'image/png',
      USER_ID,
    );

    expect(
      (orchestrator as unknown as { parseOnly: jest.Mock }).parseOnly,
    ).toHaveBeenCalledTimes(1);
    expect(
      (orchestrator as unknown as { parseAndCategorize: jest.Mock })
        .parseAndCategorize,
    ).not.toHaveBeenCalled();
    expect(
      res.items.every(
        (i) => i.sub_category === null && i.category_confidence === 0,
      ),
    ).toBe(true);
  });
});
