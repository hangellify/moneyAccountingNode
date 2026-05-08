import { ParsedBillSchema } from './parsed-bill.schema';

describe('ParsedBillSchema', () => {
  it('accepts a realistic receipt shape', () => {
    const r = ParsedBillSchema.parse({
      market_name: 'Lidl',
      bill_date: '2026-05-07',
      currency: 'EUR',
      total_amount: 23.45,
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
          name: 'TOMATOES',
          quantity: null,
          unit: 'kg',
          weight_kg: 1.234,
          price_per_kg: 8.99,
          final_price: 11.09,
        },
      ],
      raw_extracted_text: '...',
    });
    expect(r.items).toHaveLength(2);
  });

  it('rejects a bad currency length', () => {
    expect(() =>
      ParsedBillSchema.parse({
        market_name: null,
        bill_date: null,
        currency: 'EURO',
        total_amount: null,
        items: [],
        raw_extracted_text: '',
      }),
    ).toThrow();
  });
});
