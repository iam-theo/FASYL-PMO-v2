import { Router } from "express";
import { UserController } from "./user.controller";
import { authMiddleware } from "../../../shared/infrastructure/auth.middleware";
import { requirePermissions } from "../../authorization/infrastructure/authorization.middleware";

const router = Router();
const controller = new UserController();

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: User Management Endpoints
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 */
router.get("/", authMiddleware, requirePermissions("admin.users"), controller.listUsers);

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 */
router.get("/me", authMiddleware, controller.getMe);

/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Search users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.get("/search", authMiddleware, requirePermissions("admin.users"), controller.searchUsers);

/**
 * @swagger
 * /users/departments:
 *   get:
 *     summary: List all departments
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of departments
 */
router.get("/departments", authMiddleware, controller.getDepartments);

/**
 * @swagger
 * /users/managers:
 *   get:
 *     summary: List all managers
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of managers
 */
router.get("/managers", authMiddleware, requirePermissions("admin.users"), controller.getManagers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
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
 *         description: User details
 */
router.get("/:id", authMiddleware, requirePermissions("admin.users"), controller.getUserById);

/**
 * @swagger
 * /users/{id}/roles:
 *   get:
 *     summary: Get user roles
 *     tags: [Users]
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
 *         description: User roles
 */
router.get("/:id/roles", authMiddleware, requirePermissions("admin.users"), controller.getUserRoles);

/**
 * @swagger
 * /users/{id}/permissions:
 *   get:
 *     summary: Get user permissions
 *     tags: [Users]
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
 *         description: User permissions
 */
router.get("/:id/permissions", authMiddleware, requirePermissions("admin.users"), controller.getUserPermissions);

/**
 * @swagger
 * /users/{id}/projects:
 *   get:
 *     summary: Get user projects
 *     tags: [Users]
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
 *         description: User projects
 */
router.get("/:id/projects", authMiddleware, requirePermissions("admin.users"), controller.getUserProjects);

/**
 * @swagger
 * /users/{id}/tasks:
 *   get:
 *     summary: Get user tasks
 *     tags: [Users]
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
 *         description: User tasks
 */
router.get("/:id/tasks", authMiddleware, requirePermissions("admin.users"), controller.getUserTasks);
router.get("/:id/risks-issues", authMiddleware, requirePermissions("admin.users"), controller.getUserRisksAndIssues);
router.get("/:id/audit-logs", authMiddleware, requirePermissions("admin.users"), controller.getUserAuditLogs);
router.get("/:id/chat-messages", authMiddleware, requirePermissions("admin.users"), controller.getUserChatMessages);
router.get("/:id/change-requests", authMiddleware, requirePermissions("admin.users"), controller.getUserChangeRequests);
router.get("/:id/security-logs", authMiddleware, requirePermissions("admin.users"), controller.getUserSecurityLogs);
router.get("/:id/login-history", authMiddleware, requirePermissions("admin.users"), controller.getUserLoginHistory);
router.get("/:id/resources", authMiddleware, requirePermissions("admin.users"), controller.getUserResources);
router.get("/:id/milestones", authMiddleware, requirePermissions("admin.users"), controller.getUserMilestones);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               employeeId:
 *                 type: string
 *               department:
 *                 type: string
 *               jobTitle:
 *                 type: string
 *               organization:
 *                 type: string
 *               role:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post("/", authMiddleware, requirePermissions("admin.users"), controller.createUser);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user details, role, and direct permissions
 *     tags: [Users]
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
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.put("/:id", authMiddleware, requirePermissions("admin.users"), controller.updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: permanent
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.delete("/:id", authMiddleware, requirePermissions("admin.users"), controller.deleteUser);

/**
 * @swagger
 * /users/{id}/status:
 *   patch:
 *     summary: Update user status
 *     tags: [Users]
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
 *             required:
 *               - status
 *               - isActive
 *             properties:
 *               status:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               isLocked:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch("/:id/status", authMiddleware, requirePermissions("admin.users"), controller.updateUserStatus);

/**
 * @swagger
 * /users/{id}/activate:
 *   post:
 *     summary: Activate user
 *     tags: [Users]
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
 *         description: User activated successfully
 */
router.post("/:id/activate", authMiddleware, requirePermissions("admin.users"), controller.activateUser);

/**
 * @swagger
 * /users/{id}/deactivate:
 *   post:
 *     summary: Deactivate user
 *     tags: [Users]
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
 *         description: User deactivated successfully
 */
router.post("/:id/deactivate", authMiddleware, requirePermissions("admin.users"), controller.deactivateUser);

/**
 * @swagger
 * /users/{id}/suspend:
 *   post:
 *     summary: Suspend user
 *     tags: [Users]
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
 *         description: User suspended successfully
 */
router.post("/:id/suspend", authMiddleware, requirePermissions("admin.users"), controller.suspendUser);

/**
 * @swagger
 * /users/{id}/lock:
 *   post:
 *     summary: Lock user
 *     tags: [Users]
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
 *         description: User locked successfully
 */
router.post("/:id/lock", authMiddleware, requirePermissions("admin.users"), controller.lockUser);

/**
 * @swagger
 * /users/{id}/unlock:
 *   post:
 *     summary: Unlock user
 *     tags: [Users]
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
 *         description: User unlocked successfully
 */
router.post("/:id/unlock", authMiddleware, requirePermissions("admin.users"), controller.unlockUser);

/**
 * @swagger
 * /users/{id}/roles:
 *   patch:
 *     summary: Update user roles
 *     tags: [Users]
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
 *             required:
 *               - roles
 *             properties:
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Roles updated successfully
 */
router.patch("/:id/roles", authMiddleware, requirePermissions("admin.users"), controller.updateUserRoles);

/**
 * @swagger
 * /users/{id}/permissions:
 *   patch:
 *     summary: Update user direct permissions
 *     tags: [Users]
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
 *             required:
 *               - permissions
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Permissions updated successfully
 */
router.patch("/:id/permissions", authMiddleware, requirePermissions("admin.users"), controller.updateUserPermissions);

/**
 * @swagger
 * /users/{id}/reset-password:
 *   post:
 *     summary: Reset user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post("/:id/reset-password", authMiddleware, requirePermissions("admin.users"), controller.resetPassword);

export default router;
