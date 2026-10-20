import { ApiError } from '../utils/apiError.js';

/**
 * Hardened Global Error Handling Middleware
 * Ensures every error returned to the client matches the standardized schema
 * and NEVER leaks internal stack traces to the client under any circumstances.
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // If error is not an instance of ApiError, convert it safely
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';
    error = new ApiError(statusCode, message, error?.errors || []);
  }

  // Response contains only sanitized error information - stack trace is strictly omitted
  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors || [],
    timestamp: error.timestamp || new Date().toISOString()
  };

  return res.status(error.statusCode).json(response);
};

export default errorHandler;
