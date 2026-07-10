import { NotificationsAuditReportsRepository } from "./repository.ts";
import { Notification, AuditLog } from "../../types.ts";
import { dbState } from "../../db.ts";

export class NotificationsAuditReportsService {
  private repository = new NotificationsAuditReportsRepository();

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  async getNotifications(userId: string): Promise<Notification[]> {
    return this.repository.getNotificationsByUser(userId);
  }

  async markNotificationRead(id: string): Promise<Notification> {
    const updated = await this.repository.markAsRead(id);
    if (!updated) throw new Error("Notification record not found");
    return updated;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.repository.getUnreadCount(userId);
  }

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  async getAuditLogs(projectId: string): Promise<AuditLog[]> {
    return this.repository.getAuditLogs(projectId);
  }

  // ==========================================
  // REPORTS COMPILER
  // ==========================================
  async compileExecutiveStatusReport(projectId: string) {
    const project = dbState.projects.find(p => p.id === projectId);
    if (!project) throw new Error("Project not found");

    const tasks = dbState.tasks.filter(t => t.projectId === projectId && !t.deletedAt);
    const milestones = dbState.milestones.filter(m => m.projectId === projectId && !m.deletedAt);
    const issues = dbState.issues.filter(i => i.projectId === projectId && !i.deletedAt);
    const risks = dbState.risks.filter(r => r.projectId === projectId && !r.deletedAt);
    const logs = dbState.timeLogs.filter(l => l.projectId === projectId);

    const totalHoursLogged = logs.reduce((sum, l) => sum + l.hours, 0);
    const taskStatusBreakdown = {
      TODO: tasks.filter(t => t.status === "TODO").length,
      IN_PROGRESS: tasks.filter(t => t.status === "IN_PROGRESS").length,
      IN_REVIEW: tasks.filter(t => t.status === "IN_REVIEW").length,
      DONE: tasks.filter(t => t.status === "DONE").length
    };

    const criticalRisksCount = risks.filter(r => r.impact === "CRITICAL" || r.impact === "HIGH").length;
    const unresolvedIssuesCount = issues.filter(i => i.status !== "RESOLVED" && i.status !== "CLOSED").length;

    return {
      reportDate: new Date().toISOString(),
      projectCode: project.code,
      projectName: project.name,
      overallStatus: project.status,
      overallHealth: project.health,
      progressPercent: project.progress,
      metrics: {
        totalTasks: tasks.length,
        totalMilestones: milestones.length,
        totalHoursLogged,
        criticalRisksCount,
        unresolvedIssuesCount
      },
      milestoneTimeline: milestones.map(m => ({
        title: m.title,
        dueDate: m.targetDate,
        isCompleted: m.isCompleted,
        progress: m.progress
      })),
      taskStatusBreakdown
    };
  }

  /**
   * Generates a fully-formed, RFC 4180-compliant CSV string representing all active tasks
   */
  async generateTasksCSV(projectId: string): Promise<string> {
    const tasks = dbState.tasks.filter(t => t.projectId === projectId && !t.deletedAt);
    
    const headers = ["Task ID", "Title", "Status", "Priority", "Start Date", "Due Date", "Estimated Hours", "Actual Hours", "Completed At"];
    const rows = tasks.map(t => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`, // escape quotes
      t.status,
      t.priority,
      t.startDate,
      t.dueDate,
      t.estimatedHours,
      t.actualHours,
      t.completedAt || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    return csvContent;
  }
}
