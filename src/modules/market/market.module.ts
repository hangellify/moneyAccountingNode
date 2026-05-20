import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Market } from '../../entities/market.entity';
import { User } from '../../entities/user.entity';
import { MarketService } from './market.service';
import { MarketController } from './market.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Market, User])],
  controllers: [MarketController],
  providers: [MarketService],
  exports: [MarketService],
})
export class MarketModule {}
