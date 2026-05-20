import {
  IsUUID,
  IsDateString,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../../types/currency.enum';

export class UpdateBillDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  market_id?: string;

  @ApiPropertyOptional({ example: '2026-05-19' })
  @IsDateString()
  @IsOptional()
  bill_date?: string;

  @ApiPropertyOptional({ enum: Currency })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiPropertyOptional({ example: 23.45 })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  total_amount?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}
