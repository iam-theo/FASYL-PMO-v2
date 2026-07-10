import { Response } from "express";
import { MockAuthRequest } from "../../shared/middleware.ts";
import { DashboardService } from "./service.ts";
import { sendSuccess, sendError } from "../../shared/response.ts";
import { syncStateFromPostgres } from "../../db.ts";

export class DashboardController {
  private service = new DashboardService();

  /**
   * Get project or portfolio summary stats
   */
  getSummary = async (req: MockAuthRequest, res: Response) => {
    try {
      await syncStateFromPostgres();
      const projectId = req.query.projectId as string | undefined;
      const data = await this.service.getProjectSummary(projectId);
      return sendSuccess(res, "Dashboard summary calculated successfully", data);
    } catch (error: any) {
      console.error("DashboardController Error:", error);
      return sendError(res, "Failed to retrieve dashboard statistics", [error.message]);
    }
  };
}
