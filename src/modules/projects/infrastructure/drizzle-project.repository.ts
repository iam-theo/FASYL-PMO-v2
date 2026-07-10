import { eq } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import { projects } from "../../../db/schema.ts";
import { Project, ProjectStatus, ProjectHealth } from "../domain/project.entity.ts";
import { IProjectRepository } from "../domain/project.repository.interface.ts";

export class DrizzleProjectRepository implements IProjectRepository {
  private toDomain(record: any): Project {
    return Project.create({
      name: record.name,
      description: record.description || undefined,
      status: record.status as ProjectStatus,
      health: record.health as ProjectHealth,
      startDate: record.startDate || undefined,
      endDate: record.endDate || undefined,
      managerId: record.managerId || undefined,
      clientName: record.clientName || undefined,
      budget: record.budget ? parseFloat(record.budget.toString()) : 0,
      actualCost: record.actualCost ? parseFloat(record.actualCost.toString()) : 0,
      healthScore: record.healthScore,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }, record.id);
  }

  async findById(id: string): Promise<Project | null> {
    const [record] = await db.select().from(projects).where(eq(projects.id, id));
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Project[]> {
    const records = await db.select().from(projects);
    return records.map(this.toDomain);
  }

  async findByManagerId(managerId: string): Promise<Project[]> {
    const records = await db.select().from(projects).where(eq(projects.managerId, managerId));
    return records.map(this.toDomain);
  }

  async save(entity: Project): Promise<void> {
    const data = {
      id: entity.id,
      name: entity.props.name,
      description: entity.props.description,
      status: entity.props.status,
      health: entity.props.health,
      startDate: entity.props.startDate,
      endDate: entity.props.endDate,
      managerId: entity.props.managerId,
      clientName: entity.props.clientName,
      budget: entity.props.budget?.toString(),
      actualCost: entity.props.actualCost?.toString(),
      healthScore: entity.props.healthScore,
      updatedAt: new Date(),
    };

    const existing = await this.findById(entity.id);
    if (existing) {
      await db.update(projects).set(data).where(eq(projects.id, entity.id));
    } else {
      await db.insert(projects).values({ ...data, createdAt: new Date() });
    }
  }

  async delete(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }
}
