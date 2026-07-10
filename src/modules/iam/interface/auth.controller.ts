import { Request, Response, NextFunction } from "express";
import { authService } from "../application/auth.service.ts";
import { ResponseFormatter, StatusCode } from "../../../shared/infrastructure/response.ts";
import { ValidationError } from "../../../shared/infrastructure/errors.ts";

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, deviceInfo } = req.body;
      if (!email || !password) {
        throw new ValidationError("Email and password are required");
      }

      const ipAddress = req.ip || "unknown";
      const data = await authService.login(email, password, deviceInfo, ipAddress);
      
      return ResponseFormatter.success(res, data, "Login successful", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new ValidationError("Refresh token is required");
      }

      const data = await authService.refreshToken(refreshToken);
      return ResponseFormatter.success(res, data, "Token refreshed successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        throw new ValidationError("Not authenticated");
      }

      const userData = await authService.getMe(userId);
      return ResponseFormatter.success(res, userData, "User profile retrieved", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
