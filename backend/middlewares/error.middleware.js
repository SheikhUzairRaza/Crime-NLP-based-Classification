import { ApiError } from '../utils/apiError.js';

/**
 * Global Error Handling Middleware
 * Ensures every error returned to the client matches the standardized schema
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // If error is not an instance of ApiError, convert it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';
    error = new ApiError(statusCode, message, error?.errors || [], err.stack);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors,
    timestamp: error.timestamp || new Date().toISOString()
  };

  // Include stack trace only in development environment
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  return res.status(error.statusCode).json(response);
};

export default errorHandler;
