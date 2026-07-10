import { Response } from "express";
import { MockAuthRequest } from "../../shared/middleware.ts";
import { NotificationsAuditReportsService } from "./service.ts";
import { sendSuccess, sendError } from "../../shared/response.ts";

export class NotificationsAuditReportsController {
  private service = new NotificationsAuditReportsService();

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  listNotifications = async (req: MockAuthRequest, res: Response) => {
    try {
      const userId = req.user ? req.user.id : "usr-alex";
      const data = await this.service.getNotifications(userId);
      return sendSuccess(res, "Notifications loaded successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to load notifications", [error.message]);
    }
  };

  markAsRead = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = await this.service.markNotificationRead(id);
      return sendSuccess(res, "Notification marked as read successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to update notification status", [error.message]);
    }
  };

  getUnreadCount = async (req: MockAuthRequest, res: Response) => {
    try {
      const userId = req.user ? req.user.id : "usr-alex";
      const count = await this.service.getUnreadCount(userId);
      return sendSuccess(res, "Unread count compiled successfully", { unreadCount: count });
    } catch (error: any) {
      return sendError(res, "Failed to load unread count", [error.message]);
    }
  };

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  listAuditLogs = async (req: MockAuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const data = await this.service.getAuditLogs(projectId);
      return sendSuccess(res, "Project change audit logs loaded successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to load project audit trail", [error.message]);
    }
  };

  // ==========================================
  // STATUS REPORT COMPILER
  // ==========================================
  getExecutiveStatusReport = async (req: MockAuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const data = await this.service.compileExecutiveStatusReport(projectId);
      return sendSuccess(res, "Executive status report compiled successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to compile status report", [error.message]);
    }
  };

  // ==========================================
  // EXPORTS
  // ==========================================
  exportTasksCSV = async (req: MockAuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const csvContent = await this.service.generateTasksCSV(projectId);
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=tasks-project-${projectId}.csv`);
      return res.status(200).send(csvContent);
    } catch (error: any) {
      console.error("CSV Export Failed:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate CSV export file",
        errors: [error.message]
      });
    }
  };
}
