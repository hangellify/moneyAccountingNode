import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UserModule } from '../user/user.module';
import { User } from '../../entities/user.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { Session } from '../../entities/session.entity';
import { Log } from '../../entities/log.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([User, RefreshToken, Session, Log]),
    PassportModule,
    UserModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: {
        expiresIn: Math.floor(
          parseInt(process.env.JWT_EXPIRES_IN_MS!, 10) / 1000,
        ), // Convert milliseconds to seconds, because JWT requires seconds
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
