import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Factory that returns middleware validating a specific part of the request
 * against the given Zod schema.  On success the parsed (and coerced) value
 * is written back to the same `req` field so downstream handlers get types.
 *
 * @example
 *   router.post('/records', validate('body', CreateRecordSchema), handler)
 */
export function validate<T>(part: RequestPart, schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const issues = formatZodError(result.error);
      throw new ValidationError('Validation failed', issues);
    }

    // Overwrite with the coerced, trimmed value from Zod
    (req as Record<string, unknown>)[part] = result.data;
    next();
  };
}

function formatZodError(err: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_root';
    out[key] = [...(out[key] ?? []), issue.message];
  }
  return out;
}
