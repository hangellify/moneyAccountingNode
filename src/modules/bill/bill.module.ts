import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Category } from '../../entities/category.entity';
import { SubCategory } from '../../entities/sub-category.entity';
import { BillParserTask } from './tasks/bill-parser.task';
import { BillCategorizerTask } from './tasks/bill-categorizer.task';
import { BillAiOrchestrator } from './bill-ai.orchestrator';

@Module({
  imports: [MikroOrmModule.forFeature([Category, SubCategory])],
  providers: [BillParserTask, BillCategorizerTask, BillAiOrchestrator],
  exports: [BillAiOrchestrator],
})
export class BillModule {}
