import { eq, inArray } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import { 
  permissionCategories, 
  permissionGroups, 
  permissions, 
  roles, 
  rolePermissions 
} from "../../../db/schema.ts";
import { 
  CATEGORIES, 
  GROUPS, 
  PERMISSIONS, 
  ROLES, 
  ROLE_PERMISSION_MAPPINGS 
} from "../domain/permissions.constants.ts";
import logger from "../../../shared/infrastructure/logger.ts";

export async function seedAuthorization() {
  logger.info("Starting Enterprise RBAC/PBAC Seeding process...");

  try {
    await db.transaction(async (tx) => {
      // 1. Seed Permission Categories
      const categoryMap: Record<string, string> = {};
      const existingCategories = await tx.select().from(permissionCategories);
      const existingCategoryCodes = new Set(existingCategories.map((c) => c.code));

      for (const catDef of CATEGORIES) {
        if (!existingCategoryCodes.has(catDef.code)) {
          const [inserted] = await tx.insert(permissionCategories).values({
            name: catDef.name,
            code: catDef.code,
            description: catDef.description,
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning();
          categoryMap[catDef.code] = inserted.id;
          logger.debug(`Seeded category: ${catDef.code}`);
        } else {
          const cat = existingCategories.find((c) => c.code === catDef.code)!;
          categoryMap[catDef.code] = cat.id;
        }
      }

      // 2. Seed Permission Groups
      const groupMap: Record<string, string> = {};
      const existingGroups = await tx.select().from(permissionGroups);
      const existingGroupCodes = new Set(existingGroups.map((g) => g.code));

      for (const groupDef of GROUPS) {
        const categoryId = categoryMap[groupDef.categoryCode];
        if (!categoryId) {
          logger.error(`Category ${groupDef.categoryCode} not found for group ${groupDef.code}`);
          continue;
        }

        if (!existingGroupCodes.has(groupDef.code)) {
          const [inserted] = await tx.insert(permissionGroups).values({
            categoryId,
            name: groupDef.name,
            code: groupDef.code,
            description: groupDef.description,
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning();
          groupMap[groupDef.code] = inserted.id;
          logger.debug(`Seeded group: ${groupDef.code}`);
        } else {
          const grp = existingGroups.find((g) => g.code === groupDef.code)!;
          groupMap[groupDef.code] = grp.id;
        }
      }

      // 3. Seed Permissions
      const permissionMap: Record<string, string> = {};
      const existingPermissions = await tx.select().from(permissions);
      const existingPermissionNames = new Set(existingPermissions.map((p) => p.name));

      for (const permDef of PERMISSIONS) {
        const groupId = groupMap[permDef.groupCode];
        if (!groupId) {
          logger.error(`Group ${permDef.groupCode} not found for permission ${permDef.name}`);
          continue;
        }

        // Derive missing metadata from dot notation and groups
        const nameParts = permDef.name.split(".");
        const feature = nameParts[0] || "general";
        const action = nameParts[1] || "view";
        
        // Find group to get module (categoryCode)
        const groupDef = GROUPS.find(g => g.code === permDef.groupCode);
        const module = groupDef?.categoryCode || "core";

        if (!existingPermissionNames.has(permDef.name)) {
          const [inserted] = await tx.insert(permissions).values({
            groupId,
            name: permDef.name,
            label: permDef.label,
            description: permDef.description,
            module,
            feature,
            action,
            permissionKey: permDef.name,
            isSystem: permDef.isSystem ?? false,
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning();
          permissionMap[permDef.name] = inserted.id;
          logger.debug(`Seeded permission: ${permDef.name}`);
        } else {
          const perm = existingPermissions.find((p) => p.name === permDef.name)!;
          permissionMap[permDef.name] = perm.id;
        }
      }

      // 4. Seed Roles
      const roleMap: Record<string, string> = {};
      const existingRoles = await tx.select().from(roles);
      const existingRoleCodes = new Set(existingRoles.map((r) => r.code));

      for (const roleDef of ROLES) {
        if (!existingRoleCodes.has(roleDef.code)) {
          const [inserted] = await tx.insert(roles).values({
            name: roleDef.name,
            code: roleDef.code,
            description: roleDef.description,
            isSystem: roleDef.isSystem ?? false,
            isSuperAdmin: roleDef.code === "super_admin",
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning();
          roleMap[roleDef.code] = inserted.id;
          logger.info(`Seeded Role: ${roleDef.name}`);
        } else {
          const role = existingRoles.find((r) => r.code === roleDef.code)!;
          if (role.code === "super_admin" && !role.isSuperAdmin) {
            await tx.update(roles).set({ isSuperAdmin: true }).where(eq(roles.id, role.id));
            role.isSuperAdmin = true;
          }
          roleMap[roleDef.code] = role.id;
        }
      }

      // 5. Seed Role Permissions
      logger.info("Seeding Role-Permission mappings...");
      for (const roleDef of ROLES) {
        const roleId = roleMap[roleDef.code];
        if (!roleId) continue;

        // Determine permissions for this role
        const mappedPermNames = ROLE_PERMISSION_MAPPINGS[roleDef.code] || [];
        let targetPermIds: string[] = [];

        if (mappedPermNames.includes("*")) {
          // Super admin gets all permissions
          targetPermIds = Object.values(permissionMap);
        } else {
          targetPermIds = mappedPermNames
            .map((name) => permissionMap[name])
            .filter((id): id is string => !!id);
        }

        // Get existing permissions mapped to this role
        const existingMappings = await tx
          .select()
          .from(rolePermissions)
          .where(eq(rolePermissions.roleId, roleId));
        
        const existingPermIdsMapped = new Set(existingMappings.map((m) => m.permissionId));
        const targetPermIdsSet = new Set(targetPermIds);

        // Permissions to add
        const toAdd = targetPermIds.filter((pid) => !existingPermIdsMapped.has(pid));
        // Permissions to remove
        const toRemove = existingMappings.filter((m) => !targetPermIdsSet.has(m.permissionId));

        if (toAdd.length > 0) {
          const insertPayloads = toAdd.map((pid) => ({
            roleId,
            permissionId: pid,
            assignedBy: "system",
            createdAt: new Date()
          }));
          // Chunk insertions in case of massive counts
          const chunkSize = 100;
          for (let i = 0; i < insertPayloads.length; i += chunkSize) {
            const chunk = insertPayloads.slice(i, i + chunkSize);
            await tx.insert(rolePermissions).values(chunk);
          }
          logger.info(`Mapped ${toAdd.length} new permissions to Role: ${roleDef.code}`);
        }

        if (toRemove.length > 0) {
          const removeIds = toRemove.map((r) => r.id);
          const chunkSize = 100;
          for (let i = 0; i < removeIds.length; i += chunkSize) {
            const chunk = removeIds.slice(i, i + chunkSize);
            await tx.delete(rolePermissions).where(inArray(rolePermissions.id, chunk));
          }
          logger.info(`Removed ${toRemove.length} obsolete permissions from Role: ${roleDef.code}`);
        }
      }

      logger.info("Enterprise RBAC/PBAC database seeding completed successfully.");
    });
  } catch (error) {
    logger.error({ error }, "Failed to seed Enterprise RBAC/PBAC database");
    throw error;
  }
}
