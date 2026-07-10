import { Response } from "express";
import { MockAuthRequest } from "../../shared/middleware.ts";
import { TeamService } from "./service.ts";
import { sendSuccess, sendError } from "../../shared/response.ts";

export class TeamController {
  private service = new TeamService();

  /**
   * List team members of a project
   */
  listMembers = async (req: MockAuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      if (!projectId) {
        return sendError(res, "Missing project ID parameter", [], 400);
      }
      const data = await this.service.getProjectTeam(projectId);
      return sendSuccess(res, "Project team list loaded successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to load project team", [error.message]);
    }
  };

  /**
   * Assign a new team member
   */
  assignMember = async (req: MockAuthRequest, res: Response) => {
    try {
      const data = await this.service.assignMember(req.body);
      return sendSuccess(res, "Team member allocated and assigned successfully", data, 201);
    } catch (error: any) {
      return sendError(res, "Failed to assign team member", [error.message]);
    }
  };

  /**
   * Update team member allocation config
   */
  updateAllocation = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = await this.service.updateAllocation(id, req.body);
      return sendSuccess(res, "Team member allocation updated successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to update team member allocation", [error.message]);
    }
  };

  /**
   * De-allocate team member
   */
  removeMember = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.removeMember(id);
      return sendSuccess(res, "Team member de-allocated successfully", { id });
    } catch (error: any) {
      return sendError(res, "Failed to remove team member from project", [error.message]);
    }
  };
}
