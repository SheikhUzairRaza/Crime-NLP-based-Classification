import { ApiError } from '../utils/apiError.js';

/**
 * Standardized Zod request validation middleware
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body'|'params'|'query'} [source='body'] - Request property to validate
 */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const dataToValidate = req[source];
  const result = schema.safeParse(dataToValidate);

  if (!result.success) {
    const errorList = result.error.issues || result.error.errors || [];
    const errors = errorList.map((err) => ({
      field: err.path.join('.'),
      message: err.message
    }));

    return next(ApiError.badRequest(`Validation failed for request ${source}`, errors));
  }

  if (source === 'body') req.validatedBody = result.data;
  if (source === 'params') req.validatedParams = result.data;
  if (source === 'query') req.validatedQuery = result.data;

  next();
};

export const validateParams = (schema) => validate(schema, 'params');
export const validateQuery = (schema) => validate(schema, 'query');

export default validate;
