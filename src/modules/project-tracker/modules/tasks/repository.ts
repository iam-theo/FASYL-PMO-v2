import { dbState, generateUUID, saveDatabase, createNotification, createAuditLog } from "../../db.ts";
import { Task, Subtask, Milestone, Dependency, TaskStatus } from "../../types.ts";
import { db } from "../../../../shared/database/index.ts";
import { eq, inArray } from "drizzle-orm";
import { tasks as pgTasksTable } from "../../../../db/schema.ts";
import { eventBus, DomainEvents } from "../../../notifications/domain/events.ts";

export class TasksRepository {
  // ==========================================
  // TASKS
  // ==========================================
  async findTaskById(id: string): Promise<Task | null> {
    return dbState.tasks.find(t => t.id === id && !t.deletedAt) || null;
  }

  async findTasksByProject(projectId: string, filters: any = {}): Promise<Task[]> {
    let list = dbState.tasks.filter(t => t.projectId === projectId && !t.deletedAt);

    if (filters.status) {
      list = list.filter(t => t.status === filters.status);
    }
    if (filters.priority) {
      list = list.filter(t => t.priority === filters.priority);
    }
    if (filters.assigneeId) {
      list = list.filter(t => t.assigneeId === filters.assigneeId);
    }
    if (filters.milestoneId) {
      list = list.filter(t => t.milestoneId === filters.milestoneId);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      list = list.filter(t => 
        t.title.toLowerCase().includes(searchLower) || 
        t.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort order
    if (filters.sortBy) {
      const field = filters.sortBy;
      const desc = filters.sortOrder === "desc";
      list.sort((a: any, b: any) => {
        if (a[field] < b[field]) return desc ? 1 : -1;
        if (a[field] > b[field]) return desc ? -1 : 1;
        return 0;
      });
    }

    return list;
  }

  async createTask(data: Partial<Task>): Promise<Task> {
    const id = generateUUID();
    let pgStatus: "DRAFT" | "ASSIGNED" | "IN_PROGRESS" | "BLOCKED" | "REVIEW" | "COMPLETED" | "ARCHIVED" = "ASSIGNED";
    if (data.status === TaskStatus.IN_REVIEW) {
      pgStatus = "REVIEW";
    } else if (data.status === TaskStatus.IN_PROGRESS) {
      pgStatus = "IN_PROGRESS";
    } else if (data.status === TaskStatus.DONE) {
      pgStatus = "ARCHIVED";
    }

    const [inserted] = await db.insert(pgTasksTable).values({
      id,
      projectId: data.projectId!,
      title: data.title!,
      description: data.description || "",
      status: pgStatus,
      priority: (data.priority || "MEDIUM") as any,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      assigneeId: (data.assigneeId && data.assigneeId.trim() !== "") ? data.assigneeId : null,
      parentId: (data.milestoneId && data.milestoneId.trim() !== "") ? data.milestoneId : null,
      estimatedHours: data.estimatedHours !== undefined ? String(data.estimatedHours) : "0",
      actualHours: "0",
    }).returning();

    const newTask: Task = {
      id: inserted.id,
      projectId: inserted.projectId,
      title: inserted.title,
      description: inserted.description || "",
      status: data.status || TaskStatus.TODO,
      priority: inserted.priority as any,
      startDate: inserted.createdAt ? inserted.createdAt.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      dueDate: inserted.dueDate ? inserted.dueDate.toISOString().split("T")[0] : "",
      assigneeId: inserted.assigneeId || null,
      milestoneId: inserted.parentId || null,
      labels: data.labels || [],
      estimatedHours: inserted.estimatedHours ? parseFloat(inserted.estimatedHours) : 0,
      actualHours: inserted.actualHours ? parseFloat(inserted.actualHours) : 0,
      completedAt: pgStatus === "ARCHIVED" ? (inserted.updatedAt ? inserted.updatedAt.toISOString() : new Date().toISOString()) : null,
      createdAt: inserted.createdAt ? inserted.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: inserted.updatedAt ? inserted.updatedAt.toISOString() : new Date().toISOString(),
      deletedAt: null
    };

    dbState.tasks.push(newTask);
    saveDatabase();
    
    if (newTask.assigneeId) {
      eventBus.publish(DomainEvents.TASK_ASSIGNED, {
        userId: newTask.assigneeId,
        payload: {
          taskName: newTask.title,
          dueDate: newTask.dueDate || "Not set",
        },
        entityInfo: {
          type: "TASK",
          id: newTask.id,
        }
      });
    }
    return newTask;
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task | null> {
    const index = dbState.tasks.findIndex(t => t.id === id && !t.deletedAt);
    if (index === -1) return null;

    const current = dbState.tasks[index];
    let completedAt = current.completedAt;
    
    if (data.status === TaskStatus.DONE && current.status !== TaskStatus.DONE) {
      completedAt = new Date().toISOString();
    } else if (data.status && data.status !== TaskStatus.DONE) {
      completedAt = null;
    }

    let pgStatus: "DRAFT" | "ASSIGNED" | "IN_PROGRESS" | "BLOCKED" | "REVIEW" | "COMPLETED" | "ARCHIVED" | undefined;
    if (data.status !== undefined) {
      if (data.status === TaskStatus.IN_REVIEW) {
        pgStatus = "REVIEW";
      } else if (data.status === TaskStatus.IN_PROGRESS) {
        pgStatus = "IN_PROGRESS";
      } else if (data.status === TaskStatus.DONE) {
        pgStatus = "ARCHIVED";
      } else {
        pgStatus = "ASSIGNED";
      }
    }

    const dueDateVal = data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined;

    const [updated] = await db.update(pgTasksTable)
      .set({
        title: data.title,
        description: data.description,
        status: pgStatus,
        priority: data.priority as any,
        dueDate: dueDateVal,
        assigneeId: (data.assigneeId && data.assigneeId.trim() !== "") ? data.assigneeId : data.assigneeId === null || data.assigneeId === "" ? null : undefined,
        parentId: (data.milestoneId && data.milestoneId.trim() !== "") ? data.milestoneId : data.milestoneId === null || data.milestoneId === "" ? null : undefined,
        estimatedHours: data.estimatedHours !== undefined ? String(data.estimatedHours) : undefined,
        actualHours: data.actualHours !== undefined ? String(data.actualHours) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(pgTasksTable.id, id))
      .returning();

    const currentAssignee = current.assigneeId;
    const newAssignee = data.assigneeId;

    dbState.tasks[index] = {
      ...current,
      ...data,
      completedAt,
      updatedAt: updated ? updated.updatedAt.toISOString() : new Date().toISOString()
    };

    saveDatabase();

    if (newAssignee && newAssignee !== currentAssignee) {
      eventBus.publish(DomainEvents.TASK_ASSIGNED, {
        userId: newAssignee,
        payload: {
          taskName: dbState.tasks[index].title,
          dueDate: dbState.tasks[index].dueDate || "Not set",
        },
        entityInfo: {
          type: "TASK",
          id: id,
        }
      });
    }
    
    if (data.status === TaskStatus.DONE && current.status !== TaskStatus.DONE) {
      eventBus.publish(DomainEvents.TASK_COMPLETED, {
        userId: current.assigneeId,
        payload: {
          taskName: current.title,
        },
        entityInfo: {
          type: "TASK",
          id: id,
        }
      });
    }

    return dbState.tasks[index];
  }

  async deleteTask(id: string): Promise<boolean> {
    const index = dbState.tasks.findIndex(t => t.id === id && !t.deletedAt);
    if (index === -1) return false;

    await db.update(pgTasksTable)
      .set({
        deletedAt: new Date()
      })
      .where(eq(pgTasksTable.id, id));

    dbState.tasks[index].deletedAt = new Date().toISOString();
    
    // Cascading soft-delete subtasks
    dbState.subtasks.forEach(sub => {
      if (sub.taskId === id && !sub.deletedAt) {
        sub.deletedAt = new Date().toISOString();
      }
    });

    saveDatabase();
    return true;
  }

  async bulkUpdateTasks(ids: string[], data: Partial<Task>): Promise<number> {
    let pgStatus: "DRAFT" | "ASSIGNED" | "IN_PROGRESS" | "BLOCKED" | "REVIEW" | "COMPLETED" | "ARCHIVED" | undefined;
    if (data.status !== undefined) {
      if (data.status === TaskStatus.IN_REVIEW) {
        pgStatus = "REVIEW";
      } else if (data.status === TaskStatus.IN_PROGRESS) {
        pgStatus = "IN_PROGRESS";
      } else if (data.status === TaskStatus.DONE) {
        pgStatus = "ARCHIVED";
      } else {
        pgStatus = "ASSIGNED";
      }
    }

    await db.update(pgTasksTable)
      .set({
        status: pgStatus,
        priority: data.priority as any,
        assigneeId: data.assigneeId,
        updatedAt: new Date(),
      })
      .where(inArray(pgTasksTable.id, ids));

    let updatedCount = 0;
    dbState.tasks.forEach(t => {
      if (ids.includes(t.id) && !t.deletedAt) {
        Object.assign(t, {
          ...data,
          updatedAt: new Date().toISOString(),
          completedAt: data.status === TaskStatus.DONE ? new Date().toISOString() : data.status ? null : t.completedAt
        });
        updatedCount++;
      }
    });
    if (updatedCount > 0) saveDatabase();
    return updatedCount;
  }

  async bulkDeleteTasks(ids: string[]): Promise<number> {
    await db.update(pgTasksTable)
      .set({
        deletedAt: new Date()
      })
      .where(inArray(pgTasksTable.id, ids));

    let deletedCount = 0;
    dbState.tasks.forEach(t => {
      if (ids.includes(t.id) && !t.deletedAt) {
        t.deletedAt = new Date().toISOString();
        deletedCount++;
        
        // Cascading subtasks
        dbState.subtasks.forEach(sub => {
          if (sub.taskId === t.id && !sub.deletedAt) {
            sub.deletedAt = new Date().toISOString();
          }
        });
      }
    });
    if (deletedCount > 0) saveDatabase();
    return deletedCount;
  }

  // ==========================================
  // SUBTASKS
  // ==========================================
  async findSubtaskById(id: string): Promise<Subtask | null> {
    return dbState.subtasks.find(s => s.id === id && !s.deletedAt) || null;
  }

  async findSubtasksByTask(taskId: string): Promise<Subtask[]> {
    return dbState.subtasks
      .filter(s => s.taskId === taskId && !s.deletedAt)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async createSubtask(data: Partial<Subtask>): Promise<Subtask> {
    const activeSubtasks = dbState.subtasks.filter(s => s.taskId === data.taskId && !s.deletedAt);
    const orderIndex = activeSubtasks.length;

    const newSubtask: Subtask = {
      id: generateUUID(),
      taskId: data.taskId!,
      title: data.title!,
      isCompleted: false,
      orderIndex,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null
    };

    dbState.subtasks.push(newSubtask);
    saveDatabase();
    return newSubtask;
  }

  async updateSubtask(id: string, data: Partial<Subtask>): Promise<Subtask | null> {
    const index = dbState.subtasks.findIndex(s => s.id === id && !s.deletedAt);
    if (index === -1) return null;

    dbState.subtasks[index] = {
      ...dbState.subtasks[index],
      ...data,
      updatedAt: new Date().toISOString()
    };

    saveDatabase();
    return dbState.subtasks[index];
  }

  async deleteSubtask(id: string): Promise<boolean> {
    const index = dbState.subtasks.findIndex(s => s.id === id && !s.deletedAt);
    if (index === -1) return false;

    dbState.subtasks[index].deletedAt = new Date().toISOString();
    saveDatabase();
    return true;
  }

  // ==========================================
  // MILESTONES
  // ==========================================
  async findMilestoneById(id: string): Promise<Milestone | null> {
    return dbState.milestones.find(m => m.id === id && !m.deletedAt) || null;
  }

  async findMilestonesByProject(projectId: string): Promise<Milestone[]> {
    return dbState.milestones.filter(m => m.projectId === projectId && !m.deletedAt);
  }

  async createMilestone(data: Partial<Milestone>): Promise<Milestone> {
    const newMilestone: Milestone = {
      id: generateUUID(),
      projectId: data.projectId!,
      title: data.title!,
      description: data.description || "",
      targetDate: data.targetDate!,
      actualDate: null,
      isCompleted: false,
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null
    };

    dbState.milestones.push(newMilestone);
    saveDatabase();
    return newMilestone;
  }

  async updateMilestone(id: string, data: Partial<Milestone>): Promise<Milestone | null> {
    const index = dbState.milestones.findIndex(m => m.id === id && !m.deletedAt);
    if (index === -1) return null;

    dbState.milestones[index] = {
      ...dbState.milestones[index],
      ...data,
      updatedAt: new Date().toISOString(),
      actualDate: data.isCompleted ? new Date().toISOString().substring(0, 10) : data.isCompleted === false ? null : dbState.milestones[index].actualDate
    };

    saveDatabase();
    return dbState.milestones[index];
  }

  async deleteMilestone(id: string): Promise<boolean> {
    const index = dbState.milestones.findIndex(m => m.id === id && !m.deletedAt);
    if (index === -1) return false;

    dbState.milestones[index].deletedAt = new Date().toISOString();
    saveDatabase();
    return true;
  }

  // ==========================================
  // DEPENDENCIES
  // ==========================================
  async findDependenciesByProject(projectId: string): Promise<Dependency[]> {
    return dbState.dependencies.filter(d => d.projectId === projectId);
  }

  async createDependency(data: Partial<Dependency>): Promise<Dependency> {
    const newDependency: Dependency = {
      id: generateUUID(),
      projectId: data.projectId!,
      type: data.type || "FS" as any,
      predecessorId: data.predecessorId!,
      successorId: data.successorId!,
      predecessorType: data.predecessorType || "TASK",
      successorType: data.successorType || "TASK",
      lagDays: data.lagDays || 0,
      createdAt: new Date().toISOString()
    };

    dbState.dependencies.push(newDependency);
    saveDatabase();
    return newDependency;
  }

  async deleteDependency(id: string): Promise<boolean> {
    const index = dbState.dependencies.findIndex(d => d.id === id);
    if (index === -1) return false;

    dbState.dependencies.splice(index, 1);
    saveDatabase();
    return true;
  }
}
