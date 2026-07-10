import { RiskIssue } from "./risk-issue.entity.ts";
import { Repository } from "../../../shared/domain/repository.ts";

export interface IRiskIssueRepository extends Repository<RiskIssue> {
  findByProjectId(projectId: string): Promise<RiskIssue[]>;
}
