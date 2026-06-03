import {
  IsOptional,
  IsDateString,
  IsArray,
  IsString,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../../types/currency.enum';

export enum AmountRange {
  LT_50 = 'lt_50',
  BETWEEN_50_100 = 'between_50_100',
  GT_100 = 'gt_100',
}

export class ListBillsQueryDto {
  @ApiPropertyOptional({
    example: '2026-01-01',
    description:
      'Include bills with bill_date >= this date (YYYY-MM-DD). Omit to start from the beginning.',
  })
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? undefined : value,
  )
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description:
      'Include bills with bill_date <= this date (YYYY-MM-DD). Omit to include up to today.',
  })
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? undefined : value,
  )
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['Lidl', 'Kaufland'],
    description:
      'Filter by one or more market names (exact, case-sensitive). Repeat the param for multiple values: ?market_names=Lidl&market_names=Kaufland. Bills with no linked market are excluded when this filter is set.',
  })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value : typeof value === 'string' ? [value] : value,
  )
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(255, { each: true })
  market_names?: string[];

  @ApiPropertyOptional({
    enum: Currency,
    description: 'Filter by currency (exact match).',
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({
    enum: AmountRange,
    description:
      'Filter by total amount bracket. lt_50 = amount < 50; between_50_100 = 50 ≤ amount ≤ 100; gt_100 = amount > 100.',
  })
  @IsOptional()
  @IsEnum(AmountRange)
  amount_range?: AmountRange;
}
