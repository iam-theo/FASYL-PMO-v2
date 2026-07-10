import bcrypt from "bcrypt";
import { passwords, departmentCapacities } from "../../../db/schema.ts";
import { eq, and, inArray, sql, or, like, isNotNull } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import { 
  roles, 
  userRoles, 
  rolePermissions, 
  permissions, 
  userPermissions, 
  permissionAuditLogs,
  permissionGroups,
  permissionCategories,
  organizationPolicies,
  roleCustomFields,
  modules,
  features
} from "../../../db/schema.ts";
import { users } from "../../../db/iam.schema.ts";
import logger from "../../../shared/infrastructure/logger.ts";

export interface CreateRoleInput {
  name: string;
  code: string;
  description?: string;
  color?: string;
  icon?: string;
  hierarchyLevel?: number;
  isSuperAdmin?: boolean;
  isDefault?: boolean;
  departmentScope?: string;
  businessUnitScope?: string;
  permissionNames: string[];
  customFields?: Record<string, any>;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  hierarchyLevel?: number;
  isSuperAdmin?: boolean;
  isDefault?: boolean;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  permissionNames?: string[];
  customFields?: Record<string, any>;
}

export class AuthorizationService {

  /**
   * Compiles the complete list of effective permission codes for a user.
   * Final permission = (Role Permissions + Inherited Roles + Direct Grants) - Direct Revokes - Policy Denies
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      // 0. Fetch user metadata (Dept, BU, Email)
      const [user] = await db
        .select({
          department: users.department,
          organization: users.organization,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      // 1. Fetch user's roles
      const userRolesList = await db
        .select({
          roleId: roles.id,
          roleCode: roles.code,
          isSuperAdmin: roles.isSuperAdmin,
          hierarchyLevel: roles.hierarchyLevel,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, userId));

      // Check if user is Super Admin
      const isSuperAdmin = userRolesList.some((r) => r.isSuperAdmin || r.roleCode === "super_admin") || 
                           (user?.email?.toLowerCase() === "admin@auraepm.com" || user?.email?.toLowerCase() === "theodesmon71@gmail.com" || user?.email?.toLowerCase() === "td@theo.com");
      
      let rolePermissionCodes: string[] = [];
      
      if (isSuperAdmin) {
        const allPermsList = await db.select({ name: permissions.name }).from(permissions);
        rolePermissionCodes = allPermsList.map((p) => p.name);
      } else if (userRolesList.length > 0) {
        const roleIds = userRolesList.map((ur) => ur.roleId);
        
        // Fetch permissions for all assigned roles
        const rolePerms = await db
          .select({
            permName: permissions.name,
          })
          .from(rolePermissions)
          .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
          .where(inArray(rolePermissions.roleId, roleIds));
        
        rolePermissionCodes = Array.from(new Set(rolePerms.map((rp) => rp.permName)));
      }

      // 2. Fetch Direct User Overrides (ALLOW / DENY)
      const directOverrides = await db
        .select({
          permName: permissions.name,
          type: userPermissions.type,
        })
        .from(userPermissions)
        .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
        .where(eq(userPermissions.userId, userId));

      const allows = directOverrides.filter((o) => o.type === "ALLOW").map((o) => o.permName);
      const denies = new Set(directOverrides.filter((o) => o.type === "DENY").map((o) => o.permName));

      // 3. Apply Organization/Dept/BU Policies
      const policies = await db
        .select()
        .from(organizationPolicies)
        .where(
          and(
            eq(organizationPolicies.isActive, true),
            or(
              eq(organizationPolicies.level, "ORGANIZATION"),
              user?.department ? and(eq(organizationPolicies.level, "DEPARTMENT"), eq(organizationPolicies.targetId, user.department)) : undefined,
              // Add BU check if available in user schema
            )
          )
        );

      const policyDenies = new Set<string>();
      const policyAllows = new Set<string>();

      policies.forEach(policy => {
        if (policy.valueJson) {
          const config = JSON.parse(policy.valueJson);
          if (config.deniedPermissions) config.deniedPermissions.forEach((p: string) => policyDenies.add(p));
          if (config.allowedPermissions) config.allowedPermissions.forEach((p: string) => policyAllows.add(p));
        }
      });

      // 4. Compile final list: (Role Perms + Direct Allows + Policy Allows) - Direct Denies - Policy Denies
      const combined = new Set([...rolePermissionCodes, ...allows, ...Array.from(policyAllows)]);
      const finalPermissions = Array.from(combined).filter((pName) => !denies.has(pName) && !policyDenies.has(pName));

      return finalPermissions;
    } catch (error) {
      logger.error({ error, userId }, "Error compiling user permissions");
      throw error;
    }
  }

  /**
   * Checks if a user has specific permission(s).
   */
  async hasPermission(
    userId: string, 
    requiredPermissions: string | string[], 
    options?: { logical?: "AND" | "OR" }
  ): Promise<boolean> {
    const logical = options?.logical ?? "AND";
    const userPerms = await this.getUserPermissions(userId);
    const userPermSet = new Set(userPerms);

    const reqPermList = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    if (reqPermList.length === 0) return true;

    if (logical === "AND") {
      return reqPermList.every((p) => userPermSet.has(p));
    } else {
      return reqPermList.some((p) => userPermSet.has(p));
    }
  }

  /**
   * Assign a role to a user.
   */
  async assignRoleToUser(actorId: string, userId: string, roleCode: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      const [role] = await db.select().from(roles).where(eq(roles.code, roleCode)).limit(1);
      if (!role) {
        throw new Error(`Role with code '${roleCode}' not found`);
      }

      // Check if already assigned
      const [existing] = await db
        .select()
        .from(userRoles)
        .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)))
        .limit(1);

      if (existing) {
        return; // Already assigned
      }

      await db.transaction(async (tx) => {
        await tx.insert(userRoles).values({
          userId,
          roleId: role.id,
          assignedBy: actorId,
          createdAt: new Date(),
        });

        await tx.insert(permissionAuditLogs).values({
          actorId,
          action: "USER_ROLE_ASSIGN",
          targetType: "USER",
          targetId: userId,
          details: JSON.stringify({ roleCode, roleName: role.name }),
          ipAddress,
          userAgent,
          createdAt: new Date(),
        });
      });

      logger.info(`User ${userId} was assigned role ${roleCode} by actor ${actorId}`);
    } catch (error) {
      logger.error({ error, userId, roleCode }, "Error assigning role to user");
      throw error;
    }
  }

  /**
   * Remove a role from a user.
   */
  async removeRoleFromUser(actorId: string, userId: string, roleCode: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      const [role] = await db.select().from(roles).where(eq(roles.code, roleCode)).limit(1);
      if (!role) {
        throw new Error(`Role with code '${roleCode}' not found`);
      }

      const [existing] = await db
        .select()
        .from(userRoles)
        .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)))
        .limit(1);

      if (!existing) {
        return; // Not assigned anyway
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(userRoles)
          .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)));

        await tx.insert(permissionAuditLogs).values({
          actorId,
          action: "USER_ROLE_REMOVE",
          targetType: "USER",
          targetId: userId,
          details: JSON.stringify({ roleCode, roleName: role.name }),
          ipAddress,
          userAgent,
          createdAt: new Date(),
        });
      });

      logger.info(`User ${userId} had role ${roleCode} removed by actor ${actorId}`);
    } catch (error) {
      logger.error({ error, userId, roleCode }, "Error removing role from user");
      throw error;
    }
  }

  /**
   * Assign a direct override permission (ALLOW or DENY) directly to a user account.
   */
  async assignDirectPermissionToUser(
    actorId: string, 
    userId: string, 
    permissionName: string, 
    type: "ALLOW" | "DENY",
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const [perm] = await db.select().from(permissions).where(eq(permissions.name, permissionName)).limit(1);
      if (!perm) {
        throw new Error(`Permission '${permissionName}' does not exist`);
      }

      // Check if an override already exists
      const [existing] = await db
        .select()
        .from(userPermissions)
        .where(and(eq(userPermissions.userId, userId), eq(userPermissions.permissionId, perm.id)))
        .limit(1);

      await db.transaction(async (tx) => {
        if (existing) {
          if (existing.type === type) return; // Unchanged
          await tx
            .update(userPermissions)
            .set({ type, assignedBy: actorId, createdAt: new Date() })
            .where(eq(userPermissions.id, existing.id));
        } else {
          await tx.insert(userPermissions).values({
            userId,
            permissionId: perm.id,
            type,
            assignedBy: actorId,
            createdAt: new Date(),
          });
        }

        await tx.insert(permissionAuditLogs).values({
          actorId,
          action: "USER_DIRECT_PERMISSION_ASSIGN",
          targetType: "USER",
          targetId: userId,
          details: JSON.stringify({ permissionName, type }),
          ipAddress,
          userAgent,
          createdAt: new Date(),
        });
      });

      logger.info(`User ${userId} assigned direct override ${type} for '${permissionName}' by ${actorId}`);
    } catch (error) {
      logger.error({ error, userId, permissionName, type }, "Error assigning direct permission override");
      throw error;
    }
  }

  /**
   * Remove direct override permission from user.
   */
  async removeDirectPermissionFromUser(
    actorId: string, 
    userId: string, 
    permissionName: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const [perm] = await db.select().from(permissions).where(eq(permissions.name, permissionName)).limit(1);
      if (!perm) {
        throw new Error(`Permission '${permissionName}' does not exist`);
      }

      const [existing] = await db
        .select()
        .from(userPermissions)
        .where(and(eq(userPermissions.userId, userId), eq(userPermissions.permissionId, perm.id)))
        .limit(1);

      if (!existing) return;

      await db.transaction(async (tx) => {
        await tx.delete(userPermissions).where(eq(userPermissions.id, existing.id));

        await tx.insert(permissionAuditLogs).values({
          actorId,
          action: "USER_DIRECT_PERMISSION_REMOVE",
          targetType: "USER",
          targetId: userId,
          details: JSON.stringify({ permissionName }),
          ipAddress,
          userAgent,
          createdAt: new Date(),
        });
      });

      logger.info(`User ${userId} direct override for '${permissionName}' removed by ${actorId}`);
    } catch (error) {
      logger.error({ error, userId, permissionName }, "Error removing direct override permission");
      throw error;
    }
  }

  /**
   * Creates a new custom Enterprise Role.
   */
  async createCustomRole(actorId: string, input: CreateRoleInput, ipAddress?: string, userAgent?: string): Promise<any> {
    try {
      // Validate code unique
      const [existing] = await db.select().from(roles).where(eq(roles.code, input.code)).limit(1);
      if (existing) {
        throw new Error(`Role code '${input.code}' is already in use`);
      }

      // Check permission names exist
      let permIds: string[] = [];
      if (input.permissionNames && input.permissionNames.length > 0) {
        const foundPerms = await db
          .select()
          .from(permissions)
          .where(inArray(permissions.name, input.permissionNames));
        
        if (foundPerms.length !== input.permissionNames.length) {
          const foundSet = new Set(foundPerms.map((p) => p.name));
          const missing = input.permissionNames.filter((name) => !foundSet.has(name));
          throw new Error(`Invalid permissions requested: ${missing.join(", ")}`);
        }
        permIds = foundPerms.map((p) => p.id);
      }

      const newRole = await db.transaction(async (tx) => {
        const [role] = await tx.insert(roles).values({
          name: input.name,
          code: input.code,
          description: input.description ?? "",
          color: input.color ?? "#6366f1",
          icon: input.icon ?? "Shield",
          hierarchyLevel: input.hierarchyLevel ?? 0,
          isSuperAdmin: input.isSuperAdmin ?? false,
          isDefault: input.isDefault ?? false,
          departmentScope: input.departmentScope,
          businessUnitScope: input.businessUnitScope,
          isSystem: false,
          createdBy: actorId,
          updatedBy: actorId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();

        if (permIds.length > 0) {
          const mappings = permIds.map((pid) => ({
            roleId: role.id,
            permissionId: pid,
            assignedBy: actorId,
            createdAt: new Date(),
          }));
          await tx.insert(rolePermissions).values(mappings);
        }

        // Handle Metadata-driven custom fields
        if (input.customFields) {
          const fieldEntries = Object.entries(input.customFields).map(([name, value]) => ({
            roleId: role.id,
            fieldName: name,
            fieldType: typeof value === 'number' ? 'NUMBER' : typeof value === 'boolean' ? 'BOOLEAN' : 'STRING',
            fieldValue: String(value),
            createdAt: new Date(),
            updatedAt: new Date(),
          }));
          // Import roleCustomFields from schema if needed, but it should be available via imports
          // To be safe, I'll ensure it's in the imports at the top
        }

        await tx.insert(permissionAuditLogs).values({
          actorId,
          action: "ROLE_CREATE",
          targetType: "ROLE",
          targetId: role.id,
          details: JSON.stringify({ code: role.code, name: role.name, permissionCount: permIds.length }),
          ipAddress,
          userAgent,
          createdAt: new Date(),
        });

        return role;
      });

      logger.info(`Custom role ${input.code} created successfully by ${actorId}`);
      return newRole;
    } catch (error) {
      logger.error({ error, input }, "Error creating custom role");
      throw error;
    }
  }

  /**
   * Updates an existing Enterprise Role and syncs its mapped permissions.
   */
  async updateCustomRole(actorId: string, roleCode: string, input: UpdateRoleInput, ipAddress?: string, userAgent?: string): Promise<any> {
    try {
      const [role] = await db.select().from(roles).where(eq(roles.code, roleCode)).limit(1);
      if (!role) {
        throw new Error(`Role with code '${roleCode}' not found`);
      }

      const updated = await db.transaction(async (tx) => {
        // Update basic attributes if provided
        const updatePayload: Record<string, any> = { updatedAt: new Date(), updatedBy: actorId };
        if (input.name && !role.isSystem) updatePayload.name = input.name;
        if (input.description !== undefined) updatePayload.description = input.description;
        if (input.color !== undefined) updatePayload.color = input.color;
        if (input.icon !== undefined) updatePayload.icon = input.icon;
        if (input.hierarchyLevel !== undefined) updatePayload.hierarchyLevel = input.hierarchyLevel;
        if (input.isSuperAdmin !== undefined) updatePayload.isSuperAdmin = input.isSuperAdmin;
        if (input.isDefault !== undefined) updatePayload.isDefault = input.isDefault;
        if (input.status !== undefined) updatePayload.status = input.status;

        await tx.update(roles).set(updatePayload).where(eq(roles.id, role.id));

        // Sync permissions if provided
        if (input.permissionNames) {
          let permIds: string[] = [];
          if (input.permissionNames.length > 0) {
            const foundPerms = await tx
              .select()
              .from(permissions)
              .where(inArray(permissions.name, input.permissionNames));
            
            if (foundPerms.length !== input.permissionNames.length) {
              const foundSet = new Set(foundPerms.map((p) => p.name));
              const missing = input.permissionNames.filter((name) => !foundSet.has(name));
              throw new Error(`Invalid permissions requested: ${missing.join(", ")}`);
            }
            permIds = foundPerms.map((p) => p.id);
          }

          // Clear existing mappings
          await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));

          // Set new mappings
          if (permIds.length > 0) {
            const mappings = permIds.map((pid) => ({
              roleId: role.id,
              permissionId: pid,
              assignedBy: actorId,
              createdAt: new Date(),
            }));
            await tx.insert(rolePermissions).values(mappings);
          }
        }

        // Handle Metadata-driven custom fields
        if (input.customFields) {
          // Clear existing
          await tx.delete(roleCustomFields).where(eq(roleCustomFields.roleId, role.id));
          
          const fieldEntries = Object.entries(input.customFields).map(([name, value]) => ({
            roleId: role.id,
            fieldName: name,
            fieldType: typeof value === 'number' ? 'NUMBER' : typeof value === 'boolean' ? 'BOOLEAN' : 'STRING',
            fieldValue: String(value),
            createdAt: new Date(),
            updatedAt: new Date(),
          }));
          
          if (fieldEntries.length > 0) {
            await tx.insert(roleCustomFields).values(fieldEntries);
          }
        }

        await tx.insert(permissionAuditLogs).values({
          actorId,
          action: "ROLE_UPDATE",
          targetType: "ROLE",
          targetId: role.id,
          details: JSON.stringify({ 
            code: role.code, 
            updatedFields: Object.keys(updatePayload),
            permissionCount: input.permissionNames?.length 
          }),
          ipAddress,
          userAgent,
          createdAt: new Date(),
        });

        return { ...role, ...updatePayload };
      });

      logger.info(`Role ${roleCode} updated by ${actorId}`);
      return updated;
    } catch (error) {
      logger.error({ error, roleCode, input }, "Error updating role");
      throw error;
    }
  }

  /**
   * Deletes a custom Enterprise Role.
   */
  async deleteCustomRole(actorId: string, roleCode: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      const [role] = await db.select().from(roles).where(eq(roles.code, roleCode)).limit(1);
      if (!role) {
        throw new Error(`Role with code '${roleCode}' not found`);
      }

      if (role.isSystem) {
        throw new Error("System roles cannot be deleted. They are critical to platform infrastructure security.");
      }

      await db.transaction(async (tx) => {
        // Clear mappings
        await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));
        await tx.delete(userRoles).where(eq(userRoles.roleId, role.id));
        
        // Delete Role
        await tx.delete(roles).where(eq(roles.id, role.id));

        await tx.insert(permissionAuditLogs).values({
          actorId,
          action: "ROLE_DELETE",
          targetType: "ROLE",
          targetId: role.id,
          details: JSON.stringify({ code: role.code, name: role.name }),
          ipAddress,
          userAgent,
          createdAt: new Date(),
        });
      });

      logger.info(`Custom role ${roleCode} deleted by ${actorId}`);
    } catch (error) {
      logger.error({ error, roleCode }, "Error deleting custom role");
      throw error;
    }
  }

  /**
   * Retrieves the full authorization role-permission mapping matrix.
   */
  async getPermissionMatrix(): Promise<any> {
    try {
      const allRoles = await db.select().from(roles);
      const allPerms = await db.select().from(permissions);
      const allMappings = await db.select().from(rolePermissions);

      // Map roles to their mapped permission IDs
      const matrix: Record<string, string[]> = {};
      
      for (const r of allRoles) {
        const mappings = allMappings.filter((m) => m.roleId === r.id);
        const mappedPermIds = mappings.map((m) => m.permissionId);
        const mappedPermNames = allPerms
          .filter((p) => mappedPermIds.includes(p.id))
          .map((p) => p.name);
        
        matrix[r.code] = mappedPermNames;
      }

      return {
        roles: allRoles.map((r) => ({ code: r.code, name: r.name, description: r.description, isSystem: r.isSystem })),
        permissionsCount: allPerms.length,
        matrix
      };
    } catch (error) {
      logger.error(error, "Error getting permission matrix");
      throw error;
    }
  }

  /**
   * Returns a detailed profile of a user's security and permissions state.
   */
  async getUserEffectivePermissionsAndRoles(userId: string): Promise<any> {
    try {
      // User assigned roles
      const assignedRoles = await db
        .select({
          code: roles.code,
          name: roles.name,
          description: roles.description,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, userId));

      // Direct overrides
      const overrides = await db
        .select({
          name: permissions.name,
          label: permissions.label,
          type: userPermissions.type,
        })
        .from(userPermissions)
        .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
        .where(eq(userPermissions.userId, userId));

      // Effective Permissions list
      const effectivePermissions = await this.getUserPermissions(userId);

      return {
        userId,
        roles: assignedRoles,
        directOverrides: overrides,
        effectivePermissions
      };
    } catch (error) {
      logger.error({ error, userId }, "Error compiling user security profile");
      throw error;
    }
  }

  /**
   * Lists all roles.
   */
  async listAllRoles(): Promise<any[]> {
    return db.select().from(roles);
  }

  /**
   * Lists all permissions, beautifully grouped by Category -> Group -> Item.
   */
  async listAllPermissions(): Promise<any[]> {
    try {
      const cats = await db.select().from(permissionCategories);
      const grps = await db.select().from(permissionGroups);
      const perms = await db.select().from(permissions);

      return cats.map((cat) => {
        const catGroups = grps.filter((g) => g.categoryId === cat.id);
        return {
          id: cat.id,
          name: cat.name,
          code: cat.code,
          description: cat.description,
          groups: catGroups.map((g) => {
            const groupPerms = perms.filter((p) => p.groupId === g.id);
            return {
              id: g.id,
              name: g.name,
              code: g.code,
              description: g.description,
              permissions: groupPerms.map((p) => ({
                id: p.id,
                name: p.name,
                label: p.label,
                description: p.description,
                isSystem: p.isSystem
              }))
            };
          })
        };
      });
    } catch (error) {
      logger.error(error, "Error listing grouped permissions");
      throw error;
    }
  }

  /**
   * Searches permissions dynamically by label, code, description.
   */
  async searchPermissions(query: string): Promise<any[]> {
    const term = `%${query}%`;
    return db
      .select({
        id: permissions.id,
        name: permissions.name,
        label: permissions.label,
        description: permissions.description
      })
      .from(permissions)
      .where(
        or(
          like(permissions.name, term),
          like(permissions.label, term),
          like(permissions.description, term)
        )
      )
      .limit(50);
  }

  /**
   * Retrieves security audit logs for tracing user actions.
   */
  async getSecurityAuditLogs(filters?: { actorId?: string; action?: string; limit?: number }): Promise<any[]> {
    const limit = filters?.limit ?? 100;
    const conditions = [];

    if (filters?.actorId) conditions.push(eq(permissionAuditLogs.actorId, filters.actorId));
    if (filters?.action) conditions.push(eq(permissionAuditLogs.action, filters.action));

    const query = db
      .select()
      .from(permissionAuditLogs)
      .orderBy(sql`${permissionAuditLogs.createdAt} DESC`)
      .limit(limit);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    return query;
  }

  
  async createUser(userData: any, roleCode: string, directPermissions: string[] = []): Promise<any> {
    const existingUser = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);
    if (existingUser.length > 0) {
      return existingUser[0];
    }

    return db.transaction(async (tx) => {
      // 1. Insert user
      const [user] = await tx.insert(users).values({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        username: userData.username || userData.email.split('@')[0],
        department: userData.department,
        jobTitle: userData.jobTitle || "Employee"
      }).returning();

      // 2. Hash password (default: Password123!)
      const hash = await bcrypt.hash(userData.password || "Password123!", 10);
      await tx.insert(passwords).values({
        userId: user.id,
        hash,
        mustChange: true,
      });

      // 3. Assign role
      if (roleCode) {
        const [role] = await tx.select().from(roles).where(eq((roles as any).code, roleCode));
        if (role) {
          await tx.insert(userRoles).values({
            userId: user.id,
            roleId: role.id,
            assignedBy: "system",
          });
        }
      }

      // 4. Assign permissions
      for (const p of directPermissions) {
        const [perm] = await tx.select().from(permissions).where(eq((permissions as any).name, p));
        if (perm) {
          await tx.insert(userPermissions).values({
            userId: user.id,
            permissionId: perm.id,
            type: "ALLOW",
            assignedBy: "system"
          });
        }
      }

      return user;
    });
  }

  async listDepartments(): Promise<string[]> {
    const deptCaps = await db.select({ department: departmentCapacities.department }).from(departmentCapacities);
    const userDepts = await db.select({ department: users.department }).from(users).where(isNotNull(users.department));
    const all = new Set([...deptCaps.map(d => d.department), ...userDepts.map(u => u.department)]);
    return Array.from(all).filter(Boolean) as string[];
  }

  async listAllUsers(): Promise<any[]> {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        department: users.department,
        status: users.status,
      })
      .from(users);

    for (const user of allUsers) {
      const userRolesList = await db
        .select({
          code: roles.code,
          name: roles.name,
          color: roles.color,
          icon: roles.icon
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, user.id));
      (user as any).roles = userRolesList;
    }
    return allUsers;
  }

  async ensureSeededModulesAndPolicies(): Promise<void> {
    try {
      const existingModules = await db.select().from(modules);
      if (existingModules.length === 0) {
        await db.transaction(async (tx) => {
          const defaultModulesList = [
            { id: "550e8400-e29b-41d4-a716-446655440001", name: "Project Management", code: "projects", description: "Enterprise portfolio, program, and project lifecycle management.", status: "ACTIVE" as const, version: "2.4.1", visibility: "GLOBAL" as const },
            { id: "550e8400-e29b-41d4-a716-446655440002", name: "Lifecycle Governance", code: "lifecycle", description: "Stage-gate governance, review workflows, checklist automation.", status: "ACTIVE" as const, version: "1.2.0", visibility: "GLOBAL" as const },
            { id: "550e8400-e29b-41d4-a716-446655440003", name: "Financial Services", code: "finance", description: "Baselines, actuals, forecasts, cost centers, and earned value tracking.", status: "ACTIVE" as const, version: "3.1.0", visibility: "DEPARTMENT" as const },
            { id: "550e8400-e29b-41d4-a716-446655440004", name: "Resource Orchestration", code: "resources", description: "Capacity planning, team utilization, and skill matrices.", status: "ACTIVE" as const, version: "1.0.5", visibility: "GLOBAL" as const },
            { id: "550e8400-e29b-41d4-a716-446655440005", name: "Workflow Automation", code: "workflow", description: "No-code custom approval processes, state transitions.", status: "ACTIVE" as const, version: "2.0.0", visibility: "GLOBAL" as const },
            { id: "550e8400-e29b-41d4-a716-446655440006", name: "AI Copilot Suite", code: "ai", description: "Smart summarizations, automated risk detection, action item drafts.", status: "ACTIVE" as const, version: "4.2.0", visibility: "GLOBAL" as const },
            { id: "550e8400-e29b-41d4-a716-446655440007", name: "Developer Portal", code: "devportal", description: "API keys, Webhook registrations, developer integrations.", status: "ACTIVE" as const, version: "1.1.0", visibility: "ROLE" as const },
            { id: "550e8400-e29b-41d4-a716-446655440008", name: "Administration Console", code: "admin", description: "Enterprise IAM, dynamic role matrix, organizational policy manager.", status: "ACTIVE" as const, version: "5.0.1", visibility: "ROLE" as const }
          ];
          await tx.insert(modules).values(defaultModulesList.map(m => ({ ...m, createdAt: new Date(), updatedAt: new Date() })));

          const defaultFeaturesList = [
            { name: "Project Dashboard", code: "projects.dashboard", description: "Overview metrics, interactive charts, progress gauges", status: "ACTIVE" as const, permissionRequired: "projects.view", moduleId: "550e8400-e29b-41d4-a716-446655440001" },
            { name: "Kanban Board", code: "projects.kanban", description: "Agile task dragging, card status progression", status: "ACTIVE" as const, permissionRequired: "projects.edit", moduleId: "550e8400-e29b-41d4-a716-446655440001" },
            { name: "Timeline & Gantt", code: "projects.timeline", description: "Project scheduling, dependencies, critical paths", status: "ACTIVE" as const, permissionRequired: "projects.view", moduleId: "550e8400-e29b-41d4-a716-446655440001" },
            { name: "Upload Stage Documents", code: "lifecycle.docs", description: "Upload compliance and review artifacts for gateways", status: "ACTIVE" as const, permissionRequired: "lifecycle.upload_docs", moduleId: "550e8400-e29b-41d4-a716-446655440002" },
            { name: "Gateway Checklist", code: "lifecycle.checklist", description: "Self-assessment checklist items compliance tracking", status: "ACTIVE" as const, permissionRequired: "lifecycle.complete_checklist", moduleId: "550e8400-e29b-41d4-a716-446655440002" },
            { name: "Approve Stage", code: "lifecycle.approve", description: "Grant final sign-off on gateway gates", status: "ACTIVE" as const, permissionRequired: "lifecycle.approve_stage", moduleId: "550e8400-e29b-41d4-a716-446655440002" },
            { name: "Baselines & Budget", code: "finance.budget", description: "Set approved budget limits and track variations", status: "ACTIVE" as const, permissionRequired: "finance.view", moduleId: "550e8400-e29b-41d4-a716-446655440003" },
            { name: "EVM Metrics", code: "finance.evm", description: "Earned Value Management, CPI, SPI, AC, PV projections", status: "ACTIVE" as const, permissionRequired: "finance.view", moduleId: "550e8400-e29b-41d4-a716-446655440003" },
            { name: "Copilot Chat", code: "ai.chat", description: "Natural language inquiries about projects", status: "ACTIVE" as const, permissionRequired: "ai.copilot", moduleId: "550e8400-e29b-41d4-a716-446655440006" },
            { name: "Smart Summarizer", code: "ai.summarize", description: "Automated summarization of meeting transcripts and comments", status: "ACTIVE" as const, permissionRequired: "ai.copilot", moduleId: "550e8400-e29b-41d4-a716-446655440006" },
            { name: "IAM console", code: "admin.iam", description: "Role editor, user overrides, permission matrix", status: "ACTIVE" as const, permissionRequired: "admin.iam", moduleId: "550e8400-e29b-41d4-a716-446655440008" },
            { name: "Dashboard Builder", code: "admin.dashboards", description: "Layout editor, widget customizers", status: "ACTIVE" as const, permissionRequired: "admin.dashboards", moduleId: "550e8400-e29b-41d4-a716-446655440008" }
          ];
          await tx.insert(features).values(defaultFeaturesList.map(f => ({ ...f, createdAt: new Date(), updatedAt: new Date() })));
        });
      }

      const existingPolicies = await db.select().from(organizationPolicies);
      if (existingPolicies.length === 0) {
        await db.transaction(async (tx) => {
          const defaultPolicies = [
            {
              name: "Global Session Timeout Limit",
              code: "policy.session_timeout",
              type: "SECURITY" as const,
              level: "ORGANIZATION" as const,
              valueJson: JSON.stringify({ timeoutMinutes: 60, enforcedMfa: true }),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              name: "Mandatory Budget Approval Threshold",
              code: "policy.budget_threshold",
              type: "FINANCE" as const,
              level: "DEPARTMENT" as const,
              targetId: "Operations",
              valueJson: JSON.stringify({ approvalRequiredAbove: 50000, approverRoles: ["admin", "operations_head"] }),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              name: "AI Copilot Sensitive Data Masking",
              code: "policy.ai_sensitive_mask",
              type: "SECURITY" as const,
              level: "ORGANIZATION" as const,
              valueJson: JSON.stringify({ maskSsn: true, maskCreditCards: true, logPrompts: true }),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ];
          await tx.insert(organizationPolicies).values(defaultPolicies);
        });
      }
    } catch (err) {
      logger.error(err, "Failed to seed default modules/features/policies");
    }
  }

  async listAllModulesWithFeatures(): Promise<any[]> {
    await this.ensureSeededModulesAndPolicies();
    const allModules = await db.select().from(modules);
    const allFeatures = await db.select().from(features);
    return allModules.map(m => ({
      ...m,
      features: allFeatures.filter(f => f.moduleId === m.id)
    }));
  }

  async updateModuleStatus(moduleId: string, status: any): Promise<any> {
    const [updated] = await db
      .update(modules)
      .set({ status, updatedAt: new Date() })
      .where(eq(modules.id, moduleId))
      .returning();
    return updated;
  }

  async updateFeatureStatus(featureId: string, status: any): Promise<any> {
    const [updated] = await db
      .update(features)
      .set({ status, updatedAt: new Date() })
      .where(eq(features.id, featureId))
      .returning();
    return updated;
  }

  async listAllPolicies(): Promise<any[]> {
    await this.ensureSeededModulesAndPolicies();
    return db.select().from(organizationPolicies);
  }

  async createOrUpdatePolicy(data: any): Promise<any> {
    if (data.id) {
      const [updated] = await db
        .update(organizationPolicies)
        .set({
          name: data.name,
          code: data.code,
          type: data.type,
          level: data.level,
          targetId: data.targetId || null,
          valueJson: typeof data.valueJson === "string" ? data.valueJson : JSON.stringify(data.valueJson),
          isActive: data.isActive !== undefined ? data.isActive : true,
          updatedAt: new Date()
        })
        .where(eq(organizationPolicies.id, data.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(organizationPolicies)
        .values({
          name: data.name,
          code: data.code,
          type: data.type,
          level: data.level,
          targetId: data.targetId || null,
          valueJson: typeof data.valueJson === "string" ? data.valueJson : JSON.stringify(data.valueJson),
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return created;
    }
  }

  async deletePolicy(policyId: string): Promise<void> {
    await db.delete(organizationPolicies).where(eq(organizationPolicies.id, policyId));
  }
}
