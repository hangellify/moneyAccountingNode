import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SubCategory } from '../../entities/sub-category.entity';
import { Category } from '../../entities/category.entity';
import { PlaningHorizon } from '../../entities/planing-horizon.entity';
import { SubCategoryService } from './sub-category.service';
import { SubCategoryController } from './sub-category.controller';

@Module({
  imports: [MikroOrmModule.forFeature([SubCategory, Category, PlaningHorizon])],
  controllers: [SubCategoryController],
  providers: [SubCategoryService],
  exports: [SubCategoryService],
})
export class SubCategoryModule {}
