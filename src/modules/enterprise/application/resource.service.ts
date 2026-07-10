import { eq, and, or, lte, gte } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import {
  resources,
  resourceAllocations,
  resourceSkills,
  resourceCertifications,
  resourceCalendars,
  departmentCapacities,
  projects
} from "../../../db/schema.ts";
import { NotFoundError, ValidationError } from "../../../shared/infrastructure/errors.ts";
import { AuditLogger } from "../../../shared/infrastructure/audit-logger.ts";
import { eventBus } from "../../../shared/domain/event-bus.ts";

export class ResourceService {
  // 1. Core Resource Management
  async createResource(
    actorId: string,
    data: { name: string; type: "EMPLOYEE" | "CONTRACTOR"; department?: string; costPerHour?: string; status?: "ACTIVE" | "ON_LEAVE" | "INACTIVE" }
  ): Promise<any> {
    const [resource] = await db
      .insert(resources)
      .values({
        name: data.name,
        type: data.type,
        department: data.department || null,
        costPerHour: data.costPerHour ? data.costPerHour.toString() : null,
        status: data.status || "ACTIVE",
      })
      .returning();

    await AuditLogger.log(null, actorId, "RESOURCE_CREATED", "RESOURCE", resource.id, data);
    return resource;
  }

  async getResource(id: string): Promise<any> {
    const [resource] = await db.select().from(resources).where(eq(resources.id, id)).limit(1);
    if (!resource) throw new NotFoundError("Resource");

    const skills = await db.select().from(resourceSkills).where(eq(resourceSkills.resourceId, id));
    const certs = await db.select().from(resourceCertifications).where(eq(resourceCertifications.resourceId, id));
    const calendar = await db.select().from(resourceCalendars).where(eq(resourceCalendars.resourceId, id));
    const allocations = await db.select().from(resourceAllocations).where(eq(resourceAllocations.resourceId, id));

    return {
      ...resource,
      skills,
      certifications: certs,
      calendar,
      allocations,
    };
  }

  async listResources(department?: string): Promise<any[]> {
    if (department) {
      return db.select().from(resources).where(eq(resources.department, department));
    }
    return db.select().from(resources);
  }

  // 2. Skills & Certifications
  async addResourceSkill(actorId: string, resourceId: string, data: { skill: string; proficiencyLevel: "BEGINNER" | "INTERMEDIATE" | "EXPERT" }): Promise<any> {
    const [skill] = await db.insert(resourceSkills).values({ resourceId, ...data }).returning();
    await AuditLogger.log(null, actorId, "RESOURCE_SKILL_ADDED", "RESOURCE", resourceId, data);
    return skill;
  }

  async addResourceCertification(actorId: string, resourceId: string, data: { certificationName: string; issuingOrganization?: string; expiryDate?: string }): Promise<any> {
    const [cert] = await db
      .insert(resourceCertifications)
      .values({
        resourceId,
        certificationName: data.certificationName,
        issuingOrganization: data.issuingOrganization || null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      })
      .returning();
    await AuditLogger.log(null, actorId, "RESOURCE_CERT_ADDED", "RESOURCE", resourceId, data);
    return cert;
  }

  // 3. Resource Calendars / Leave
  async addCalendarEvent(actorId: string, resourceId: string | null, data: { eventType: string; description?: string; startDate: string; endDate: string; workingHoursPerDay?: number }): Promise<any> {
    const [event] = await db
      .insert(resourceCalendars)
      .values({
        resourceId,
        eventType: data.eventType,
        description: data.description || null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        workingHoursPerDay: data.workingHoursPerDay || 8,
      })
      .returning();
    await AuditLogger.log(null, actorId, "RESOURCE_CALENDAR_EVENT_ADDED", "RESOURCE_CALENDAR", event.id, data);
    return event;
  }

  // 4. Resource Allocation
  async allocateResource(
    actorId: string,
    data: { resourceId: string; projectId: string; startDate: string; endDate?: string; allocationPercentage: number }
  ): Promise<any> {
    // Check if resource and project exists
    const [resource] = await db.select().from(resources).where(eq(resources.id, data.resourceId)).limit(1);
    if (!resource) throw new NotFoundError("Resource");

    const [project] = await db.select().from(projects).where(eq(projects.id, data.projectId)).limit(1);
    if (!project) throw new NotFoundError("Project");

    // 1. Conflict and Over-allocation check
    // Sum allocation percentages during overlapping start dates
    const startObj = new Date(data.startDate);
    const endObj = data.endDate ? new Date(data.endDate) : null;

    const existingAllocations = await db
      .select()
      .from(resourceAllocations)
      .where(eq(resourceAllocations.resourceId, data.resourceId));

    let totalOverlapPercentage = data.allocationPercentage;
    let conflicts: any[] = [];

    for (const alloc of existingAllocations) {
      const allocStart = new Date(alloc.startDate);
      const allocEnd = alloc.endDate ? new Date(alloc.endDate) : null;

      // Overlap logic
      const startsBeforeOrOn = allocStart <= (endObj || new Date(9999, 11, 31));
      const endsAfterOrOn = !allocEnd || allocEnd >= startObj;

      if (startsBeforeOrOn && endsAfterOrOn) {
        totalOverlapPercentage += alloc.allocationPercentage;
        conflicts.push(alloc);
      }
    }

    const [allocation] = await db
      .insert(resourceAllocations)
      .values({
        resourceId: data.resourceId,
        projectId: data.projectId,
        startDate: startObj,
        endDate: endObj,
        allocationPercentage: data.allocationPercentage,
      })
      .returning();

    // Trigger Over-allocation Event
    if (totalOverlapPercentage > 100) {
      eventBus.publish("resource.overallocated", {
        resourceId: data.resourceId,
        allocationId: allocation.id,
        currentTotalPercentage: totalOverlapPercentage,
        conflicts,
      });
      await AuditLogger.log(project.id, actorId, "RESOURCE_OVERALLOCATED", "RESOURCE", data.resourceId, {
        allocationId: allocation.id,
        currentTotalPercentage: totalOverlapPercentage,
      });
    }

    eventBus.publish("resource.assigned", allocation);
    await AuditLogger.log(project.id, actorId, "RESOURCE_ALLOCATED", "RESOURCE", data.resourceId, data);
    return { allocation, isOverAllocated: totalOverlapPercentage > 100, currentTotalPercentage: totalOverlapPercentage };
  }

  async releaseResource(actorId: string, allocationId: string): Promise<any> {
    const [allocation] = await db.select().from(resourceAllocations).where(eq(resourceAllocations.id, allocationId)).limit(1);
    if (!allocation) throw new NotFoundError("Allocation");

    await db.delete(resourceAllocations).where(eq(resourceAllocations.id, allocationId));
    await AuditLogger.log(allocation.projectId, actorId, "RESOURCE_RELEASED", "RESOURCE", allocation.resourceId, { allocationId });
    return { success: true };
  }

  // 5. Capacity Planning
  async setDepartmentCapacity(actorId: string, data: { department: string; totalHeads: number; availableHoursPerMonth: number; targetUtilization?: number }): Promise<any> {
    const [existing] = await db.select().from(departmentCapacities).where(eq(departmentCapacities.department, data.department)).limit(1);
    
    let capacity;
    if (existing) {
      [capacity] = await db
        .update(departmentCapacities)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(departmentCapacities.department, data.department))
        .returning();
    } else {
      [capacity] = await db.insert(departmentCapacities).values(data).returning();
    }

    await AuditLogger.log(null, actorId, "DEPARTMENT_CAPACITY_UPDATED", "CAPACITY", capacity.id, data);
    return capacity;
  }

  async getCapacityDashboard(): Promise<any> {
    const capacities = await db.select().from(departmentCapacities);
    const allResources = await db.select().from(resources).where(eq(resources.status, "ACTIVE"));
    const allocations = await db.select().from(resourceAllocations);

    // Roll up actual active headcount and allocations per department
    const deptStats = capacities.map((cap) => {
      const deptResources = allResources.filter((r) => r.department === cap.department);
      const headcount = deptResources.length;

      // Filter active allocations for this department resources
      const deptAllocations = allocations.filter((a) => {
        const res = deptResources.find((r) => r.id === a.resourceId);
        return !!res;
      });

      // Sum allocations percentage to estimate current utilization %
      let totalAllocatedPercentage = 0;
      deptAllocations.forEach((alloc) => {
        totalAllocatedPercentage += alloc.allocationPercentage;
      });

      const avgUtilization = headcount > 0 ? totalAllocatedPercentage / headcount : 0;
      const hoursAvailable = headcount * 160; // 160 hours standard work month
      const hoursAllocated = (totalAllocatedPercentage / 100) * 160;

      return {
        department: cap.department,
        configuredHeads: cap.totalHeads,
        actualHeadcount: headcount,
        configuredAvailableHours: cap.availableHoursPerMonth,
        actualAvailableHours: hoursAvailable,
        allocatedHours: hoursAllocated,
        utilizationPercentage: parseFloat(avgUtilization.toFixed(1)),
        targetUtilization: cap.targetUtilization,
        hiringRequirement: Math.max(0, cap.totalHeads - headcount),
      };
    });

    return {
      departments: deptStats,
      totalActiveResources: allResources.length,
      benchCount: allResources.filter((r) => {
        const activeAlloc = allocations.find((a) => a.resourceId === r.id);
        return !activeAlloc;
      }).length,
    };
  }
}
