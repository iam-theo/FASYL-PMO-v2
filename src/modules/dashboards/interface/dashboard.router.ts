import { Router } from "express";
import { authMiddleware } from "../../../shared/infrastructure/auth.middleware.ts";
import { requirePermissions } from "../../authorization/infrastructure/authorization.middleware.ts";
import { DashboardController } from "./dashboard.controller.ts";

const router = Router();
const controller = new DashboardController();

/**
 * @swagger
 * /dashboards/me:
 *   get:
 *     summary: Get resolved dashboard for current user
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get("/me", authMiddleware, controller.getEffectiveDashboard);

/**
 * @swagger
 * /dashboards/preferences:
 *   post:
 *     summary: Save user dashboard preferences
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.post("/preferences", authMiddleware, controller.savePreferences);

/**
 * @swagger
 * /dashboards/widgets:
 *   get:
 *     summary: List available widgets
 *     tags: [Dashboard Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get("/widgets", authMiddleware, requirePermissions("admin.dashboards"), controller.listWidgets);

/**
 * @swagger
 * /dashboards/widgets:
 *   post:
 *     summary: Create a new widget definition
 *     tags: [Dashboard Admin]
 *     security:
 *       - bearerAuth: []
 */
router.post("/widgets", authMiddleware, requirePermissions("admin.dashboards"), controller.createWidget);

/**
 * @swagger
 * /dashboards/templates:
 *   post:
 *     summary: Create a new dashboard template
 *     tags: [Dashboard Admin]
 *     security:
 *       - bearerAuth: []
 */
router.post("/templates", authMiddleware, requirePermissions("admin.dashboards"), controller.createTemplate);
router.get("/templates", authMiddleware, requirePermissions("admin.dashboards"), controller.listTemplates);
router.delete("/templates/:id", authMiddleware, requirePermissions("admin.dashboards"), controller.deleteTemplate);
router.put("/widgets/:id", authMiddleware, requirePermissions("admin.dashboards"), controller.updateWidget);
router.delete("/widgets/:id", authMiddleware, requirePermissions("admin.dashboards"), controller.deleteWidget);

export { router as dashboardRouter };
