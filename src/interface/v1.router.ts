import { Router } from "express";
import projectRouter from "../modules/projects/interface/project.router.ts";
import taskRouter from "../modules/tasks/interface/task.router.ts";
import riskIssueRouter from "../modules/issues-risks/interface/risk-issue.router.ts";
import authRouter from "../modules/authorization/interface/authorization.router.ts";
import iamRouter from "../modules/iam/interface/iam.router.ts";
import userRouter from "../modules/iam/interface/user.router.ts";
import workflowRouter from "../modules/workflow/interface/workflow.router.ts";
import portfolioRouter from "../modules/portfolio/interface/portfolio.router.ts";
import enterpriseRouter from "../modules/enterprise/interface/enterprise.router.ts";
import lifecycleRouter from "../modules/enterprise/interface/lifecycle.router.ts";
import orchestrationRouter from "../modules/orchestration/interface/orchestration.router.ts";
import devPortalRouter from "../modules/orchestration/interface/developer-portal.router.ts";
import { dashboardRouter } from "../modules/dashboards/interface/dashboard.router.ts";
import { notificationRouter } from "../modules/notifications/interface/notification.router.ts";

const v1Router = Router();

v1Router.use("/projects", projectRouter);
v1Router.use("/tasks", taskRouter);
v1Router.use("/risks-issues", riskIssueRouter);
v1Router.use("/auth", iamRouter);
v1Router.use("/auth", authRouter);
v1Router.use("/users", userRouter);
v1Router.use("/workflows", workflowRouter);
v1Router.use("/portfolios", portfolioRouter);
v1Router.use("/enterprise", enterpriseRouter);
v1Router.use("/lifecycle", lifecycleRouter);
v1Router.use("/orchestration", orchestrationRouter);
v1Router.use("/devportal", devPortalRouter);
v1Router.use("/dashboards", dashboardRouter);
v1Router.use("/notifications", notificationRouter);

export default v1Router;
