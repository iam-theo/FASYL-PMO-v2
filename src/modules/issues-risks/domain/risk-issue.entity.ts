import { Entity } from "../../../shared/domain/entity.ts";
import { Priority } from "../../tasks/domain/task.entity.ts";

export enum IssueStatus {
  OPEN = "OPEN",
  ASSIGNED = "ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED"
}

export enum RiskStatus {
  IDENTIFIED = "IDENTIFIED",
  ASSESSED = "ASSESSED",
  MITIGATED = "MITIGATED",
  ACCEPTED = "ACCEPTED",
  CLOSED = "CLOSED"
}

export interface RiskIssueProps {
  projectId: string;
  title: string;
  description?: string;
  type: "ISSUE" | "RISK";
  status: string; // Polymorphic
  priority: Priority;
  ownerId?: string;
  mitigationPlan?: string;
  impact?: string;
  probability?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class RiskIssue extends Entity<RiskIssueProps> {
  private constructor(props: RiskIssueProps, id?: string) {
    super(props, id);
  }

  public static create(props: Partial<RiskIssueProps>, id?: string): RiskIssue {
    if (!props.projectId) throw new Error("Project ID is required");
    if (!props.title) throw new Error("Title is required");
    if (!props.type) throw new Error("Type (ISSUE/RISK) is required");

    const defaultProps: RiskIssueProps = {
      projectId: props.projectId,
      title: props.title,
      description: props.description,
      type: props.type,
      status: props.status || (props.type === "ISSUE" ? IssueStatus.OPEN : RiskStatus.IDENTIFIED),
      priority: props.priority || Priority.MEDIUM,
      ownerId: props.ownerId,
      mitigationPlan: props.mitigationPlan,
      impact: props.impact,
      probability: props.probability,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };

    return new RiskIssue(defaultProps, id);
  }
}
