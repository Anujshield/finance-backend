import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';

/**
 * Global error-handling middleware.
 * Must be registered LAST in the Express middleware chain.
 *
 * Handles:
 *  - AppError subclasses (uses their statusCode and code)
 *  - Unexpected runtime errors (500, sanitised message in production)
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.code,
      // Only expose validation details; hide internals for other errors
      err.statusCode === 422 ? (err as { details?: unknown }).details : undefined,
    );
    return;
  }

  // Unexpected error — log it and hide implementation details in production
  console.error('[Unhandled Error]', err);

  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : (err instanceof Error ? err.message : String(err));

  sendError(res, message, 500, 'INTERNAL_ERROR');
}
