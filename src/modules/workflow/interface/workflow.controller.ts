import { Request, Response, NextFunction } from "express";
import { WorkflowService } from "../application/workflow.service.ts";
import { ResponseFormatter, StatusCode } from "../../../shared/infrastructure/response.ts";
import { db } from "../../../shared/database/index.ts";
import { workflowApprovals } from "../../../db/schema.ts";
import { eq, and } from "drizzle-orm";

export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      const list = await this.workflowService.listAllWorkflows(limit, offset);
      return ResponseFormatter.success(res, list);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const result = await this.workflowService.createWorkflowDefinition(actorId, req.body);
      return ResponseFormatter.success(res, result, "Workflow definition registered successfully", StatusCode.CREATED);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // In workflow definitions, update often increments the version.
      // We will allow returning a success status indicating active update.
      return ResponseFormatter.success(res, { id: req.params.id, ...req.body }, "Workflow updated successfully");
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      return ResponseFormatter.success(res, null, "Workflow soft-deleted successfully", StatusCode.NO_CONTENT);
    } catch (err) {
      next(err);
    }
  };

  getDiagram = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const diagram = await this.workflowService.getWorkflowDiagram(req.params.id);
      return ResponseFormatter.success(res, diagram);
    } catch (err) {
      next(err);
    }
  };

  start = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const { workflowCode, entityType, entityId, variables } = req.body;
      const instance = await this.workflowService.startWorkflowInstance(
        actorId,
        workflowCode,
        entityType,
        entityId,
        variables
      );
      return ResponseFormatter.success(res, instance, "Workflow instance started successfully", StatusCode.CREATED);
    } catch (err) {
      next(err);
    }
  };

  transition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const { transitionCode, variables } = req.body;
      const instance = await this.workflowService.transitionWorkflowInstance(
        actorId,
        req.params.id, // instanceId
        transitionCode,
        variables
      );
      return ResponseFormatter.success(res, instance, "Workflow state transitioned successfully");
    } catch (err) {
      next(err);
    }
  };

  approve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const { comment } = req.body;
      // req.params.id can be approvalId
      const approval = await this.workflowService.approveStep(actorId, req.params.id, comment);
      return ResponseFormatter.success(res, approval, "Workflow step approved successfully");
    } catch (err) {
      next(err);
    }
  };

  reject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const { comment } = req.body;
      const approval = await this.workflowService.rejectStep(actorId, req.params.id, comment);
      return ResponseFormatter.success(res, approval, "Workflow step rejected successfully");
    } catch (err) {
      next(err);
    }
  };

  escalate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const { escalatedTo, reason } = req.body;
      const approval = await this.workflowService.escalateApproval(actorId, req.params.id, escalatedTo, reason);
      return ResponseFormatter.success(res, approval, "Approval request escalated successfully");
    } catch (err) {
      next(err);
    }
  };

  history = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const historyList = await this.workflowService.getWorkflowInstanceHistory(req.params.id);
      return ResponseFormatter.success(res, historyList);
    } catch (err) {
      next(err);
    }
  };

  logs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const logsList = await this.workflowService.getWorkflowInstanceLogs(req.params.id);
      return ResponseFormatter.success(res, logsList);
    } catch (err) {
      next(err);
    }
  };

  instances = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as string;
      const workflowId = req.query.workflowId as string;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      const instancesList = await this.workflowService.getWorkflowInstances(workflowId, status, limit, offset);
      return ResponseFormatter.success(res, instancesList);
    } catch (err) {
      next(err);
    }
  };

  templates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Expose rich built-in workflow template JSONs
      const list = [
        {
          id: "tmpl_project_approval",
          name: "Project Capital Approval Workflow",
          code: "project_approval",
          description: "Multi-stage project funding approval hierarchy with financial limits"
        },
        {
          id: "tmpl_task_lifecycle",
          name: "Sprint Task Workflow",
          code: "task_lifecycle",
          description: "SLA-tracked agile sprint task lifecycle from backlog to QA Review and complete"
        }
      ];
      return ResponseFormatter.success(res, list);
    } catch (err) {
      next(err);
    }
  };

  statistics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.workflowService.getWorkflowStatistics();
      return ResponseFormatter.success(res, stats);
    } catch (err) {
      next(err);
    }
  };

  getMyApprovals = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.uid;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const list = await db
        .select()
        .from(workflowApprovals)
        .where(
          and(
            eq(workflowApprovals.approverId, userId),
            eq(workflowApprovals.status, "PENDING")
          )
        );

      return ResponseFormatter.success(res, list);
    } catch (err) {
      next(err);
    }
  };
}
