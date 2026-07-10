import { Entity } from "../../../shared/domain/entity.ts";

export enum ProjectStatus {
  DRAFT = "DRAFT",
  PLANNING = "PLANNING",
  ACTIVE = "ACTIVE",
  ON_HOLD = "ON_HOLD",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED"
}

export enum ProjectHealth {
  STABLE = "STABLE",
  AT_RISK = "AT_RISK",
  CRITICAL = "CRITICAL",
  ON_TRACK = "ON_TRACK"
}

export interface ProjectProps {
  name: string;
  description?: string;
  status: ProjectStatus;
  health: ProjectHealth;
  startDate?: Date;
  endDate?: Date;
  managerId?: string;
  clientName?: string;
  budget?: number;
  actualCost?: number;
  healthScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Project extends Entity<ProjectProps> {
  private constructor(props: ProjectProps, id?: string) {
    super(props, id);
  }

  public static create(props: Partial<ProjectProps>, id?: string): Project {
    const defaultProps: ProjectProps = {
      name: props.name || "Untitled Project",
      description: props.description,
      status: props.status || ProjectStatus.DRAFT,
      health: props.health || ProjectHealth.ON_TRACK,
      startDate: props.startDate,
      endDate: props.endDate,
      managerId: props.managerId,
      clientName: props.clientName,
      budget: props.budget || 0,
      actualCost: props.actualCost || 0,
      healthScore: props.healthScore || 100,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };

    return new Project(defaultProps, id);
  }

  // Domain logic
  public updateStatus(newStatus: ProjectStatus): void {
    // Implement state machine transitions here if needed
    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }
}
