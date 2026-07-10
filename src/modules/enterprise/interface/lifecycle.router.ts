import { Router } from "express";
import { EnterpriseController } from "./enterprise.controller.ts";
import { upload } from "./upload.middleware.ts";

const router = Router();
const controller = new EnterpriseController();

// 1. Templates & Overviews

router.get("/templates", controller.getTemplates);
router.get("/templates/:templateId", controller.getTemplateById);
router.put("/templates/:templateId", controller.updateTemplate);

/**
 * @swagger
 * /lifecycle/seed:
 *   post:
 *     summary: Seed default lifecycle template
 *     tags: [Enterprise Lifecycle]
 *     responses:
 *       201:
 *         description: Seeded template
 */
router.post("/seed", controller.seedDefaultLifecycleTemplate);

/**
 * @swagger
 * /lifecycle/dashboard:
 *   get:
 *     summary: Get governance dashboard metrics
 *     tags: [Enterprise Lifecycle]
 *     responses:
 *       200:
 *         description: Dashboard metrics
 */
router.get("/dashboard", controller.getGovernanceDashboardMetrics);

/**
 * @swagger
 * /lifecycle/sla/cron:
 *   post:
 *     summary: Run SLA cron jobs simulation
 *     tags: [Enterprise Lifecycle]
 *     responses:
 *       200:
 *         description: Cron jobs simulation ran
 */
router.post("/sla/cron", controller.runSLACronJobsSimulation);

// 2. Instances
/**
 * @swagger
 * /lifecycle/instances:
 *   post:
 *     summary: Create lifecycle instance
 *     tags: [Enterprise Lifecycle]
 *     responses:
 *       201:
 *         description: Lifecycle instance created
 */
router.post("/instances", controller.createLifecycleInstance);

/**
 * @swagger
 * /lifecycle/instances/{projectId}:
 *   get:
 *     summary: Get lifecycle instance
 *     tags: [Enterprise Lifecycle]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lifecycle instance
 */
router.get("/instances/:projectId", controller.getLifecycleInstance);

// 3. Document Controls
/**
 * @swagger
 * /lifecycle/instances/{instanceId}/documents/{stageDocumentId}/upload:
 */
router.post("/instances/:instanceId/documents/:stageDocumentId/upload", upload.single("file"), controller.uploadLifecycleDocument);
router.post("/documents/verify/:documentVersionId", controller.verifyLifecycleDocument);

// 4. Checklists
router.post("/instances/:instanceId/checklists/:checklistId/complete", controller.completeLifecycleChecklist);

// 5. Governance Workflow
router.post("/instances/:instanceId/submit", controller.submitLifecycleForReview);
router.post("/instances/:instanceId/review", controller.reviewLifecycleStageGate);
router.get("/instances/:instanceId/stages/:stageId/readiness", controller.getLifecycleReadinessStatus);

/**
 * @swagger
 * /lifecycle/instances/{instanceId}/documents/{stageDocumentId}/upload:
 *   post:
 *     summary: Upload lifecycle document
 *     tags: [Enterprise Lifecycle]
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: stageDocumentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Document uploaded
 */

/**
 * @swagger
 * /lifecycle/documents/{documentVersionId}/verify:
 *   post:
 *     summary: Verify lifecycle document
 *     tags: [Enterprise Lifecycle]
 *     parameters:
 *       - in: path
 *         name: documentVersionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document verified
 */
router.post("/documents/:documentVersionId/verify", controller.verifyLifecycleDocument);

// 4. Checklist Controls
/**
 * @swagger
 * /lifecycle/instances/{instanceId}/checklists/{checklistId}/complete:
 *   post:
 *     summary: Complete lifecycle checklist
 *     tags: [Enterprise Lifecycle]
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: checklistId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Checklist completed
 */
router.post("/instances/:instanceId/checklists/:checklistId/complete", controller.completeLifecycleChecklist);

// 5. Approvals
/**
 * @swagger
 * /lifecycle/instances/{instanceId}/stages/{stageId}/approve:
 *   post:
 *     summary: Submit stage approval role
 *     tags: [Enterprise Lifecycle]
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: stageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Approval submitted
 */
router.post("/instances/:instanceId/stages/:stageId/approve", controller.submitStageApprovalRole);

// 6. Discussions
/**
 * @swagger
 * /lifecycle/instances/{instanceId}/stages/{stageId}/comments:
 *   post:
 *     summary: Add lifecycle comment message
 *     tags: [Enterprise Lifecycle]
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: stageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Comment added
 */
router.post("/instances/:instanceId/stages/:stageId/comments", controller.addLifecycleCommentMessage);

// 7. Gatekeeper Control (Head of Operations Review)
/**
 * @swagger
 * /lifecycle/instances/{instanceId}/stages/{stageId}/operations-review:
 *   post:
 *     summary: Submit Head of Operations Review Gate
 *     tags: [Enterprise Lifecycle]
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: stageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review submitted
 */
router.post("/instances/:instanceId/stages/:stageId/operations-review", controller.submitHeadOfOperationsReviewGate);

// 8. Metrics
/**
 * @swagger
 * /lifecycle/instances/{instanceId}/stages/{stageId}/sla:
 *   get:
 *     summary: Get stage SLA performance
 *     tags: [Enterprise Lifecycle]
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: stageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: SLA performance
 */
router.get("/instances/:instanceId/stages/:stageId/sla", controller.getStageSLAPerformance);

export default router;
