import { eq } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import { risksAndIssues } from "../../../db/schema.ts";
import { RiskIssue } from "../domain/risk-issue.entity.ts";
import { IRiskIssueRepository } from "../domain/risk-issue.repository.interface.ts";
import { Priority } from "../../tasks/domain/task.entity.ts";

export class DrizzleRiskIssueRepository implements IRiskIssueRepository {
  private toDomain(record: any): RiskIssue {
    return RiskIssue.create({
      projectId: record.projectId,
      title: record.title,
      description: record.description || undefined,
      type: record.type as "ISSUE" | "RISK",
      status: record.status,
      priority: record.priority as Priority,
      ownerId: record.ownerId || undefined,
      mitigationPlan: record.mitigationPlan || undefined,
      impact: record.impact || undefined,
      probability: record.probability || undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }, record.id);
  }

  async findById(id: string): Promise<RiskIssue | null> {
    const [record] = await db.select().from(risksAndIssues).where(eq(risksAndIssues.id, id));
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<RiskIssue[]> {
    const records = await db.select().from(risksAndIssues);
    return records.map(this.toDomain);
  }

  async findByProjectId(projectId: string): Promise<RiskIssue[]> {
    const records = await db.select().from(risksAndIssues).where(eq(risksAndIssues.projectId, projectId));
    return records.map(this.toDomain);
  }

  async save(entity: RiskIssue): Promise<void> {
    const data = {
      id: entity.id,
      projectId: entity.props.projectId,
      title: entity.props.title,
      description: entity.props.description,
      type: entity.props.type,
      status: entity.props.status as any,
      priority: entity.props.priority as any,
      ownerId: entity.props.ownerId,
      mitigationPlan: entity.props.mitigationPlan,
      impact: entity.props.impact,
      probability: entity.props.probability,
      updatedAt: new Date(),
    };

    const existing = await this.findById(entity.id);
    if (existing) {
      await db.update(risksAndIssues).set(data).where(eq(risksAndIssues.id, entity.id));
    } else {
      await db.insert(risksAndIssues).values({ ...data, createdAt: new Date() });
    }
  }

  async delete(id: string): Promise<void> {
    await db.delete(risksAndIssues).where(eq(risksAndIssues.id, id));
  }
}
