import { eq, and } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import {
  projects,
  costCenters,
  projectExpenses,
  evmSnapshots,
  tasks
} from "../../../db/schema.ts";
import { NotFoundError, ValidationError } from "../../../shared/infrastructure/errors.ts";
import { AuditLogger } from "../../../shared/infrastructure/audit-logger.ts";
import { eventBus } from "../../../shared/domain/event-bus.ts";

export class FinanceService {
  // 1. Cost Center Management
  async createCostCenter(actorId: string, data: { code: string; name: string; description?: string; managerId?: string }): Promise<any> {
    const [existing] = await db.select().from(costCenters).where(eq(costCenters.code, data.code)).limit(1);
    if (existing) {
      throw new ValidationError(`Cost Center with code '${data.code}' already exists`);
    }

    const [cc] = await db.insert(costCenters).values(data).returning();
    await AuditLogger.log(null, actorId, "COST_CENTER_CREATED", "FINANCE", cc.id, data);
    return cc;
  }

  async listCostCenters(): Promise<any[]> {
    return db.select().from(costCenters);
  }

  // 2. Project Expense Management
  async createExpense(
    actorId: string,
    data: { projectId: string; costCenterId?: string; category: string; amount: string; description?: string; expenseDate: string }
  ): Promise<any> {
    const [project] = await db.select().from(projects).where(eq(projects.id, data.projectId)).limit(1);
    if (!project) throw new NotFoundError("Project");

    const [expense] = await db
      .insert(projectExpenses)
      .values({
        projectId: data.projectId,
        costCenterId: data.costCenterId || null,
        category: data.category,
        amount: data.amount.toString(),
        description: data.description || null,
        expenseDate: new Date(data.expenseDate),
        status: "PENDING",
      })
      .returning();

    await AuditLogger.log(data.projectId, actorId, "EXPENSE_CREATED", "FINANCE", expense.id, data);
    return expense;
  }

  async approveExpense(actorId: string, id: string, status: "APPROVED" | "REJECTED"): Promise<any> {
    const [expense] = await db.select().from(projectExpenses).where(eq(projectExpenses.id, id)).limit(1);
    if (!expense) throw new NotFoundError("Expense");

    const [updated] = await db
      .update(projectExpenses)
      .set({
        status,
        approvedBy: actorId,
      })
      .where(eq(projectExpenses.id, id))
      .returning();

    // If approved, dynamically roll up into project's actualCost
    if (status === "APPROVED") {
      const [project] = await db.select().from(projects).where(eq(projects.id, expense.projectId)).limit(1);
      if (project) {
        const currentActual = project.actualCost ? parseFloat(project.actualCost) : 0;
        const expenseAmount = parseFloat(expense.amount);
        const newActualCost = (currentActual + expenseAmount).toFixed(2);

        await db
          .update(projects)
          .set({ actualCost: newActualCost, updatedAt: new Date() })
          .where(eq(projects.id, expense.projectId));

        eventBus.publish("budget.changed", { projectId: expense.projectId, newActualCost });
      }
    }

    await AuditLogger.log(expense.projectId, actorId, `EXPENSE_${status}`, "FINANCE", id);
    return updated;
  }

  async getProjectExpenses(projectId: string): Promise<any[]> {
    return db.select().from(projectExpenses).where(eq(projectExpenses.projectId, projectId));
  }

  // 3. Earned Value Management (EVM) Engine
  async calculateProjectEVM(actorId: string, projectId: string): Promise<any> {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) throw new NotFoundError("Project");

    // BAC: Budget At Completion
    const bac = project.budget ? parseFloat(project.budget) : 0;
    if (bac <= 0) {
      return { message: "BAC must be greater than zero to calculate EVM metrics", projectId };
    }

    // AC: Actual Cost
    const ac = project.actualCost ? parseFloat(project.actualCost) : 0;

    // Retrieve tasks to aggregate physical completion percentage
    const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, projectId));
    let totalProgress = 0;
    let totalTasksWithEstimates = 0;

    projectTasks.forEach((t) => {
      totalProgress += t.completionPercentage || 0;
      totalTasksWithEstimates++;
    });

    // Average project completion percentage
    const avgCompletion = totalTasksWithEstimates > 0 ? totalProgress / totalTasksWithEstimates : 0;

    // EV: Earned Value = BAC * % Complete
    const ev = bac * (avgCompletion / 100);

    // PV: Planned Value (proportion of time elapsed versus project duration)
    let pv = 0;
    if (project.startDate && project.endDate) {
      const start = new Date(project.startDate).getTime();
      const end = new Date(project.endDate).getTime();
      const now = Date.now();

      const totalDuration = end - start;
      const elapsed = now - start;

      if (totalDuration > 0) {
        const progressTime = Math.max(0, Math.min(1, elapsed / totalDuration));
        pv = bac * progressTime;
      }
    } else {
      // Default to 50% PV if timeline is missing
      pv = bac * 0.5;
    }

    // Perform EVM Index Calculations
    const cv = ev - ac; // Cost Variance
    const sv = ev - pv; // Schedule Variance

    const cpi = ac > 0 ? ev / ac : 1.0; // Cost Performance Index
    const spi = pv > 0 ? ev / pv : 1.0; // Schedule Performance Index

    // EAC: Estimate At Completion = BAC / CPI
    const eac = cpi > 0 ? bac / cpi : bac;

    // VAC: Variance At Completion = BAC - EAC
    const vac = bac - eac;

    // TCPI: To Complete Performance Index (work remaining divided by funds remaining)
    const workRemaining = bac - ev;
    const fundsRemaining = bac - ac;
    const tcpi = fundsRemaining > 0 ? workRemaining / fundsRemaining : 1.0;

    // Save EVM Snapshot
    const [snapshot] = await db
      .insert(evmSnapshots)
      .values({
        projectId,
        pv: pv.toFixed(2),
        ev: ev.toFixed(2),
        ac: ac.toFixed(2),
        spi: spi.toFixed(2),
        cpi: cpi.toFixed(2),
        eac: eac.toFixed(2),
        vac: vac.toFixed(2),
        tcpi: tcpi.toFixed(2),
      })
      .returning();

    eventBus.publish("evm.updated", snapshot);
    await AuditLogger.log(projectId, actorId, "EVM_SNAPSHOT_GENERATED", "FINANCE", snapshot.id, snapshot);

    return {
      projectId,
      completionPercentage: avgCompletion.toFixed(1),
      metrics: {
        bac,
        pv: parseFloat(pv.toFixed(2)),
        ev: parseFloat(ev.toFixed(2)),
        ac: parseFloat(ac.toFixed(2)),
        cv: parseFloat(cv.toFixed(2)),
        sv: parseFloat(sv.toFixed(2)),
        spi: parseFloat(spi.toFixed(2)),
        cpi: parseFloat(cpi.toFixed(2)),
        eac: parseFloat(eac.toFixed(2)),
        vac: parseFloat(vac.toFixed(2)),
        tcpi: parseFloat(tcpi.toFixed(2)),
      },
    };
  }

  async getEVMSnapshots(projectId: string): Promise<any[]> {
    return db.select().from(evmSnapshots).where(eq(evmSnapshots.projectId, projectId));
  }
}
