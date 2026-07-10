import { Entity } from "../../../shared/domain/entity.ts";

export enum TaskStatus {
  DRAFT = "DRAFT",
  ASSIGNED = "ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  BLOCKED = "BLOCKED",
  REVIEW = "REVIEW",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED"
}

export enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT"
}

export interface TaskProps {
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: string;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  completionPercentage: number;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Task extends Entity<TaskProps> {
  private constructor(props: TaskProps, id?: string) {
    super(props, id);
  }

  public static create(props: Partial<TaskProps>, id?: string): Task {
    if (!props.projectId) throw new Error("Project ID is required for a Task");
    if (!props.title) throw new Error("Task title is required");

    const defaultProps: TaskProps = {
      projectId: props.projectId,
      title: props.title,
      description: props.description,
      status: props.status || TaskStatus.DRAFT,
      priority: props.priority || Priority.MEDIUM,
      assigneeId: props.assigneeId,
      dueDate: props.dueDate,
      estimatedHours: props.estimatedHours || 0,
      actualHours: props.actualHours || 0,
      completionPercentage: props.completionPercentage || 0,
      parentId: props.parentId,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };

    return new Task(defaultProps, id);
  }

  public updateStatus(newStatus: TaskStatus): void {
    // State machine logic
    const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.DRAFT]: [TaskStatus.ASSIGNED, TaskStatus.ARCHIVED],
      [TaskStatus.ASSIGNED]: [TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED, TaskStatus.ARCHIVED],
      [TaskStatus.IN_PROGRESS]: [TaskStatus.BLOCKED, TaskStatus.REVIEW, TaskStatus.COMPLETED],
      [TaskStatus.BLOCKED]: [TaskStatus.IN_PROGRESS, TaskStatus.ARCHIVED],
      [TaskStatus.REVIEW]: [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS],
      [TaskStatus.COMPLETED]: [TaskStatus.ARCHIVED],
      [TaskStatus.ARCHIVED]: [TaskStatus.DRAFT]
    };

    if (!allowedTransitions[this.props.status].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${this.props.status} to ${newStatus}`);
    }

    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }
}
