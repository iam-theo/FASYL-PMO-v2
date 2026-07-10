import { Response } from "express";
import { MockAuthRequest } from "../../shared/middleware.ts";
import { TasksService } from "./service.ts";
import { sendSuccess, sendError } from "../../shared/response.ts";

export class TasksController {
  private service = new TasksService();

  // ==========================================
  // TASKS
  // ==========================================
  listTasks = async (req: MockAuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const filters = {
        status: req.query.status,
        priority: req.query.priority,
        assigneeId: req.query.assigneeId,
        milestoneId: req.query.milestoneId,
        search: req.query.search,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
      };
      const data = await this.service.getTasks(projectId, filters);
      return sendSuccess(res, "Tasks retrieved successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to load project tasks", [error.message]);
    }
  };

  createTask = async (req: MockAuthRequest, res: Response) => {
    try {
      const data = await this.service.createTask(req.body);
      return sendSuccess(res, "Task created successfully", data, 201);
    } catch (error: any) {
      return sendError(res, "Failed to create task", [error.message]);
    }
  };

  updateTask = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = await this.service.updateTask(id, req.body);
      return sendSuccess(res, "Task updated successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to update task", [error.message]);
    }
  };

  deleteTask = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.deleteTask(id);
      return sendSuccess(res, "Task deleted successfully", { id });
    } catch (error: any) {
      return sendError(res, "Failed to delete task", [error.message]);
    }
  };

  bulkUpdateTasks = async (req: MockAuthRequest, res: Response) => {
    try {
      const { taskIds, ...updateFields } = req.body;
      const count = await this.service.bulkUpdate(taskIds, updateFields);
      return sendSuccess(res, `Bulk updated ${count} tasks successfully`, { count });
    } catch (error: any) {
      return sendError(res, "Failed to perform bulk update on tasks", [error.message]);
    }
  };

  bulkDeleteTasks = async (req: MockAuthRequest, res: Response) => {
    try {
      const { taskIds } = req.body;
      const count = await this.service.bulkDelete(taskIds);
      return sendSuccess(res, `Bulk deleted ${count} tasks successfully`, { count });
    } catch (error: any) {
      return sendError(res, "Failed to perform bulk deletion on tasks", [error.message]);
    }
  };

  // ==========================================
  // SUBTASKS
  // ==========================================
  listSubtasks = async (req: MockAuthRequest, res: Response) => {
    try {
      const { taskId } = req.params;
      const data = await this.service.getSubtasks(taskId);
      return sendSuccess(res, "Subtasks loaded successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to load subtasks", [error.message]);
    }
  };

  createSubtask = async (req: MockAuthRequest, res: Response) => {
    try {
      const data = await this.service.createSubtask(req.body);
      return sendSuccess(res, "Subtask created successfully", data, 201);
    } catch (error: any) {
      return sendError(res, "Failed to create subtask", [error.message]);
    }
  };

  updateSubtask = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = await this.service.updateSubtask(id, req.body);
      return sendSuccess(res, "Subtask updated successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to update subtask", [error.message]);
    }
  };

  deleteSubtask = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.deleteSubtask(id);
      return sendSuccess(res, "Subtask deleted successfully", { id });
    } catch (error: any) {
      return sendError(res, "Failed to delete subtask", [error.message]);
    }
  };

  // ==========================================
  // MILESTONES
  // ==========================================
  listMilestones = async (req: MockAuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const data = await this.service.getMilestones(projectId);
      return sendSuccess(res, "Milestones loaded successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to load project milestones", [error.message]);
    }
  };

  createMilestone = async (req: MockAuthRequest, res: Response) => {
    try {
      const data = await this.service.createMilestone(req.body);
      return sendSuccess(res, "Milestone created successfully", data, 201);
    } catch (error: any) {
      return sendError(res, "Failed to create milestone", [error.message]);
    }
  };

  updateMilestone = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = await this.service.updateMilestone(id, req.body);
      return sendSuccess(res, "Milestone updated successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to update milestone", [error.message]);
    }
  };

  deleteMilestone = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.deleteMilestone(id);
      return sendSuccess(res, "Milestone deleted successfully", { id });
    } catch (error: any) {
      return sendError(res, "Failed to delete milestone", [error.message]);
    }
  };

  // ==========================================
  // DEPENDENCIES
  // ==========================================
  listDependencies = async (req: MockAuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const data = await this.service.getDependencies(projectId);
      return sendSuccess(res, "Dependencies loaded successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to load dependencies", [error.message]);
    }
  };

  createDependency = async (req: MockAuthRequest, res: Response) => {
    try {
      const data = await this.service.createDependency(req.body);
      return sendSuccess(res, "Dependency mapping established successfully", data, 201);
    } catch (error: any) {
      return sendError(res, "Dependency validation failed", [error.message], 400);
    }
  };

  deleteDependency = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.deleteDependency(id);
      return sendSuccess(res, "Dependency mapping removed successfully", { id });
    } catch (error: any) {
      return sendError(res, "Failed to delete dependency", [error.message]);
    }
  };

  getCriticalPath = async (req: MockAuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const data = await this.service.getCriticalPath(projectId);
      return sendSuccess(res, "Critical path mapped successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to generate critical path", [error.message]);
    }
  };
}
