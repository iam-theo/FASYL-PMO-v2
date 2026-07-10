import { readFileSync } from "fs";
import { join } from "path";
import { db } from "../../../shared/database";
import { users } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";
import logger from "../../../shared/infrastructure/logger.ts";

export class UserSyncService {
  private jsonDbPath: string;

  constructor() {
    this.jsonDbPath = join(process.cwd(), "project_tracker_db.json");
  }

  async syncUsers() {
    try {
      logger.info("Starting User Synchronization from Projects Database (JSON)");
      
      const fileContent = readFileSync(this.jsonDbPath, "utf-8");
      const data = JSON.parse(fileContent);
      const teamMembers = data.teamMembers || [];

      let syncedCount = 0;

      for (const member of teamMembers) {
        // Map JSON fields to SQL columns
        const [firstName, ...lastNames] = member.name.split(" ");
        const lastName = lastNames.join(" ") || "N/A";
        
        const userData = {
          id: member.userId || member.id,
          firstName,
          lastName,
          email: member.email,
          username: member.email.split("@")[0],
          jobTitle: member.role,
          status: (member.availability === "AVAILABLE" ? "ACTIVE" : "INACTIVE") as any,
          isActive: true,
        };

        // Check if user exists
        const [existing] = await db.select().from(users).where(eq(users.email, member.email)).limit(1);

        if (existing) {
          // Update
          await db.update(users)
            .set({
              ...userData,
              updatedAt: new Date(),
            } as any)
            .where(eq(users.id, existing.id));
        } else {
          // Insert
          await db.insert(users).values({
            ...userData,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any);
        }
        syncedCount++;
      }

      logger.info(`Successfully synced ${syncedCount} users from Projects Database.`);
      return syncedCount;
    } catch (error: any) {
      logger.error({ error }, "Error during user synchronization");
      throw error;
    }
  }
}
