import { Response, NextFunction } from "express";
import { ForbiddenError, UnauthorizedError } from "../../../shared/infrastructure/errors.ts";
import { AuthorizationService } from "../application/authorization.service.ts";

export const authService = new AuthorizationService();

export const requirePermissions = (
  requiredPermissions: string | string[],
  options?: { logical?: "AND" | "OR" }
) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return next(new UnauthorizedError("User session context not found. Ensure authorization token is passed."));
      }

      const hasAccess = await authService.hasPermission(userId, requiredPermissions, options);
      if (!hasAccess) {
        const permsStr = Array.isArray(requiredPermissions) ? requiredPermissions.join(", ") : requiredPermissions;
        return next(
          new ForbiddenError(`Access denied. Missing required enterprise permission: [${permsStr}]`)
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
