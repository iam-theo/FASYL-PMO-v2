import { Request, Response, NextFunction } from "express";
import { UserService } from "../application/user.service";
import { ResponseFormatter } from "../../../shared/infrastructure/response";
import { UserSearchFilters } from "../application/user.dto";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  listUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters: UserSearchFilters = {
        search: req.query.search as string,
        department: req.query.department as string,
        status: req.query.status as string,
        role: req.query.role as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        sortBy: req.query.sortBy as string,
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };
      
      const result = await this.userService.getUsers(filters);
      return ResponseFormatter.success(res, result.data, "Users retrieved successfully", 200, {
        pagination: result.pagination,
        meta: result.meta
      });
    } catch (error) {
      next(error);
    }
  }

  getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      return ResponseFormatter.success(res, user, "User retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.uid;
      const user = await this.userService.getCurrentUser(userId);
      return ResponseFormatter.success(res, user, "Current user profile retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  searchUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query.q as string;
      const users = await this.userService.searchUsers(query);
      return ResponseFormatter.success(res, users, "Search results retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  getDepartments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const departments = await this.userService.getDepartments();
      return ResponseFormatter.success(res, departments, "Departments retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  getManagers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const managers = await this.userService.getManagers();
      return ResponseFormatter.success(res, managers, "Managers retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  getUserRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const roles = await this.userService.getUserRoles(id);
      return ResponseFormatter.success(res, roles, "User roles retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  getUserPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const permissions = await this.userService.getUserPermissions(id);
      return ResponseFormatter.success(res, permissions, "User permissions retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  getUserProjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const projects = await this.userService.getUserProjects(id);
      return ResponseFormatter.success(res, projects, "User projects retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  getUserTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const tasks = await this.userService.getUserTasks(id);
      return ResponseFormatter.success(res, tasks, "User tasks retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  getUserRisksAndIssues = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = await this.userService.getUserRisksAndIssues(id);
      return ResponseFormatter.success(res, data, "User risks and issues retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  getUserAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = await this.userService.getUserAuditLogs(id);
      return ResponseFormatter.success(res, data, "User audit logs retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  getUserChatMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = await this.userService.getUserChatMessages(id);
      return ResponseFormatter.success(res, data, "User chat messages retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  getUserChangeRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = await this.userService.getUserChangeRequests(id);
      return ResponseFormatter.success(res, data, "User change requests retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  getUserSecurityLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = await this.userService.getUserSecurityLogs(id);
      return ResponseFormatter.success(res, data, "User security logs retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  getUserLoginHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = await this.userService.getUserLoginHistory(id);
      return ResponseFormatter.success(res, data, "User login history retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  getUserResources = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = await this.userService.getUserResources(id);
      return ResponseFormatter.success(res, data, "User resources retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  getUserMilestones = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data = await this.userService.getUserMilestones(id);
      return ResponseFormatter.success(res, data, "User milestones retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.createUser(req.body);
      return ResponseFormatter.success(res, user, "User created successfully", 201);
    } catch (error) {
      next(error);
    }
  }

  updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = await this.userService.updateUser(id, req.body);
      return ResponseFormatter.success(res, user, "User updated successfully");
    } catch (error) {
      next(error);
    }
  }

  deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = (req as any).user?.id;
      const permanent = req.query.permanent === "true";
      await this.userService.deleteUser(id, permanent, actorId);
      return ResponseFormatter.success(res, null, "User deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = (req as any).user?.id;
      const { status, isActive, isLocked } = req.body;
      const user = await this.userService.updateUserStatus(id, status, isActive, isLocked, actorId);
      return ResponseFormatter.success(res, user, "User status updated successfully");
    } catch (error) {
      next(error);
    }
  }

  activateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = (req as any).user?.id;
      const user = await this.userService.activateUser(id, actorId);
      return ResponseFormatter.success(res, user, "User activated successfully");
    } catch (error) {
      next(error);
    }
  }

  deactivateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = (req as any).user?.id;
      const user = await this.userService.deactivateUser(id, actorId);
      return ResponseFormatter.success(res, user, "User deactivated successfully");
    } catch (error) {
      next(error);
    }
  }

  suspendUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = (req as any).user?.id;
      const user = await this.userService.suspendUser(id, actorId);
      return ResponseFormatter.success(res, user, "User suspended successfully");
    } catch (error) {
      next(error);
    }
  }

  lockUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = (req as any).user?.id;
      const user = await this.userService.lockUser(id, actorId);
      return ResponseFormatter.success(res, user, "User locked successfully");
    } catch (error) {
      next(error);
    }
  }

  unlockUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = (req as any).user?.id;
      const user = await this.userService.unlockUser(id, actorId);
      return ResponseFormatter.success(res, user, "User unlocked successfully");
    } catch (error) {
      next(error);
    }
  }

  updateUserRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { roles } = req.body;
      await this.userService.updateUserRoles(id, roles);
      return ResponseFormatter.success(res, null, "User roles updated successfully");
    } catch (error) {
      next(error);
    }
  }

  updateUserPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { permissions } = req.body;
      await this.userService.updateUserPermissions(id, permissions);
      return ResponseFormatter.success(res, null, "User permissions updated successfully");
    } catch (error) {
      next(error);
    }
  }

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      await this.userService.resetPassword(id, password);
      return ResponseFormatter.success(res, null, "User password reset successfully");
    } catch (error) {
      next(error);
    }
  }
}
