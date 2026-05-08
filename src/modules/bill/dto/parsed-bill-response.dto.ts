// TEMPORARY shape — Task 10 replaces this with class-based Swagger-decorated DTOs.
export interface SubCategoryRefDto {
  id: string;
  name: string;
  category_name: string;
}

export interface ParsedBillItemResponseDto {
  name: string;
  quantity: number | null;
  unit: 'kg' | 'g' | 'l' | 'ml' | 'piece' | null;
  weight_kg: number | null;
  price_per_kg: number | null;
  final_price: number;
  sub_category: SubCategoryRefDto | null;
  category_confidence: number;
  category_reasoning?: string;
}

export interface ParsedBillResponseDto {
  market_name: string | null;
  bill_date: string | null;
  currency: string | null;
  total_amount: number | null;
  items: ParsedBillItemResponseDto[];
  raw_extracted_text: string;
}
