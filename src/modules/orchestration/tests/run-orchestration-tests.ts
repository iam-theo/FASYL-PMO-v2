import { orchestrator } from "../application/orchestration.service.ts";
import { eventBus } from "../../../shared/domain/event-bus.ts";
import logger from "../../../shared/infrastructure/logger.ts";

export async function executeOrchestrationTests() {
  logger.info("================ STARTING ENTERPRISE ORCHESTRATION LAYER (EPOL) INTEGRATION TESTS ================");

  const actorId = "test-orchestrator-admin-uid";

  try {
    // 1. Configuration Center Verification
    logger.info("EPOL Test Scenario 1: Configuration Center dynamic mappings...");
    const baseSlaDays = await orchestrator.configCenter.get<number>("sla.default.duration.days", 30);
    logger.info(`Fetched base SLA threshold: ${baseSlaDays} days.`);

    await orchestrator.configCenter.set("sla.default.duration.days", 45, "SLA", actorId);
    const updatedSlaDays = await orchestrator.configCenter.get<number>("sla.default.duration.days");
    logger.info(`Updated SLA duration: ${updatedSlaDays} days.`);

    // 2. Audit Center compliance verification
    logger.info("EPOL Test Scenario 2: Immutable Auditing Ledger...");
    await orchestrator.auditCenter.log(actorId, "ACCESS_DASHBOARD", "ORCHESTRATION", { tab: "executive" });
    const auditLogs = await orchestrator.auditCenter.getLogs({ actorId });
    logger.info(`Retrieved ${auditLogs.length} audit trail records.`);

    // 3. Timeline Engine Verification
    logger.info("EPOL Test Scenario 3: Universal Chronology Timeline...");
    await orchestrator.timelineEngine.logTimelineEvent(
      null,
      "LEAD",
      "test-lead-123",
      "CREATED",
      "Lead registered",
      actorId,
      "Manual test entry"
    );

    // 4. Notification Center unified routing
    logger.info("EPOL Test Scenario 4: Unified Notification Dispatch & Receipts...");
    const notice = await orchestrator.notificationCenter.send(
      "pmo_analyst",
      "IN_APP",
      "notification.templates.welcome",
      { name: "John Doe" }
    );
    logger.info(`Notification queued. Record ID: ${notice.id}`);
    await orchestrator.notificationCenter.markAsRead(notice.id);
    logger.info("Read receipt logged successfully.");

    // 5. Scheduler & Job Center Background Processing Queue
    logger.info("EPOL Test Scenario 5: Priority Scheduler queues & manual background job executor...");
    const job = await orchestrator.scheduler.scheduleJob(
      "sla.escalation.check",
      { targetStage: "stage_2" },
      { priority: 9 }
    );
    logger.info(`Scheduled background job: ${job.id} (Priority: ${job.priority})`);
    
    // Process the jobs immediately
    await orchestrator.jobCenter.processNextBatch();
    logger.info("Background job batch processor executed successfully.");

    // 6. Dashboard Composition Engine
    logger.info("EPOL Test Scenario 6: Executive Dashboard Bento-Layout Builder...");
    const dash = await orchestrator.dashboardEngine.getExecutiveDashboard();
    logger.info(`Dashboard generated with ${dash.widgets.length} real-time widgets.`);

    // 7. Performance & Bottleneck Analytics
    logger.info("EPOL Test Scenario 7: Workflow Efficiency & Bottleneck Analytics...");
    const analysis = await orchestrator.analyticsEngine.getAnalyticsMetrics();
    logger.info(`Efficiency factor: ${analysis.workflowEfficiencyRatio}%. Sla factor: ${analysis.slaComplianceFactor}%`);

    // 8. Observability Telemetry
    logger.info("EPOL Test Scenario 8: Trace performance trackers & uptime health metrics...");
    const health = await orchestrator.observability.getSystemHealth();
    logger.info(`System state: ${health.status}, postgres latency: ${health.databases.postgres.latencyMs}ms`);

    // 9. Integration Hub Syncing
    logger.info("EPOL Test Scenario 9: ERP/CRM Sync & field mappings...");
    const syncRes = await orchestrator.integrationHub.syncEntity("SAP", "PROJECT_FINANCE", { budget: 1000000 });
    logger.info(`SAP external sync output: Ticket ID=${syncRes.remoteTicketId}, status=${syncRes.status}`);

    // 10. Event Catalog specifications
    logger.info("EPOL Test Scenario 10: Event Schema Registry Metadata...");
    const catalog = await orchestrator.eventRegistry.getEventCatalog();
    logger.info(`Loaded ${catalog.length} system events catalog schemas.`);

    // 11. System Administration & Licensing
    logger.info("EPOL Test Scenario 11: License constraints & Maintenance mode...");
    const currentSettings = await orchestrator.systemAdmin.getSettings();
    logger.info(`License status: ${currentSettings.licenseStatus}, org: ${currentSettings.orgName}`);
    await orchestrator.systemAdmin.toggleMaintenanceMode(true);
    await orchestrator.systemAdmin.toggleMaintenanceMode(false);

    // 12. Smart AI Gateway
    logger.info("EPOL Test Scenario 12: Smart AI Gateway text synthesis fallback testing...");
    const aiText = await orchestrator.aiOrchestration.generateText("Draft SLA notification layout.");
    logger.info(`AI generated response via '${aiText.modelUsed}': ${aiText.text.substring(0, 80)}...`);

    // 13. Central Event Orchestrator flow triggers
    logger.info("EPOL Test Scenario 13: E2E Event Bus Subscription coordination...");
    // Simulate lead conversion event
    eventBus.publish("lead.converted", {
      leadId: "lead-999",
      projectName: "Automation Pipeline 2026",
      convertedBy: actorId,
    });

    logger.info("================ ALL ENTERPRISE ORCHESTRATION LAYER (EPOL) TESTS COMPLETED SUCCESSFULLY ================");
    return { success: true };
  } catch (error) {
    logger.error({ error }, "Error occurred during EPOL integration tests");
    throw error;
  }
}
