import { Response } from "express";
import { MockAuthRequest } from "../../shared/middleware.ts";
import { MeetingsResourcesService } from "./service.ts";
import { sendSuccess, sendError } from "../../shared/response.ts";

export class MeetingsResourcesController {
  private service = new MeetingsResourcesService();

  // ==========================================
  // MEETINGS
  // ==========================================
  listMeetings = async (req: MockAuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const data = await this.service.getMeetings(projectId);
      return sendSuccess(res, "Meetings list loaded successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to load project meetings", [error.message]);
    }
  };

  createMeeting = async (req: MockAuthRequest, res: Response) => {
    try {
      const data = await this.service.createMeeting(req.body);
      return sendSuccess(res, "Meeting scheduled successfully", data, 201);
    } catch (error: any) {
      return sendError(res, "Failed to schedule meeting", [error.message]);
    }
  };

  updateMeeting = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = await this.service.updateMeeting(id, req.body);
      return sendSuccess(res, "Meeting configuration updated successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to update meeting parameters", [error.message]);
    }
  };

  // ==========================================
  // CAPACITY PLANNING
  // ==========================================
  getResourceAllocation = async (req: MockAuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const data = await this.service.getResourceAllocationReport(projectId);
      return sendSuccess(res, "Resource allocations loaded successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to load resource allocation maps", [error.message]);
    }
  };

  // ==========================================
  // EVM PROGRESS ANALYTICS
  // ==========================================
  getProgressEVM = async (req: MockAuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const data = await this.service.getProjectProgressEVM(projectId);
      return sendSuccess(res, "Earned Value metrics evaluated successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to evaluate progress metric indices", [error.message]);
    }
  };
}
