import { StatusCode } from "./response.ts";

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: StatusCode = StatusCode.INTERNAL_SERVER_ERROR,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, StatusCode.BAD_REQUEST);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized access") {
    super(message, StatusCode.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access forbidden") {
    super(message, StatusCode.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string = "Resource") {
    super(`${entity} not found`, StatusCode.NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, StatusCode.CONFLICT);
  }
}
