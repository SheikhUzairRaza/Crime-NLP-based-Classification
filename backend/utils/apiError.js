/**
 * Standardized API Error class
 * Extends built-in Error to include status codes, details, and stack traces
 */
export class ApiError extends Error {
  constructor(
    statusCode = 500,
    message = 'Internal server error',
    errors = [],
    stack = ''
  ) {
    super(message);
    this.success = false;
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.timestamp = new Date().toISOString();

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = 'Bad Request', errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static internal(message = 'Internal server error', errors = []) {
    return new ApiError(500, message, errors);
  }
}

export default ApiError;
