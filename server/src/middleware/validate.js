import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

export const validate = (schema) => (req, res, next) => {
  try {
    const validated = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    // Assign validated data
    req.body = validated.body || req.body;
    req.query = validated.query || req.query;
    req.params = validated.params || req.params;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorDetails = error.errors.map((err) => ({
        field: err.path.join('.').replace(/^(body|query|params)\./, ''),
        message: err.message
      }));
      return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', errorDetails));
    }
    next(error);
  }
};
