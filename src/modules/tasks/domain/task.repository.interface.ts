import { Task } from "./task.entity.ts";
import { Repository } from "../../../shared/domain/repository.ts";

export interface ITaskRepository extends Repository<Task> {
  findByProjectId(projectId: string): Promise<Task[]>;
  findByAssigneeId(assigneeId: string): Promise<Task[]>;
}
