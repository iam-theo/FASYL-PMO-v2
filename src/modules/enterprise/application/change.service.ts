import { eq, and } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import {
  projects,
  changeRequests
} from "../../../db/schema.ts";
import { NotFoundError, ValidationError } from "../../../shared/infrastructure/errors.ts";
import { AuditLogger } from "../../../shared/infrastructure/audit-logger.ts";
import { eventBus } from "../../../shared/domain/event-bus.ts";

export class ChangeService {
  async createChangeRequest(
    actorId: string,
    data: { projectId: string; title: string; description: string; impactAnalysis?: string; proposedBudgetChange?: string; proposedScheduleChangeDays?: number }
  ): Promise<any> {
    const [project] = await db.select().from(projects).where(eq(projects.id, data.projectId)).limit(1);
    if (!project) throw new NotFoundError("Project");

    const [cr] = await db
      .insert(changeRequests)
      .values({
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        impactAnalysis: data.impactAnalysis || null,
        proposedBudgetChange: data.proposedBudgetChange ? data.proposedBudgetChange.toString() : "0",
        proposedScheduleChangeDays: data.proposedScheduleChangeDays || 0,
        status: "PENDING",
        createdBy: actorId,
      })
      .returning();

    eventBus.publish("change.requested", cr);
    await AuditLogger.log(data.projectId, actorId, "CHANGE_REQUEST_CREATED", "CHANGE_MANAGEMENT", cr.id, data);
    return cr;
  }

  async reviewChangeRequest(actorId: string, id: string, status: "APPROVED" | "REJECTED"): Promise<any> {
    const [cr] = await db.select().from(changeRequests).where(eq(changeRequests.id, id)).limit(1);
    if (!cr) throw new NotFoundError("Change Request");

    const [updated] = await db
      .update(changeRequests)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(changeRequests.id, id))
      .returning();

    await AuditLogger.log(cr.projectId, actorId, `CHANGE_REQUEST_${status}`, "CHANGE_MANAGEMENT", id);

    if (status === "APPROVED") {
      eventBus.publish("change.approved", updated);
      
      // Auto-implementation: update Project timeline and/or budget
      const [project] = await db.select().from(projects).where(eq(projects.id, cr.projectId)).limit(1);
      if (project) {
        const currentBudget = project.budget ? parseFloat(project.budget) : 0;
        const budgetDelta = cr.proposedBudgetChange ? parseFloat(cr.proposedBudgetChange) : 0;
        const newBudget = (currentBudget + budgetDelta).toFixed(2);

        let newEndDate = project.endDate;
        if (cr.proposedScheduleChangeDays && cr.proposedScheduleChangeDays > 0 && project.endDate) {
          newEndDate = new Date(new Date(project.endDate).getTime() + cr.proposedScheduleChangeDays * 24 * 60 * 60 * 1000);
        }

        await db
          .update(projects)
          .set({
            budget: newBudget,
            endDate: newEndDate,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, cr.projectId));

        await AuditLogger.log(cr.projectId, actorId, "CHANGE_AUTO_IMPLEMENTED", "PROJECT", cr.projectId, {
          previousBudget: currentBudget,
          newBudget,
          newEndDate,
        });
      }
    }

    return updated;
  }

  async listChangeRequests(projectId?: string): Promise<any[]> {
    if (projectId) {
      return db.select().from(changeRequests).where(eq(changeRequests.projectId, projectId));
    }
    return db.select().from(changeRequests);
  }
}
