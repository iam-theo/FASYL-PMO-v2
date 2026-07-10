import { eq, and } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import { programs, portfolios, projects, risksAndIssues } from "../../../db/schema.ts";
import { NotFoundError, ValidationError } from "../../../shared/infrastructure/errors.ts";
import { AuditLogger } from "../../../shared/infrastructure/audit-logger.ts";
import { eventBus } from "../../../shared/domain/event-bus.ts";

export class ProgramService {
  async createProgram(
    actorId: string,
    data: { portfolioId: string; name: string; description?: string; managerId: string; budget?: string }
  ): Promise<any> {
    // Verify portfolio exists
    const [portfolio] = await db.select().from(portfolios).where(eq(portfolios.id, data.portfolioId)).limit(1);
    if (!portfolio) {
      throw new NotFoundError("Portfolio");
    }

    const [program] = await db
      .insert(programs)
      .values({
        portfolioId: data.portfolioId,
        name: data.name,
        description: data.description,
        managerId: data.managerId,
        budget: data.budget ? data.budget.toString() : null,
        status: "ACTIVE",
      })
      .returning();

    await AuditLogger.log(null, actorId, "PROGRAM_CREATED", "PROGRAM", program.id, data);
    eventBus.publish("program.created", program);
    return program;
  }

  async updateProgram(
    actorId: string,
    id: string,
    data: { name?: string; description?: string; managerId?: string; budget?: string; status?: "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED" }
  ): Promise<any> {
    const [existing] = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
    if (!existing) {
      throw new NotFoundError("Program");
    }

    const [program] = await db
      .update(programs)
      .set({
        ...data,
        budget: data.budget ? data.budget.toString() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(programs.id, id))
      .returning();

    await AuditLogger.log(null, actorId, "PROGRAM_UPDATED", "PROGRAM", id, data);
    eventBus.publish("program.updated", program);
    return program;
  }

  async archiveProgram(actorId: string, id: string): Promise<any> {
    return this.updateProgram(actorId, id, { status: "ARCHIVED" });
  }

  async getProgram(id: string): Promise<any> {
    const [program] = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
    if (!program) {
      throw new NotFoundError("Program");
    }
    return program;
  }

  async listPrograms(portfolioId?: string): Promise<any[]> {
    if (portfolioId) {
      return db.select().from(programs).where(eq(programs.portfolioId, portfolioId));
    }
    return db.select().from(programs);
  }

  async getProgramDashboard(id: string): Promise<any> {
    const program = await this.getProgram(id);
    
    // Fetch all projects belonging to this program
    const programProjects = await db.select().from(projects).where(eq(projects.programId, id));

    // Calculate aggregated budget and actual costs
    let totalProjectBudget = 0;
    let totalProjectActualCost = 0;
    let criticalProjectsCount = 0;
    let atRiskProjectsCount = 0;
    let stableProjectsCount = 0;

    for (const p of programProjects) {
      totalProjectBudget += p.budget ? parseFloat(p.budget) : 0;
      totalProjectActualCost += p.actualCost ? parseFloat(p.actualCost) : 0;
      if (p.health === "CRITICAL") criticalProjectsCount++;
      else if (p.health === "AT_RISK") atRiskProjectsCount++;
      else stableProjectsCount++;
    }

    // Fetch Program risks & issues (polymorphic risks from child projects)
    const projectIds = programProjects.map((p) => p.id);
    let programRisks: any[] = [];
    if (projectIds.length > 0) {
      programRisks = await db
        .select()
        .from(risksAndIssues)
        .where(and(eq(risksAndIssues.type, "RISK"), eq(risksAndIssues.status, "IDENTIFIED"))); // identified/active risks
    }

    return {
      program,
      projectCount: programProjects.length,
      financials: {
        allocatedBudget: program.budget ? parseFloat(program.budget) : 0,
        rolledUpProjectBudgets: totalProjectBudget,
        rolledUpProjectActualCosts: totalProjectActualCost,
        budgetVariance: (program.budget ? parseFloat(program.budget) : 0) - totalProjectActualCost,
      },
      healthDistribution: {
        stable: stableProjectsCount,
        atRisk: atRiskProjectsCount,
        critical: criticalProjectsCount,
      },
      projects: programProjects,
      risks: programRisks,
    };
  }
}
