/**
 * Application error hierarchy.
 *
 * Throw these from services/repositories. The global error middleware in
 * app.ts maps them to HTTP responses, so controllers never need to inspect
 * error messages to decide on a status code.
 *
 * Usage:
 *   throw new NotFoundError("Gig not found");
 *   throw new BadRequestError("date is required");
 *   throw new ConflictError("email already in use");
 */

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}
