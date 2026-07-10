import { Request, Response, NextFunction } from "express";
import { DashboardService } from "../application/dashboard.service.ts";
import { ResponseFormatter, StatusCode } from "../../../shared/infrastructure/response.ts";

const dashboardService = new DashboardService();

export class DashboardController {

  async getEffectiveDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const data = await dashboardService.getEffectiveDashboard(userId);
      return ResponseFormatter.success(res, data, "Dashboard resolved successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async listWidgets(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.listAllWidgets();
      return ResponseFormatter.success(res, data, "Widgets retrieved successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async createWidget(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.createWidget(req.body);
      return ResponseFormatter.success(res, data, "Widget created successfully", StatusCode.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { layout, ...templateData } = req.body;
      const data = await dashboardService.createDashboardTemplate(templateData, layout || []);
      return ResponseFormatter.success(res, data, "Dashboard template created successfully", StatusCode.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async listTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.listAllTemplates();
      return ResponseFormatter.success(res, data, "Dashboard templates retrieved successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async deleteTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await dashboardService.deleteTemplate(id);
      return ResponseFormatter.success(res, null, "Dashboard template deleted successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async updateWidget(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = await dashboardService.updateWidget(id, req.body);
      return ResponseFormatter.success(res, data, "Widget updated successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async deleteWidget(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await dashboardService.deleteWidget(id);
      return ResponseFormatter.success(res, null, "Widget deleted successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }

  async savePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const data = await dashboardService.saveUserPreferences(userId, req.body);
      return ResponseFormatter.success(res, data, "Preferences saved successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }
}
