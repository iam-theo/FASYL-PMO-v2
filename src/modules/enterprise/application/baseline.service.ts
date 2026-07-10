import { eq, and } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import {
  projects,
  tasks,
  resourceAllocations,
  projectBaselines
} from "../../../db/schema.ts";
import { NotFoundError, ValidationError } from "../../../shared/infrastructure/errors.ts";
import { AuditLogger } from "../../../shared/infrastructure/audit-logger.ts";
import { eventBus } from "../../../shared/domain/event-bus.ts";

export class BaselineService {
  async createBaseline(actorId: string, projectId: string, name: string, description?: string): Promise<any> {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) throw new NotFoundError("Project");

    // Fetch current tasks (schedules) for snapshotting
    const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, projectId));
    const schedulesSnapshot = projectTasks.map((t) => ({
      taskId: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate,
      estimatedHours: t.estimatedHours,
      completionPercentage: t.completionPercentage,
    }));

    // Fetch resource allocations for snapshotting
    const allocations = await db.select().from(resourceAllocations).where(eq(resourceAllocations.projectId, projectId));
    const resourcesSnapshot = allocations.map((a) => ({
      allocationId: a.id,
      resourceId: a.resourceId,
      startDate: a.startDate,
      endDate: a.endDate,
      allocationPercentage: a.allocationPercentage,
    }));

    // De-activate old current baseline if this is the new one
    await db
      .update(projectBaselines)
      .set({ isCurrentBaseline: false })
      .where(eq(projectBaselines.projectId, projectId));

    const [baseline] = await db
      .insert(projectBaselines)
      .values({
        projectId,
        name,
        description: description || null,
        originalScheduleJson: JSON.stringify(schedulesSnapshot),
        originalBudget: project.budget,
        originalScope: project.description || "",
        originalMilestonesJson: JSON.stringify([]), // Customize if specific milestones table exists, or take from tasks
        originalResourcesJson: JSON.stringify(resourcesSnapshot),
        isCurrentBaseline: true,
        createdBy: actorId,
      })
      .returning();

    eventBus.publish("baseline.created", baseline);
    await AuditLogger.log(projectId, actorId, "BASELINE_CREATED", "BASELINE", baseline.id, { name });
    return baseline;
  }

  async getBaselines(projectId: string): Promise<any[]> {
    return db.select().from(projectBaselines).where(eq(projectBaselines.projectId, projectId));
  }

  async compareBaseline(projectId: string, baselineId: string): Promise<any> {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) throw new NotFoundError("Project");

    const [baseline] = await db.select().from(projectBaselines).where(and(eq(projectBaselines.id, baselineId), eq(projectBaselines.projectId, projectId))).limit(1);
    if (!baseline) throw new NotFoundError("Baseline");

    const currentTasks = await db.select().from(tasks).where(eq(tasks.projectId, projectId));
    const originalTasks = baseline.originalScheduleJson ? JSON.parse(baseline.originalScheduleJson) : [];

    // Compare budget variance
    const baseBudget = baseline.originalBudget ? parseFloat(baseline.originalBudget) : 0;
    const currBudget = project.budget ? parseFloat(project.budget) : 0;
    const budgetVariance = currBudget - baseBudget;

    // Compare milestones/dates delays
    const taskComparisons = currentTasks.map((t) => {
      const orig = originalTasks.find((o: any) => o.taskId === t.id);
      let isDelayed = false;
      let delayDays = 0;

      if (orig && orig.dueDate && t.dueDate) {
        const origTime = new Date(orig.dueDate).getTime();
        const currTime = new Date(t.dueDate).getTime();
        if (currTime > origTime) {
          isDelayed = true;
          delayDays = Math.ceil((currTime - origTime) / (1000 * 60 * 60 * 24));
        }
      }

      return {
        taskId: t.id,
        title: t.title,
        currentDueDate: t.dueDate,
        baselineDueDate: orig ? orig.dueDate : null,
        isDelayed,
        delayDays,
        currentCompletion: t.completionPercentage,
        baselineCompletion: orig ? orig.completionPercentage : null,
      };
    });

    return {
      baseline: {
        id: baseline.id,
        name: baseline.name,
        createdAt: baseline.createdAt,
      },
      budgetComparison: {
        baselineBudget: baseBudget,
        currentBudget: currBudget,
        variance: budgetVariance,
      },
      scheduleComparison: {
        totalTasks: taskComparisons.length,
        delayedTasks: taskComparisons.filter((tc) => tc.isDelayed).length,
        tasks: taskComparisons,
      },
    };
  }
}
