import { dbState, generateUUID, saveDatabase } from "../../db.ts";
import { TimeLog, Issue, Risk } from "../../types.ts";
import { db } from "../../../../shared/database/index.ts";
import { eq } from "drizzle-orm";
import { risksAndIssues as pgRisksAndIssuesTable } from "../../../../db/schema.ts";

export class TimeIssuesRisksRepository {
  // ==========================================
  // TIME LOGS
  // ==========================================
  async getTimeLogsByProject(projectId: string): Promise<TimeLog[]> {
    return dbState.timeLogs.filter(tl => tl.projectId === projectId);
  }

  async createTimeLog(data: Partial<TimeLog>): Promise<TimeLog> {
    const newLog: TimeLog = {
      id: generateUUID(),
      projectId: data.projectId!,
      taskId: data.taskId || null,
      teamMemberId: data.teamMemberId!,
      hours: data.hours!,
      date: data.date!,
      description: data.description!,
      isBillable: data.isBillable !== undefined ? data.isBillable : true,
      isApproved: false,
      createdAt: new Date().toISOString()
    };

    dbState.timeLogs.push(newLog);
    
    // Accumulate task actual hours automatically!
    if (data.taskId) {
      const task = dbState.tasks.find(t => t.id === data.taskId);
      if (task) {
        task.actualHours += data.hours!;
      }
    }

    saveDatabase();
    return newLog;
  }

  async approveTimeLog(id: string, approvedBy: string): Promise<TimeLog | null> {
    const index = dbState.timeLogs.findIndex(tl => tl.id === id);
    if (index === -1) return null;

    dbState.timeLogs[index].isApproved = true;
    dbState.timeLogs[index].approvedBy = approvedBy;
    
    saveDatabase();
    return dbState.timeLogs[index];
  }

  // ==========================================
  // ISSUES
  // ==========================================
  async getIssuesByProject(projectId: string): Promise<Issue[]> {
    return dbState.issues.filter(i => i.projectId === projectId && !i.deletedAt);
  }

  async findIssueById(id: string): Promise<Issue | null> {
    return dbState.issues.find(i => i.id === id && !i.deletedAt) || null;
  }

  async createIssue(data: Partial<Issue>): Promise<Issue> {
    const id = generateUUID();
    const severity = data.severity || "MEDIUM";
    const priority = data.priority || "MEDIUM";
    const status = data.status || "OPEN";

    const [inserted] = await db.insert(pgRisksAndIssuesTable).values({
      id,
      projectId: data.projectId!,
      title: data.title!,
      description: data.description || "",
      type: "ISSUE",
      status: (status === "CLOSED" ? "CLOSED" : status === "RESOLVED" ? "RESOLVED" : "OPEN") as any,
      priority: priority as any,
      ownerId: data.reporterId || "usr-alex",
      impact: severity,
      probability: null
    }).returning();

    const newIssue: Issue = {
      id: inserted.id,
      projectId: inserted.projectId,
      title: inserted.title,
      description: inserted.description || "",
      severity: (inserted.impact || "MEDIUM") as any,
      priority: inserted.priority as any,
      status: (inserted.status === "CLOSED" ? "CLOSED" : inserted.status === "RESOLVED" ? "RESOLVED" : "OPEN") as any,
      reporterId: inserted.ownerId || "usr-alex",
      assigneeId: null,
      rootCause: null,
      resolution: null,
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
      deletedAt: null
    };

    dbState.issues.push(newIssue);
    saveDatabase();
    return newIssue;
  }

  async updateIssue(id: string, data: Partial<Issue>): Promise<Issue | null> {
    const index = dbState.issues.findIndex(i => i.id === id && !i.deletedAt);
    if (index === -1) return null;

    const current = dbState.issues[index];
    const updatedStatus = data.status || current.status;
    const updatedPriority = data.priority || current.priority;
    const updatedSeverity = data.severity || current.severity;

    const [updated] = await db.update(pgRisksAndIssuesTable)
      .set({
        title: data.title,
        description: data.description,
        status: (updatedStatus === "CLOSED" ? "CLOSED" : updatedStatus === "RESOLVED" ? "RESOLVED" : "OPEN") as any,
        priority: updatedPriority as any,
        impact: updatedSeverity,
        updatedAt: new Date()
      })
      .where(eq(pgRisksAndIssuesTable.id, id))
      .returning();

    dbState.issues[index] = {
      ...current,
      ...data,
      updatedAt: updated ? updated.updatedAt.toISOString() : new Date().toISOString()
    };

    saveDatabase();
    return dbState.issues[index];
  }

  async deleteIssue(id: string): Promise<boolean> {
    const index = dbState.issues.findIndex(i => i.id === id && !i.deletedAt);
    if (index === -1) return false;

    await db.update(pgRisksAndIssuesTable)
      .set({
        deletedAt: new Date()
      })
      .where(eq(pgRisksAndIssuesTable.id, id));

    dbState.issues[index].deletedAt = new Date().toISOString();
    saveDatabase();
    return true;
  }

  // ==========================================
  // RISKS
  // ==========================================
  async getRisksByProject(projectId: string): Promise<Risk[]> {
    return dbState.risks.filter(r => r.projectId === projectId && !r.deletedAt);
  }

  async findRiskById(id: string): Promise<Risk | null> {
    return dbState.risks.find(r => r.id === id && !r.deletedAt) || null;
  }

  async createRisk(data: Partial<Risk>): Promise<Risk> {
    const id = generateUUID();
    const probabilityNum = data.probability === "LOW" ? 1 : data.probability === "HIGH" ? 3 : 2;
    const impact = data.impact || "MEDIUM";
    const status = data.status || "IDENTIFIED";

    const [inserted] = await db.insert(pgRisksAndIssuesTable).values({
      id,
      projectId: data.projectId!,
      title: data.title!,
      description: data.description || "",
      type: "RISK",
      status: (status === "CLOSED" ? "CLOSED" : status === "MITIGATED" ? "MITIGATED" : "OPEN") as any,
      priority: "MEDIUM" as any,
      ownerId: data.ownerId || "usr-alex",
      mitigationPlan: data.mitigationStrategy || "",
      impact,
      probability: probabilityNum
    }).returning();

    const newRisk: Risk = {
      id: inserted.id,
      projectId: inserted.projectId,
      title: inserted.title,
      description: inserted.description || "",
      probability: (inserted.probability === 1 ? "LOW" : inserted.probability === 3 ? "HIGH" : "MEDIUM") as any,
      impact: (inserted.impact || "MEDIUM") as any,
      mitigationStrategy: inserted.mitigationPlan || "",
      escalationPlan: "",
      status: (inserted.status === "CLOSED" ? "CLOSED" : inserted.status === "MITIGATED" ? "MITIGATED" : "IDENTIFIED") as any,
      ownerId: inserted.ownerId || "usr-alex",
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
      deletedAt: null
    };

    dbState.risks.push(newRisk);
    saveDatabase();
    return newRisk;
  }

  async updateRisk(id: string, data: Partial<Risk>): Promise<Risk | null> {
    const index = dbState.risks.findIndex(r => r.id === id && !r.deletedAt);
    if (index === -1) return null;

    const current = dbState.risks[index];
    const updatedStatus = data.status || current.status;
    const probabilityNum = data.probability !== undefined
      ? (data.probability === "LOW" ? 1 : data.probability === "HIGH" ? 3 : 2)
      : undefined;

    const [updated] = await db.update(pgRisksAndIssuesTable)
      .set({
        title: data.title,
        description: data.description,
        status: (updatedStatus === "CLOSED" ? "CLOSED" : updatedStatus === "MITIGATED" ? "MITIGATED" : "OPEN") as any,
        mitigationPlan: data.mitigationStrategy,
        impact: data.impact,
        probability: probabilityNum,
        updatedAt: new Date()
      })
      .where(eq(pgRisksAndIssuesTable.id, id))
      .returning();

    dbState.risks[index] = {
      ...current,
      ...data,
      updatedAt: updated ? updated.updatedAt.toISOString() : new Date().toISOString()
    };

    saveDatabase();
    return dbState.risks[index];
  }

  async deleteRisk(id: string): Promise<boolean> {
    const index = dbState.risks.findIndex(r => r.id === id && !r.deletedAt);
    if (index === -1) return false;

    await db.update(pgRisksAndIssuesTable)
      .set({
        deletedAt: new Date()
      })
      .where(eq(pgRisksAndIssuesTable.id, id));

    dbState.risks[index].deletedAt = new Date().toISOString();
    saveDatabase();
    return true;
  }
}
