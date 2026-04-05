import { getDb } from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import {
  FinancialRecordRow,
  SafeRecord,
  RecordType,
  PaginatedResult,
  PaginationParams,
  Role,
} from '../types';

// ─── Shape conversion ─────────────────────────────────────────────────────────

export function toSafeRecord(row: FinancialRecordRow): SafeRecord {
  return {
    id: row.id,
    amount: row.amount,
    type: row.type,
    category: row.category,
    date: row.date,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Filter / list ────────────────────────────────────────────────────────────

export interface RecordFilters {
  type?: RecordType;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export function listRecords(
  filters: RecordFilters,
  { page, limit }: PaginationParams,
): PaginatedResult<SafeRecord> {
  const db = getDb();

  const conditions: string[] = ['is_deleted = 0'];
  const params: unknown[] = [];

  if (filters.type) {
    conditions.push('type = ?');
    params.push(filters.type);
  }
  if (filters.category) {
    conditions.push('category = ? COLLATE NOCASE');
    params.push(filters.category);
  }
  if (filters.dateFrom) {
    conditions.push('date >= ?');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push('date <= ?');
    params.push(filters.dateTo);
  }
  if (filters.search) {
    conditions.push("(category LIKE ? OR notes LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * limit;

  const rows = db
    .prepare(`SELECT * FROM financial_records ${where} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as FinancialRecordRow[];

  const { total } = db
    .prepare(`SELECT COUNT(*) as total FROM financial_records ${where}`)
    .get(...params) as { total: number };

  return {
    data: rows.map(toSafeRecord),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export function getRecordById(id: number): SafeRecord {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM financial_records WHERE id = ? AND is_deleted = 0')
    .get(id) as FinancialRecordRow | undefined;
  if (!row) throw new NotFoundError('Financial record');
  return toSafeRecord(row);
}

// ─── Create / update / delete ────────────────────────────────────────────────

export interface CreateRecordInput {
  amount: number;
  type: RecordType;
  category: string;
  date: string;
  notes?: string;
}

export function createRecord(input: CreateRecordInput, userId: number): SafeRecord {
  const db = getDb();

  const result = db
    .prepare(`
      INSERT INTO financial_records (amount, type, category, date, notes, created_by)
      VALUES (@amount, @type, @category, @date, @notes, @created_by)
    `)
    .run({
      amount: input.amount,
      type: input.type,
      category: input.category.trim(),
      date: input.date,
      notes: input.notes ?? null,
      created_by: userId,
    });

  return getRecordById(result.lastInsertRowid as number);
}

export interface UpdateRecordInput {
  amount?: number;
  type?: RecordType;
  category?: string;
  date?: string;
  notes?: string;
}

export function updateRecord(
  id: number,
  input: UpdateRecordInput,
  requesterId: number,
  requesterRole: Role,
): SafeRecord {
  const db = getDb();

  const row = db
    .prepare('SELECT * FROM financial_records WHERE id = ? AND is_deleted = 0')
    .get(id) as FinancialRecordRow | undefined;
  if (!row) throw new NotFoundError('Financial record');

  // Analysts and viewers cannot mutate records even if they somehow reach here
  // (RBAC middleware already blocks them; this is a defence-in-depth check)
  if (requesterRole !== 'admin') {
    throw new ForbiddenError('Only admins may modify financial records');
  }

  const fields: string[] = ["updated_at = datetime('now')"];
  const params: Record<string, unknown> = { id };

  if (input.amount !== undefined)   { fields.push('amount = @amount');     params.amount = input.amount; }
  if (input.type !== undefined)     { fields.push('type = @type');         params.type = input.type; }
  if (input.category !== undefined) { fields.push('category = @category'); params.category = input.category.trim(); }
  if (input.date !== undefined)     { fields.push('date = @date');         params.date = input.date; }
  if (input.notes !== undefined)    { fields.push('notes = @notes');       params.notes = input.notes; }

  if (fields.length > 1) {
    db.prepare(`UPDATE financial_records SET ${fields.join(', ')} WHERE id = @id`).run(params);
  }

  return getRecordById(id);
}

/** Soft-delete: sets is_deleted = 1 rather than removing the row. */
export function deleteRecord(id: number, requesterRole: Role): void {
  const db = getDb();

  const row = db
    .prepare('SELECT id FROM financial_records WHERE id = ? AND is_deleted = 0')
    .get(id) as FinancialRecordRow | undefined;
  if (!row) throw new NotFoundError('Financial record');

  if (requesterRole !== 'admin') {
    throw new ForbiddenError('Only admins may delete financial records');
  }

  db.prepare("UPDATE financial_records SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?").run(id);
}
