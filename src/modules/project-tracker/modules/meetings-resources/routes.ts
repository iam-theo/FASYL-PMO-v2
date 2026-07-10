import { Router } from "express";
import { MeetingsResourcesController } from "./controller.ts";
import { requireAuth, auditLogger } from "../../shared/middleware.ts";
import { validateSchema, schemas } from "../../shared/validation.ts";

const router = Router();
const controller = new MeetingsResourcesController();

// ==========================================
// MEETINGS ROUTES
// ==========================================
router.get("/project/:projectId", requireAuth, controller.listMeetings);

router.post(
  "/",
  requireAuth,
  validateSchema(schemas.meetingCreate),
  auditLogger("MEETING"),
  controller.createMeeting
);

router.patch(
  "/:id",
  requireAuth,
  validateSchema(schemas.meetingUpdate),
  auditLogger("MEETING"),
  controller.updateMeeting
);

// ==========================================
// RESOURCES CAPACITY ROUTES
// ==========================================
router.get("/project/:projectId/capacity-planning", requireAuth, controller.getResourceAllocation);

// ==========================================
// EVM PROGRESS ANALYTICS ROUTES
// ==========================================
router.get("/project/:projectId/evm-progress", requireAuth, controller.getProgressEVM);

export default router;
