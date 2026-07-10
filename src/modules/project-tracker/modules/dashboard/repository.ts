import { dbState } from "../../db.ts";
import { Project, AuditLog } from "../../types.ts";

export class DashboardRepository {
  /**
   * Fetch all active, non-soft-deleted projects
   */
  async getActiveProjects(): Promise<any[]> {
    const { db } = await import("../../../../shared/database/index.ts");
    const { projects: pgProjectsTable, tasks: pgTasksTable } = await import("../../../../db/schema.ts");
    const { isNull } = await import("drizzle-orm");
    
    const dbProjects = await db.select().from(pgProjectsTable).where(isNull(pgProjectsTable.deletedAt));
    
    // We map over them to retrieve their completion progress from tasks
    const allTasks = await db.select().from(pgTasksTable).where(isNull(pgTasksTable.deletedAt));
    
    return dbProjects.map(p => {
      const pTasks = allTasks.filter(t => t.projectId === p.id);
      let progress = 0;
      if (pTasks.length > 0) {
        progress = pTasks.reduce((sum, t) => sum + (t.completionPercentage || 0), 0) / pTasks.length;
      }
      return {
        ...p,
        budget: p.budget ? parseFloat(p.budget) : 100000,
        actualCost: p.actualCost ? parseFloat(p.actualCost) : 0,
        progress: progress,
      };
    });
  }

  /**
   * Fetch a specific project by UUID
   */
  async getProjectById(id: string): Promise<any | null> {
    const { db } = await import("../../../../shared/database/index.ts");
    const { projects: pgProjectsTable, tasks: pgTasksTable } = await import("../../../../db/schema.ts");
    const { eq, isNull, and } = await import("drizzle-orm");
    
    const pRecords = await db.select().from(pgProjectsTable).where(and(eq(pgProjectsTable.id, id), isNull(pgProjectsTable.deletedAt)));
    const p = pRecords[0];
    if (!p) return null;
    
    const pTasks = await db.select().from(pgTasksTable).where(and(eq(pgTasksTable.projectId, id), isNull(pgTasksTable.deletedAt)));
    let progress = 0;
    if (pTasks.length > 0) {
      progress = pTasks.reduce((sum, t) => sum + (t.completionPercentage || 0), 0) / pTasks.length;
    }
    
    return {
      ...p,
      budget: p.budget ? parseFloat(p.budget) : 100000,
      actualCost: p.actualCost ? parseFloat(p.actualCost) : 0,
      progress: progress,
    };
  }

  /**
   * Fetch the global audit logs / activity feed
   */
  async getActivityFeed(projectId?: string, limit = 15): Promise<AuditLog[]> {
    let logs = dbState.auditLogs;
    if (projectId) {
      logs = logs.filter(l => l.projectId === projectId);
    }
    return logs.slice(0, limit);
  }

  /**
   * Fetch total task status aggregations
   */
  async getTaskStatusCounts(projectId?: string) {
    let tasks = dbState.tasks.filter(t => !t.deletedAt);
    if (projectId) {
      tasks = tasks.filter(t => t.projectId === projectId);
    }

    const counts = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 };
    tasks.forEach(t => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });

    return counts;
  }

  /**
   * Fetch total issue severities
   */
  async getIssueSeverityCounts(projectId?: string) {
    let issues = dbState.issues.filter(i => !i.deletedAt);
    if (projectId) {
      issues = issues.filter(i => i.projectId === projectId);
    }

    const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    issues.forEach(i => {
      if (counts[i.severity] !== undefined) {
        counts[i.severity]++;
      }
    });

    return counts;
  }
}
