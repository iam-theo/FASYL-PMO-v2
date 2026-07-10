import { Request, Response } from "express";
import { TaskService } from "../application/task.service.ts";
import { ResponseFormatter, StatusCode } from "../../../shared/infrastructure/response.ts";
import { AuthorizationService } from "../../authorization/application/authorization.service.ts";
import { db } from "../../../shared/database/index.ts";
import { projects, resources, resourceAllocations } from "../../../db/schema.ts";
import { eq, inArray, and } from "drizzle-orm";

const authService = new AuthorizationService();

export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  getAll = async (req: any, res: Response) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const tasks = await this.taskService.getAllTasks();

      // Check permission / roles
      const profile = await authService.getUserEffectivePermissionsAndRoles(userId);
      const userRoleCodes = profile?.roles?.map((r: any) => r.code) || [];
      const isUnrestrictedRole = userRoleCodes.some((c: string) => 
        ["super_admin", "admin", "pmo_director", "chief_executive_officer", "portfolio_manager", "executive_viewer"].includes(c)
      );

      if (isUnrestrictedRole) {
        return ResponseFormatter.success(res, tasks.map(t => ({ id: t.id, ...t.props })));
      }

      // Filter tasks to only those assigned to the user or from projects they manage
      // Get projects managed by user
      const managedProjects = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.managerId, userId));
      const managedProjectIds = managedProjects.map(p => p.id);

      const filtered = tasks.filter(t => 
        t.props.assigneeId === userId || managedProjectIds.includes(t.props.projectId)
      );

      return ResponseFormatter.success(res, filtered.map(t => ({ id: t.id, ...t.props })));
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  getMyTasks = async (req: any, res: Response) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const tasks = await this.taskService.getAllTasks();
      const filtered = tasks.filter(t => t.props.assigneeId === userId);
      return ResponseFormatter.success(res, filtered.map(t => ({ id: t.id, ...t.props })));
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  getByProject = async (req: any, res: Response) => {
    try {
      const userId = req.user?.uid;
      const { projectId } = req.params;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const tasks = await this.taskService.getTasksByProject(projectId);

      // Check permission / roles
      const profile = await authService.getUserEffectivePermissionsAndRoles(userId);
      const userRoleCodes = profile?.roles?.map((r: any) => r.code) || [];
      const isUnrestrictedRole = userRoleCodes.some((c: string) => 
        ["super_admin", "admin", "pmo_director", "chief_executive_officer", "portfolio_manager", "executive_viewer"].includes(c)
      );

      // Also get the project to check if user is manager
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      const isManager = project && project.managerId === userId;

      if (isUnrestrictedRole || isManager) {
        return ResponseFormatter.success(res, tasks.map(t => ({ id: t.id, ...t.props })));
      }

      // Otherwise filter tasks: only show assigned tasks
      const filtered = tasks.filter(t => t.props.assigneeId === userId);
      return ResponseFormatter.success(res, filtered.map(t => ({ id: t.id, ...t.props })));
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  getOne = async (req: any, res: Response) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const task = await this.taskService.getTask(req.params.id);

      // Check permission / roles
      const profile = await authService.getUserEffectivePermissionsAndRoles(userId);
      const userRoleCodes = profile?.roles?.map((r: any) => r.code) || [];
      const isUnrestrictedRole = userRoleCodes.some((c: string) => 
        ["super_admin", "admin", "pmo_director", "chief_executive_officer", "portfolio_manager", "executive_viewer"].includes(c)
      );

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, task.props.projectId))
        .limit(1);

      const isManager = project && project.managerId === userId;

      if (isUnrestrictedRole || isManager || task.props.assigneeId === userId) {
        return ResponseFormatter.success(res, { id: task.id, ...task.props });
      }

      return res.status(403).json({ success: false, error: "Access denied: Not authorized to view this task" });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  create = async (req: any, res: Response) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      // Check permission
      const hasPerm = await authService.hasPermission(userId, "tasks.create");
      if (!hasPerm) {
        return res.status(403).json({ success: false, error: "Access denied. Missing 'tasks.create' permission." });
      }

      const task = await this.taskService.createTask(req.body);
      return ResponseFormatter.success(res, { id: task.id, ...task.props }, "Task created successfully", StatusCode.CREATED);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  updateStatus = async (req: any, res: Response) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const task = await this.taskService.getTask(req.params.id);

      // Allowed if user has tasks.complete permission, is assignee, or is project manager
      const hasPerm = await authService.hasPermission(userId, "tasks.complete") || await authService.hasPermission(userId, "tasks.edit");
      const isAssignee = task.props.assigneeId === userId;

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, task.props.projectId))
        .limit(1);
      const isManager = project && project.managerId === userId;

      if (!hasPerm && !isAssignee && !isManager) {
        return res.status(403).json({ success: false, error: "Access denied. Not authorized to complete or edit this task." });
      }

      const updated = await this.taskService.updateTaskStatus(req.params.id, req.body.status);
      return ResponseFormatter.success(res, { id: updated.id, ...updated.props }, "Task status updated successfully");
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  update = async (req: any, res: Response) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const task = await this.taskService.getTask(req.params.id);

      const hasPerm = await authService.hasPermission(userId, "tasks.edit");
      const isAssignee = task.props.assigneeId === userId;

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, task.props.projectId))
        .limit(1);
      const isManager = project && project.managerId === userId;

      if (!hasPerm && !isAssignee && !isManager) {
        return res.status(403).json({ success: false, error: "Access denied. Not authorized to edit this task." });
      }

      const updated = await this.taskService.updateTask(req.params.id, req.body);
      return ResponseFormatter.success(res, { id: updated.id, ...updated.props }, "Task updated successfully");
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  delete = async (req: any, res: Response) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      // Check permission
      const hasPerm = await authService.hasPermission(userId, "tasks.delete");
      if (!hasPerm) {
        return res.status(403).json({ success: false, error: "Access denied. Missing 'tasks.delete' permission." });
      }

      await this.taskService.deleteTask(req.params.id);
      return ResponseFormatter.success(res, null, "Task deleted successfully", StatusCode.NO_CONTENT);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}
