import type { AuthenticatedUser } from '../modules/auth/types/jwt-payload.interface';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
