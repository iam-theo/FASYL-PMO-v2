import { eq, and } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import {
  projects,
  tasks,
  risksAndIssues,
  resources,
  resourceAllocations,
  kpiMetrics
} from "../../../db/schema.ts";
import { NotFoundError } from "../../../shared/infrastructure/errors.ts";
import { AuditLogger } from "../../../shared/infrastructure/audit-logger.ts";
import { eventBus } from "../../../shared/domain/event-bus.ts";

export class KPIHealthService {
  // 1. PROJECT HEALTH ENGINE V2
  async recalculateProjectHealth(actorId: string, projectId: string): Promise<any> {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) throw new NotFoundError("Project");

    const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, projectId));
    const projectRisks = await db.select().from(risksAndIssues).where(and(eq(risksAndIssues.projectId, projectId), eq(risksAndIssues.type, "RISK")));
    const projectIssues = await db.select().from(risksAndIssues).where(and(eq(risksAndIssues.projectId, projectId), eq(risksAndIssues.type, "ISSUE")));

    // A. Schedule Health (Percentage of delayed active tasks)
    let scheduleScore = 100;
    const activeTasks = projectTasks.filter((t) => t.status !== "COMPLETED" && t.status !== "ARCHIVED");
    if (activeTasks.length > 0) {
      const delayedTasks = activeTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date());
      const delayRatio = delayedTasks.length / activeTasks.length;
      scheduleScore = Math.max(0, 100 - Math.round(delayRatio * 80));
    }

    // B. Budget Health
    let budgetScore = 100;
    const budget = project.budget ? parseFloat(project.budget) : 0;
    const actualCost = project.actualCost ? parseFloat(project.actualCost) : 0;
    if (budget > 0) {
      if (actualCost > budget) {
        const overPercent = (actualCost - budget) / budget;
        if (overPercent <= 0.05) budgetScore = 90;
        else if (overPercent <= 0.15) budgetScore = 70;
        else if (overPercent <= 0.30) budgetScore = 40;
        else budgetScore = 10;
      }
    }

    // C. Risk Health (Active high-probability risks)
    let riskScore = 100;
    const activeRisks = projectRisks.filter((r) => r.status !== "CLOSED" && r.status !== "MITIGATED");
    if (activeRisks.length > 0) {
      let riskPenalties = 0;
      activeRisks.forEach((r) => {
        const prob = r.probability || 50;
        const priorityWeight = r.priority === "URGENT" ? 1.5 : r.priority === "HIGH" ? 1.2 : 0.8;
        riskPenalties += (prob / 100) * 15 * priorityWeight;
      });
      riskScore = Math.max(0, 100 - Math.round(riskPenalties));
    }

    // D. Issue Health
    let issueScore = 100;
    const openIssues = projectIssues.filter((i) => i.status !== "CLOSED" && i.status !== "RESOLVED");
    if (openIssues.length > 0) {
      const issuePenalties = openIssues.length * 12;
      issueScore = Math.max(0, 100 - issuePenalties);
    }

    // E. Team Health & SLA Compliance (Fallback mock/static indicators)
    const teamScore = 90; // High overall collaboration index
    const slaScore = 96; // 96% task action SLA compliance

    // F. Overall Health Score (Weighted index)
    const overallScore = Math.round(
      scheduleScore * 0.35 +
      budgetScore * 0.3 +
      riskScore * 0.15 +
      issueScore * 0.1 +
      teamScore * 0.05 +
      slaScore * 0.05
    );

    // G. Determine general health status
    let healthStatus: "STABLE" | "AT_RISK" | "CRITICAL" | "ON_TRACK" = "ON_TRACK";
    if (overallScore >= 80) healthStatus = "ON_TRACK";
    else if (overallScore >= 60) healthStatus = "STABLE";
    else if (overallScore >= 40) healthStatus = "AT_RISK";
    else healthStatus = "CRITICAL";

    // Update project table
    await db
      .update(projects)
      .set({
        healthScore: overallScore,
        health: healthStatus,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    await AuditLogger.log(projectId, actorId, "PROJECT_HEALTH_RECALCULATED", "HEALTH_ENGINE", projectId, {
      overallScore,
      healthStatus,
      scheduleScore,
      budgetScore,
      riskScore,
      issueScore,
    });

    eventBus.publish("health.recalculated", { projectId, overallScore, healthStatus });

    return {
      projectId,
      overallHealthScore: overallScore,
      healthStatus,
      breakdown: {
        schedule: scheduleScore,
        budget: budgetScore,
        risk: riskScore,
        issue: issueScore,
        team: teamScore,
        sla: slaScore,
      },
    };
  }

  // 2. EXECUTIVE AND PMO KPI ENGINE
  async getEnterpriseKPIs(): Promise<any> {
    const allProjects = await db.select().from(projects);
    const activeResources = await db.select().from(resources).where(eq(resources.status, "ACTIVE"));
    const allocations = await db.select().from(resourceAllocations);

    const total = allProjects.length;
    if (total === 0) {
      return { message: "No project records found to compile KPIs" };
    }

    const onTimeCount = allProjects.filter((p) => p.health === "ON_TRACK" || p.health === "STABLE").length;
    const atRiskCount = allProjects.filter((p) => p.health === "AT_RISK").length;
    const criticalCount = allProjects.filter((p) => p.health === "CRITICAL").length;

    // Averages
    let totalCompletion = 0;
    let projectsWithCompletion = 0;
    let totalBudget = 0;
    let totalActualCost = 0;

    for (const p of allProjects) {
      totalBudget += p.budget ? parseFloat(p.budget) : 0;
      totalActualCost += p.actualCost ? parseFloat(p.actualCost) : 0;
      
      // Assume a dynamic task completion score
      if (p.healthScore) {
        totalCompletion += p.healthScore; // using health score as proxy for completion metrics
        projectsWithCompletion++;
      }
    }

    const avgCompletion = projectsWithCompletion > 0 ? totalCompletion / projectsWithCompletion : 0;
    const avgCostVariance = totalBudget > 0 ? ((totalBudget - totalActualCost) / totalBudget) * 100 : 0;

    // Team resource utilization
    let totalResourceAllocations = 0;
    allocations.forEach((a) => {
      totalResourceAllocations += a.allocationPercentage;
    });
    const avgUtilization = activeResources.length > 0 ? totalResourceAllocations / activeResources.length : 0;

    const metrics = {
      projectsOnTimePercent: parseFloat(((onTimeCount / total) * 100).toFixed(1)),
      projectsAtRiskPercent: parseFloat(((atRiskCount / total) * 100).toFixed(1)),
      projectsCriticalPercent: parseFloat(((criticalCount / total) * 100).toFixed(1)),
      averageCostVariancePercent: parseFloat(avgCostVariance.toFixed(1)),
      averageCompletionPercent: parseFloat(avgCompletion.toFixed(1)),
      teamResourceUtilization: parseFloat(avgUtilization.toFixed(1)),
    };

    return metrics;
  }
}
