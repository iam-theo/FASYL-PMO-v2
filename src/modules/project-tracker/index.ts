import { Router } from "express";
import dashboardRoutes from "./modules/dashboard/routes.ts";
import teamRoutes from "./modules/team/routes.ts";
import tasksRoutes from "./modules/tasks/routes.ts";
import tirRoutes from "./modules/time-issues-risks/routes.ts";
import ddcRoutes from "./modules/deliverables-docs/routes.ts";
import mrRoutes from "./modules/meetings-resources/routes.ts";
import narRoutes from "./modules/notifications-audit-reports/routes.ts";
import chatRoutes from "./modules/chat/routes.ts";
import geminiAgentRoutes from "./modules/gemini-agent/routes.ts";

const trackerRouter = Router();

// Mount Feature Modules as Independent Decoupled Routers
trackerRouter.use("/dashboard", dashboardRoutes);
trackerRouter.use("/team", teamRoutes);
trackerRouter.use("/tasks", tasksRoutes);
trackerRouter.use("/tir", tirRoutes);
trackerRouter.use("/ddc", ddcRoutes);
trackerRouter.use("/meetings-resources", mrRoutes);
trackerRouter.use("/nar", narRoutes);
trackerRouter.use("/chat", chatRoutes);
trackerRouter.use("/gemini-agent", geminiAgentRoutes);

export default trackerRouter;
export { dbState, loadDatabase, saveDatabase, syncStateFromPostgres } from "./db.ts";
export * from "./types.ts";
