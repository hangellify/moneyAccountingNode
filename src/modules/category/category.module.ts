import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Category } from '../../entities/category.entity';
import { PlaningHorizon } from '../../entities/planing-horizon.entity';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Category, PlaningHorizon])],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
