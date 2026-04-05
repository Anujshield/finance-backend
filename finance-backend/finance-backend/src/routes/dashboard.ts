import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { getDashboardSummary } from '../services/dashboardService';
import { sendSuccess } from '../utils/response';

const router = Router();
router.use(authenticate);

/**
 * GET /dashboard/summary
 * All roles (viewer, analyst, admin) — returns aggregated financial metrics.
 */
router.get(
  '/summary',
  requirePermission('dashboard:read'),
  (_req: Request, res: Response) => {
    sendSuccess(res, getDashboardSummary());
  },
);

export default router;
