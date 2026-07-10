import { Router } from "express";
import { TeamController } from "./controller.ts";
import { requireAuth, auditLogger } from "../../shared/middleware.ts";
import { validateSchema, schemas } from "../../shared/validation.ts";

const router = Router();
const controller = new TeamController();

// GET /api/project-tracker/team/project/:projectId
router.get("/project/:projectId", requireAuth, controller.listMembers);

// POST /api/project-tracker/team
router.post(
  "/",
  requireAuth,
  validateSchema(schemas.teamMemberCreate),
  auditLogger("TEAM_MEMBER"),
  controller.assignMember
);

// PATCH /api/project-tracker/team/:id
router.patch(
  "/:id",
  requireAuth,
  validateSchema(schemas.teamMemberUpdate),
  auditLogger("TEAM_MEMBER"),
  controller.updateAllocation
);

// DELETE /api/project-tracker/team/:id
router.delete(
  "/:id",
  requireAuth,
  auditLogger("TEAM_MEMBER"),
  controller.removeMember
);

export default router;
