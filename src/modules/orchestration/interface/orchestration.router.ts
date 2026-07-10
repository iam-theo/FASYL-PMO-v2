import { Router } from "express";
import { OrchestrationController } from "./orchestration.controller.ts";

const orchestrationRouter = Router();
const controller = new OrchestrationController();

/**
 * @swagger
 * /orchestration/health:
 *   get:
 *     summary: Retrieve system telemetry and microservice health status
 *     tags: [Orchestration]
 *     responses:
 *       200:
 *         description: Telemetry data, resource usage, and database connections
 */
orchestrationRouter.get("/health", controller.getSystemHealth);

/**
 * @swagger
 * /orchestration/dashboard:
 *   get:
 *     summary: Retrieve executive PMO orchestration analytics dashboard
 *     tags: [Orchestration]
 *     responses:
 *       200:
 *         description: High-level system governance metrics
 */
orchestrationRouter.get("/dashboard", controller.getExecutiveDashboard);
orchestrationRouter.get("/analytics", controller.getAnalyticsMetrics);

/**
 * @swagger
 * /orchestration/configs:
 *   get:
 *     summary: Fetch system configurations by category
 *     tags: [Configuration]
 *     parameters:
 *       - in: query
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Config category (e.g. SLA, FEATURE_FLAGS, AI, CALENDAR, NOTIFICATION, FINANCE)
 *     responses:
 *       200:
 *         description: Active threshold values and state parameters
 *   post:
 *     summary: Update a single dynamic system configuration
 *     tags: [Configuration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, value, category, actorId]
 *             properties:
 *               key:
 *                 type: string
 *               value:
 *                 type: object
 *               category:
 *                 type: string
 *               actorId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 */
orchestrationRouter.get("/configs", controller.getConfigs);
orchestrationRouter.post("/configs", controller.updateConfig);

/**
 * @swagger
 * /orchestration/configs/bulk:
 *   post:
 *     summary: Bulk update multiple system configurations in a single batch operation
 *     tags: [Configuration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [configs, actorId]
 *             properties:
 *               configs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [key, value, category]
 *                   properties:
 *                     key:
 *                       type: string
 *                     value:
 *                       type: object
 *                     category:
 *                       type: string
 *               actorId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Configurations bulk updated successfully
 */
orchestrationRouter.post("/configs/bulk", controller.bulkUpdateConfigs);

// 4. Integration Hub
orchestrationRouter.get("/integrations", controller.getIntegrations);
orchestrationRouter.post("/integrations/toggle", controller.toggleIntegration);
orchestrationRouter.post("/integrations/sync", controller.syncEntity);

// 5. Scheduler & Job Center Queue
orchestrationRouter.get("/jobs", controller.listActiveJobs);
orchestrationRouter.post("/jobs/trigger", controller.triggerManualJob);

// 6. Event Registry
orchestrationRouter.get("/events", controller.getEventCatalog);

/**
 * @swagger
 * /orchestration/audit:
 *   get:
 *     summary: Retrieve immutable system change audit logs with filtering, searching, sorting, and pagination
 *     tags: [Audit]
 *     parameters:
 *       - in: query
 *         name: actorId
 *         schema:
 *           type: string
 *         description: Filter logs by actor ID
 *       - in: query
 *         name: moduleName
 *         schema:
 *           type: string
 *         description: Filter logs by module name
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter logs by action string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query matching actions, categories, descriptions, or serialized details
 *       - in: query
 *         name: sortField
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field name to sort on
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sorting order
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Pagination limit
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Filtered and sorted audit logs
 */
orchestrationRouter.get("/audit", controller.getAuditLogs);

// 8. Universal Timeline
orchestrationRouter.get("/timeline/:projectId", controller.getProjectTimeline);

// 9. Smart AI Gateway
orchestrationRouter.post("/ai/generate", controller.generateAiText);

// 10. System Administration & Maintenance Mode
orchestrationRouter.get("/settings", controller.getSystemSettings);
orchestrationRouter.post("/maintenance", controller.toggleMaintenanceMode);

export default orchestrationRouter;
