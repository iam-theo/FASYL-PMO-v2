import { Router } from "express";
import { ProjectController } from "./project.controller.ts";
import { ProjectService } from "../application/project.service.ts";
import { DrizzleProjectRepository } from "../infrastructure/drizzle-project.repository.ts";
import { authMiddleware } from "../../../shared/infrastructure/auth.middleware.ts";

const router = Router();

// Dependency Injection (Poor man's version for now)
const repository = new DrizzleProjectRepository();
const service = new ProjectService(repository);
const controller = new ProjectController(service);

/**
 * @swagger
 * /projects/me:
 *   get:
 *     summary: Retrieve projects assigned to or managed by the authenticated user
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of assigned projects
 */
router.get("/me", authMiddleware, controller.getMyProjects);

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Retrieve a list of all projects (filtered by access)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of projects
 */
router.get("/", authMiddleware, controller.getAll);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Retrieve a specific project by ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project details
 *       404:
 *         description: Project not found
 */
router.get("/:id", authMiddleware, controller.getOne);

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created project
 */
router.post("/", authMiddleware, controller.create);

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Update an existing project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated project
 */
router.put("/:id", authMiddleware, controller.update);

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Delete a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project deleted successfully
 */
router.delete("/:id", authMiddleware, controller.delete);

export default router;
