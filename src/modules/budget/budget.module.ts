import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Budget } from '../../entities/budget.entity';
import { User } from '../../entities/user.entity';
import { Household } from '../../entities/household.entity';
import { BudgetService } from './budget.service';
import { BudgetController } from './budget.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Budget, User, Household])],
  controllers: [BudgetController],
  providers: [BudgetService],
  exports: [BudgetService],
})
export class BudgetModule {}
