import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Category } from '../../entities/category.entity';
import { SubCategory } from '../../entities/sub-category.entity';
import { BillParserTask } from './tasks/bill-parser.task';
import { BillParseCategorizeTask } from './tasks/bill-parse-categorize.task';
import { BillAiOrchestrator } from './bill-ai.orchestrator';
import { BillPhotoService } from './bill-photo.service';
import { BillController } from './bill.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Category, SubCategory])],
  controllers: [BillController],
  providers: [
    BillParserTask,
    BillParseCategorizeTask,
    BillAiOrchestrator,
    BillPhotoService,
  ],
  exports: [BillAiOrchestrator],
})
export class BillModule {}
