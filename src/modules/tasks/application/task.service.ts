import { ITaskRepository } from "../domain/task.repository.interface.ts";
import { Task, TaskProps, TaskStatus } from "../domain/task.entity.ts";
import { NotFoundError } from "../../../shared/infrastructure/errors.ts";
import { eventBus as sharedEventBus } from "../../../shared/domain/event-bus.ts";
import { DomainEvents } from "../../notifications/domain/events.ts";

export class TaskService {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async createTask(data: Partial<TaskProps>): Promise<Task> {
    const task = Task.create(data);
    await this.taskRepository.save(task);
    sharedEventBus.publish("task.created", task);
    
    if (task.props.assigneeId) {
      sharedEventBus.publish(DomainEvents.TASK_ASSIGNED, {
        userId: task.props.assigneeId,
        payload: { taskName: task.props.title, dueDate: task.props.dueDate?.toLocaleDateString() },
        entityInfo: { type: "TASK", id: task.id }
      });
    }
    return task;
  }

  async getTask(id: string): Promise<Task> {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new NotFoundError("Task");
    return task;
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    return this.taskRepository.findByProjectId(projectId);
  }

  async getAllTasks(): Promise<Task[]> {
    return this.taskRepository.findAll();
  }

  async updateTaskStatus(id: string, newStatus: TaskStatus): Promise<Task> {
    const task = await this.getTask(id);
    task.updateStatus(newStatus);
    await this.taskRepository.save(task);
    sharedEventBus.publish("task.status_updated", { id, status: newStatus });

    if (newStatus === "COMPLETED" && task.props.assigneeId) {
      sharedEventBus.publish(DomainEvents.TASK_COMPLETED, {
        userId: task.props.assigneeId,
        payload: { taskName: task.props.title },
        entityInfo: { type: "TASK", id: task.id }
      });
    }
    return task;
  }

  async updateTask(id: string, data: Partial<TaskProps>): Promise<Task> {
    const task = await this.getTask(id);
    Object.assign(task.props, data);
    task.props.updatedAt = new Date();
    await this.taskRepository.save(task);
    sharedEventBus.publish("task.updated", task);
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    await this.getTask(id);
    await this.taskRepository.delete(id);
    sharedEventBus.publish("task.deleted", { id });
  }
}
