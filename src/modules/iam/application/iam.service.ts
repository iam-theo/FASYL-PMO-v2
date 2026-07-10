import { db } from "../../../shared/database";
import { users } from "../../../db/iam.schema";
import { 
  roles, permissions, rolePermissions, userRoles, 
  organizationPolicies, genericStatusEnum 
} from "../../../db/schema";
import { eq, and, or, inArray, desc, isNotNull } from "drizzle-orm";

export class IAMService {
  /**
   * Calculates effective permissions for a user across all roles and policies.
   * This engine accounts for:
   * 1. Multiple roles assigned to a user
   * 2. Permission overrides (Allow/Deny)
   * 3. Organization, Department, and Business Unit level policies
   */
  static async getEffectivePermissions(userId: string) {
    // 1. Fetch user roles
    const userRoleMappings = await db.select()
      .from(userRoles)
      .where(eq(userRoles.userId, userId));
    
    if (userRoleMappings.length === 0) return [];

    const roleIds = userRoleMappings.map(r => r.roleId);

    // 2. Fetch permissions associated with these roles
    const grantedPermissions = await db.select({
      permissionName: permissions.name,
      permissionId: permissions.id,
      isSystem: permissions.isSystem
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(inArray(rolePermissions.roleId, roleIds));

    // 3. TODO: Apply Organization Policies and Direct User Overrides
    // For now, return role-based permissions
    return Array.from(new Set(grantedPermissions.map(p => p.permissionName)));
  }

  static async listUsers() {
    return await db.select().from(users).where(isNotNull(users.id)).orderBy(desc(users.createdAt));
  }

  static async getUserById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  static async createUser(data: any) {
    const [newUser] = await db.insert(users).values({
      ...data,
      status: "ACTIVE",
      isActive: true,
    }).returning();
    return newUser;
  }

  static async updateUser(id: string, data: any) {
    const [updatedUser] = await db.update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  static async deleteUser(id: string) {
    await db.update(users).set({ deletedAt: new Date(), isActive: false }).where(eq(users.id, id));
  }

  static async getRoles() {
    return await db.select().from(roles).where(eq(roles.status, "ACTIVE"));
  }

  static async createRole(data: any) {
    const [newRole] = await db.insert(roles).values({
      ...data,
      status: "ACTIVE",
    }).returning();
    return newRole;
  }

  static async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    // Clear existing
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    
    // Batch insert new
    if (permissionIds.length > 0) {
      await db.insert(rolePermissions).values(
        permissionIds.map(pid => ({
          roleId,
          permissionId: pid,
          isGrant: true
        }))
      );
    }
  }
}
