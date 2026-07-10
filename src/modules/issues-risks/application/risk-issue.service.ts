import { IRiskIssueRepository } from "../domain/risk-issue.repository.interface.ts";
import { RiskIssue, RiskIssueProps } from "../domain/risk-issue.entity.ts";
import { NotFoundError } from "../../../shared/infrastructure/errors.ts";
import { eventBus } from "../../../shared/domain/event-bus.ts";

export class RiskIssueService {
  constructor(private readonly repository: IRiskIssueRepository) {}

  async create(data: Partial<RiskIssueProps>): Promise<RiskIssue> {
    const entity = RiskIssue.create(data);
    await this.repository.save(entity);
    eventBus.publish(data.type === "RISK" ? "risk.created" : "issue.created", entity);
    return entity;
  }

  async getById(id: string): Promise<RiskIssue> {
    const entity = await this.repository.findById(id);
    if (!entity) throw new NotFoundError("Risk/Issue");
    return entity;
  }

  async getByProject(projectId: string): Promise<RiskIssue[]> {
    return this.repository.findByProjectId(projectId);
  }

  async update(id: string, data: Partial<RiskIssueProps>): Promise<RiskIssue> {
    const entity = await this.getById(id);
    Object.assign(entity.props, data);
    entity.props.updatedAt = new Date();
    await this.repository.save(entity);
    return entity;
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await this.repository.delete(id);
  }
}
