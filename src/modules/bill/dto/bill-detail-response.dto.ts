import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillResponseDto } from './bill-response.dto';
import { SubCategoryRefDto } from './parsed-bill-response.dto';

export class BillItemResponseDto {
  @ApiProperty({ type: SubCategoryRefDto })
  sub_category!: SubCategoryRefDto;

  @ApiProperty({ example: 2 })
  product_count!: number;

  @ApiProperty({ example: 8.99 })
  amount!: number;

  @ApiPropertyOptional({ example: 1.234 })
  product_weight?: number;
}

export class BillDetailResponseDto extends BillResponseDto {
  @ApiProperty({ type: [BillItemResponseDto] })
  items!: BillItemResponseDto[];
}
