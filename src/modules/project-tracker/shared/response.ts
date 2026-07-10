import { Response } from "express";

/**
 * REST standardized JSON Response Helper Functions
 */

export const sendSuccess = (res: Response, message: string, data: any = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const sendError = (res: Response, message: string, errors: any[] = [], statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};
