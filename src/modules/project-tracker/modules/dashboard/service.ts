import { DashboardRepository } from "./repository.ts";
import { dbState } from "../../db.ts";

export class DashboardService {
  private repository = new DashboardRepository();

  /**
   * Get dynamic KPIs and aggregate summaries for the entire portfolio or a single project
   */
  async getProjectSummary(projectId?: string) {
    const projects = projectId 
      ? [await this.repository.getProjectById(projectId)] 
      : await this.repository.getActiveProjects();

    const validProjects = projects.filter(p => p !== null) as any[];

    // Calculate Financial KPIs
    const totalBudget = validProjects.reduce((acc, p) => acc + p.budget, 0);
    const avgProgress = validProjects.length > 0 
      ? Math.round(validProjects.reduce((acc, p) => acc + p.progress, 0) / validProjects.length)
      : 0;

    // Load active items from global state
    let activeTasks = dbState.tasks.filter(t => !t.deletedAt);
    let activeIssues = dbState.issues.filter(i => !i.deletedAt && i.status !== "CLOSED");
    let activeRisks = dbState.risks.filter(r => !r.deletedAt && r.status !== "CLOSED");
    let activeTimeLogs = dbState.timeLogs;

    if (projectId) {
      activeTasks = activeTasks.filter(t => t.projectId === projectId);
      activeIssues = activeIssues.filter(i => i.projectId === projectId);
      activeRisks = activeRisks.filter(r => r.projectId === projectId);
      activeTimeLogs = activeTimeLogs.filter(t => t.projectId === projectId);
    }

    const taskCounts = await this.repository.getTaskStatusCounts(projectId);
    const issueCounts = await this.repository.getIssueSeverityCounts(projectId);

    const totalHoursLogged = activeTimeLogs.reduce((acc, tl) => acc + tl.hours, 0);
    const totalEstimatedHours = activeTasks.reduce((acc, t) => acc + t.estimatedHours, 0);

    // Activity Feed
    const activityFeed = await this.repository.getActivityFeed(projectId, 10);

    // Calculate Portfolio Health Scores
    const criticalIssuesCount = activeIssues.filter(i => i.severity === "CRITICAL" || i.severity === "HIGH").length;
    const highRisksCount = activeRisks.filter(r => r.impact === "CRITICAL" || r.impact === "HIGH").length;

    let overallHealth = "HEALTHY";
    if (criticalIssuesCount > 2 || highRisksCount > 2) {
      overallHealth = "CRITICAL";
    } else if (criticalIssuesCount > 0 || highRisksCount > 0) {
      overallHealth = "NEEDS_ATTENTION";
    }

    const firstProject = validProjects[0];
    const description = projectId && firstProject 
      ? firstProject.description 
      : "Aggregated summary and KPIs of all active workspace execution tracks.";
    const projectCode = projectId && firstProject 
      ? firstProject.code 
      : "PORTFOLIO";
    const projectStatus = projectId && firstProject 
      ? firstProject.status 
      : "ACTIVE";
    const progress = projectId && firstProject 
      ? firstProject.progress 
      : avgProgress;
    const budget = projectId && firstProject 
      ? firstProject.budget 
      : totalBudget;
    const projectHealth = projectId && firstProject 
      ? firstProject.health 
      : overallHealth;

    const allocatedTeamMembers = dbState.teamMembers.filter(
      t => (!projectId || t.projectId === projectId) && !t.deletedAt
    );
    const allocatedTeamCount = allocatedTeamMembers.length;

    // Calculate Project Duration in Days
    let totalDurationDays = 0;
    validProjects.forEach(p => {
      if (p.startDate && p.endDate) {
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalDurationDays += diffDays;
      }
    });
    const durationDays = projectId && firstProject ? totalDurationDays : (validProjects.length > 0 ? Math.round(totalDurationDays / validProjects.length) : 0);

    // Calculate Active Task counts (tasks that are not DONE)
    const activeTasksCount = activeTasks.filter(t => t.status !== "DONE").length;
    const todoTasksCount = activeTasks.filter(t => t.status === "TODO").length;
    const inProgressTasksCount = activeTasks.filter(t => t.status === "IN_PROGRESS").length;
    const inReviewTasksCount = activeTasks.filter(t => t.status === "IN_REVIEW").length;

    // Calculate Resource Utilization Percentages
    const totalWeeklyCapacity = allocatedTeamMembers.reduce((sum, m) => sum + m.capacity, 0);
    // Overall utilization percent is logged hours over total capacity
    const utilizationPercent = totalWeeklyCapacity > 0
      ? Math.round((totalHoursLogged / totalWeeklyCapacity) * 100)
      : 0;
    const avgAllocationPercent = allocatedTeamCount > 0
      ? Math.round(allocatedTeamMembers.reduce((sum, m) => sum + m.allocation, 0) / allocatedTeamCount)
      : 0;

    return {
      projectId: projectId || "ALL_PROJECTS",
      projectName: projectId && firstProject ? firstProject.name : "Enterprise Portfolio Overview",
      description,
      projectCode,
      projectStatus,
      progress,
      budget,
      projectHealth,
      totalActualHours: totalHoursLogged,
      allocatedTeamCount,
      quickStats: {
        durationDays,
        activeTaskCounts: {
          total: activeTasksCount,
          todo: todoTasksCount,
          inProgress: inProgressTasksCount,
          inReview: inReviewTasksCount
        },
        resourceUtilization: {
          overallPercent: utilizationPercent,
          avgAllocationPercent,
          totalCapacityHours: totalWeeklyCapacity,
          totalLoggedHours: totalHoursLogged
        }
      },
      kpis: {
        totalBudget,
        avgProgress,
        overallHealth,
        totalHoursLogged,
        totalEstimatedHours,
        criticalIssuesCount,
        highRisksCount,
        activeTasksCount: activeTasks.length,
        activeIssuesCount: activeIssues.length,
        activeRisksCount: activeRisks.length
      },
      taskDistribution: taskCounts,
      issueDistribution: issueCounts,
      activityFeed
    };
  }
}
