import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHouseholdDto {
  @ApiProperty({ example: 'Family Budget' })
  @IsString()
  @Length(1, 255)
  name!: string;
}
