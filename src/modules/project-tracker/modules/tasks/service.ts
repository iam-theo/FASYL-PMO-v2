import { TasksRepository } from "./repository.ts";
import { Task, Subtask, Milestone, Dependency, TaskStatus } from "../../types.ts";
import { dbState, saveDatabase } from "../../db.ts";

export class TasksService {
  private repository = new TasksRepository();

  // ==========================================
  // TASKS
  // ==========================================
  async getTask(id: string): Promise<Task> {
    const task = await this.repository.findTaskById(id);
    if (!task) throw new Error("Task not found");
    return task;
  }

  async getTasks(projectId: string, filters: any = {}): Promise<Task[]> {
    return this.repository.findTasksByProject(projectId, filters);
  }

  async createTask(data: Partial<Task>): Promise<Task> {
    const task = await this.repository.createTask(data);
    await this.recalculateProjectProgress(task.projectId);
    return task;
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    const task = await this.repository.updateTask(id, data);
    if (!task) throw new Error("Task not found to update");
    
    // Trigger progress updates up the hierarchy
    if (data.status || data.milestoneId) {
      await this.recalculateMilestoneProgress(task.projectId, task.milestoneId);
      await this.recalculateProjectProgress(task.projectId);
    }
    return task;
  }

  async deleteTask(id: string): Promise<boolean> {
    const task = await this.repository.findTaskById(id);
    if (!task) throw new Error("Task not found");
    
    const deleted = await this.repository.deleteTask(id);
    await this.recalculateMilestoneProgress(task.projectId, task.milestoneId);
    await this.recalculateProjectProgress(task.projectId);
    return deleted;
  }

  async bulkUpdate(ids: string[], data: Partial<Task>): Promise<number> {
    const count = await this.repository.bulkUpdateTasks(ids, data);
    if (count > 0 && dbState.tasks.length > 0) {
      const sample = dbState.tasks.find(t => ids.includes(t.id));
      if (sample) {
        await this.recalculateProjectProgress(sample.projectId);
      }
    }
    return count;
  }

  async bulkDelete(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const sample = await this.repository.findTaskById(ids[0]);
    const count = await this.repository.bulkDeleteTasks(ids);
    if (count > 0 && sample) {
      await this.recalculateProjectProgress(sample.projectId);
    }
    return count;
  }

  // ==========================================
  // SUBTASKS
  // ==========================================
  async getSubtasks(taskId: string): Promise<Subtask[]> {
    return this.repository.findSubtasksByTask(taskId);
  }

  async createSubtask(data: Partial<Subtask>): Promise<Subtask> {
    return this.repository.createSubtask(data);
  }

  async updateSubtask(id: string, data: Partial<Subtask>): Promise<Subtask> {
    const updated = await this.repository.updateSubtask(id, data);
    if (!updated) throw new Error("Subtask not found to update");
    
    // If completed status changed, we can adjust parent task status or estimate hours
    return updated;
  }

  async deleteSubtask(id: string): Promise<boolean> {
    return this.repository.deleteSubtask(id);
  }

  // ==========================================
  // MILESTONES
  // ==========================================
  async getMilestones(projectId: string): Promise<Milestone[]> {
    return this.repository.findMilestonesByProject(projectId);
  }

  async createMilestone(data: Partial<Milestone>): Promise<Milestone> {
    return this.repository.createMilestone(data);
  }

  async updateMilestone(id: string, data: Partial<Milestone>): Promise<Milestone> {
    const updated = await this.repository.updateMilestone(id, data);
    if (!updated) throw new Error("Milestone not found to update");
    return updated;
  }

  async deleteMilestone(id: string): Promise<boolean> {
    return this.repository.deleteMilestone(id);
  }

  // ==========================================
  // DEPENDENCIES
  // ==========================================
  async getDependencies(projectId: string): Promise<Dependency[]> {
    return this.repository.findDependenciesByProject(projectId);
  }

  async createDependency(data: Partial<Dependency>): Promise<Dependency> {
    const { predecessorId, successorId, projectId } = data;
    
    if (predecessorId === successorId) {
      throw new Error("Self-dependencies are strictly prohibited");
    }

    // Circular Dependency Validation using Depth-First Search
    const isCircular = await this.checkCircular(projectId!, predecessorId!, successorId!);
    if (isCircular) {
      throw new Error("Invalid Dependency: This connection creates a circular blocking loop");
    }

    return this.repository.createDependency(data);
  }

  async deleteDependency(id: string): Promise<boolean> {
    return this.repository.deleteDependency(id);
  }

  /**
   * Determine the Critical Path of tasks inside a project
   */
  async getCriticalPath(projectId: string) {
    const tasks = dbState.tasks.filter(t => t.projectId === projectId && !t.deletedAt);
    const deps = dbState.dependencies.filter(d => d.projectId === projectId);

    // Simplistic Critical Path Engine:
    // Identify task nodes that block other high-priority task nodes (Finish-to-Start)
    // and have a short timeline margin.
    const criticalTaskIds = new Set<string>();

    deps.forEach(d => {
      if (d.predecessorType === "TASK" && d.successorType === "TASK") {
        const pred = tasks.find(t => t.id === d.predecessorId);
        const succ = tasks.find(t => t.id === d.successorId);
        
        if (pred && succ && (pred.priority === "URGENT" || pred.priority === "HIGH")) {
          criticalTaskIds.add(pred.id);
          criticalTaskIds.add(succ.id);
        }
      }
    });

    // Fallback: If no dependencies are marked, default high priority tasks act as critical indicators
    if (criticalTaskIds.size === 0) {
      tasks.forEach(t => {
        if (t.priority === "URGENT" || t.priority === "HIGH") {
          criticalTaskIds.add(t.id);
        }
      });
    }

    return tasks.filter(t => criticalTaskIds.has(t.id));
  }

  // ==========================================
  // CORE DYNAMIC PORTFOLIO MATHEMATICS
  // ==========================================
  private async checkCircular(projectId: string, pred: string, succ: string): Promise<boolean> {
    const deps = dbState.dependencies.filter(d => d.projectId === projectId);
    
    const adjList: Record<string, string[]> = {};
    deps.forEach(d => {
      if (!adjList[d.predecessorId]) adjList[d.predecessorId] = [];
      adjList[d.predecessorId].push(d.successorId);
    });

    const visited = new Set<string>();

    const hasPath = (current: string, target: string): boolean => {
      if (current === target) return true;
      if (visited.has(current)) return false;
      visited.add(current);

      const neighbors = adjList[current] || [];
      for (const neighbor of neighbors) {
        if (hasPath(neighbor, target)) return true;
      }
      return false;
    };

    return hasPath(succ, pred);
  }

  private async recalculateMilestoneProgress(projectId: string, milestoneId: string | null): Promise<void> {
    if (!milestoneId) return;

    const milestoneIndex = dbState.milestones.findIndex(m => m.id === milestoneId && !m.deletedAt);
    if (milestoneIndex === -1) return;

    const tasksInMilestone = dbState.tasks.filter(t => t.milestoneId === milestoneId && !t.deletedAt);
    if (tasksInMilestone.length === 0) {
      dbState.milestones[milestoneIndex].progress = 0;
      dbState.milestones[milestoneIndex].isCompleted = false;
      saveDatabase();
      return;
    }

    const completedCount = tasksInMilestone.filter(t => t.status === TaskStatus.DONE).length;
    const progress = Math.round((completedCount / tasksInMilestone.length) * 100);

    dbState.milestones[milestoneIndex].progress = progress;
    dbState.milestones[milestoneIndex].isCompleted = progress === 100;
    dbState.milestones[milestoneIndex].actualDate = progress === 100 ? new Date().toISOString().substring(0, 10) : null;
    
    saveDatabase();
  }

  private async recalculateProjectProgress(projectId: string): Promise<void> {
    const projectIndex = dbState.projects.findIndex(p => p.id === projectId && !p.deletedAt);
    if (projectIndex === -1) return;

    const tasks = dbState.tasks.filter(t => t.projectId === projectId && !t.deletedAt);
    if (tasks.length === 0) {
      dbState.projects[projectIndex].progress = 0;
      saveDatabase();
      return;
    }

    const completed = tasks.filter(t => t.status === TaskStatus.DONE).length;
    dbState.projects[projectIndex].progress = Math.round((completed / tasks.length) * 100);
    saveDatabase();
  }
}
