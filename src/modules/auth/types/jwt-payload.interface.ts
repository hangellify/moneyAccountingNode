import { User } from '../../../entities/user.entity';

export type TokenType = 'access' | 'refresh';

export interface JwtPayload {
  sub: string;
  email: string;
  first_name: string;
  type: TokenType;
  jti: string;
  sid?: string;
  iat?: number;
  exp?: number;
}

export type AuthenticatedUser = Pick<
  User,
  | 'id'
  | 'email'
  | 'first_name'
  | 'last_name'
  | 'username'
  | 'currency'
  | 'language_code'
> & { sid: string };
