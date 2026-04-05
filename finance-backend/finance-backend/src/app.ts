import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import recordRoutes from './routes/records';
import dashboardRoutes from './routes/dashboard';
import { errorHandler } from './middleware/errorHandler';
import { sendError } from './utils/response';

const app = express();

// ─── Global middleware ────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─── Health check ────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API routes ───────────────────────────────────────────────────────────────

app.use('/auth',      authRoutes);
app.use('/users',     userRoutes);
app.use('/records',   recordRoutes);
app.use('/dashboard', dashboardRoutes);

// ─── 404 catch-all ───────────────────────────────────────────────────────────

app.use((_req, res) => {
  sendError(res, 'Route not found', 404, 'NOT_FOUND');
});

// ─── Central error handler (must be last) ────────────────────────────────────

app.use(errorHandler);

export default app;
