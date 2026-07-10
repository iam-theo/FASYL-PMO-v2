import { Project } from "./project.entity.ts";
import { Repository } from "../../../shared/domain/repository.ts";

export interface IProjectRepository extends Repository<Project> {
  findByManagerId(managerId: string): Promise<Project[]>;
}
