export class ApiError extends Error {
    constructor(statusCode, message, details = null) {
      super(message);
      this.statusCode = statusCode;
      this.details = details;
      this.isOperational = true;
    }
  
    static badRequest(message = 'Invalid request', details) {
      return new ApiError(400, message, details);
    }
    static unauthorized(message = 'Please log in to continue') {
      return new ApiError(401, message);
    }
    static forbidden(message = 'You do not have permission to do this') {
      return new ApiError(403, message);
    }
    static notFound(message = 'Not found') {
      return new ApiError(404, message);
    }
    static conflict(message = 'This record already exists', details) {
      return new ApiError(409, message, details);
    }
  }