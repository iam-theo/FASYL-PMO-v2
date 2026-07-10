import { db } from "./src/shared/database/index.ts";
import { securityAuditLogs, users } from "./src/db/schema.ts";
import { desc, eq } from "drizzle-orm";

async function main() {
  try {
    const logs = await db.select().from(securityAuditLogs).orderBy(desc(securityAuditLogs.createdAt)).limit(10);
    console.log("Recent audit logs:");
    for (const log of logs) {
      let userEmail = "unknown";
      if (log.userId) {
        const [u] = await db.select().from(users).where(eq(users.id, log.userId));
        if (u) userEmail = u.email;
      }
      console.log(`Time: ${log.createdAt}, User: ${userEmail} (${log.userId}), Action: ${log.action}, IP: ${log.ipAddress}, Details: ${log.details}`);
    }
  } catch (err) {
    console.error("Error reading logs:", err);
  }
  process.exit(0);
}

main();
