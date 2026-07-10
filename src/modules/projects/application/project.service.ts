import { IProjectRepository } from "../domain/project.repository.interface.ts";
import { Project, ProjectProps } from "../domain/project.entity.ts";
import { NotFoundError } from "../../../shared/infrastructure/errors.ts";
import { eventBus as sharedEventBus } from "../../../shared/domain/event-bus.ts";
import { DomainEvents } from "../../notifications/domain/events.ts";
import { AuditLogger } from "../../../shared/infrastructure/audit-logger.ts";
import { LifecycleService } from "../../enterprise/application/lifecycle.service.ts";

export class ProjectService {
  private lifecycleService: LifecycleService;

  constructor(private readonly projectRepository: IProjectRepository) {
    this.lifecycleService = new LifecycleService();
  }

  async createProject(data: Partial<ProjectProps>, userId: string): Promise<{ project: Project, lifecycle: any }> {
    const project = Project.create(data);
    await this.projectRepository.save(project);
    
    await AuditLogger.log(project.id, userId, "PROJECT_CREATED", "PROJECT", project.id, data);
    sharedEventBus.publish("project.created", project);

    if (project.props.managerId) {
      sharedEventBus.publish(DomainEvents.PROJECT_ASSIGNED, {
        userId: project.props.managerId,
        payload: { projectName: project.props.name },
        entityInfo: { type: "PROJECT", id: project.id }
      });
    }

    // Default template handling 
    const templateId = "default";
    const lifecycle = await this.lifecycleService.createInstance(userId, project.id, templateId);

    return { project, lifecycle };
  }

  async getProject(id: string): Promise<Project> {
    const project = await this.projectRepository.findById(id);
    if (!project) throw new NotFoundError("Project");
    return project;
  }

  async getAllProjects(): Promise<Project[]> {
    return this.projectRepository.findAll();
  }

  async updateProject(id: string, data: Partial<ProjectProps>, userId: string): Promise<Project> {
    const project = await this.getProject(id);
    
    Object.assign(project.props, data);
    project.props.updatedAt = new Date();
    
    await this.projectRepository.save(project);
    await AuditLogger.log(project.id, userId, "PROJECT_UPDATED", "PROJECT", project.id, data);
    sharedEventBus.publish("project.updated", project);
    return project;
  }

  async deleteProject(id: string, userId: string): Promise<void> {
    const project = await this.getProject(id);
    await this.projectRepository.delete(id);
    await AuditLogger.log(project.id, userId, "PROJECT_DELETED", "PROJECT", project.id);
    sharedEventBus.publish("project.deleted", { id });
  }
}
