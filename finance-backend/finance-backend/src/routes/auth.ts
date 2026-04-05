import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { login } from '../services/authService';
import { sendSuccess } from '../utils/response';

const router = Router();

const LoginSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /auth/login
 * Public — exchange credentials for a JWT.
 */
router.post('/login', validate('body', LoginSchema), (req: Request, res: Response) => {
  const { email, password } = req.body as z.infer<typeof LoginSchema>;
  const result = login(email, password);
  sendSuccess(res, result, 200, 'Login successful');
});

/**
 * GET /auth/me
 * Protected — returns the currently authenticated user's profile.
 */
router.get('/me', authenticate, (req: Request, res: Response) => {
  sendSuccess(res, req.user);
});

export default router;
