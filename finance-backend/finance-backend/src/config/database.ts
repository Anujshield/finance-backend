import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH =
  process.env.NODE_ENV === 'test'
    ? ':memory:'
    : path.join(DB_DIR, 'finance.db');

// Ensure the data directory exists for non-test environments
if (process.env.NODE_ENV !== 'test' && !fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let _db: Database.Database | null = null;

/**
 * Returns a singleton database connection.
 * Using WAL mode for better concurrent read performance.
 */
export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    applySchema(_db);
  }
  return _db;
}

/** Allow tests to swap in an in-memory DB. */
export function setDb(db: Database.Database): void {
  _db = db;
  applySchema(_db);
}

// ─── Schema ───────────────────────────────────────────────────────────────────

function applySchema(db: Database.Database): void {
  db.exec(`
    -- ── Users ────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT    NOT NULL,
      name          TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'viewer'
                            CHECK(role IN ('admin','analyst','viewer')),
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Financial Records ────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS financial_records (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      amount      REAL    NOT NULL CHECK(amount > 0),
      type        TEXT    NOT NULL CHECK(type IN ('income','expense')),
      category    TEXT    NOT NULL,
      date        TEXT    NOT NULL,   -- YYYY-MM-DD
      notes       TEXT,
      created_by  INTEGER NOT NULL REFERENCES users(id),
      is_deleted  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Indexes ──────────────────────────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_records_type     ON financial_records(type);
    CREATE INDEX IF NOT EXISTS idx_records_category ON financial_records(category);
    CREATE INDEX IF NOT EXISTS idx_records_date     ON financial_records(date);
    CREATE INDEX IF NOT EXISTS idx_records_deleted  ON financial_records(is_deleted);
  `);
}
