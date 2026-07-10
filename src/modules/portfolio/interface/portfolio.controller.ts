import { Request, Response, NextFunction } from "express";
import { PortfolioService } from "../application/portfolio.service.ts";
import { ResponseFormatter, StatusCode } from "../../../shared/infrastructure/response.ts";

export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const portfolio = await this.portfolioService.createPortfolio(actorId, req.body);
      return ResponseFormatter.success(res, portfolio, "Portfolio created", StatusCode.CREATED);
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const portfolios = await this.portfolioService.getAllPortfolios();
      return ResponseFormatter.success(res, portfolios);
    } catch (err) {
      next(err);
    }
  };
}
