/**
 * Shared test helpers.
 * Each test file calls `setupTestDb()` in a beforeEach so every test
 * starts with a clean, seeded in-memory SQLite database.
 */
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { setDb } from '../config/database';

export function setupTestDb(): void {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  // Apply schema
  db.exec(`
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

    CREATE TABLE IF NOT EXISTS financial_records (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      amount      REAL    NOT NULL CHECK(amount > 0),
      type        TEXT    NOT NULL CHECK(type IN ('income','expense')),
      category    TEXT    NOT NULL,
      date        TEXT    NOT NULL,
      notes       TEXT,
      created_by  INTEGER NOT NULL REFERENCES users(id),
      is_deleted  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed users
  const hash = bcrypt.hashSync('password123', 1); // cost=1 for speed in tests
  db.prepare(`INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`)
    .run('admin@test.com', hash, 'Test Admin', 'admin');
  db.prepare(`INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`)
    .run('analyst@test.com', hash, 'Test Analyst', 'analyst');
  db.prepare(`INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`)
    .run('viewer@test.com', hash, 'Test Viewer', 'viewer');

  const adminId = (db.prepare('SELECT id FROM users WHERE email = ?').get('admin@test.com') as { id: number }).id;

  // Seed records
  const ins = db.prepare(`
    INSERT INTO financial_records (amount, type, category, date, notes, created_by)
    VALUES (@amount, @type, @category, @date, @notes, @created_by)
  `);
  ins.run({ amount: 5000, type: 'income',  category: 'Salary',   date: '2024-01-05', notes: 'Jan salary', created_by: adminId });
  ins.run({ amount: 1200, type: 'expense', category: 'Rent',     date: '2024-01-08', notes: null,         created_by: adminId });
  ins.run({ amount: 300,  type: 'expense', category: 'Groceries',date: '2024-02-10', notes: null,         created_by: adminId });

  setDb(db);
}
