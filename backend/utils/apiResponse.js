/**
 * Standardized API Response class
 * Formats all successful responses with a consistent structure
 */
export class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Helper static method to send standard response directly
   */
  static send(res, statusCode, data, message = 'Success') {
    return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
  }
}

export default ApiResponse;
