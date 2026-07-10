import bcrypt from "bcrypt";
import { db } from "../../../shared/database/index.ts";
import { users, passwords, roles, userRoles } from "../../../db/schema.ts";
import { eq, and } from "drizzle-orm";
import logger from "../../../shared/infrastructure/logger.ts";

export async function seedIAM() {
  logger.info("Starting IAM Seeding process...");

  try {
    // Check if admin user exists
    const adminEmail = "admin@auraepm.com";
    const devEmail = "theodesmon71@gmail.com";
    
    for (const email of [adminEmail, devEmail]) {
      const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      let userObj = existingUser;

      if (!existingUser) {
        logger.info(`Creating enterprise user: ${email}`);
        const passwordHash = await bcrypt.hash("Welcome@123", 10);
        
        await db.transaction(async (tx) => {
          const [newUser] = await tx.insert(users).values({
            firstName: email === adminEmail ? "Enterprise" : "Theo",
            lastName: email === adminEmail ? "Admin" : "Desmon",
            email: email,
            username: email.split("@")[0],
            department: "IT",
            jobTitle: "System Administrator",
            organization: "AuraEPM Enterprise",
            status: "ACTIVE",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).returning();

          await tx.insert(passwords).values({
            userId: newUser.id,
            hash: passwordHash,
            mustChange: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          userObj = newUser;
        });
      }

      if (userObj) {
        const [superAdminRole] = await db.select().from(roles).where(eq(roles.code, "super_admin")).limit(1);
        if (superAdminRole) {
          const [existingAssigned] = await db.select()
            .from(userRoles)
            .where(and(eq(userRoles.userId, userObj.id), eq(userRoles.roleId, superAdminRole.id)))
            .limit(1);
          if (!existingAssigned) {
            await db.insert(userRoles).values({
              userId: userObj.id,
              roleId: superAdminRole.id,
              assignedBy: "system",
              createdAt: new Date()
            });
          }
        }
      }
    }
  } catch (error) {
    logger.error({ error }, "Failed to seed IAM database");
    throw error;
  }
}
