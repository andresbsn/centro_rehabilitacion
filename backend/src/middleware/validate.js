import { ZodError } from 'zod';
import { badRequest } from '../utils/httpError.js';

export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (e) {
      if (e instanceof ZodError) {
        const details = e.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
        return next(badRequest('Validación fallida', 'VALIDATION_ERROR', { details }));
      }
      next(e);
    }
  };
}
