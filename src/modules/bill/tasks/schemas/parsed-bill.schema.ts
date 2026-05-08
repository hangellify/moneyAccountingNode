import { z } from 'zod';

export const ParsedBillItemSchema = z.object({
  name: z.string().describe('Product name as printed on the bill'),
  quantity: z.number().int().nullable(),
  unit: z.enum(['kg', 'g', 'l', 'ml', 'piece']).nullable(),
  weight_kg: z
    .number()
    .nullable()
    .describe('Weight in kilograms if weight-priced'),
  price_per_kg: z.number().nullable(),
  final_price: z
    .number()
    .describe('Line total for this item, in bill currency'),
});

export const ParsedBillSchema = z.object({
  market_name: z.string().nullable(),
  bill_date: z.string().nullable().describe('ISO-8601 date (YYYY-MM-DD)'),
  currency: z.string().length(3).nullable().describe('ISO-4217 currency code'),
  total_amount: z.number().nullable(),
  items: z.array(ParsedBillItemSchema),
  raw_extracted_text: z.string().describe('Full OCR text — debug aid'),
});
export type ParsedBill = z.infer<typeof ParsedBillSchema>;
export type ParsedBillItem = z.infer<typeof ParsedBillItemSchema>;
