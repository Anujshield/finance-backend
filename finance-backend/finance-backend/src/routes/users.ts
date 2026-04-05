import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../services/userService';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';
import { Role } from '../types';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// ─── Validation schemas ───────────────────────────────────────────────────────

const RoleEnum = z.enum(['admin', 'analyst', 'viewer']);

const CreateUserSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name:     z.string().min(1).max(100).trim(),
  role:     RoleEnum,
});

const UpdateUserSchema = z.object({
  name:     z.string().min(1).max(100).trim().optional(),
  role:     RoleEnum.optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required' });

const PaginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /users
 * Admin only — paginated list of all users.
 */
router.get(
  '/',
  requirePermission('users:read'),
  validate('query', PaginationSchema),
  (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as z.infer<typeof PaginationSchema>;
    sendSuccess(res, listUsers({ page, limit }));
  },
);

/**
 * GET /users/:id
 * Requires users:read — admins can view anyone; analysts can view any user too
 * (useful for showing who created a record).
 */
router.get(
  '/:id',
  requirePermission('users:read'),
  validate('params', IdParamSchema),
  (req: Request, res: Response) => {
    const { id } = req.params as unknown as z.infer<typeof IdParamSchema>;
    sendSuccess(res, getUserById(id));
  },
);

/**
 * POST /users
 * Admin only — create a new user.
 */
router.post(
  '/',
  requirePermission('users:create'),
  validate('body', CreateUserSchema),
  (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof CreateUserSchema>;
    const user = createUser(body);
    sendSuccess(res, user, 201, 'User created');
  },
);

/**
 * PATCH /users/:id
 * Admin can update anyone. Non-admins can update only themselves (enforced
 * in the service layer as an extra guard).
 */
router.patch(
  '/:id',
  requirePermission('users:update'),
  validate('params', IdParamSchema),
  validate('body', UpdateUserSchema),
  (req: Request, res: Response) => {
    const { id } = req.params as unknown as z.infer<typeof IdParamSchema>;
    const body = req.body as z.infer<typeof UpdateUserSchema>;
    const user = updateUser(
      id,
      { ...body, isActive: body.isActive },
      req.user!.id,
      req.user!.role as Role,
    );
    sendSuccess(res, user, 200, 'User updated');
  },
);

/**
 * DELETE /users/:id
 * Admin only — hard delete (users cannot delete themselves).
 */
router.delete(
  '/:id',
  requirePermission('users:delete'),
  validate('params', IdParamSchema),
  (req: Request, res: Response) => {
    const { id } = req.params as unknown as z.infer<typeof IdParamSchema>;
    deleteUser(id, req.user!.id);
    sendSuccess(res, null, 200, 'User deleted');
  },
);

export default router;
