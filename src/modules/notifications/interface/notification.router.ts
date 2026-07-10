import { Router } from "express";
import { NotificationController } from "./notification.controller";
import { authMiddleware } from "../../../shared/infrastructure/auth.middleware";
import { requirePermissions } from "../../authorization/infrastructure/authorization.middleware.ts";

const router = Router();
const controller = new NotificationController();

// User Notifications
router.get("/", authMiddleware, controller.getNotifications);
router.get("/unread-count", authMiddleware, controller.getUnreadCount);
router.patch("/:id/read", authMiddleware, controller.markAsRead);
router.patch("/read-all", authMiddleware, controller.markAllAsRead);

// User Preferences
router.get("/preferences", authMiddleware, controller.getPreferences);
router.put("/preferences", authMiddleware, controller.updatePreference);

// Admin Settings
router.get("/settings", authMiddleware, requirePermissions("admin.notifications"), controller.getSettings);
router.put("/settings", authMiddleware, requirePermissions("admin.notifications"), controller.updateSetting);

// Admin Templates
router.get("/templates", authMiddleware, requirePermissions("admin.notifications"), controller.getTemplates);
router.put("/templates/:code", authMiddleware, requirePermissions("admin.notifications"), controller.updateTemplate);

// Admin Logs
router.get("/logs", authMiddleware, requirePermissions("admin.notifications"), controller.getLogs);

// Admin Tests
router.post("/test/email", authMiddleware, requirePermissions("admin.notifications"), controller.testEmail);
router.post("/test/sms", authMiddleware, requirePermissions("admin.notifications"), controller.testSms);

export const notificationRouter = router;
