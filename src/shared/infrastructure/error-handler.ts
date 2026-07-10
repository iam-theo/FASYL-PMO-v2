import { Request, Response, NextFunction } from "express";
import { AppError } from "./errors.ts";
import { ResponseFormatter, StatusCode } from "./response.ts";
import logger from "./logger.ts";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    if (err.statusCode && err.statusCode >= 500) {
      logger.error({ err });
    } else {
      logger.warn({ err }, err.message);
    }
    return ResponseFormatter.error(res, err.message, err.statusCode);
  }

  logger.error({ err });

  // Handle Drizzle/Postgres errors specifically if needed here
  
  return ResponseFormatter.error(
    res,
    "An unexpected error occurred",
    StatusCode.INTERNAL_SERVER_ERROR
  );
};
