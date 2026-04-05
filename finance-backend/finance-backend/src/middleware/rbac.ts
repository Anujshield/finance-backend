import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { Permission, ROLE_PERMISSIONS } from '../types';

/**
 * Returns an Express middleware that blocks requests whose authenticated
 * user does not hold *all* of the listed permissions.
 *
 * Usage:
 *   router.post('/records', authenticate, requirePermission('records:create'), handler)
 */
export function requirePermission(...required: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const userPerms = ROLE_PERMISSIONS[req.user.role] ?? [];

    const missing = required.filter((p) => !userPerms.includes(p));

    if (missing.length > 0) {
      throw new ForbiddenError(
        `Your role (${req.user.role}) lacks the following permissions: ${missing.join(', ')}`,
      );
    }

    next();
  };
}

/**
 * Sugar helper — restricts a route to specific roles.
 * Prefer `requirePermission` for finer control; use this
 * when a whole route section is role-gated.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError();
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(`Route requires one of: ${roles.join(', ')}`);
    }
    next();
  };
}
