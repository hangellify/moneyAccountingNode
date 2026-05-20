import { Test } from '@nestjs/testing';
import { APP_FILTER } from '@nestjs/core';
import { BillController } from './bill.controller';
import { BillPhotoService } from './bill-photo.service';
import { BillCrudService } from './bill-crud.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiGatewayExhaustedFilter } from './filters/ai-gateway-exhausted.filter';

describe('BillController', () => {
  let controller: BillController;
  const parseAndCategorize = jest.fn();
  const billCrudMock = {
    createBill: jest.fn(),
    listBills: jest.fn(),
    getBill: jest.fn(),
    updateBill: jest.fn(),
    softDeleteBill: jest.fn(),
    createDraftFromParsed: jest.fn(),
    listDrafts: jest.fn(),
    confirmBill: jest.fn(),
  };

  beforeEach(async () => {
    parseAndCategorize.mockReset();
    Object.values(billCrudMock).forEach((fn) => fn.mockReset());
    const mod = await Test.createTestingModule({
      controllers: [BillController],
      providers: [
        { provide: BillPhotoService, useValue: { parseAndCategorize } },
        { provide: BillCrudService, useValue: billCrudMock },
        { provide: APP_FILTER, useClass: AiGatewayExhaustedFilter },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = mod.get(BillController);
  });

  it('forwards multer file buffer + mime + user id to BillPhotoService and returns its response', async () => {
    const dto = {
      market_name: null,
      bill_date: null,
      currency: null,
      total_amount: null,
      items: [],
      raw_extracted_text: '',
    };
    const draftId = 'draft-uuid-001';
    parseAndCategorize.mockResolvedValue(dto);
    billCrudMock.createDraftFromParsed.mockResolvedValue(draftId);
    const fakeFile = {
      buffer: Buffer.from([1, 2, 3]),
      mimetype: 'image/png',
    } as Express.Multer.File;
    const res = await controller.parsePhoto(
      { id: 'user-xyz' } as never,
      fakeFile,
    );
    expect(parseAndCategorize).toHaveBeenCalledWith(
      fakeFile.buffer,
      'image/png',
      'user-xyz',
    );
    expect(billCrudMock.createDraftFromParsed).toHaveBeenCalledWith(
      'user-xyz',
      dto,
    );
    expect(res).toEqual({ ...dto, draft_id: draftId });
  });
});
