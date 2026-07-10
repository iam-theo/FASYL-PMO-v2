import { TimeIssuesRisksRepository } from "./repository.ts";
import { TimeLog, Issue, Risk } from "../../types.ts";
import { dbState } from "../../db.ts";

export class TimeIssuesRisksService {
  private repository = new TimeIssuesRisksRepository();

  // ==========================================
  // TIME LOGS
  // ==========================================
  async getTimeLogs(projectId: string): Promise<TimeLog[]> {
    return this.repository.getTimeLogsByProject(projectId);
  }

  async createTimeLog(data: Partial<TimeLog>): Promise<TimeLog> {
    // Validate that hours doesn't exceed 24 hours
    if (data.hours! <= 0 || data.hours! > 24) {
      throw new Error("Invalid Hours: Time logged must be between 0 and 24 hours per day");
    }

    // Check if the team member weekly allocation capacity is exceeded
    const member = dbState.teamMembers.find(tm => tm.id === data.teamMemberId);
    if (member) {
      const activeLogs = dbState.timeLogs.filter(tl => tl.teamMemberId === data.teamMemberId);
      const totalLoggedThisWeek = activeLogs.reduce((sum, tl) => sum + tl.hours, 0);
      if (totalLoggedThisWeek + data.hours! > member.capacity) {
        console.warn(`Time tracking notification: ${member.name} total logged hours (${totalLoggedThisWeek + data.hours!}h) exceeds weekly capacity (${member.capacity}h)`);
      }
    }

    return this.repository.createTimeLog(data);
  }

  async approveTimeLog(id: string, approvedBy: string): Promise<TimeLog> {
    const approved = await this.repository.approveTimeLog(id, approvedBy);
    if (!approved) throw new Error("Time log entry not found");
    return approved;
  }

  async getTimesheetSummary(projectId: string) {
    const logs = await this.getTimeLogs(projectId);
    
    let totalBillable = 0;
    let totalNonBillable = 0;
    const memberHours: Record<string, { name: string; hours: number }> = {};

    logs.forEach(l => {
      if (l.isBillable) {
        totalBillable += l.hours;
      } else {
        totalNonBillable += l.hours;
      }

      const member = dbState.teamMembers.find(tm => tm.id === l.teamMemberId);
      const memberName = member ? member.name : "Unknown Member";
      
      if (!memberHours[l.teamMemberId]) {
        memberHours[l.teamMemberId] = { name: memberName, hours: 0 };
      }
      memberHours[l.teamMemberId].hours += l.hours;
    });

    return {
      projectId,
      totals: {
        hoursLogged: totalBillable + totalNonBillable,
        billableHours: totalBillable,
        nonBillableHours: totalNonBillable,
        billablePercentage: totalBillable + totalNonBillable > 0 
          ? Math.round((totalBillable / (totalBillable + totalNonBillable)) * 100) 
          : 0
      },
      memberWorkloads: Object.values(memberHours)
    };
  }

  // ==========================================
  // ISSUES
  // ==========================================
  async getIssues(projectId: string): Promise<Issue[]> {
    return this.repository.getIssuesByProject(projectId);
  }

  async createIssue(data: Partial<Issue>): Promise<Issue> {
    return this.repository.createIssue(data);
  }

  async updateIssue(id: string, data: Partial<Issue>): Promise<Issue> {
    const updated = await this.repository.updateIssue(id, data);
    if (!updated) throw new Error("Issue record not found to update");
    return updated;
  }

  async deleteIssue(id: string): Promise<boolean> {
    return this.repository.deleteIssue(id);
  }

  // ==========================================
  // RISKS
  // ==========================================
  async getRisks(projectId: string): Promise<Risk[]> {
    const risks = await this.repository.getRisksByProject(projectId);
    
    // Inject calculated Risk Scores & Classification for analytics reporting
    return risks.map(r => {
      const score = this.calculateRiskScore(r.probability, r.impact);
      const level = this.getRiskSeverityLevel(score);
      return {
        ...r,
        riskScore: score,
        riskLevel: level
      } as any;
    });
  }

  async createRisk(data: Partial<Risk>): Promise<Risk> {
    return this.repository.createRisk(data);
  }

  async updateRisk(id: string, data: Partial<Risk>): Promise<Risk> {
    const updated = await this.repository.updateRisk(id, data);
    if (!updated) throw new Error("Risk record not found to update");
    return updated;
  }

  async deleteRisk(id: string): Promise<boolean> {
    return this.repository.deleteRisk(id);
  }

  /**
   * Risk Rating Engine Matrix (Probability x Impact)
   */
  private calculateRiskScore(prob: string, imp: string): number {
    const pVal = { LOW: 1, MEDIUM: 2, HIGH: 3 }[prob] || 1;
    const iVal = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[imp] || 1;
    return pVal * iVal;
  }

  private getRiskSeverityLevel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    if (score >= 12) return "CRITICAL";
    if (score >= 8) return "HIGH";
    if (score >= 3) return "MEDIUM";
    return "LOW";
  }
}
