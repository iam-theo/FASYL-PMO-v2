import { eq, and } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import { portfolios, programs } from "../../../db/schema.ts";
import { NotFoundError } from "../../../shared/infrastructure/errors.ts";
import { AuditLogger } from "../../../shared/infrastructure/audit-logger.ts";
import { eventBus } from "../../../shared/domain/event-bus.ts";

export class PortfolioService {
  async createPortfolio(actorId: string, data: { name: string; description?: string; managerId: string; budget?: string }): Promise<any> {
    const [portfolio] = await db.insert(portfolios).values({
      ...data,
      budget: data.budget ? data.budget.toString() : undefined,
    }).returning();
    
    await AuditLogger.log(null, actorId, "PORTFOLIO_CREATED", "PORTFOLIO", portfolio.id, data);
    eventBus.publish("portfolio.created", portfolio);
    return portfolio;
  }

  async getAllPortfolios(): Promise<any[]> {
    return db.select().from(portfolios).where(eq(portfolios.status, "ACTIVE"));
  }

  async getPortfolio(id: string): Promise<any> {
    const [portfolio] = await db.select().from(portfolios).where(eq(portfolios.id, id)).limit(1);
    if (!portfolio) throw new NotFoundError("Portfolio");
    return portfolio;
  }
}
