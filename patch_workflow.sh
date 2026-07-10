cat << 'INNER_EOF' > src/modules/workflow/interface/workflow.router.ts
import { Router } from "express";
import { WorkflowController } from "./workflow.controller.ts";
import { WorkflowService } from "../application/workflow.service.ts";
import { authMiddleware } from "../../../shared/infrastructure/auth.middleware.ts";

const router = Router();
const service = new WorkflowService();
const controller = new WorkflowController(service);

/**
 * @swagger
 * /workflows/templates:
 *   get:
 *     summary: Retrieve workflow templates
 *     tags: [Workflows]
 *     responses:
 *       200:
 *         description: List of workflow templates
 */
router.get("/templates", controller.templates);

/**
 * @swagger
 * /workflows/statistics:
 *   get:
 *     summary: Retrieve workflow statistics
 *     tags: [Workflows]
 *     responses:
 *       200:
 *         description: Workflow statistics
 */
router.get("/statistics", controller.statistics);

/**
 * @swagger
 * /workflows:
 *   get:
 *     summary: Retrieve all workflows
 *     tags: [Workflows]
 *     responses:
 *       200:
 *         description: List of workflows
 */
router.get("/", controller.list);

/**
 * @swagger
 * /workflows:
 *   post:
 *     summary: Create a new workflow
 *     tags: [Workflows]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created workflow
 */
router.post("/", controller.create);

/**
 * @swagger
 * /workflows/{id}:
 *   put:
 *     summary: Update a workflow
 *     tags: [Workflows]
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
 *     responses:
 *       200:
 *         description: Updated workflow
 */
router.put("/:id", controller.update);

/**
 * @swagger
 * /workflows/{id}:
 *   delete:
 *     summary: Delete a workflow
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted workflow
 */
router.delete("/:id", controller.delete);

/**
 * @swagger
 * /workflows/{id}/diagram:
 *   get:
 *     summary: Get workflow diagram
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow diagram
 */
router.get("/:id/diagram", controller.getDiagram);

/**
 * @swagger
 * /workflows/{id}/start:
 *   post:
 *     summary: Start a workflow instance
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Started workflow instance
 */
router.post("/:id/start", controller.start);

/**
 * @swagger
 * /workflows/{id}/transition:
 *   post:
 *     summary: Transition a workflow instance
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transitioned workflow instance
 */
router.post("/:id/transition", controller.transition);

/**
 * @swagger
 * /workflows/{id}/approve:
 *   post:
 *     summary: Approve a workflow instance
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Approved workflow instance
 */
router.post("/:id/approve", controller.approve);

/**
 * @swagger
 * /workflows/{id}/reject:
 *   post:
 *     summary: Reject a workflow instance
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rejected workflow instance
 */
router.post("/:id/reject", controller.reject);

/**
 * @swagger
 * /workflows/{id}/escalate:
 *   post:
 *     summary: Escalate a workflow instance
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Escalated workflow instance
 */
router.post("/:id/escalate", controller.escalate);

/**
 * @swagger
 * /workflows/{id}/history:
 *   get:
 *     summary: Get workflow history
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow history
 */
router.get("/:id/history", controller.history);

/**
 * @swagger
 * /workflows/{id}/logs:
 *   get:
 *     summary: Get workflow logs
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow logs
 */
router.get("/:id/logs", controller.logs);

/**
 * @swagger
 * /workflows/{id}/instances:
 *   get:
 *     summary: Get workflow instances
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow instances
 */
router.get("/:id/instances", controller.instances);

export default router;
INNER_EOF
