import { z } from 'zod';
import { ParsedBillItemSchema, ParsedBillSchema } from './parsed-bill.schema';

export const ParsedAndCategorizedBillItemSchema = ParsedBillItemSchema.extend({
  sub_category_id: z.string().uuid().nullable(),
  category_confidence: z.number().min(0).max(1),
  category_reasoning: z.string().nullable().optional(),
});

export const ParsedAndCategorizedBillSchema = ParsedBillSchema.omit({
  items: true,
}).extend({
  items: z.array(ParsedAndCategorizedBillItemSchema),
});

export type ParsedAndCategorizedBill = z.infer<
  typeof ParsedAndCategorizedBillSchema
>;
export type ParsedAndCategorizedBillItem = z.infer<
  typeof ParsedAndCategorizedBillItemSchema
>;
