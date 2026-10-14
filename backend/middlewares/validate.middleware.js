import { ApiError } from '../utils/apiError.js';

/**
 * Standardized Zod request validation middleware
 * Validates request body, query, or params and passes structured ApiError if invalid
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errorList = result.error.issues || result.error.errors || [];
    const errors = errorList.map((err) => ({
      field: err.path.join('.'),
      message: err.message
    }));

    return next(ApiError.badRequest('Validation failed', errors));
  }

  req.validatedBody = result.data;
  next();
};

export default validate;
