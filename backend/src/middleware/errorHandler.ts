import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { securityLogger } from "../lib/security-logger";

const isProduction = process.env.NODE_ENV === 'production';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Zod validation errors → 400 with field-level details
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  const status = (err as { status?: number }).status ?? 500;

  if (isProduction) {
    securityLogger.error('Unhandled error', {
      path: req.path,
      method: req.method,
      status,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    const clientMessage = status < 500 && err instanceof Error
      ? sanitizeForClient(err.message)
      : 'Internal server error';

    res.status(status).json({ error: clientMessage });
  } else {
    securityLogger.error('Unhandled error', {
      path: req.path,
      method: req.method,
      status,
      error: err instanceof Error ? err.message : String(err),
    });
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(status).json({ error: message });
  }
}

// Strip messages that reveal database structure, file paths, or framework internals
function sanitizeForClient(message: string): string {
  if (/prisma|p\d{4}|unique constraint|foreign key|null constraint/i.test(message)) {
    return 'A database error occurred';
  }
  if (/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|TABLE|COLUMN|JOIN)\b/i.test(message)) {
    return 'A database error occurred';
  }
  if (/node_modules|\/src\/|\.ts:|\.js:/.test(message)) {
    return 'Internal server error';
  }
  return message;
}
