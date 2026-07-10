import { Router } from "express";
import { DashboardController } from "./controller.ts";
import { requireAuth } from "../../shared/middleware.ts";

const router = Router();
const controller = new DashboardController();

/**
 * @swagger
 * /dashboard/summary:
 *   get:
 *     summary: Retrieve dashboard execution summary metrics for a project
 *     tags: [Project Tracker - Dashboard]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: The UUID of the project
 *     responses:
 *       200:
 *         description: Project execution status summary metrics
 */
router.get("/summary", requireAuth, controller.getSummary);

export default router;
