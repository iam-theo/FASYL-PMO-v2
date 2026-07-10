import { Request, Response, NextFunction } from "express";
import { ResponseFormatter, StatusCode } from "../../../shared/infrastructure/response.ts";
import { authService } from "../infrastructure/authorization.middleware.ts";
import { ValidationError } from "../../../shared/infrastructure/errors.ts";

export class AuthorizationController {

  async listPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.listAllPermissions();
      return ResponseFormatter.success(res, data, "All enterprise permissions retrieved successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async searchPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query.q as string;
      if (!q) {
        throw new ValidationError("Search query parameter 'q' is required");
      }
      const data = await authService.searchPermissions(q);
      return ResponseFormatter.success(res, data, `Permissions searching for query: '${q}' completed`, StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async listRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.listAllRoles();
      return ResponseFormatter.success(res, data, "All enterprise roles retrieved successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async getPermissionMatrix(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.getPermissionMatrix();
      return ResponseFormatter.success(res, data, "Role-permission mapping matrix retrieved successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async createCustomRole(req: any, res: Response, next: NextFunction) {
    try {
      const actorId = req.user?.uid || "system";
      const { name, code, description, permissionNames } = req.body;

      if (!name || !code) {
        throw new ValidationError("Fields 'name' and 'code' are mandatory to create an authorization role");
      }

      const input = {
        name,
        code: code.toLowerCase().replace(/\s+/g, "_"),
        description,
        permissionNames: permissionNames || []
      };

      const ipAddress = req.ip;
      const userAgent = req.headers["user-agent"];

      const data = await authService.createCustomRole(actorId, input, ipAddress, userAgent);
      return ResponseFormatter.success(res, data, `Enterprise Custom Role [${input.code}] created successfully`, StatusCode.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async updateCustomRole(req: any, res: Response, next: NextFunction) {
    try {
      const actorId = req.user?.uid || "system";
      const { code } = req.params;
      const { name, description, permissionNames } = req.body;

      if (!code) {
        throw new ValidationError("URL parameter 'code' is required");
      }

      const input = { name, description, permissionNames };
      const ipAddress = req.ip;
      const userAgent = req.headers["user-agent"];

      const data = await authService.updateCustomRole(actorId, code, input, ipAddress, userAgent);
      return ResponseFormatter.success(res, data, `Enterprise Role [${code}] updated successfully`, StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async deleteCustomRole(req: any, res: Response, next: NextFunction) {
    try {
      const actorId = req.user?.uid || "system";
      const { code } = req.params;

      if (!code) {
        throw new ValidationError("URL parameter 'code' is required to delete a custom role");
      }

      const ipAddress = req.ip;
      const userAgent = req.headers["user-agent"];

      await authService.deleteCustomRole(actorId, code, ipAddress, userAgent);
      return ResponseFormatter.success(res, null, `Custom Role [${code}] deleted successfully`, StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async assignRoleToUser(req: any, res: Response, next: NextFunction) {
    try {
      const actorId = req.user?.uid || "system";
      const { userId } = req.params;
      const { roleCode } = req.body;

      if (!userId || !roleCode) {
        throw new ValidationError("Parameters 'userId' in path and 'roleCode' in request body are mandatory");
      }

      const ipAddress = req.ip;
      const userAgent = req.headers["user-agent"];

      await authService.assignRoleToUser(actorId, userId, roleCode, ipAddress, userAgent);
      return ResponseFormatter.success(res, null, `Role [${roleCode}] assigned to user [${userId}] successfully`, StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async removeRoleFromUser(req: any, res: Response, next: NextFunction) {
    try {
      const actorId = req.user?.uid || "system";
      const { userId, roleCode } = req.params;

      if (!userId || !roleCode) {
        throw new ValidationError("Path parameters 'userId' and 'roleCode' are required");
      }

      const ipAddress = req.ip;
      const userAgent = req.headers["user-agent"];

      await authService.removeRoleFromUser(actorId, userId, roleCode, ipAddress, userAgent);
      return ResponseFormatter.success(res, null, `Role [${roleCode}] removed from user [${userId}] successfully`, StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async assignDirectPermissionToUser(req: any, res: Response, next: NextFunction) {
    try {
      const actorId = req.user?.uid || "system";
      const { userId } = req.params;
      const { permissionName, type } = req.body;

      if (!userId || !permissionName || !type) {
        throw new ValidationError("Path 'userId', and body keys 'permissionName' and 'type' ('ALLOW' | 'DENY') are required");
      }

      if (type !== "ALLOW" && type !== "DENY") {
        throw new ValidationError("Override type must be either 'ALLOW' or 'DENY'");
      }

      const ipAddress = req.ip;
      const userAgent = req.headers["user-agent"];

      await authService.assignDirectPermissionToUser(actorId, userId, permissionName, type, ipAddress, userAgent);
      return ResponseFormatter.success(res, null, `Direct override '${type}' for permission '${permissionName}' assigned to user [${userId}] successfully`, StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async removeDirectPermissionFromUser(req: any, res: Response, next: NextFunction) {
    try {
      const actorId = req.user?.uid || "system";
      const { userId, permissionName } = req.params;

      if (!userId || !permissionName) {
        throw new ValidationError("Path parameters 'userId' and 'permissionName' are required");
      }

      const ipAddress = req.ip;
      const userAgent = req.headers["user-agent"];

      await authService.removeDirectPermissionFromUser(actorId, userId, permissionName, ipAddress, userAgent);
      return ResponseFormatter.success(res, null, `Direct override for permission '${permissionName}' removed from user [${userId}] successfully`, StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async getUserSecurityProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      if (!userId) {
        throw new ValidationError("URL parameter 'userId' is required");
      }

      const data = await authService.getUserEffectivePermissionsAndRoles(userId);
      return ResponseFormatter.success(res, data, `Security profile retrieved successfully for user [${userId}]`, StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async getOwnSecurityProfile(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        throw new ValidationError("No authenticated session context found to pull user profile");
      }

      const data = await authService.getUserEffectivePermissionsAndRoles(userId);
      return ResponseFormatter.success(res, data, "Your self-security profile retrieved successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async getSecurityAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = req.query.actorId as string;
      const action = req.query.action as string;
      const limitVal = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const data = await authService.getSecurityAuditLogs({ actorId, action, limit: limitVal });
      return ResponseFormatter.success(res, data, "Security authorization audit logs retrieved successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.listAllUsers();
      return ResponseFormatter.success(res, data, "All enterprise users retrieved successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async listModules(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.listAllModulesWithFeatures();
      return ResponseFormatter.success(res, data, "All modules and feature flags retrieved successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async updateModule(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const data = await authService.updateModuleStatus(id, status);
      return ResponseFormatter.success(res, data, `Module [${id}] status updated to [${status}]`, StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async updateFeature(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const data = await authService.updateFeatureStatus(id, status);
      return ResponseFormatter.success(res, data, `Feature flag [${id}] status updated to [${status}]`, StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async listPolicies(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.listAllPolicies();
      return ResponseFormatter.success(res, data, "All organization security policies retrieved successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async upsertPolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.createOrUpdatePolicy(req.body);
      return ResponseFormatter.success(res, data, "Security policy saved successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async deletePolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await authService.deletePolicy(id);
      return ResponseFormatter.success(res, null, "Security policy deleted successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }
}
