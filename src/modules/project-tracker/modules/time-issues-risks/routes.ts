import { Router } from "express";
import { TimeIssuesRisksController } from "./controller.ts";
import { requireAuth, auditLogger } from "../../shared/middleware.ts";
import { validateSchema, schemas } from "../../shared/validation.ts";

const router = Router();
const controller = new TimeIssuesRisksController();

// ==========================================
// TIME TRACKING ROUTES
// ==========================================

/**
 * @swagger
 * /time-issues-risks/project/{projectId}:
 *   get:
 *     summary: Retrieve all time logs for a project
 *     tags: [Project Tracker - Time, Issues & Risks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of time logs
 */
router.get("/project/:projectId", requireAuth, controller.listTimeLogs);

/**
 * @swagger
 * /time-issues-risks/project/{projectId}/summary:
 *   get:
 *     summary: Retrieve timesheet summary metrics for a project
 *     tags: [Project Tracker - Time, Issues & Risks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Timesheet summary metrics
 */
router.get("/project/:projectId/summary", requireAuth, controller.getTimesheetSummary);

/**
 * @swagger
 * /time-issues-risks:
 *   post:
 *     summary: Create a new time log entry
 *     tags: [Project Tracker - Time, Issues & Risks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId, taskId, hours, date, description]
 *             properties:
 *               projectId:
 *                 type: string
 *               taskId:
 *                 type: string
 *               hours:
 *                 type: number
 *               date:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Time log entry created successfully
 */
router.post(
  "/",
  requireAuth,
  validateSchema(schemas.timeLogCreate),
  auditLogger("TIME_LOG"),
  controller.createTimeLog
);

/**
 * @swagger
 * /time-issues-risks/{id}/approve:
 *   patch:
 *     summary: Approve a submitted time log entry
 *     tags: [Project Tracker - Time, Issues & Risks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Time log entry approved
 */
router.patch(
  "/:id/approve",
  requireAuth,
  auditLogger("TIME_LOG_APPROVE"),
  controller.approveTimeLog
);

// ==========================================
// ISSUES REGISTER ROUTES
// ==========================================

/**
 * @swagger
 * /time-issues-risks/project/{projectId}/issues:
 *   get:
 *     summary: Retrieve all registered issues for a project
 *     tags: [Project Tracker - Time, Issues & Risks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of project issues
 */
router.get("/project/:projectId/issues", requireAuth, controller.listIssues);

/**
 * @swagger
 * /time-issues-risks/issue:
 *   post:
 *     summary: Create a new issue in the register
 *     tags: [Project Tracker - Time, Issues & Risks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId, title, severity]
 *             properties:
 *               projectId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               severity:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *     responses:
 *       201:
 *         description: Issue registered successfully
 */
router.post(
  "/issue",
  requireAuth,
  validateSchema(schemas.issueCreate),
  auditLogger("ISSUE"),
  controller.createIssue
);

/**
 * @swagger
 * /time-issues-risks/issue/{id}:
 *   patch:
 *     summary: Update an existing issue registration
 *     tags: [Project Tracker - Time, Issues & Risks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               severity:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [OPEN, RESOLVED, CLOSED]
 *     responses:
 *       200:
 *         description: Issue updated successfully
 */
router.patch(
  "/issue/:id",
  requireAuth,
  validateSchema(schemas.issueUpdate),
  auditLogger("ISSUE"),
  controller.updateIssue
);

/**
 * @swagger
 * /time-issues-risks/issue/{id}:
 *   delete:
 *     summary: Remove an issue registration (soft-delete)
 *     tags: [Project Tracker - Time, Issues & Risks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Issue removed
 */
router.delete(
  "/issue/:id",
  requireAuth,
  auditLogger("ISSUE"),
  controller.deleteIssue
);

// ==========================================
// RISKS REGISTER ROUTES
// ==========================================

/**
 * @swagger
 * /time-issues-risks/project/{projectId}/risks:
 *   get:
 *     summary: Retrieve all registered risks for a project
 *     tags: [Project Tracker - Time, Issues & Risks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of project risks
 */
router.get("/project/:projectId/risks", requireAuth, controller.listRisks);

/**
 * @swagger
 * /time-issues-risks/risk:
 *   post:
 *     summary: Create a new risk in the register
 *     tags: [Project Tracker - Time, Issues & Risks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId, title, probability, impact, mitigationStrategy]
 *             properties:
 *               projectId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               probability:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *               impact:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *               mitigationStrategy:
 *                 type: string
 *     responses:
 *       201:
 *         description: Risk registered successfully
 */
router.post(
  "/risk",
  requireAuth,
  validateSchema(schemas.riskCreate),
  auditLogger("RISK"),
  controller.createRisk
);

/**
 * @swagger
 * /time-issues-risks/risk/{id}:
 *   patch:
 *     summary: Update an existing risk registration
 *     tags: [Project Tracker - Time, Issues & Risks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               probability:
 *                 type: string
 *               impact:
 *                 type: string
 *               mitigationStrategy:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [IDENTIFIED, MITIGATED, CLOSED]
 *     responses:
 *       200:
 *         description: Risk updated successfully
 */
router.patch(
  "/risk/:id",
  requireAuth,
  validateSchema(schemas.riskUpdate),
  auditLogger("RISK"),
  controller.updateRisk
);

/**
 * @swagger
 * /time-issues-risks/risk/{id}:
 *   delete:
 *     summary: Remove a risk registration (soft-delete)
 *     tags: [Project Tracker - Time, Issues & Risks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Risk removed
 */
router.delete(
  "/risk/:id",
  requireAuth,
  auditLogger("RISK"),
  controller.deleteRisk
);

export default router;
