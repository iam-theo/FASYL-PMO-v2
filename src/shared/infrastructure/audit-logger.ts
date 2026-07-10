import { db } from "../database/index.ts";
import { auditLogs } from "../../db/schema.ts";
import logger from "./logger.ts";

export class AuditLogger {
  static async log(projectId: string | null, userId: string, action: string, entityType: string, entityId: string, details?: any) {
    try {
      await db.insert(auditLogs).values({
        projectId,
        userId,
        action,
        entityType,
        entityId,
        details: details ? JSON.stringify(details) : null,
        createdAt: new Date(),
      });
    } catch (err) {
      logger.error({ err }, "Failed to persist audit log");
    }
  }
}
