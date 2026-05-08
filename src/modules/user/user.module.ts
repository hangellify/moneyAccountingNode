import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { User } from '../../entities/user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { CategoryModule } from '../category/category.module';

@Module({
  imports: [MikroOrmModule.forFeature([User]), CategoryModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
