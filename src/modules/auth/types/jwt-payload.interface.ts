import { User } from '../../../entities/user.entity';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  first_name: string;
  iat?: number; // Issued at (added by JWT)
  exp?: number; // Expiration (added by JWT)
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
>;
