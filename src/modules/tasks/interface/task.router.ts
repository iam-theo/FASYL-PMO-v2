import { Router } from "express";
import { TaskController } from "./task.controller.ts";
import { TaskService } from "../application/task.service.ts";
import { DrizzleTaskRepository } from "../infrastructure/drizzle-task.repository.ts";
import { authMiddleware } from "../../../shared/infrastructure/auth.middleware.ts";

const router = Router();
const repository = new DrizzleTaskRepository();
const service = new TaskService(repository);
const controller = new TaskController(service);

/**
 * @swagger
 * /tasks/me:
 *   get:
 *     summary: Retrieve tasks assigned to the authenticated user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of assigned tasks
 */
router.get("/me", authMiddleware, controller.getMyTasks);

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Retrieve all tasks (filtered by user access)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of all tasks
 */
router.get("/", authMiddleware, controller.getAll);

/**
 * @swagger
 * /tasks/project/{projectId}:
 *   get:
 *     summary: Retrieve tasks by project ID (filtered by access)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of tasks for the project
 */
router.get("/project/:projectId", authMiddleware, controller.getByProject);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Retrieve a specific task by ID
 *     tags: [Tasks]
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
 *         description: Task details
 */
router.get("/:id", authMiddleware, controller.getOne);

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
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
 *     responses:
 *       201:
 *         description: Created task
 */
router.post("/", authMiddleware, controller.create);

/**
 * @swagger
 * /tasks/{id}/status:
 *   patch:
 *     summary: Update the status of a task
 *     tags: [Tasks]
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
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated task status
 */
router.patch("/:id/status", authMiddleware, controller.updateStatus);

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update an existing task
 *     tags: [Tasks]
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated task
 */
router.put("/:id", authMiddleware, controller.update);

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
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
 *         description: Task deleted successfully
 */
router.delete("/:id", authMiddleware, controller.delete);

export default router;
