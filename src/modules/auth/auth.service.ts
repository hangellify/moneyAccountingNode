import {
  Injectable,
  UnauthorizedException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/core';
import { User } from '../../entities/user.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { Session } from '../../entities/session.entity';
import { Log, LogLevel, LogSource } from '../../entities/log.entity';
import { Currency } from '../../types/currency.enum';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { JwtPayload } from './types/jwt-payload.interface';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: EntityRepository<RefreshToken>,
    @InjectRepository(Session)
    private readonly sessionRepository: EntityRepository<Session>,
    @InjectRepository(Log)
    private readonly logRepository: EntityRepository<Log>,
    private readonly em: EntityManager,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    this.logger.debug(`Validating user: ${email}`);

    const user = await this.userRepository.findOne(
      { email },
      {
        fields: [
          'id',
          'email',
          'first_name',
          'last_name',
          'username',
          'password',
          'currency',
          'language_code',
        ],
      },
    );

    if (!user) {
      this.logger.warn(`User not found: ${email}`);
      await this.logAuthAttempt(email, false, 'User not found');
      return null;
    }

    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for user: ${email}`);
      await this.logAuthAttempt(email, false, 'Invalid password');
      return null;
    }

    this.logger.log(`User validated successfully: ${email}`);
    return user as User;
  }

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    await this.createSession(user, tokens.access_token, ipAddress, userAgent);
    await this.createRefreshToken(
      user,
      tokens.refresh_token,
      ipAddress,
      userAgent,
    );
    await this.logAuthAttempt(loginDto.email, true, 'Login successful');

    this.logger.log(`User logged in successfully: ${user.email}`);
    return tokens;
  }

  async register(
    registerDto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenResponseDto> {
    this.logger.debug(`Registering new user: ${registerDto.email}`);

    const existingUser = await this.userRepository.findOne({
      email: registerDto.email,
    });

    if (existingUser) {
      this.logger.warn(
        `Registration failed - user exists: ${registerDto.email}`,
      );
      throw new BadRequestException('User already exists');
    }

    const user = new User();
    user.email = registerDto.email;
    user.password = registerDto.password;
    user.first_name = registerDto.first_name;
    user.last_name = registerDto.last_name;
    user.username = registerDto.username;
    user.currency = Currency.EUR;

    await this.em.persistAndFlush(user);
    this.logger.log(`User registered successfully: ${user.email}`);

    const tokens = await this.generateTokens(user);
    await this.createSession(user, tokens.access_token, ipAddress, userAgent);
    await this.createRefreshToken(
      user,
      tokens.refresh_token,
      ipAddress,
      userAgent,
    );
    await this.logAuthAttempt(
      registerDto.email,
      true,
      'Registration successful',
    );

    return tokens;
  }

  async refreshToken(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenResponseDto> {
    this.logger.debug('Refreshing token');

    try {
      this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });

      const tokenEntity = await this.refreshTokenRepository.findOne(
        {
          token: refreshToken,
          is_active: true,
          is_revoked: false,
        },
        { populate: ['user'] },
      );

      if (!tokenEntity) {
        this.logger.warn('Refresh token not found or revoked');
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (new Date() > tokenEntity.expires_at) {
        this.logger.warn('Refresh token expired');
        tokenEntity.is_active = false;
        await this.em.persistAndFlush(tokenEntity);
        throw new UnauthorizedException('Refresh token expired');
      }

      // Revoke old token (token rotation)
      tokenEntity.is_revoked = true;
      tokenEntity.is_active = false;
      await this.em.persistAndFlush(tokenEntity);

      const user = tokenEntity.user;
      const newTokens = await this.generateTokens(user);

      // Update or create session with new access token
      await this.updateOrCreateSession(
        user,
        newTokens.access_token,
        ipAddress,
        userAgent,
      );

      await this.createRefreshToken(
        user,
        newTokens.refresh_token,
        ipAddress,
        userAgent,
        tokenEntity.family_id,
      );

      this.logger.log(`Token refreshed for user: ${user.email}`);
      return newTokens;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Token refresh failed: ${errorMessage}`);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    this.logger.debug(`Logging out user: ${userId}`);

    if (refreshToken) {
      const tokenEntity = await this.refreshTokenRepository.findOne({
        token: refreshToken,
        user: { id: userId },
      });

      if (tokenEntity) {
        tokenEntity.is_revoked = true;
        tokenEntity.is_active = false;
        await this.em.persistAndFlush(tokenEntity);
      }
    }

    await this.sessionRepository.nativeUpdate(
      { user: { id: userId }, is_active: true },
      { is_active: false },
    );

    this.logger.log(`User logged out: ${userId}`);
  }

  private async generateTokens(user: User): Promise<TokenResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      first_name: user.first_name,
    };

    const accessTokenExpiresInMs = parseInt(process.env.JWT_EXPIRES_IN_MS!, 10);
    const refreshTokenExpiresInMs = parseInt(
      process.env.JWT_REFRESH_EXPIRES_IN_MS!,
      10,
    );

    // Convert milliseconds to seconds for JWT (JWT requires seconds)
    const accessTokenExpiresInSeconds = Math.floor(
      accessTokenExpiresInMs / 1000,
    );
    const refreshTokenExpiresInSeconds = Math.floor(
      refreshTokenExpiresInMs / 1000,
    );

    const jwtPayload: Record<string, unknown> = {
      sub: payload.sub,
      email: payload.email,
      first_name: payload.first_name,
    };

    const accessTokenSecret = process.env.JWT_SECRET || 'secret';
    const refreshTokenSecret = process.env.JWT_REFRESH_SECRET!;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: accessTokenSecret,
        expiresIn: accessTokenExpiresInSeconds,
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: refreshTokenSecret,
        expiresIn: refreshTokenExpiresInSeconds,
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: accessTokenExpiresInSeconds,
      token_type: 'Bearer',
    };
  }

  private async createSession(
    user: User,
    accessToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Session> {
    const accessTokenExpiresInMs = parseInt(process.env.JWT_EXPIRES_IN_MS!, 10);

    const session = this.sessionRepository.create({
      user,
      session_token: accessToken,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date(),
      expires_at: new Date(Date.now() + accessTokenExpiresInMs),
      last_activity_at: new Date(),
      is_active: true,
    });

    await this.em.persistAndFlush(session);
    return session;
  }

  private async updateOrCreateSession(
    user: User,
    accessToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Session> {
    const accessTokenExpiresInMs = parseInt(process.env.JWT_EXPIRES_IN_MS!, 10);

    // Find existing active session for this user
    const existingSession = await this.sessionRepository.findOne({
      user: { id: user.id },
      is_active: true,
    });

    if (existingSession) {
      // Update existing session with new token
      existingSession.session_token = accessToken;
      existingSession.expires_at = new Date(
        Date.now() + accessTokenExpiresInMs,
      );
      existingSession.last_activity_at = new Date();
      if (ipAddress) existingSession.ip_address = ipAddress;
      if (userAgent) existingSession.user_agent = userAgent;
      existingSession.is_active = true;

      await this.em.persistAndFlush(existingSession);
      return existingSession;
    } else {
      // Create new session if none exists
      return this.createSession(user, accessToken, ipAddress, userAgent);
    }
  }

  private async createRefreshToken(
    user: User,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
    familyId?: string,
  ): Promise<RefreshToken> {
    const refreshTokenExpiresInMs = parseInt(
      process.env.JWT_REFRESH_EXPIRES_IN_MS!,
      10,
    );

    const token = this.refreshTokenRepository.create({
      user,
      token: refreshToken,
      family_id: familyId || randomBytes(16).toString('hex'),
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date(),
      expires_at: new Date(Date.now() + refreshTokenExpiresInMs),
      is_active: true,
      is_revoked: false,
    });

    await this.em.persistAndFlush(token);
    return token;
  }

  private async logAuthAttempt(
    email: string,
    success: boolean,
    message: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const log = this.logRepository.create({
      level: success ? LogLevel.INFO : LogLevel.WARN,
      source: LogSource.AUTH,
      context: 'Authentication',
      message: `Auth attempt: ${message} - ${email}`,
      metadata: {
        email,
        success,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date(),
    });

    await this.em.persistAndFlush(log);
  }
}
