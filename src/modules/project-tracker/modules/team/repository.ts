import { dbState, generateUUID, saveDatabase, createNotification, createAuditLog } from "../../db.ts";
import { TeamMember } from "../../types.ts";
import { db } from "../../../../shared/database/index.ts";
import { eq } from "drizzle-orm";
import {
  resources as pgResourcesTable,
  resourceAllocations as pgResourceAllocationsTable
} from "../../../../db/schema.ts";

export class TeamRepository {
  /**
   * Find a team member by ID
   */
  async findById(id: string): Promise<TeamMember | null> {
    const member = dbState.teamMembers.find(t => t.id === id && !t.deletedAt);
    return member || null;
  }

  /**
   * Find a team member by Project and User ID
   */
  async findByProjectAndUser(projectId: string, userId: string): Promise<TeamMember | null> {
    const member = dbState.teamMembers.find(t => t.projectId === projectId && t.userId === userId && !t.deletedAt);
    return member || null;
  }

  /**
   * List all team members assigned to a specific project
   */
  async findByProject(projectId: string): Promise<TeamMember[]> {
    return dbState.teamMembers.filter(t => t.projectId === projectId && !t.deletedAt);
  }

  /**
   * Insert a new team member
   */
  async create(data: Partial<TeamMember>): Promise<TeamMember> {
    let resourceId = null;
    const isUserUuid = data.userId && data.userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    if (isUserUuid) {
      // 1. Check if a resource already exists for this userId
      const existingByUser = await db.select().from(pgResourcesTable).where(eq(pgResourcesTable.userId, data.userId!));
      if (existingByUser.length > 0) {
        resourceId = existingByUser[0].id;
      } else {
        // 2. Check if a resource already exists with this name (but no userId)
        const existingByName = await db.select().from(pgResourcesTable).where(eq(pgResourcesTable.name, data.name!));
        if (existingByName.length > 0) {
          // Link it to the user
          await db.update(pgResourcesTable).set({ userId: data.userId! }).where(eq(pgResourcesTable.id, existingByName[0].id));
          resourceId = existingByName[0].id;
        } else {
          // Create a new resource linked to this user
          const [newRes] = await db.insert(pgResourcesTable).values({
            userId: data.userId!,
            name: data.name!,
            type: "EMPLOYEE",
            department: data.role || "Team Member",
            costPerHour: "50.00",
            status: "ACTIVE"
          }).returning();
          resourceId = newRes.id;
        }
      }
    } else {
      // No valid user UUID, check by name
      const existingByName = await db.select().from(pgResourcesTable).where(eq(pgResourcesTable.name, data.name!));
      if (existingByName.length > 0) {
        resourceId = existingByName[0].id;
      } else {
        const [newRes] = await db.insert(pgResourcesTable).values({
          name: data.name!,
          type: "EMPLOYEE",
          department: data.role || "Team Member",
          costPerHour: "50.00",
          status: "ACTIVE"
        }).returning();
        resourceId = newRes.id;
      }
    }

    // Create allocation in Postgres
    const [newAlloc] = await db.insert(pgResourceAllocationsTable).values({
      resourceId: resourceId!,
      projectId: data.projectId!,
      startDate: new Date(),
      allocationPercentage: data.allocation !== undefined ? data.allocation : 100,
    }).returning();

    const newMember: TeamMember = {
      id: newAlloc.id,
      projectId: data.projectId!,
      userId: resourceId!,
      name: data.name!,
      email: data.email || `${data.name!.toLowerCase().replace(/\s+/g, ".")}@enterprise.com`,
      role: data.role || "Team Member",
      capacity: data.capacity !== undefined ? data.capacity : 40,
      allocation: data.allocation !== undefined ? data.allocation : 100,
      availability: "AVAILABLE",
      createdAt: newAlloc.createdAt.toISOString(),
      updatedAt: newAlloc.createdAt.toISOString(),
      deletedAt: null
    };

    dbState.teamMembers.push(newMember);
    saveDatabase();

    // Notify the user they have been assigned to the project
    if (data.userId && data.userId.trim() !== "") {
      const project = dbState.projects.find(p => p.id === data.projectId);
      const projectName = project ? project.name : "a new project";
      await createNotification(
        data.userId,
        "Project Assigned",
        `You have been assigned to the project "${projectName}" as a ${data.role || "Team Member"}.`,
        "SYSTEM"
      );
    }
    return newMember;
  }

  /**
   * Update an existing team member's configuration
   */
  async update(id: string, data: Partial<TeamMember>): Promise<TeamMember | null> {
    // Update resource_allocations in Postgres
    if (data.allocation !== undefined) {
      await db.update(pgResourceAllocationsTable)
        .set({
          allocationPercentage: data.allocation,
        })
        .where(eq(pgResourceAllocationsTable.id, id));
    }
    
    // Find resourceId to update resources department or capacity if role is provided
    const alloc = await db.select().from(pgResourceAllocationsTable).where(eq(pgResourceAllocationsTable.id, id));
    if (alloc.length > 0 && data.role) {
      await db.update(pgResourcesTable)
        .set({
          department: data.role,
        })
        .where(eq(pgResourcesTable.id, alloc[0].resourceId));
    }

    const index = dbState.teamMembers.findIndex(t => t.id === id && !t.deletedAt);
    if (index === -1) return null;

    dbState.teamMembers[index] = {
      ...dbState.teamMembers[index],
      ...data,
      updatedAt: new Date().toISOString()
    };

    saveDatabase();
    return dbState.teamMembers[index];
  }

  /**
   * Soft-delete a team member from a project
   */
  async delete(id: string): Promise<boolean> {
    // Delete allocation from Postgres
    await db.delete(pgResourceAllocationsTable).where(eq(pgResourceAllocationsTable.id, id));

    const index = dbState.teamMembers.findIndex(t => t.id === id && !t.deletedAt);
    if (index === -1) return false;

    dbState.teamMembers[index].deletedAt = new Date().toISOString();
    saveDatabase();
    return true;
  }
}
