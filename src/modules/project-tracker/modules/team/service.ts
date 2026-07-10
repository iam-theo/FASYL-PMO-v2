import { TeamRepository } from "./repository.ts";
import { TeamMember } from "../../types.ts";

export class TeamService {
  private repository = new TeamRepository();

  /**
   * Add / Allocate a member to a project
   */
  async assignMember(data: Partial<TeamMember>): Promise<TeamMember> {
    if (!data.userId) {
      data.userId = "usr-" + Math.random().toString(36).substring(2, 11);
    }
    const existing = await this.repository.findByProjectAndUser(data.projectId!, data.userId!);
    if (existing) {
      throw new Error("This user is already allocated as a member of this project");
    }

    // Workload check: sum allocation of user across all active projects
    const allMemberships = typeof global !== "undefined" ? [] : []; // in simulated state, can search dbState
    const userMemberships = await this.calculateUserTotalAllocation(data.userId!);
    const proposedAllocation = data.allocation || 100;

    if (userMemberships + proposedAllocation > 100) {
      // We will allow it but log a warning / adjust capacity, or just allow for flexibility with a notification
      console.warn(`User ${data.name} total allocation exceeds 100% (currently ${userMemberships + proposedAllocation}%)`);
    }

    return this.repository.create(data);
  }

  /**
   * Update member configuration
   */
  async updateAllocation(id: string, data: Partial<TeamMember>): Promise<TeamMember> {
    const member = await this.repository.findById(id);
    if (!member) {
      throw new Error("Team member allocation record not found");
    }

    const updated = await this.repository.update(id, data);
    return updated!;
  }

  /**
   * Remove member from project (soft delete)
   */
  async removeMember(id: string): Promise<boolean> {
    const member = await this.repository.findById(id);
    if (!member) {
      throw new Error("Team member allocation record not found");
    }
    return this.repository.delete(id);
  }

  /**
   * List project team members with workloads
   */
  async getProjectTeam(projectId: string): Promise<TeamMember[]> {
    return this.repository.findByProject(projectId);
  }

  /**
   * Helper to calculate user's global allocation across all projects
   */
  private async calculateUserTotalAllocation(userId: string): Promise<number> {
    const { dbState } = await import("../../db.ts");
    return dbState.teamMembers
      .filter(t => t.userId === userId && !t.deletedAt)
      .reduce((sum, t) => sum + t.allocation, 0);
  }
}
