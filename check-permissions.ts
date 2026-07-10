import { db } from "./src/shared/database/index.ts";
import { users, userRoles, roles } from "./src/db/schema.ts";
import { AuthorizationService } from "./src/modules/authorization/application/authorization.service.ts";
import { eq } from "drizzle-orm";

async function main() {
  try {
    const authService = new AuthorizationService();
    const email = "theodesmon71@gmail.com";
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (!user) {
      console.log(`User with email ${email} not found!`);
      process.exit(0);
    }
    
    console.log("User found:", user.id, user.email);
    
    const assignedRoles = await db
      .select({
        roleId: roles.id,
        roleCode: roles.code,
        isSuperAdmin: roles.isSuperAdmin,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));
      
    console.log("Assigned roles:", JSON.stringify(assignedRoles, null, 2));
    
    const effectivePerms = await authService.getUserPermissions(user.id);
    console.log("Effective permissions count:", effectivePerms.length);
    console.log("Has 'admin.logs' permission?", effectivePerms.includes("admin.logs"));
    
  } catch (err) {
    console.error("Error checking permissions:", err);
  }
  process.exit(0);
}

main();
