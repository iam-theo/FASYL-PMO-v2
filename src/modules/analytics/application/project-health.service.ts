import { eventBus } from "../../../shared/domain/event-bus.ts";
import { IProjectRepository } from "../../projects/domain/project.repository.interface.ts";
import { ITaskRepository as ITaskRepo } from "../../tasks/domain/task.repository.interface.ts";
import { IRiskIssueRepository } from "../../issues-risks/domain/risk-issue.repository.interface.ts";
import logger from "../../../shared/infrastructure/logger.ts";

export class ProjectHealthService {
  constructor(
    private readonly projectRepo: IProjectRepository,
    private readonly taskRepo: ITaskRepo,
    private readonly riskRepo: IRiskIssueRepository
  ) {
    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    eventBus.subscribe("task.status_updated", (data) => this.recalculateHealth(data.projectId));
    eventBus.subscribe("issue.created", (data) => this.recalculateHealth(data.projectId));
    eventBus.subscribe("risk.created", (data) => this.recalculateHealth(data.projectId));
  }

  public async recalculateHealth(projectId: string) {
    if (!projectId) return;

    try {
      const project = await this.projectRepo.findById(projectId);
      if (!project) return;

      const tasks = await this.taskRepo.findByProjectId(projectId);
      const risksAndIssues = await this.riskRepo.findByProjectId(projectId);

      let score = 100;

      // Logic: Deduct for overdue tasks
      const overdueTasks = tasks.filter(t => t.props.dueDate && t.props.dueDate < new Date() && t.props.status !== "COMPLETED");
      score -= overdueTasks.length * 5;

      // Logic: Deduct for open issues
      const openIssues = risksAndIssues.filter(i => i.props.type === "ISSUE" && i.props.status !== "CLOSED");
      score -= openIssues.length * 3;

      // Logic: Deduct for high probability risks
      const highRisks = risksAndIssues.filter(r => r.props.type === "RISK" && (r.props.probability || 0) > 70);
      score -= highRisks.length * 4;

      score = Math.max(0, score);
      
      project.props.healthScore = score;
      
      // Update health enum based on score
      if (score > 80) project.props.health = "ON_TRACK" as any;
      else if (score > 60) project.props.health = "STABLE" as any;
      else if (score > 40) project.props.health = "AT_RISK" as any;
      else project.props.health = "CRITICAL" as any;

      await this.projectRepo.save(project);
      logger.info({ projectId, score }, "Project health recalculated");
    } catch (err) {
      logger.error({ err, projectId }, "Failed to recalculate project health");
    }
  }
}
