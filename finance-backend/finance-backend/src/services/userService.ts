import bcrypt from 'bcryptjs';
import { getDb } from '../config/database';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { UserRow, SafeUser, Role, PaginatedResult, PaginationParams } from '../types';

// ─── Shape conversion ─────────────────────────────────────────────────────────

/** Strip password hash; convert SQLite integers to booleans. */
export function toSafeUser(row: UserRow): SafeUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function listUsers(
  { page, limit }: PaginationParams,
): PaginatedResult<SafeUser> {
  const db = getDb();
  const offset = (page - 1) * limit;

  const rows = db
    .prepare('SELECT * FROM users ORDER BY id LIMIT ? OFFSET ?')
    .all(limit, offset) as UserRow[];

  const { total } = db
    .prepare('SELECT COUNT(*) as total FROM users')
    .get() as { total: number };

  return {
    data: rows.map(toSafeUser),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export function getUserById(id: number): SafeUser {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  if (!row) throw new NotFoundError('User');
  return toSafeUser(row);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: Role;
}

export function createUser(input: CreateUserInput): SafeUser {
  const db = getDb();

  const existing = db
    .prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE')
    .get(input.email);
  if (existing) throw new ConflictError(`Email '${input.email}' is already registered`);

  const hash = bcrypt.hashSync(input.password, 10);

  const result = db
    .prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (@email, @hash, @name, @role)
    `)
    .run({ email: input.email, hash, name: input.name, role: input.role });

  return getUserById(result.lastInsertRowid as number);
}

export interface UpdateUserInput {
  name?: string;
  role?: Role;
  isActive?: boolean;
  password?: string;
}

export function updateUser(
  targetId: number,
  input: UpdateUserInput,
  requesterId: number,
  requesterRole: Role,
): SafeUser {
  const db = getDb();

  // Non-admins can only edit themselves
  if (requesterRole !== 'admin' && targetId !== requesterId) {
    throw new ForbiddenError('You can only update your own profile');
  }

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as UserRow | undefined;
  if (!row) throw new NotFoundError('User');

  const fields: string[] = ['updated_at = datetime(\'now\')'];
  const params: Record<string, unknown> = { id: targetId };

  if (input.name !== undefined)     { fields.push('name = @name');           params.name = input.name; }
  if (input.role !== undefined)     { fields.push('role = @role');           params.role = input.role; }
  if (input.isActive !== undefined) { fields.push('is_active = @is_active'); params.is_active = input.isActive ? 1 : 0; }
  if (input.password !== undefined) {
    fields.push('password_hash = @password_hash');
    params.password_hash = bcrypt.hashSync(input.password, 10);
  }

  if (fields.length === 1) return toSafeUser(row); // nothing to update

  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = @id`).run(params);
  return getUserById(targetId);
}

export function deleteUser(targetId: number, requesterId: number): void {
  const db = getDb();

  if (targetId === requesterId) {
    throw new ForbiddenError('You cannot delete your own account');
  }

  const row = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId) as UserRow | undefined;
  if (!row) throw new NotFoundError('User');

  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
}
