import { Router } from "express";
import { IAMController } from "./iam.controller";
import { authController } from "./auth.controller.ts";
import { UserController } from "./user.controller.ts";
import { authMiddleware } from "../../../shared/infrastructure/auth.middleware.ts";

const router = Router();
const userController = new UserController();

/**
 * @swagger
 * tags:
 *   - name: IAM
 *     description: Identity and Access Management (IAM) & Authentication Endpoints
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate a user and get JWT access and refresh tokens
 *     tags: [IAM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@auraepm.com
 *               password:
 *                 type: string
 *                 example: Admin123!
 *               deviceInfo:
 *                 type: string
 *                 example: Swagger Doc Client
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *       400:
 *         description: Email and password are required or invalid inputs
 *       401:
 *         description: Unauthorized credentials
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Revoke access session and logout
 *     tags: [IAM]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out
 *       401:
 *         description: Unauthorized token
 */
router.post("/logout", authMiddleware, (req, res) => res.json({ success: true }));

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change password of current authenticated user
 *     tags: [IAM]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Unauthorized token
 */
router.post("/change-password", authMiddleware, (req, res) => res.json({ success: true, message: "Password changed" }));

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh JWT Access Token using standard Refresh Token
 *     tags: [IAM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "<your_refresh_token_here>"
 *     responses:
 *       200:
 *         description: Tokens successfully refreshed
 *       401:
 *         description: Invalid refresh token
 */
router.post("/refresh", authController.refreshToken);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Retrieve details of currently logged-in user
 *     tags: [IAM]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user identity profile details
 *       401:
 *         description: Unauthorized token
 */
router.get("/me", authMiddleware, authController.getMe);

/**
 * @swagger
 * /auth/roles:
 *   get:
 *     summary: Retrieve list of all available and active security roles
 *     tags: [IAM]
 *     responses:
 *       200:
 *         description: Array of roles retrieved successfully
 */
// router.get("/roles", IAMController.listRoles);

/**
 * @swagger
 * /auth/roles:
 *   post:
 *     summary: Create a new security role in the Enterprise Directory
 *     tags: [IAM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *             properties:
 *               name:
 *                 type: string
 *                 example: Project Planner
 *               code:
 *                 type: string
 *                 example: project_planner
 *               description:
 *                 type: string
 *                 example: Can coordinate, view timelines and manage milestones
 *     responses:
 *       201:
 *         description: Security role created successfully
 *       500:
 *         description: Database insert error
 */
// router.post("/roles", IAMController.createRole);

/**
 * @swagger
 * /auth/roles/{roleId}/permissions:
 *   post:
 *     summary: Set the exact batch of authorization permission IDs mapped to a role
 *     tags: [IAM]
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the role to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissionIds
 *             properties:
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]
 *     responses:
 *       200:
 *         description: Permissions assigned successfully
 *       500:
 *         description: Database error
 */
// router.post("/roles/:roleId/permissions", IAMController.assignPermissions);

/**
 * @swagger
 * /auth/users/{userId}/effective-permissions:
 *   get:
 *     summary: Calculate user's effective authorization permission codes (RBAC + dynamic rules)
 *     tags: [IAM]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the user
 *     responses:
 *       200:
 *         description: Set of permissions granted to the user
 *       500:
 *         description: Error processing permissions mapping
 */
router.get("/users/:userId/effective-permissions", IAMController.getEffectivePermissions);
router.get("/departments", authMiddleware, userController.getDepartments);

export default router;
