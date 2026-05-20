import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
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
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { BillPhotoService } from './bill-photo.service';
import { BillCrudService } from './bill-crud.service';
import { ParsedBillResponseDto } from './dto/parsed-bill-response.dto';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { BillResponseDto } from './dto/bill-response.dto';
import { BillDetailResponseDto } from './dto/bill-detail-response.dto';
import {
  ApiParsePhotoResponses,
  ApiCreateBillResponses,
  ApiListBillsResponses,
  ApiGetBillResponses,
  ApiUpdateBillResponses,
  ApiDeleteBillResponses,
} from './dto/api-responses.decorator';
import { AiGatewayExhaustedFilter } from './filters/ai-gateway-exhausted.filter';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

@ApiTags('bills')
@Controller('bills')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class BillController {
  constructor(
    private readonly billPhoto: BillPhotoService,
    private readonly billCrud: BillCrudService,
  ) {}

  @Post('parse-photo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'))
  @UseFilters(AiGatewayExhaustedFilter)
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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save a confirmed parsed bill with line items' })
  @ApiCreateBillResponses()
  async createBill(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBillDto,
  ): Promise<BillDetailResponseDto> {
    return this.billCrud.createBill(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all bills for the current user' })
  @ApiListBillsResponses()
  async listBills(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BillResponseDto[]> {
    return this.billCrud.listBills(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bill by ID with line items' })
  @ApiParam({
    name: 'id',
    description: 'Bill unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiGetBillResponses()
  async getBill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<BillDetailResponseDto> {
    return this.billCrud.getBill(id, user.id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update top-level bill fields' })
  @ApiParam({
    name: 'id',
    description: 'Bill unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiUpdateBillResponses()
  async updateBill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBillDto,
  ): Promise<BillResponseDto> {
    return this.billCrud.updateBill(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a bill by ID' })
  @ApiParam({
    name: 'id',
    description: 'Bill unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiDeleteBillResponses()
  async deleteBill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.billCrud.softDeleteBill(id, user.id);
  }
}
