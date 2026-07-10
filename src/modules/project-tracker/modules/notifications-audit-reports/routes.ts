import { Router } from "express";
import { NotificationsAuditReportsController } from "./controller.ts";
import { requireAuth, auditLogger } from "../../shared/middleware.ts";

const router = Router();
const controller = new NotificationsAuditReportsController();

// ==========================================
// NOTIFICATIONS ROUTES
// ==========================================
router.get("/notifications", requireAuth, controller.listNotifications);
router.get("/notifications/unread-count", requireAuth, controller.getUnreadCount);
router.patch("/notifications/:id/read", requireAuth, controller.markAsRead);

// ==========================================
// AUDIT LOGS ROUTES
// ==========================================
router.get("/audit-logs/project/:projectId", requireAuth, controller.listAuditLogs);

// ==========================================
// EXECUTIVE REPORT ROUTES
// ==========================================
router.get("/reports/executive-status/:projectId", requireAuth, controller.getExecutiveStatusReport);

// ==========================================
// EXPORT PIPELINE ROUTES
// ==========================================
router.get("/reports/export-csv/:projectId", requireAuth, controller.exportTasksCSV);

export default router;
