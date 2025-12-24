import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import { User } from '../../../entities/user.entity';
import { Session } from '../../../entities/session.entity';
import { JwtPayload, AuthenticatedUser } from '../types/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    @InjectRepository(Session)
    private readonly sessionRepository: EntityRepository<Session>,
    private readonly em: EntityManager,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
      passReqToCallback: true, // Enable access to request object
    });
  }

  async validate(
    request: any,
    payload: JwtPayload,
  ): Promise<AuthenticatedUser> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Get the token from the request
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

    // Check if user exists
    const user = await this.userRepository.findOne(
      { id: payload.sub },
      {
        fields: [
          'id',
          'email',
          'first_name',
          'last_name',
          'username',
          'currency',
          'language_code',
        ],
      },
    );

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if there's an active session with this token
    if (token) {
      const session = await this.sessionRepository.findOne({
        session_token: token,
        user: { id: payload.sub },
        is_active: true,
      });

      if (!session) {
        throw new UnauthorizedException(
          'Session not found or user has logged out',
        );
      }

      // Check if session has expired
      if (new Date() > session.expires_at) {
        // Mark session as inactive
        session.is_active = false;
        await this.em.persistAndFlush(session);
        throw new UnauthorizedException('Session has expired');
      }

      // Update last activity timestamp
      session.last_activity_at = new Date();
      await this.em.persistAndFlush(session);
    } else {
      // If no token provided, check if user has any active sessions
      // This handles cases where token might not be extractable
      const activeSession = await this.sessionRepository.findOne({
        user: { id: payload.sub },
        is_active: true,
      });

      if (!activeSession) {
        throw new UnauthorizedException('User has logged out');
      }
    }

    return user as AuthenticatedUser;
  }
}
