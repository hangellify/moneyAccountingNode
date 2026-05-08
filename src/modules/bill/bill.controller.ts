import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UseFilters,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { BillPhotoService } from './bill-photo.service';
import { ParsedBillResponseDto } from './dto/parsed-bill-response.dto';
import { ApiParsePhotoResponses } from './dto/api-responses.decorator';
import { AiGatewayExhaustedFilter } from './filters/ai-gateway-exhausted.filter';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

@ApiTags('bills')
@Controller('bills')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@UseFilters(AiGatewayExhaustedFilter)
export class BillController {
  constructor(private readonly billPhoto: BillPhotoService) {}

  @Post('parse-photo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary:
      'Upload a grocery receipt photo; return parsed + categorized items. Image is stored to S3; the AI request is audited.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { image: { type: 'string', format: 'binary' } },
      required: ['image'],
    },
  })
  @ApiParsePhotoResponses()
  async parsePhoto(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMAGE_SIZE_BYTES }),
          new FileTypeValidator({ fileType: /^image\/(png|jpeg|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<ParsedBillResponseDto> {
    return this.billPhoto.parseAndCategorize(
      file.buffer,
      file.mimetype as 'image/png' | 'image/jpeg' | 'image/webp',
      user.id,
    );
  }
}
