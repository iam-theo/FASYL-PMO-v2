import { Response } from "express";

export enum StatusCode {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export class ResponseFormatter {
  static success<T>(res: Response, data: T, message?: string, code = StatusCode.OK, extra: any = {}) {
    return res.status(code).json({
      success: true,
      message,
      data,
      ...extra
    });
  }

  static error(res: Response, message: string, code = StatusCode.INTERNAL_SERVER_ERROR) {
    return res.status(code).json({
      success: false,
      error: message,
    });
  }
}
