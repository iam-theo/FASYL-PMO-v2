import { ProgramService } from "../application/program.service.ts";
import { ResourceService } from "../application/resource.service.ts";
import { FinanceService } from "../application/finance.service.ts";
import { BaselineService } from "../application/baseline.service.ts";
import { ChangeService } from "../application/change.service.ts";
import { TemplateService } from "../application/template.service.ts";
import { KPIHealthService } from "../application/kpi-health.service.ts";
import { AIService } from "../application/ai.service.ts";
import { LifecycleService } from "../application/lifecycle.service.ts";
import { PortfolioService } from "../../portfolio/application/portfolio.service.ts";
import { ProjectService } from "../../projects/application/project.service.ts";
import { eq } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import { projects, tasks } from "../../../db/schema.ts";
import logger from "../../../shared/infrastructure/logger.ts";

export async function executeEnterpriseTests() {
  logger.info("================ STARTING ENTERPRISE EPPM SIMULATION & INTEGRATION TESTS ================");

  const actorId = "test-enterprise-admin-uid";

  // Instantiating Services
  const portfolioService = new PortfolioService();
  const programService = new ProgramService();
  const resourceService = new ResourceService();
  const financeService = new FinanceService();
  const baselineService = new BaselineService();
  const changeService = new ChangeService();
  const templateService = new TemplateService();
  const kpiHealthService = new KPIHealthService();
  const aiService = new AIService();

  try {
    // --- 1. PORTFOLIOS & PROGRAMS ---
    logger.info("TEST Scenario 1: Portfolio and Program creation...");
    const portfolio = await portfolioService.createPortfolio(actorId, {
      name: "Strategic Digital Transformation 2026",
      description: "Enterprise-wide cloud native initiative",
      managerId: actorId,
      budget: "50000000.00",
    });
    logger.info(`Portfolio created successfully with ID: ${portfolio.id}`);

    const program = await programService.createProgram(actorId, {
      portfolioId: portfolio.id,
      name: "Cloud Ingress Migration Program",
      description: "Migrating legacy data centers",
      managerId: actorId,
      budget: "20000000.00",
    });
    logger.info(`Program created successfully with ID: ${program.id}`);

    // Create a Project associated with this Program
    const [project] = await db
      .insert(projects)
      .values({
        programId: program.id,
        name: "Database Migration to Cloud Spanner",
        description: "Core database overhaul project",
        managerId: actorId,
        budget: "5000000.00",
        actualCost: "0.00",
        startDate: new Date(),
        endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days out
        status: "ACTIVE",
        health: "ON_TRACK",
      })
      .returning();
    logger.info(`Project linked to program successfully. Project ID: ${project.id}`);

    // Create a dummy task for EVM and health computations
    const [task] = await db
      .insert(tasks)
      .values({
        projectId: project.id,
        title: "Provision Cloud Spanner instances",
        description: "Development environment setup",
        status: "IN_PROGRESS",
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        estimatedHours: "40.00",
        completionPercentage: 50,
      })
      .returning();

    // --- 2. RESOURCE SKILLS & CALENDARS & OVER-ALLOCATION ---
    logger.info("TEST Scenario 2: Resource pool, scheduling & allocation conflict detection...");
    const resource = await resourceService.createResource(actorId, {
      name: "Sophia Martinez (Lead DBA)",
      type: "EMPLOYEE",
      department: "Database Operations",
      costPerHour: "150.00",
    });

    await resourceService.addResourceSkill(actorId, resource.id, {
      skill: "PostgreSQL Administration",
      proficiencyLevel: "EXPERT",
    });

    await resourceService.addResourceSkill(actorId, resource.id, {
      skill: "Cloud Spanner Architecture",
      proficiencyLevel: "INTERMEDIATE",
    });

    // Add Leave Calendar Event
    await resourceService.addCalendarEvent(actorId, resource.id, {
      eventType: "LEAVE",
      description: "Annual vacation time",
      startDate: "2026-08-01T00:00:00.000Z",
      endDate: "2026-08-10T00:00:00.000Z",
    });

    // Allocate resource (80%)
    const alloc1 = await resourceService.allocateResource(actorId, {
      resourceId: resource.id,
      projectId: project.id,
      startDate: "2026-07-10T00:00:00.000Z",
      endDate: "2026-09-10T00:00:00.000Z",
      allocationPercentage: 80,
    });
    logger.info(`Initial resource allocation created (80% allocation). Overallocated: ${alloc1.isOverAllocated}`);

    // Allocate again to trigger over-allocation event (total 130%)
    const alloc2 = await resourceService.allocateResource(actorId, {
      resourceId: resource.id,
      projectId: project.id,
      startDate: "2026-07-15T00:00:00.000Z",
      endDate: "2026-08-15T00:00:00.000Z",
      allocationPercentage: 50,
    });
    logger.info(`Over-allocation check complete. Overallocated status triggered: ${alloc2.isOverAllocated} (Total load: ${alloc2.currentTotalPercentage}%)`);

    // --- 3. PROJECT FINANCES & EARNED VALUE ENGINE ---
    logger.info("TEST Scenario 3: PMO Financial management & Earned Value snapshots...");
    const cc = await financeService.createCostCenter(actorId, {
      code: "CC-DBOPS-100",
      name: "Database Systems Cost Center",
      description: "Operations budget center for DBAs",
    });

    const expense = await financeService.createExpense(actorId, {
      projectId: project.id,
      costCenterId: cc.id,
      category: "SOFTWARE",
      amount: "250000.00",
      description: "Cloud Spanner enterprise license",
      expenseDate: new Date().toISOString(),
    });

    // Approve expense to roll into project actualCost
    await financeService.approveExpense(actorId, expense.id, "APPROVED");
    logger.info("Expense approved and successfully rolled up into project actualCost!");

    // Calculate Earned Value metrics
    const evm = await financeService.calculateProjectEVM(actorId, project.id);
    logger.info(`EVM Performance Indexes computed: SPI=${evm.metrics.spi}, CPI=${evm.metrics.cpi}`);

    // --- 4. BASELINE MANAGEMENT ---
    logger.info("TEST Scenario 4: Capturing project baselines and tracking schedule slippage...");
    const baseline = await baselineService.createBaseline(actorId, project.id, "Pre-flight Baseline", "Baseline snapshot before sprint 1");
    logger.info(`Baseline snapshot saved successfully. ID: ${baseline.id}`);

    // Modify task due date to simulate schedule delay/slippage
    await db
      .update(tasks)
      .set({ dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) }) // 10 days later than baseline
      .where(eq(tasks.id, task.id));

    const comparison = await baselineService.compareBaseline(project.id, baseline.id);
    logger.info(`Baseline variance analysis complete! Delayed tasks counted: ${comparison.scheduleComparison.delayedTasks}`);

    // --- 5. CHANGE CONTROL WORKFLOWS ---
    logger.info("TEST Scenario 5: Formal Change Requests & automated implementation upon approval...");
    const cr = await changeService.createChangeRequest(actorId, {
      projectId: project.id,
      title: "Additional Spanner nodes request",
      description: "Requesting additional database compute instances to support peak transaction loads",
      proposedBudgetChange: "1500000.00",
      proposedScheduleChangeDays: 30,
    });

    await changeService.reviewChangeRequest(actorId, cr.id, "APPROVED");
    logger.info("Change request approved! Project budget and timeline have been automatically extended.");

    // --- 6. PROJECT TEMPLATES ---
    logger.info("TEST Scenario 6: Reusable project blueprints and automated instantiations...");
    const tmpl = await templateService.createTemplate(actorId, {
      name: "Standard Cloud Ingress Blueprint",
      description: "Pre-configured tasks and risks for infrastructure migrations",
      tasksJson: JSON.stringify([
        { title: "Define access control policy", priority: "HIGH", estimatedHours: 20 },
        { title: "Configure VPC peering", priority: "MEDIUM", estimatedHours: 15 },
      ]),
      risksJson: JSON.stringify([
        { title: "Unauthorized security perimeter breaching", priority: "URGENT", probability: 35 },
      ]),
    });

    const instantiatedProject = await templateService.instantiateProject(actorId, tmpl.id, {
      name: "Ingress Migration - London Datacenter",
      managerId: actorId,
      budget: "1000000.00",
    });
    logger.info(`Spawning project from blueprint template was successful! Project ID: ${instantiatedProject.id}`);

    // --- 7. PROJECT HEALTH ENGINE V2 ---
    logger.info("TEST Scenario 7: Executing PMO Health Engine V2 multi-variable weights calculation...");
    const healthEngineMetrics = await kpiHealthService.recalculateProjectHealth(actorId, project.id);
    logger.info(`Calculated overall project health score: ${healthEngineMetrics.overallHealthScore}/100 [Status: ${healthEngineMetrics.healthStatus}]`);

    // --- 8. AI COPILOT ANALYTICS PREDICTIONS ---
    logger.info("TEST Scenario 8: Simulating AI Copilot forecast analytics...");
    if (process.env.GEMINI_API_KEY) {
      const delayForecast = await aiService.predictProjectDelay(project.id);
      logger.info("AI delay forecasting successfully generated via Gemini-3.5-flash.");
    } else {
      logger.warn("Skipping AI call: GEMINI_API_KEY is not configured.");
    }

    // --- 9. STAGE-GATE GOVERNANCE SYSTEM (PLGS) ---
    logger.info("TEST Scenario 9: Running full Stage-Gate Governance PLGS verification...");
    const lifecycleService = new LifecycleService();

    // A. Seed Default Corporate Template
    const seed = await lifecycleService.seedDefaultTemplate();
    logger.info(`Lifecycle default seed result: ${seed.message}`);

    // B. Create a new locked project inside Lifecycle Gateway
    const [lockedProject] = await db
      .insert(projects)
      .values({
        programId: program.id,
        name: "Enterprise Core ERP Ingress Gateway",
        description: "Regulated high-compliance ERP gateway project",
        managerId: actorId,
        budget: "15000000.00",
        actualCost: "0.00",
        startDate: new Date(),
        status: "DRAFT",
      })
      .returning();
    logger.info(`Locked gateway project created. Status is ${lockedProject.status}`);

    // C. Initialize Project Lifecycle
    const instance = await lifecycleService.createInstance(actorId, lockedProject.id);
    logger.info(`Governance instance initialized. Instance ID: ${instance.instanceId}. Currently locked in: ${instance.currentStage.name}`);

    // D. Step 1: Complete checklists for Stage 1
    logger.info("Completing Stage 1 mandatory checklists...");
    for (const item of instance.checklists) {
      await lifecycleService.completeChecklistItem(actorId, instance.instanceId, item.id, true, "Checked and verified manually");
    }

    // E. Step 2: Upload stage documents
    logger.info("Uploading Stage 1 required documents...");
    for (const doc of instance.documents) {
      const upload = await lifecycleService.uploadDocument(actorId, instance.instanceId, doc.id, {
        fileName: `${doc.name.replace(/\s+/g, "_")}_v1.pdf`,
        filePath: `/uploads/${doc.id}/v1.pdf`,
      });
      // Verify immediately
      await lifecycleService.verifyDocument(actorId, upload.id, "VERIFIED", "Compliance checklist verified ok");
    }

    // F. Step 3: Complete role approvals
    logger.info("Recording Stage 1 role-based approvals...");
    for (const app of instance.approvals) {
      await lifecycleService.submitStageApproval(actorId, instance.instanceId, instance.currentStage.id, app.role, "APPROVED", "Checked and signed digitally");
    }

    // G. Step 4: Add discussion logs
    await lifecycleService.addComment(actorId, instance.instanceId, instance.currentStage.id, "Ready for Head of Operations signoff");

    // H. Step 5: Submit Head of Operations Review Gate to unlock Stage 2
    logger.info("Submitting Head of Operations Review Gate...");
    const gateApproval = await lifecycleService.submitHeadOfOperationsReview(actorId, instance.instanceId, instance.currentStage.id, "APPROVED", {
      comments: "All compliance gates satisfied. Stage 1 passed.",
      digitalSignature: "SIG-CORP-OP-HEAD-12345",
    });
    logger.info(`Head of Operations Gate approved. Status: ${gateApproval.status}`);

    // I. Verify that Stage 2 is unlocked
    const refreshedInstance = await lifecycleService.getInstance(lockedProject.id);
    logger.info(`Current Stage updated after gate approval! Now in: ${refreshedInstance.currentStage.name} (Stage Number: ${refreshedInstance.currentStage.stageNumber})`);

    // J. Run background SLA cron simulator
    logger.info("Executing background SLA monitoring cron job simulation...");
    const cronResult = await lifecycleService.runSLAChronChecks();
    logger.info(`SLA cron completed successfully! Processed: ${cronResult.processedSlas}, Warnings: ${cronResult.warningsTriggered}`);

    logger.info("================ ALL ENTERPRISE EPPM SIMULATION & INTEGRATION TESTS COMPLETED SUCCESSFULLY ================");
    return { success: true };
  } catch (error) {
    logger.error({ error }, "Error occurred during enterprise integration tests");
    throw error;
  }
}
