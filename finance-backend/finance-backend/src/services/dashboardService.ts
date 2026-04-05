import { getDb } from '../config/database';
import { FinancialRecordRow, DashboardSummary, CategoryTotal, MonthlyTrend } from '../types';
import { toSafeRecord } from './recordService';

/**
 * Returns a complete dashboard summary in a single function.
 * All queries run against the live DB so the numbers are always current.
 *
 * Deliberately kept as separate named queries (not one massive SQL blob)
 * so each piece is easy to test or replace independently.
 */
export function getDashboardSummary(): DashboardSummary {
  const db = getDb();
  const BASE = "FROM financial_records WHERE is_deleted = 0";

  // ── Totals ─────────────────────────────────────────────────────────────────

  const { totalIncome } = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) as totalIncome ${BASE} AND type = 'income'`)
    .get() as { totalIncome: number };

  const { totalExpenses } = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) as totalExpenses ${BASE} AND type = 'expense'`)
    .get() as { totalExpenses: number };

  // ── Category totals ────────────────────────────────────────────────────────

  const categoryTotals = db
    .prepare(`
      SELECT category, type, COALESCE(SUM(amount), 0) as total
      ${BASE}
      GROUP BY category, type
      ORDER BY total DESC
    `)
    .all() as CategoryTotal[];

  // ── Monthly trends (last 12 months) ───────────────────────────────────────

  const monthlyRaw = db
    .prepare(`
      SELECT
        strftime('%Y-%m', date) as month,
        type,
        COALESCE(SUM(amount), 0) as total
      ${BASE}
        AND date >= date('now', '-12 months')
      GROUP BY month, type
      ORDER BY month ASC
    `)
    .all() as { month: string; type: 'income' | 'expense'; total: number }[];

  // Pivot the flat rows into per-month objects
  const monthMap = new Map<string, MonthlyTrend>();
  for (const row of monthlyRaw) {
    if (!monthMap.has(row.month)) {
      monthMap.set(row.month, { month: row.month, income: 0, expense: 0, net: 0 });
    }
    const entry = monthMap.get(row.month)!;
    if (row.type === 'income') entry.income += row.total;
    else entry.expense += row.total;
  }
  const monthlyTrends: MonthlyTrend[] = [...monthMap.values()].map((t) => ({
    ...t,
    net: t.income - t.expense,
  }));

  // ── Recent records (last 10) ───────────────────────────────────────────────

  const recentRows = db
    .prepare(`
      SELECT * ${BASE}
      ORDER BY date DESC, id DESC
      LIMIT 10
    `)
    .all() as FinancialRecordRow[];

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    categoryTotals,
    monthlyTrends,
    recentRecords: recentRows.map(toSafeRecord),
  };
}
