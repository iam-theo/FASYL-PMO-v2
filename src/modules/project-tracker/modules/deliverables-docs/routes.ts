import { Router } from "express";
import { DeliverablesDocsController } from "./controller.ts";
import { requireAuth, auditLogger } from "../../shared/middleware.ts";
import { validateSchema, schemas } from "../../shared/validation.ts";

const router = Router();
const controller = new DeliverablesDocsController();

// ==========================================
// DELIVERABLES ROUTES
// ==========================================
router.get("/project/:projectId", requireAuth, controller.listDeliverables);

router.post(
  "/",
  requireAuth,
  validateSchema(schemas.deliverableCreate),
  auditLogger("DELIVERABLE"),
  controller.createDeliverable
);

router.patch(
  "/:id",
  requireAuth,
  validateSchema(schemas.deliverableUpdate),
  auditLogger("DELIVERABLE"),
  controller.updateDeliverable
);

router.delete(
  "/:id",
  requireAuth,
  auditLogger("DELIVERABLE"),
  controller.deleteDeliverable
);

// ==========================================
// DOCUMENTS & FOLDERS ROUTES
// ==========================================
router.get("/project/:projectId/documents", requireAuth, controller.listDocuments);
router.get("/project/:projectId/folders", requireAuth, controller.listFolders);

router.post(
  "/document",
  requireAuth,
  validateSchema(schemas.documentCreate),
  auditLogger("DOCUMENT"),
  controller.uploadDocument
);

// ==========================================
// THREADED COMMENTS ROUTES
// ==========================================
router.get("/comments/:entityType/:entityId", requireAuth, controller.listThreadedComments);

router.post(
  "/comment",
  requireAuth,
  validateSchema(schemas.commentCreate),
  auditLogger("COMMENT"),
  controller.createComment
);

router.post(
  "/comment/:commentId/reaction",
  requireAuth,
  auditLogger("COMMENT_REACTION"),
  controller.toggleReaction
);

router.delete(
  "/comment/:id",
  requireAuth,
  auditLogger("COMMENT"),
  controller.deleteComment
);

export default router;
