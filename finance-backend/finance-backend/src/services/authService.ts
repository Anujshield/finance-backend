import bcrypt from 'bcryptjs';
import { getDb } from '../config/database';
import { signToken } from '../middleware/auth';
import { UnauthorizedError, NotFoundError } from '../utils/errors';
import { UserRow, AuthenticatedUser } from '../types';
import { toSafeUser } from './userService';

export interface LoginResult {
  token: string;
  user: ReturnType<typeof toSafeUser>;
}

/**
 * Validates credentials and returns a signed JWT along with the safe
 * user object.  Throws if credentials are invalid or account is inactive.
 */
export function login(email: string, password: string): LoginResult {
  const db = getDb();

  const row = db
    .prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE')
    .get(email) as UserRow | undefined;

  if (!row) {
    // Intentionally vague — don't reveal whether the email exists
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!row.is_active) {
    throw new UnauthorizedError('Account is inactive. Please contact an administrator.');
  }

  const valid = bcrypt.compareSync(password, row.password_hash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const payload: AuthenticatedUser = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
  };

  return {
    token: signToken(payload),
    user: toSafeUser(row),
  };
}
