import { Response } from "express";
import { MockAuthRequest } from "../../shared/middleware.ts";
import { TimeIssuesRisksService } from "./service.ts";
import { sendSuccess, sendError } from "../../shared/response.ts";

export class TimeIssuesRisksController {
  private service = new TimeIssuesRisksService();

  // ==========================================
  // TIME LOGS
  // ==========================================
  listTimeLogs = async (req: MockAuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const data = await this.service.getTimeLogs(projectId);
      return sendSuccess(res, "Time logs retrieved successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to retrieve time logs", [error.message]);
    }
  };

  createTimeLog = async (req: MockAuthRequest, res: Response) => {
    try {
      const data = await this.service.createTimeLog(req.body);
      return sendSuccess(res, "Time log registered successfully", data, 201);
    } catch (error: any) {
      return sendError(res, "Failed to create time log entry", [error.message]);
    }
  };

  approveTimeLog = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const approvedBy = req.user ? req.user.id : "usr-system";
      const data = await this.service.approveTimeLog(id, approvedBy);
      return sendSuccess(res, "Timesheet entry approved successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to approve timesheet entry", [error.message]);
    }
  };

  getTimesheetSummary = async (req: MockAuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const data = await this.service.getTimesheetSummary(projectId);
      return sendSuccess(res, "Timesheet summary compiled successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to compile timesheet report", [error.message]);
    }
  };

  // ==========================================
  // ISSUES
  // ==========================================
  listIssues = async (req: MockAuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const data = await this.service.getIssues(projectId);
      return sendSuccess(res, "Project issues register retrieved successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to load project issues register", [error.message]);
    }
  };

  createIssue = async (req: MockAuthRequest, res: Response) => {
    try {
      const data = await this.service.createIssue(req.body);
      return sendSuccess(res, "Issue registered in tracker successfully", data, 201);
    } catch (error: any) {
      return sendError(res, "Failed to register issue in tracker", [error.message]);
    }
  };

  updateIssue = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = await this.service.updateIssue(id, req.body);
      return sendSuccess(res, "Issue updated successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to update issue in register", [error.message]);
    }
  };

  deleteIssue = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.deleteIssue(id);
      return sendSuccess(res, "Issue soft-deleted successfully", { id });
    } catch (error: any) {
      return sendError(res, "Failed to remove issue from register", [error.message]);
    }
  };

  // ==========================================
  // RISKS
  // ==========================================
  listRisks = async (req: MockAuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const data = await this.service.getRisks(projectId);
      return sendSuccess(res, "Project risk register retrieved successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to load project risk register", [error.message]);
    }
  };

  createRisk = async (req: MockAuthRequest, res: Response) => {
    try {
      const data = await this.service.createRisk(req.body);
      return sendSuccess(res, "Risk identified and logged successfully", data, 201);
    } catch (error: any) {
      return sendError(res, "Failed to log risk in register", [error.message]);
    }
  };

  updateRisk = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = await this.service.updateRisk(id, req.body);
      return sendSuccess(res, "Risk status updated successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to update risk in register", [error.message]);
    }
  };

  deleteRisk = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.deleteRisk(id);
      return sendSuccess(res, "Risk archived successfully", { id });
    } catch (error: any) {
      return sendError(res, "Failed to remove risk from register", [error.message]);
    }
  };
}
