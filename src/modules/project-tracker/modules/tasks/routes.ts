import { Router } from "express";
import { TasksController } from "./controller.ts";
import { requireAuth, auditLogger } from "../../shared/middleware.ts";
import { validateSchema, schemas } from "../../shared/validation.ts";

const router = Router();
const controller = new TasksController();

// ==========================================
// TASKS ROUTING
// ==========================================
router.get("/project/:projectId", requireAuth, controller.listTasks);
router.get("/project/:projectId/critical-path", requireAuth, controller.getCriticalPath);

router.post(
  "/",
  requireAuth,
  validateSchema(schemas.taskCreate),
  auditLogger("TASK"),
  controller.createTask
);

router.patch(
  "/bulk-update",
  requireAuth,
  validateSchema(schemas.taskBulkUpdate),
  auditLogger("TASK_BULK"),
  controller.bulkUpdateTasks
);

router.delete(
  "/bulk-delete",
  requireAuth,
  validateSchema(schemas.taskBulkDelete),
  auditLogger("TASK_BULK"),
  controller.bulkDeleteTasks
);

router.patch(
  "/:id",
  requireAuth,
  validateSchema(schemas.taskUpdate),
  auditLogger("TASK"),
  controller.updateTask
);

router.delete(
  "/:id",
  requireAuth,
  auditLogger("TASK"),
  controller.deleteTask
);

// ==========================================
// SUBTASKS ROUTING
// ==========================================
router.get("/task/:taskId/subtasks", requireAuth, controller.listSubtasks);

router.post(
  "/subtask",
  requireAuth,
  validateSchema(schemas.subtaskCreate),
  auditLogger("SUBTASK"),
  controller.createSubtask
);

router.patch(
  "/subtask/:id",
  requireAuth,
  validateSchema(schemas.subtaskUpdate),
  auditLogger("SUBTASK"),
  controller.updateSubtask
);

router.delete(
  "/subtask/:id",
  requireAuth,
  auditLogger("SUBTASK"),
  controller.deleteSubtask
);

// ==========================================
// MILESTONES ROUTING
// ==========================================
router.get("/project/:projectId/milestones", requireAuth, controller.listMilestones);

router.post(
  "/milestone",
  requireAuth,
  validateSchema(schemas.milestoneCreate),
  auditLogger("MILESTONE"),
  controller.createMilestone
);

router.patch(
  "/milestone/:id",
  requireAuth,
  validateSchema(schemas.milestoneUpdate),
  auditLogger("MILESTONE"),
  controller.updateMilestone
);

router.delete(
  "/milestone/:id",
  requireAuth,
  auditLogger("MILESTONE"),
  controller.deleteMilestone
);

// ==========================================
// DEPENDENCIES ROUTING
// ==========================================
router.get("/project/:projectId/dependencies", requireAuth, controller.listDependencies);

router.post(
  "/dependency",
  requireAuth,
  validateSchema(schemas.dependencyCreate),
  auditLogger("DEPENDENCY"),
  controller.createDependency
);

router.delete(
  "/dependency/:id",
  requireAuth,
  auditLogger("DEPENDENCY"),
  controller.deleteDependency
);

export default router;
