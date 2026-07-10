cat << 'INNER_EOF' > src/modules/issues-risks/interface/risk-issue.router.ts
import { Router } from "express";
import { RiskIssueController } from "./risk-issue.controller.ts";
import { RiskIssueService } from "../application/risk-issue.service.ts";
import { DrizzleRiskIssueRepository } from "../infrastructure/drizzle-risk-issue.repository.ts";

const router = Router();
const repository = new DrizzleRiskIssueRepository();
const service = new RiskIssueService(repository);
const controller = new RiskIssueController(service);

/**
 * @swagger
 * /risks-issues/project/{projectId}:
 *   get:
 *     summary: Retrieve risks and issues by project ID
 *     tags: [Risks and Issues]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of risks and issues for the project
 */
router.get("/project/:projectId", controller.getByProject);

/**
 * @swagger
 * /risks-issues:
 *   post:
 *     summary: Create a new risk or issue
 *     tags: [Risks and Issues]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               projectId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [RISK, ISSUE]
 *     responses:
 *       201:
 *         description: Created risk or issue
 */
router.post("/", controller.create);

/**
 * @swagger
 * /risks-issues/{id}:
 *   put:
 *     summary: Update a risk or issue
 *     tags: [Risks and Issues]
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
 *     responses:
 *       200:
 *         description: Updated risk or issue
 */
router.put("/:id", controller.update);

/**
 * @swagger
 * /risks-issues/{id}:
 *   delete:
 *     summary: Delete a risk or issue
 *     tags: [Risks and Issues]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted risk or issue
 */
router.delete("/:id", controller.delete);

export default router;
INNER_EOF
