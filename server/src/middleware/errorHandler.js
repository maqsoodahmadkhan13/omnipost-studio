import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');
  const message = err.message || 'An unexpected error occurred';

  // Only log full error details for 500s and unexpected operational errors
  if (statusCode >= 500) {
    logger.error(`API Error [${req.method} ${req.originalUrl}]: ${message}`, {
      statusCode,
      code,
      stack: config.NODE_ENV === 'development' ? err.stack : undefined
    });
  } else if (statusCode !== 401 || !req.originalUrl.includes('/auth/me')) {
    logger.warn(`API Warning [${req.method} ${req.originalUrl}] (${statusCode}): ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(config.NODE_ENV === 'development' && statusCode >= 500 && { details: err.details })
  });
};

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
