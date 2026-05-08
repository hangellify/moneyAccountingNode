import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogoutDto {
  @ApiProperty({
    description:
      'Refresh token to revoke. If omitted, the current session is revoked.',
    required: false,
  })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
