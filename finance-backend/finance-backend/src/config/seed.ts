/**
 * Seed script — run once with `npm run seed`
 * Creates one user per role and 20 sample financial records.
 */
import bcrypt from 'bcryptjs';
import { getDb } from './database';

const db = getDb();

// ─── Users ────────────────────────────────────────────────────────────────────

const users = [
  { email: 'admin@example.com',   name: 'Alice Admin',   role: 'admin',   password: 'admin123'   },
  { email: 'analyst@example.com', name: 'Bob Analyst',   role: 'analyst', password: 'analyst123' },
  { email: 'viewer@example.com',  name: 'Carol Viewer',  role: 'viewer',  password: 'viewer123'  },
];

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (email, password_hash, name, role)
  VALUES (@email, @password_hash, @name, @role)
`);

for (const u of users) {
  const hash = bcrypt.hashSync(u.password, 10);
  insertUser.run({ email: u.email, password_hash: hash, name: u.name, role: u.role });
}

const adminId = (db.prepare('SELECT id FROM users WHERE email = ?').get('admin@example.com') as { id: number }).id;

// ─── Financial Records ────────────────────────────────────────────────────────

const insertRecord = db.prepare(`
  INSERT INTO financial_records (amount, type, category, date, notes, created_by)
  VALUES (@amount, @type, @category, @date, @notes, @created_by)
`);

const records = [
  { amount: 5000, type: 'income',  category: 'Salary',      date: '2024-01-05', notes: 'January salary' },
  { amount: 1200, type: 'expense', category: 'Rent',         date: '2024-01-08', notes: 'Monthly rent' },
  { amount: 300,  type: 'expense', category: 'Groceries',    date: '2024-01-12', notes: null },
  { amount: 800,  type: 'income',  category: 'Freelance',    date: '2024-01-20', notes: 'Web project' },
  { amount: 150,  type: 'expense', category: 'Utilities',    date: '2024-01-22', notes: 'Electricity' },
  { amount: 5000, type: 'income',  category: 'Salary',       date: '2024-02-05', notes: 'February salary' },
  { amount: 1200, type: 'expense', category: 'Rent',         date: '2024-02-08', notes: 'Monthly rent' },
  { amount: 200,  type: 'expense', category: 'Groceries',    date: '2024-02-14', notes: null },
  { amount: 500,  type: 'income',  category: 'Freelance',    date: '2024-02-18', notes: 'Logo design' },
  { amount: 90,   type: 'expense', category: 'Transport',    date: '2024-02-25', notes: 'Fuel' },
  { amount: 5000, type: 'income',  category: 'Salary',       date: '2024-03-05', notes: 'March salary' },
  { amount: 1200, type: 'expense', category: 'Rent',         date: '2024-03-08', notes: 'Monthly rent' },
  { amount: 450,  type: 'expense', category: 'Groceries',    date: '2024-03-10', notes: null },
  { amount: 1500, type: 'income',  category: 'Freelance',    date: '2024-03-15', notes: 'App consulting' },
  { amount: 200,  type: 'expense', category: 'Entertainment',date: '2024-03-20', notes: 'Streaming + dining' },
  { amount: 120,  type: 'expense', category: 'Utilities',    date: '2024-03-22', notes: 'Internet' },
  { amount: 5000, type: 'income',  category: 'Salary',       date: '2024-04-05', notes: 'April salary' },
  { amount: 1200, type: 'expense', category: 'Rent',         date: '2024-04-08', notes: 'Monthly rent' },
  { amount: 350,  type: 'expense', category: 'Groceries',    date: '2024-04-12', notes: null },
  { amount: 600,  type: 'income',  category: 'Freelance',    date: '2024-04-19', notes: 'Maintenance contract' },
];

for (const r of records) {
  insertRecord.run({ ...r, created_by: adminId });
}

console.log('✅  Seed complete.');
console.log('   admin@example.com   / admin123');
console.log('   analyst@example.com / analyst123');
console.log('   viewer@example.com  / viewer123');
