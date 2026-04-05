import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors';
import { AuthenticatedUser } from '../types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

/** Signs a JWT for a given user payload. */
export function signToken(payload: AuthenticatedUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

/**
 * `authenticate` middleware — requires a valid Bearer token.
 * Attaches the decoded user to `req.user`.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Bearer token missing');
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = payload;
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

/**
 * `optionalAuth` middleware — does NOT fail on missing token,
 * but attaches user if one is present.  Useful for future
 * public + authenticated dual-mode endpoints.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET) as AuthenticatedUser;
    } catch {
      /* silently ignore bad tokens in optional mode */
    }
  }
  next();
}
