import { db } from "../../../shared/database";
import { 
  users, userRoles, roles, permissions, rolePermissions, 
  projects, tasks, risksAndIssues, auditLogs, 
  chatMessages, changeRequests, securityAuditLogs, loginHistory,
  resources, resourceAllocations, passwords, userPermissions,
  passwordHistory, refreshTokens, deviceSessions, passwordResetTokens,
  emailVerificationTokens, userDashboardPreferences
} from "../../../db/schema.ts";
import { eq, and, or, ilike, desc, asc, count, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { UserSearchFilters } from "../application/user.dto";

export class UserRepository {
  async findAll(filters: UserSearchFilters) {
    const { 
      search, department, status, role, 
      page = 1, limit = 10, 
      sortBy = 'createdAt', sortOrder = 'desc' 
    } = filters;

    const offset = (page - 1) * limit;
    
    let query = db.select().from(users);
    
    const conditions = [isNull(users.deletedAt)];
    if (search) {
      conditions.push(
        or(
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.username, `%${search}%`)
        )
      );
    }
    
    if (department) {
      conditions.push(eq(users.department, department));
    }
    
    if (status) {
      conditions.push(eq(users.status, status as any));
    }

    if (role) {
      // Join with userRoles and roles
      const subquery = db.select({ userId: userRoles.userId })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(roles.code, role));
      
      conditions.push(inArray(users.id, subquery));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // @ts-ignore
    const dataQuery = db.select().from(users).where(whereClause);
    
    // Sorting
    const sortField = (users as any)[sortBy] || users.createdAt;
    const sortedQuery = sortOrder === 'asc' ? dataQuery.orderBy(asc(sortField)) : dataQuery.orderBy(desc(sortField));
    
    const data = await sortedQuery.limit(limit).offset(offset);
    
    // Count total
    const [totalResult] = await db.select({ value: count() }).from(users).where(whereClause);
    const total = Number(totalResult.value);

    return { data, total };
  }

  async findById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async listDepartments() {
    const result = await db.select({ department: users.department })
      .from(users)
      .where(isNotNull(users.department))
      .groupBy(users.department);
    return result.map(r => r.department);
  }

  async findUserRoles(userId: string) {
    return await db.select({
      id: roles.id,
      name: roles.name,
      code: roles.code,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
  }

  async findUserPermissions(userId: string) {
    // Get permissions through roles
    const rolePerms = await db.select({
      name: permissions.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId));

    return Array.from(new Set(rolePerms.map(p => p.name)));
  }

  async findUserProjects(userId: string) {
    // Deep search: find projects where user is manager OR allocated as a resource
    const resourceIdsSubquery = db.select({ id: resources.id })
      .from(resources)
      .where(eq(resources.userId, userId));

    const allocatedProjectsSubquery = db.select({ projectId: resourceAllocations.projectId })
      .from(resourceAllocations)
      .where(inArray(resourceAllocations.resourceId, resourceIdsSubquery));

    return await db.select().from(projects)
      .where(
        or(
          eq(projects.managerId, userId),
          inArray(projects.id, allocatedProjectsSubquery)
        )
      );
  }

  async findUserTasks(userId: string) {
    // Deep search: find tasks where user is assignee OR linked via resourceId
    const resourceIdsSubquery = db.select({ id: sql<string>`cast(${resources.id} as text)` })
      .from(resources)
      .where(eq(resources.userId, userId));

    return await db.select().from(tasks)
      .where(
        or(
          eq(tasks.assigneeId, userId),
          inArray(tasks.assigneeId, resourceIdsSubquery)
        )
      );
  }

  async findUserRisksAndIssues(userId: string) {
    return await db.select().from(risksAndIssues).where(eq(risksAndIssues.ownerId, userId));
  }

  async findUserAuditLogs(userId: string) {
    return await db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.createdAt)).limit(50);
  }

  async findUserChatMessages(userId: string) {
    return await db.select().from(chatMessages).where(eq(chatMessages.authorId, userId)).orderBy(desc(chatMessages.createdAt)).limit(50);
  }

  async findUserChangeRequests(userId: string) {
    return await db.select().from(changeRequests).where(eq(changeRequests.createdBy, userId));
  }

  async findUserSecurityLogs(userId: string) {
    return await db.select().from(securityAuditLogs).where(eq(securityAuditLogs.userId, userId as any)).orderBy(desc(securityAuditLogs.createdAt)).limit(50);
  }

  async findUserLoginHistory(userId: string) {
    return await db.select().from(loginHistory).where(eq(loginHistory.userId, userId as any)).orderBy(desc(loginHistory.createdAt)).limit(50);
  }

  async findUserResources(userId: string) {
    return await db.select().from(resources).where(eq(resources.userId, userId));
  }

  async findUserMilestones(userId: string) {
    // Milestones are stored in projects table as JSON
    const userProjects = await this.findUserProjects(userId);
    const milestones: any[] = [];
    
    userProjects.forEach(project => {
      if (project.milestonesJson) {
        try {
          const projectMilestones = JSON.parse(project.milestonesJson);
          if (Array.isArray(projectMilestones)) {
            projectMilestones.forEach(m => {
              milestones.push({
                ...m,
                projectId: project.id,
                projectName: project.name
              });
            });
          }
        } catch (e) {
          console.error("Failed to parse milestones JSON for project", project.id);
        }
      }
    });
    
    return milestones;
  }

  async listManagers() {
    // Managers are often defined by a role or specific field, for now just list those in projects
    // or those with 'manager' in jobTitle
    return await db.select()
      .from(users)
      .where(or(
        ilike(users.jobTitle, '%Manager%'),
        ilike(users.jobTitle, '%Director%'),
        ilike(users.jobTitle, '%Lead%')
      ));
  }

  async createUser(userData: any, passwordHash: string, roleCode?: string, directPermissions: string[] = []) {
    return await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        username: userData.username || userData.email.split('@')[0],
        phoneNumber: userData.phoneNumber || null,
        employeeId: userData.employeeId || null,
        department: userData.department || null,
        jobTitle: userData.jobTitle || null,
        organization: userData.organization || null,
        status: userData.status || "ACTIVE",
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      await tx.insert(passwords).values({
        userId: user.id,
        hash: passwordHash,
        mustChange: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (roleCode) {
        const [role] = await tx.select().from(roles).where(eq(roles.code, roleCode)).limit(1);
        if (role) {
          await tx.insert(userRoles).values({
            userId: user.id,
            roleId: role.id,
            assignedBy: "system",
            createdAt: new Date(),
          });
        }
      }

      for (const permName of directPermissions) {
        const [perm] = await tx.select().from(permissions).where(eq(permissions.name, permName)).limit(1);
        if (perm) {
          await tx.insert(userPermissions).values({
            userId: user.id,
            permissionId: perm.id,
            type: "ALLOW",
            assignedBy: "system",
            createdAt: new Date(),
          });
        }
      }

      return user;
    });
  }

  async updateUser(id: string, userData: any) {
    return await db.transaction(async (tx) => {
      const updateData: any = {};
      if (userData.firstName !== undefined) updateData.firstName = userData.firstName;
      if (userData.lastName !== undefined) updateData.lastName = userData.lastName;
      if (userData.email !== undefined) updateData.email = userData.email;
      if (userData.username !== undefined) updateData.username = userData.username;
      if (userData.phoneNumber !== undefined) updateData.phoneNumber = userData.phoneNumber;
      if (userData.employeeId !== undefined) updateData.employeeId = userData.employeeId;
      if (userData.department !== undefined) updateData.department = userData.department;
      if (userData.jobTitle !== undefined) updateData.jobTitle = userData.jobTitle;
      if (userData.organization !== undefined) updateData.organization = userData.organization;
      if (userData.status !== undefined) updateData.status = userData.status;
      if (userData.isActive !== undefined) updateData.isActive = userData.isActive;
      
      updateData.updatedAt = new Date();

      const [updatedUser] = await tx.update(users)
        .set(updateData)
        .where(and(eq(users.id, id), isNull(users.deletedAt)))
        .returning();

      if (userData.role !== undefined) {
        await tx.delete(userRoles).where(eq(userRoles.userId, id));
        if (userData.role) {
          const [role] = await tx.select().from(roles).where(eq(roles.code, userData.role)).limit(1);
          if (role) {
            await tx.insert(userRoles).values({
              userId: id,
              roleId: role.id,
              assignedBy: "system",
              createdAt: new Date(),
            });
          }
        }
      }

      if (userData.permissions !== undefined) {
        await tx.delete(userPermissions).where(eq(userPermissions.userId, id));
        for (const permName of userData.permissions) {
          const [perm] = await tx.select().from(permissions).where(eq(permissions.name, permName)).limit(1);
          if (perm) {
            await tx.insert(userPermissions).values({
              userId: id,
              permissionId: perm.id,
              type: "ALLOW",
              assignedBy: "system",
              createdAt: new Date(),
            });
          }
        }
      }

      return updatedUser;
    });
  }

  async deleteUser(id: string, permanent: boolean = false, actorId?: string) {
    if (permanent) {
      return await db.transaction(async (tx) => {
        // Clear references in resources
        await tx.update(resources).set({ userId: null }).where(eq(resources.userId, id));

        // Delete child relations
        await tx.delete(userRoles).where(eq(userRoles.userId, id));
        await tx.delete(userPermissions).where(eq(userPermissions.userId, id));
        await tx.delete(passwords).where(eq(passwords.userId, id));
        await tx.delete(passwordHistory).where(eq(passwordHistory.userId, id));
        await tx.delete(refreshTokens).where(eq(refreshTokens.userId, id));
        await tx.delete(deviceSessions).where(eq(deviceSessions.userId, id));
        await tx.delete(loginHistory).where(eq(loginHistory.userId, id));
        await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, id));
        await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, id));
        await tx.delete(userDashboardPreferences).where(eq(userDashboardPreferences.userId, id));

        // Finally delete user
        const [deleted] = await tx.delete(users).where(eq(users.id, id)).returning();

        // Audit Log
        if (actorId) {
          await tx.insert(securityAuditLogs).values({
            userId: id as any,
            actorId: actorId,
            action: "USER_PERMANENT_DELETE",
            details: { permanent: true },
            createdAt: new Date(),
          });
        }

        return deleted;
      });
    } else {
      return await db.transaction(async (tx) => {
        const [softDeleted] = await tx.update(users)
          .set({ deletedAt: new Date(), isActive: false, status: "INACTIVE" as any })
          .where(eq(users.id, id))
          .returning();

        if (actorId && softDeleted) {
          await tx.insert(securityAuditLogs).values({
            userId: id as any,
            actorId: actorId,
            action: "USER_SOFT_DELETE",
            details: { permanent: false },
            createdAt: new Date(),
          });
        }
        return softDeleted;
      });
    }
  }

  async updateUserStatus(id: string, status: string, isActive: boolean, isLocked?: boolean, actorId?: string) {
    return await db.transaction(async (tx) => {
      const updateData: any = { status, isActive, updatedAt: new Date() };
      if (isLocked !== undefined) updateData.isLocked = isLocked;
      
      const [updated] = await tx.update(users)
        .set(updateData)
        .where(and(eq(users.id, id), isNull(users.deletedAt)))
        .returning();

      if (actorId && updated) {
        await tx.insert(securityAuditLogs).values({
          userId: id as any,
          actorId: actorId,
          action: "USER_STATUS_UPDATE",
          details: { status, isActive, isLocked },
          createdAt: new Date(),
        });
      }
      return updated;
    });
  }

  async activateUser(id: string, actorId?: string) {
    return this.updateUserStatus(id, "ACTIVE", true, false, actorId);
  }

  async deactivateUser(id: string, actorId?: string) {
    return this.updateUserStatus(id, "INACTIVE", false, undefined, actorId);
  }

  async suspendUser(id: string, actorId?: string) {
    // Assuming INACTIVE or a new status if we want to distinguish suspension
    return this.updateUserStatus(id, "INACTIVE", false, undefined, actorId);
  }

  async lockUser(id: string, actorId?: string) {
    return this.updateUserStatus(id, "LOCKED", false, true, actorId);
  }

  async unlockUser(id: string, actorId?: string) {
    return this.updateUserStatus(id, "ACTIVE", true, false, actorId);
  }

  async updateUserRoles(userId: string, roleCodes: string[]) {
    return await db.transaction(async (tx) => {
      await tx.delete(userRoles).where(eq(userRoles.userId, userId));
      
      for (const code of roleCodes) {
        const [role] = await tx.select().from(roles).where(eq(roles.code, code)).limit(1);
        if (role) {
          await tx.insert(userRoles).values({
            userId,
            roleId: role.id,
            assignedBy: "system",
            createdAt: new Date(),
          });
        }
      }
      return true;
    });
  }

  async updateUserPermissions(userId: string, permissionNames: string[]) {
    return await db.transaction(async (tx) => {
      await tx.delete(userPermissions).where(eq(userPermissions.userId, userId));
      
      for (const name of permissionNames) {
        const [perm] = await tx.select().from(permissions).where(eq(permissions.name, name)).limit(1);
        if (perm) {
          await tx.insert(userPermissions).values({
            userId,
            permissionId: perm.id,
            type: "ALLOW",
            assignedBy: "system",
            createdAt: new Date(),
          });
        }
      }
      return true;
    });
  }

  async updatePassword(userId: string, hash: string) {
    const [updated] = await db.update(passwords)
      .set({ hash, updatedAt: new Date() })
      .where(eq(passwords.userId, userId))
      .returning();
    return updated;
  }
}
