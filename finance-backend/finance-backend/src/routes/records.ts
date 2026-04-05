import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  listRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
} from '../services/recordService';
import { sendSuccess } from '../utils/response';
import { Role } from '../types';

const router = Router();
router.use(authenticate);

// ─── Validation schemas ───────────────────────────────────────────────────────

const TypeEnum = z.enum(['income', 'expense']);

const DateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const CreateRecordSchema = z.object({
  amount:   z.number().positive('Amount must be positive'),
  type:     TypeEnum,
  category: z.string().min(1).max(100).trim(),
  date:     DateString,
  notes:    z.string().max(500).trim().optional(),
});

const UpdateRecordSchema = z.object({
  amount:   z.number().positive().optional(),
  type:     TypeEnum.optional(),
  category: z.string().min(1).max(100).trim().optional(),
  date:     DateString.optional(),
  notes:    z.string().max(500).trim().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required' });

const FilterSchema = z.object({
  type:     TypeEnum.optional(),
  category: z.string().optional(),
  dateFrom: DateString.optional(),
  dateTo:   DateString.optional(),
  search:   z.string().max(100).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
});

const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /records
 * Viewer, Analyst, Admin — filtered, paginated list.
 */
router.get(
  '/',
  requirePermission('records:read'),
  validate('query', FilterSchema),
  (req: Request, res: Response) => {
    const q = req.query as unknown as z.infer<typeof FilterSchema>;
    const result = listRecords(
      { type: q.type, category: q.category, dateFrom: q.dateFrom, dateTo: q.dateTo, search: q.search },
      { page: q.page, limit: q.limit },
    );
    sendSuccess(res, result);
  },
);

/**
 * GET /records/:id
 */
router.get(
  '/:id',
  requirePermission('records:read'),
  validate('params', IdParamSchema),
  (req: Request, res: Response) => {
    const { id } = req.params as unknown as z.infer<typeof IdParamSchema>;
    sendSuccess(res, getRecordById(id));
  },
);

/**
 * POST /records
 * Admin only.
 */
router.post(
  '/',
  requirePermission('records:create'),
  validate('body', CreateRecordSchema),
  (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof CreateRecordSchema>;
    const record = createRecord(body, req.user!.id);
    sendSuccess(res, record, 201, 'Record created');
  },
);

/**
 * PATCH /records/:id
 * Admin only.
 */
router.patch(
  '/:id',
  requirePermission('records:update'),
  validate('params', IdParamSchema),
  validate('body', UpdateRecordSchema),
  (req: Request, res: Response) => {
    const { id } = req.params as unknown as z.infer<typeof IdParamSchema>;
    const body = req.body as z.infer<typeof UpdateRecordSchema>;
    const record = updateRecord(id, body, req.user!.id, req.user!.role as Role);
    sendSuccess(res, record, 200, 'Record updated');
  },
);

/**
 * DELETE /records/:id
 * Admin only — soft delete.
 */
router.delete(
  '/:id',
  requirePermission('records:delete'),
  validate('params', IdParamSchema),
  (req: Request, res: Response) => {
    const { id } = req.params as unknown as z.infer<typeof IdParamSchema>;
    deleteRecord(id, req.user!.role as Role);
    sendSuccess(res, null, 200, 'Record deleted');
  },
);

export default router;
