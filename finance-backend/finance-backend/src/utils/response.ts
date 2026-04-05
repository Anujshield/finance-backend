import { Response } from 'express';

interface SuccessPayload<T> {
  success: true;
  data: T;
  message?: string;
}

interface ErrorPayload {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

/** Send a successful JSON response. */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string,
): void {
  const body: SuccessPayload<T> = { success: true, data };
  if (message) body.message = message;
  res.status(statusCode).json(body);
}

/** Send an error JSON response. */
export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  code?: string,
  details?: unknown,
): void {
  const body: ErrorPayload = {
    success: false,
    error: { message, code, details },
  };
  res.status(statusCode).json(body);
}
