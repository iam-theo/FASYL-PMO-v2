import { db } from "../../../shared/database/index.ts";
import { auditLedger } from "../../../db/schema.ts";
import logger from "../../../shared/infrastructure/logger.ts";

export class AuditCenterService {
  public async log(
    actorId: string,
    action: string,
    moduleName: string,
    details: any,
    ipAddress?: string
  ): Promise<void> {
    try {
      const serializedDetails = typeof details === "string" ? details : JSON.stringify(details);
      
      await db.insert(auditLedger).values({
        actorId,
        action,
        moduleName,
        details: serializedDetails,
        ipAddress: ipAddress || "127.0.0.1",
      });

      logger.info(`[Audit Center] ${moduleName} - ${action} by ${actorId}: ${serializedDetails}`);
    } catch (err) {
      logger.error({ err }, "Failed to write audit ledger log entry");
    }
  }

  public async getLogs(filters?: {
    actorId?: string;
    moduleName?: string;
    action?: string;
    search?: string;
    sortField?: string;
    sortOrder?: "ASC" | "DESC";
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      const logs = await db.select().from(auditLedger);
      
      let filtered = logs;
      
      // 1. Filtering
      if (filters?.actorId) {
        filtered = filtered.filter(l => l.actorId === filters.actorId);
      }
      if (filters?.moduleName) {
        filtered = filtered.filter(l => l.moduleName === filters.moduleName);
      }
      if (filters?.action) {
        filtered = filtered.filter(l => l.action === filters.action);
      }
      
      // 2. Searching
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(l => 
          (l.action && l.action.toLowerCase().includes(searchLower)) ||
          (l.moduleName && l.moduleName.toLowerCase().includes(searchLower)) ||
          (l.actorId && l.actorId.toLowerCase().includes(searchLower)) ||
          (l.details && l.details.toLowerCase().includes(searchLower))
        );
      }
      
      // 3. Sorting
      const sortField = filters?.sortField || "createdAt";
      const sortOrder = filters?.sortOrder || "DESC";
      
      filtered.sort((a, b) => {
        let valA = (a as any)[sortField];
        let valB = (b as any)[sortField];
        
        if (valA instanceof Date) valA = valA.getTime();
        if (valB instanceof Date) valB = valB.getTime();
        
        if (valA < valB) return sortOrder === "ASC" ? -1 : 1;
        if (valA > valB) return sortOrder === "ASC" ? 1 : -1;
        return 0;
      });
      
      // 4. Pagination
      const offset = filters?.offset || 0;
      const limit = filters?.limit || 100;
      
      return filtered.slice(offset, offset + limit);
    } catch (err) {
      logger.error({ err }, "Failed to query audit logs from repository");
      return [];
    }
  }
}
