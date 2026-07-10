cat << 'INNER_EOF' > src/modules/authorization/interface/authorization.router.ts
import { Router } from "express";
import { authMiddleware } from "../../../shared/infrastructure/auth.middleware.ts";
import { requirePermissions } from "../infrastructure/authorization.middleware.ts";
import { AuthorizationController } from "./authorization.controller.ts";

const router = Router();
const controller = new AuthorizationController();

/**
 * @swagger
 * /auth/users/me/profile:
 *   get:
 *     summary: Get calling user's own security footprint
 *     tags: [Authorization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Security profile
 */
router.get("/users/me/profile", authMiddleware, controller.getOwnSecurityProfile);

/**
 * @swagger
 * /auth/permissions:
 *   get:
 *     summary: Dictionary list actions
 *     tags: [Authorization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of permissions
 */
router.get("/permissions", authMiddleware, requirePermissions("admin.permissions"), controller.listPermissions);

/**
 * @swagger
 * /auth/permissions/search:
 *   get:
 *     summary: Search permissions
 *     tags: [Authorization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Searched permissions
 */
router.get("/permissions/search", authMiddleware, requirePermissions("admin.permissions"), controller.searchPermissions);

/**
 * @swagger
 * /auth/matrix:
 *   get:
 *     summary: Get permission matrix
 *     tags: [Authorization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permission matrix
 */
router.get("/matrix", authMiddleware, requirePermissions("admin.permissions"), controller.getPermissionMatrix);

/**
 * @swagger
 * /auth/roles:
 *   get:
 *     summary: List roles
 *     tags: [Authorization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 */
router.get("/roles", authMiddleware, requirePermissions("admin.roles"), controller.listRoles);

/**
 * @swagger
 * /auth/roles:
 *   post:
 *     summary: Create custom role
 *     tags: [Authorization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created role
 */
router.post("/roles", authMiddleware, requirePermissions("admin.roles"), controller.createCustomRole);

/**
 * @swagger
 * /auth/roles/{code}:
 *   put:
 *     summary: Update custom role
 *     tags: [Authorization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
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
 *         description: Updated role
 */
router.put("/roles/:code", authMiddleware, requirePermissions("admin.roles"), controller.updateCustomRole);

/**
 * @swagger
 * /auth/roles/{code}:
 *   delete:
 *     summary: Delete custom role
 *     tags: [Authorization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted role
 */
router.delete("/roles/:code", authMiddleware, requirePermissions("admin.roles"), controller.deleteCustomRole);

/**
 * @swagger
 * /auth/users/{userId}/roles:
 *   post:
 *     summary: Assign role to user
 *     tags: [Authorization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *         description: Assigned role
 */
router.post("/users/:userId/roles", authMiddleware, requirePermissions("admin.role_assignment"), controller.assignRoleToUser);

/**
 * @swagger
 * /auth/users/{userId}/roles/{roleCode}:
 *   delete:
 *     summary: Remove role from user
 *     tags: [Authorization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roleCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Removed role
 */
router.delete("/users/:userId/roles/:roleCode", authMiddleware, requirePermissions("admin.role_assignment"), controller.removeRoleFromUser);

/**
 * @swagger
 * /auth/users/{userId}/permissions:
 *   post:
 *     summary: Assign direct permission to user
 *     tags: [Authorization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *         description: Assigned permission
 */
router.post("/users/:userId/permissions", authMiddleware, requirePermissions("admin.user_assignment"), controller.assignDirectPermissionToUser);

/**
 * @swagger
 * /auth/users/{userId}/permissions/{permissionName}:
 *   delete:
 *     summary: Remove direct permission from user
 *     tags: [Authorization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: permissionName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Removed permission
 */
router.delete("/users/:userId/permissions/:permissionName", authMiddleware, requirePermissions("admin.user_assignment"), controller.removeDirectPermissionFromUser);

/**
 * @swagger
 * /auth/users/{userId}/profile:
 *   get:
 *     summary: Access other users security footprints
 *     tags: [Authorization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile
 */
router.get("/users/:userId/profile", authMiddleware, requirePermissions("admin.users"), controller.getUserSecurityProfile);

/**
 * @swagger
 * /auth/logs:
 *   get:
 *     summary: Security and access changes audit history logs
 *     tags: [Authorization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs
 */
router.get("/logs", authMiddleware, requirePermissions("admin.logs"), controller.getSecurityAuditLogs);

export default router;
INNER_EOF
