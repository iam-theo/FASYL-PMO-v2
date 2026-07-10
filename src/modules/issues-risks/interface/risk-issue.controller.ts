import { Request, Response } from "express";
import { RiskIssueService } from "../application/risk-issue.service.ts";
import { ResponseFormatter, StatusCode } from "../../../shared/infrastructure/response.ts";

export class RiskIssueController {
  constructor(private readonly service: RiskIssueService) {}

  getByProject = async (req: Request, res: Response) => {
    const items = await this.service.getByProject(req.params.projectId);
    return ResponseFormatter.success(res, items.map(i => ({ id: i.id, ...i.props })));
  };

  create = async (req: Request, res: Response) => {
    const item = await this.service.create(req.body);
    return ResponseFormatter.success(res, { id: item.id, ...item.props }, "Risk/Issue created successfully", StatusCode.CREATED);
  };

  update = async (req: Request, res: Response) => {
    const item = await this.service.update(req.params.id, req.body);
    return ResponseFormatter.success(res, { id: item.id, ...item.props }, "Risk/Issue updated successfully");
  };

  delete = async (req: Request, res: Response) => {
    await this.service.delete(req.params.id);
    return ResponseFormatter.success(res, null, "Risk/Issue deleted successfully", StatusCode.NO_CONTENT);
  };
}
