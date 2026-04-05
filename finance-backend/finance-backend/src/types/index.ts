// ─── Role & Permission Types ─────────────────────────────────────────────────

export type Role = 'admin' | 'analyst' | 'viewer';

export type Permission =
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'records:read'
  | 'records:create'
  | 'records:update'
  | 'records:delete'
  | 'dashboard:read';

/** Maps each role to the set of permissions it holds. */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'users:read', 'users:create', 'users:update', 'users:delete',
    'records:read', 'records:create', 'records:update', 'records:delete',
    'dashboard:read',
  ],
  analyst: [
    'users:read',
    'records:read',
    'dashboard:read',
  ],
  viewer: [
    'dashboard:read',
    'records:read',
  ],
};

// ─── Database Row Types (raw SQLite results) ──────────────────────────────────

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: Role;
  is_active: number; // SQLite stores booleans as 0/1
  created_at: string;
  updated_at: string;
}

export type RecordType = 'income' | 'expense';

export interface FinancialRecordRow {
  id: number;
  amount: number;
  type: RecordType;
  category: string;
  date: string;        // ISO date string YYYY-MM-DD
  notes: string | null;
  created_by: number;  // user id
  is_deleted: number;  // soft-delete flag
  created_at: string;
  updated_at: string;
}

// ─── API / Service Layer Types ────────────────────────────────────────────────

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: Role;
}

/** Attached to every authenticated request via JWT middleware. */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface CategoryTotal {
  category: string;
  type: RecordType;
  total: number;
}

export interface MonthlyTrend {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  net: number;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  categoryTotals: CategoryTotal[];
  monthlyTrends: MonthlyTrend[];
  recentRecords: SafeRecord[];
}

// ─── Safe (public-facing) shapes ─────────────────────────────────────────────

export interface SafeUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SafeRecord {
  id: number;
  amount: number;
  type: RecordType;
  category: string;
  date: string;
  notes: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}
