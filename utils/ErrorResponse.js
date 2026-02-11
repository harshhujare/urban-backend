class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Operational vs Programming errors

    Error.captureStackTrace(this, this.constructor);
  }
}

export default ErrorResponse;
