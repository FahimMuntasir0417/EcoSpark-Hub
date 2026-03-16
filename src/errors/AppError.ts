export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    options?: { isOperational?: boolean; details?: unknown }
  ) {
    super(message);

    this.statusCode = statusCode;
    this.name = 'AppError';
    this.isOperational = options?.isOperational ?? true;
    this.details = options?.details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
