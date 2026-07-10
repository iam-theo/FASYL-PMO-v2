import { eq } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import { tasks } from "../../../db/schema.ts";
import { Task, TaskStatus, Priority } from "../domain/task.entity.ts";
import { ITaskRepository } from "../domain/task.repository.interface.ts";

export class DrizzleTaskRepository implements ITaskRepository {
  private toDomain(record: any): Task {
    return Task.create({
      projectId: record.projectId,
      title: record.title,
      description: record.description || undefined,
      status: record.status as TaskStatus,
      priority: record.priority as Priority,
      assigneeId: record.assigneeId || undefined,
      dueDate: record.dueDate || undefined,
      estimatedHours: record.estimatedHours ? parseFloat(record.estimatedHours.toString()) : 0,
      actualHours: record.actualHours ? parseFloat(record.actualHours.toString()) : 0,
      completionPercentage: record.completionPercentage,
      parentId: record.parentId || undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }, record.id);
  }

  async findById(id: string): Promise<Task | null> {
    const [record] = await db.select().from(tasks).where(eq(tasks.id, id));
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Task[]> {
    const records = await db.select().from(tasks);
    return records.map(this.toDomain);
  }

  async findByProjectId(projectId: string): Promise<Task[]> {
    const records = await db.select().from(tasks).where(eq(tasks.projectId, projectId));
    return records.map(this.toDomain);
  }

  async findByAssigneeId(assigneeId: string): Promise<Task[]> {
    const records = await db.select().from(tasks).where(eq(tasks.assigneeId, assigneeId));
    return records.map(this.toDomain);
  }

  async save(entity: Task): Promise<void> {
    const data = {
      id: entity.id,
      projectId: entity.props.projectId,
      title: entity.props.title,
      description: entity.props.description,
      status: entity.props.status,
      priority: entity.props.priority,
      assigneeId: entity.props.assigneeId,
      dueDate: entity.props.dueDate,
      estimatedHours: entity.props.estimatedHours?.toString(),
      actualHours: entity.props.actualHours?.toString(),
      completionPercentage: entity.props.completionPercentage,
      parentId: entity.props.parentId,
      updatedAt: new Date(),
    };

    const existing = await this.findById(entity.id);
    if (existing) {
      await db.update(tasks).set(data).where(eq(tasks.id, entity.id));
    } else {
      await db.insert(tasks).values({ ...data, createdAt: new Date() });
    }
  }

  async delete(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }
}
