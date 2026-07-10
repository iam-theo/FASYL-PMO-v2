import { eq } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import { auditLogs } from "../../../db/schema.ts";

export class AuditRepository {
  async findByProject(projectId: string) {
    return db.select().from(auditLogs).where(eq(auditLogs.projectId, projectId));
  }

  async findByUser(userId: string) {
    return db.select().from(auditLogs).where(eq(auditLogs.userId, userId));
  }
}
