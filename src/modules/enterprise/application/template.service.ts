import { eq } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import {
  projects,
  tasks,
  risksAndIssues,
  projectTemplates
} from "../../../db/schema.ts";
import { NotFoundError, ValidationError } from "../../../shared/infrastructure/errors.ts";
import { AuditLogger } from "../../../shared/infrastructure/audit-logger.ts";

export class TemplateService {
  async createTemplate(
    actorId: string,
    data: {
      name: string;
      description?: string;
      tasksJson?: string;
      milestonesJson?: string;
      risksJson?: string;
      workflowTemplatesJson?: string;
      budgetTemplatesJson?: string;
      checklistTemplatesJson?: string;
      documentTemplatesJson?: string;
    }
  ): Promise<any> {
    const [existing] = await db.select().from(projectTemplates).where(eq(projectTemplates.name, data.name)).limit(1);
    if (existing) {
      throw new ValidationError(`Template with name '${data.name}' already exists`);
    }

    const [tmpl] = await db.insert(projectTemplates).values(data).returning();
    await AuditLogger.log(null, actorId, "TEMPLATE_CREATED", "TEMPLATE", tmpl.id, { name: data.name });
    return tmpl;
  }

  async getTemplate(id: string): Promise<any> {
    const [tmpl] = await db.select().from(projectTemplates).where(eq(projectTemplates.id, id)).limit(1);
    if (!tmpl) throw new NotFoundError("Template");
    return tmpl;
  }

  async listTemplates(): Promise<any[]> {
    return db.select().from(projectTemplates);
  }

  async instantiateProject(
    actorId: string,
    templateId: string,
    projectData: { name: string; description?: string; managerId: string; budget?: string; startDate?: string; endDate?: string }
  ): Promise<any> {
    const tmpl = await this.getTemplate(templateId);

    // 1. Create Project Core
    const [project] = await db
      .insert(projects)
      .values({
        name: projectData.name,
        description: projectData.description || tmpl.description,
        managerId: projectData.managerId,
        budget: projectData.budget ? projectData.budget.toString() : null,
        startDate: projectData.startDate ? new Date(projectData.startDate) : null,
        endDate: projectData.endDate ? new Date(projectData.endDate) : null,
        status: "PLANNING",
        health: "ON_TRACK",
        healthScore: 100,
      })
      .returning();

    // 2. Instantiate tasks if any
    if (tmpl.tasksJson) {
      try {
        const parsedTasks = JSON.parse(tmpl.tasksJson);
        if (Array.isArray(parsedTasks)) {
          for (const t of parsedTasks) {
            await db.insert(tasks).values({
              projectId: project.id,
              title: t.title || "Untitled Task",
              description: t.description || null,
              status: "DRAFT",
              priority: t.priority || "MEDIUM",
              estimatedHours: t.estimatedHours ? t.estimatedHours.toString() : null,
              completionPercentage: 0,
            });
          }
        }
      } catch (err) {
        // Log parse error but keep project creation intact
      }
    }

    // 3. Instantiate risks if any
    if (tmpl.risksJson) {
      try {
        const parsedRisks = JSON.parse(tmpl.risksJson);
        if (Array.isArray(parsedRisks)) {
          for (const r of parsedRisks) {
            await db.insert(risksAndIssues).values({
              projectId: project.id,
              title: r.title || "Untitled Risk",
              description: r.description || null,
              type: "RISK",
              status: "IDENTIFIED",
              priority: r.priority || "MEDIUM",
              probability: r.probability || 50,
              mitigationPlan: r.mitigationPlan || null,
            });
          }
        }
      } catch (err) {
        // Log parse error
      }
    }

    await AuditLogger.log(project.id, actorId, "PROJECT_INSTANTIATED_FROM_TEMPLATE", "PROJECT", project.id, { templateId });
    return project;
  }
}
