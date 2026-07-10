cat << 'INNER_EOF' > src/modules/tasks/interface/task.router.ts
import { Router } from "express";
import { TaskController } from "./task.controller.ts";
import { TaskService } from "../application/task.service.ts";
import { DrizzleTaskRepository } from "../infrastructure/drizzle-task.repository.ts";

const router = Router();
const repository = new DrizzleTaskRepository();
const service = new TaskService(repository);
const controller = new TaskController(service);

/**
 * @swagger
 * /tasks/project/{projectId}:
 *   get:
 *     summary: Retrieve tasks by project ID
 *     tags: [Tasks]
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
router.get("/project/:projectId", controller.getByProject);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Retrieve a specific task by ID
 *     tags: [Tasks]
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
router.get("/:id", controller.getOne);

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
router.post("/", controller.create);

/**
 * @swagger
 * /tasks/{id}/status:
 *   patch:
 *     summary: Update the status of a task
 *     tags: [Tasks]
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
router.patch("/:id/status", controller.updateStatus);

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update an existing task
 *     tags: [Tasks]
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
router.put("/:id", controller.update);

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
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
router.delete("/:id", controller.delete);

export default router;
INNER_EOF
