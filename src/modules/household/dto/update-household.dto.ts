import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateHouseholdDto {
  @ApiProperty({ example: 'Family Budget 2026' })
  @IsString()
  @Length(1, 255)
  name!: string;
}
