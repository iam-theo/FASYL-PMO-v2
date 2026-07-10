import { eventBus } from "../../../shared/domain/event-bus.ts";
import logger from "../../../shared/infrastructure/logger.ts";

import { ConfigurationCenterService } from "./configuration-center.service.ts";
import { AuditCenterService } from "./audit-center.service.ts";
import { TimelineEngineService } from "./timeline-engine.service.ts";
import { NotificationCenterService } from "./notification-center.service.ts";
import { SchedulerService } from "./scheduler.service.ts";
import { JobCenterService } from "./job-center.service.ts";
import { DashboardEngineService } from "./dashboard-engine.service.ts";
import { AnalyticsEngineService } from "./analytics-engine.service.ts";
import { ObservabilityService } from "./observability.service.ts";
import { IntegrationHubService } from "./integration-hub.service.ts";
import { EventRegistryService } from "./event-registry.service.ts";
import { SystemAdministrationService } from "./system-administration.service.ts";
import { AiOrchestrationService } from "./ai-orchestration.service.ts";

export class OrchestrationService {
  private static instance: OrchestrationService | null = null;

  public configCenter = new ConfigurationCenterService();
  public auditCenter = new AuditCenterService();
  public timelineEngine = new TimelineEngineService();
  public notificationCenter = new NotificationCenterService();
  public scheduler = new SchedulerService();
  public jobCenter = new JobCenterService();
  public dashboardEngine = new DashboardEngineService();
  public analyticsEngine = new AnalyticsEngineService();
  public observability = new ObservabilityService();
  public integrationHub = new IntegrationHubService();
  public eventRegistry = new EventRegistryService();
  public systemAdmin = new SystemAdministrationService();
  public aiOrchestration = new AiOrchestrationService();

  private constructor() {
    this.registerEventListeners();
    this.jobCenter.startWorkerLoop();
  }

  public static getInstance(): OrchestrationService {
    if (!OrchestrationService.instance) {
      OrchestrationService.instance = new OrchestrationService();
    }
    return OrchestrationService.instance;
  }

  public async init() {
    logger.info("[Orchestrator] Initializing core services and seeding configurations...");
    await this.configCenter.seedDefaultConfigs();
    await this.integrationHub.seedDefaultConnectors();
    await this.eventRegistry.seedEventRegistry();
    await this.systemAdmin.seedDefaultSettings();
    logger.info("[Orchestrator] Core services initialization complete.");
  }

  private registerEventListeners(): void {
    logger.info("[Orchestrator] Registering central EPOL system event listeners...");

    // 1. Lead Converted
    eventBus.subscribe("lead.converted", async (data: any) => {
      const traceId = `trace-lead-${Date.now()}`;
      this.observability.startTrace(traceId, "lead.converted event");
      try {
        logger.info({ data }, "[Orchestrator] Received 'lead.converted' event.");

        // Log audit trail
        await this.auditCenter.log(
          data.convertedBy || "system",
          "CONVERT_LEAD",
          "ORCHESTRATION",
          { leadId: data.leadId, projectName: data.projectName }
        );

        // Record on project timeline
        await this.timelineEngine.logTimelineEvent(
          data.projectId || null,
          "LEAD",
          data.leadId,
          "CREATED",
          "Lead converted into Project",
          data.convertedBy || "system",
          `Project named '${data.projectName}' spawned.`
        );

        // Send multi-channel notification
        await this.notificationCenter.send(
          data.convertedBy || "manager",
          "IN_APP",
          "notification.templates.welcome",
          { name: "Project Lead Owner" }
        );

        // Queue priority SLA checks
        await this.scheduler.scheduleJob(
          "sla.escalation.check",
          { projectId: data.projectId },
          { priority: 5 }
        );

      } catch (err) {
        logger.error({ err }, "[Orchestrator] Failed processing 'lead.converted' event");
      } finally {
        this.observability.endTrace(traceId);
      }
    });

    // 2. Lifecycle Stage Unlocked
    eventBus.subscribe("lifecycle.stage.unlocked", async (data: any) => {
      const traceId = `trace-lifecycle-${Date.now()}`;
      this.observability.startTrace(traceId, "lifecycle.stage.unlocked event");
      try {
        logger.info({ data }, "[Orchestrator] Received 'lifecycle.stage.unlocked' event.");

        await this.auditCenter.log(
          data.unlockedBy || "system",
          "STAGE_UNLOCKED",
          "ENTERPRISE",
          { instanceId: data.instanceId, stageId: data.stageId }
        );

        await this.timelineEngine.logTimelineEvent(
          data.projectId || null,
          "GOVERNANCE",
          data.stageId,
          "TRANSITIONED",
          `Stage gate unlocked: ${data.stageName || "Next Stage"}`,
          data.unlockedBy || "system",
          `Project progressed through gate stage '${data.stageName || "Unknown"}'`
        );

        await this.notificationCenter.send(
          "delivery_manager",
          "EMAIL",
          "notification.templates.stage_unlocked",
          { projectName: data.projectName || "Enterprise Delivery", stageName: data.stageName || "Gate Stage" }
        );

        // Sync with corporate ERP SAP
        await this.scheduler.scheduleJob(
          "portfolio.sync.sap",
          { projectId: data.projectId, stageId: data.stageId },
          { priority: 8 }
        );

      } catch (err) {
        logger.error({ err }, "[Orchestrator] Failed processing 'lifecycle.stage.unlocked' event");
      } finally {
        this.observability.endTrace(traceId);
      }
    });

    // 3. Workflow Transition Completed
    eventBus.subscribe("workflow.transition.completed", async (data: any) => {
      const traceId = `trace-workflow-${Date.now()}`;
      this.observability.startTrace(traceId, "workflow.transition.completed event");
      try {
        logger.info({ data }, "[Orchestrator] Received 'workflow.transition.completed' event.");

        await this.auditCenter.log(
          data.actorId || "system",
          "WORKFLOW_TRANSITION",
          "WORKFLOW",
          { instanceId: data.instanceId, transitionId: data.transitionId }
        );

        await this.timelineEngine.logTimelineEvent(
          data.projectId || null,
          "EXECUTION",
          data.instanceId,
          "COMPLETED",
          "Workflow Step Completed",
          data.actorId || "system",
          `Workflow transitioned safely. Details: ${JSON.stringify(data.conditions || {})}`
        );
      } catch (err) {
        logger.error({ err }, "[Orchestrator] Failed processing 'workflow.transition.completed' event");
      } finally {
        this.observability.endTrace(traceId);
      }
    });

    // 4. Financial Budget Changed
    eventBus.subscribe("financial.budget.changed", async (data: any) => {
      const traceId = `trace-financial-${Date.now()}`;
      this.observability.startTrace(traceId, "financial.budget.changed event");
      try {
        logger.info({ data }, "[Orchestrator] Received 'financial.budget.changed' event.");

        await this.auditCenter.log(
          data.actorId || "system",
          "BUDGET_CHANGED",
          "FINANCE",
          { projectId: data.projectId, oldBudget: data.oldBudget, newBudget: data.newBudget }
        );

        await this.timelineEngine.logTimelineEvent(
          data.projectId,
          "PLANNING",
          data.projectId,
          "REJECTED",
          "Project Budget Updated",
          data.actorId || "system",
          `Budget adjusted from ${data.oldBudget} to ${data.newBudget}.`
        );

        // Instantly trigger SAP remote connector synchronization
        await this.integrationHub.syncEntity("SAP", "BUDGET_UPDATE", {
          projectId: data.projectId,
          amount: data.newBudget,
        });

      } catch (err) {
        logger.error({ err }, "[Orchestrator] Failed processing 'financial.budget.changed' event");
      } finally {
        this.observability.endTrace(traceId);
      }
    });

    // 5. Issue Identified
    eventBus.subscribe("issue.identified", async (data: any) => {
      const traceId = `trace-issue-${Date.now()}`;
      this.observability.startTrace(traceId, "issue.identified event");
      try {
        logger.info({ data }, "[Orchestrator] Received 'issue.identified' event.");

        // Leverage Smart AI Orchestration Gateway to draft automated resolution suggestions
        const aiResponse = await this.aiOrchestration.generateText(
          `Provide an SLA remediation plan for project issue: ${data.description}`
        );

        await this.auditCenter.log(
          "system-ai",
          "AI_RESOLVE_ADVICE",
          "ORCHESTRATION",
          { issueId: data.issueId, adviceModel: aiResponse.modelUsed }
        );

        await this.timelineEngine.logTimelineEvent(
          data.projectId,
          "EXECUTION",
          data.issueId,
          "CREATED",
          "Project Issue Tracked",
          "system",
          `Issue identified. AI Suggestion: ${aiResponse.text}`
        );

        // Schedule notification warning digest
        await this.scheduler.scheduleJob(
          "report.generate.digest",
          { recipientId: "governance_director", issueId: data.issueId },
          { priority: 3 }
        );

      } catch (err) {
        logger.error({ err }, "[Orchestrator] Failed processing 'issue.identified' event");
      } finally {
        this.observability.endTrace(traceId);
      }
    });
  }
}
export const orchestrator = OrchestrationService.getInstance();
export const orchestrationService = orchestrator; // Alias to support clean import styles
export const configurationCenterService = orchestrator.configCenter;
export const auditCenterService = orchestrator.auditCenter;
export const timelineEngineService = orchestrator.timelineEngine;
export const notificationCenterService = orchestrator.notificationCenter;
export const schedulerService = orchestrator.scheduler;
export const jobCenterService = orchestrator.jobCenter;
export const dashboardEngineService = orchestrator.dashboardEngine;
export const analyticsEngineService = orchestrator.analyticsEngine;
export const observabilityService = orchestrator.observability;
export const integrationHubService = orchestrator.integrationHub;
export const eventRegistryService = orchestrator.eventRegistry;
export const systemAdministrationService = orchestrator.systemAdmin;
export const aiOrchestrationService = orchestrator.aiOrchestration;
