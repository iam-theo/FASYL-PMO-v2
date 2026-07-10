import { Request, Response } from "express";
import { ProjectService } from "../application/project.service.ts";
import { ResponseFormatter, StatusCode } from "../../../shared/infrastructure/response.ts";
import { AuthorizationService } from "../../authorization/application/authorization.service.ts";
import { db } from "../../../shared/database/index.ts";
import { resources, resourceAllocations } from "../../../db/schema.ts";
import { eq, inArray, and } from "drizzle-orm";

const authService = new AuthorizationService();

export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  getAll = async (req: any, res: Response) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      // Check user permissions and roles
      const profile = await authService.getUserEffectivePermissionsAndRoles(userId);
      const userRoleCodes = profile?.roles?.map((r: any) => r.code) || [];
      const isUnrestrictedRole = userRoleCodes.some((c: string) => 
        ["super_admin", "admin", "pmo_director", "chief_executive_officer", "portfolio_manager", "executive_viewer"].includes(c)
      );

      const projects = await this.projectService.getAllProjects();
      
      if (isUnrestrictedRole) {
        // Can see all projects
        return ResponseFormatter.success(res, projects.map(p => ({ id: p.id, ...p.props })));
      }

      // Otherwise, filter projects:
      // 1. Projects managed by the user
      // 2. Projects assigned to user via team membership (resource allocations)
      const userResources = await db
        .select({ id: resources.id })
        .from(resources)
        .where(eq(resources.userId, userId));
      const resourceIds = userResources.map(r => r.id);

      let allocatedProjectIds: string[] = [];
      if (resourceIds.length > 0) {
        const allocations = await db
          .select({ projectId: resourceAllocations.projectId })
          .from(resourceAllocations)
          .where(inArray(resourceAllocations.resourceId, resourceIds));
        allocatedProjectIds = allocations.map(a => a.projectId);
      }

      const filtered = projects.filter(p => 
        p.props.managerId === userId || allocatedProjectIds.includes(p.id)
      );

      return ResponseFormatter.success(res, filtered.map(p => ({ id: p.id, ...p.props })));
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  getMyProjects = async (req: any, res: Response) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const projects = await this.projectService.getAllProjects();

      // 1. Projects managed by the user
      // 2. Projects assigned to user via team membership (resource allocations)
      const userResources = await db
        .select({ id: resources.id })
        .from(resources)
        .where(eq(resources.userId, userId));
      const resourceIds = userResources.map(r => r.id);

      let allocatedProjectIds: string[] = [];
      if (resourceIds.length > 0) {
        const allocations = await db
          .select({ projectId: resourceAllocations.projectId })
          .from(resourceAllocations)
          .where(inArray(resourceAllocations.resourceId, resourceIds));
        allocatedProjectIds = allocations.map(a => a.projectId);
      }

      const filtered = projects.filter(p => 
        p.props.managerId === userId || allocatedProjectIds.includes(p.id)
      );

      return ResponseFormatter.success(res, filtered.map(p => ({ id: p.id, ...p.props })));
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  getOne = async (req: any, res: Response) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const project = await this.projectService.getProject(req.params.id);

      // Check authorization
      const profile = await authService.getUserEffectivePermissionsAndRoles(userId);
      const userRoleCodes = profile?.roles?.map((r: any) => r.code) || [];
      const isUnrestrictedRole = userRoleCodes.some((c: string) => 
        ["super_admin", "admin", "pmo_director", "chief_executive_officer", "portfolio_manager", "executive_viewer"].includes(c)
      );

      if (isUnrestrictedRole || project.props.managerId === userId) {
        return ResponseFormatter.success(res, { id: project.id, ...project.props });
      }

      // Check allocations
      const userResources = await db
        .select({ id: resources.id })
        .from(resources)
        .where(eq(resources.userId, userId));
      const resourceIds = userResources.map(r => r.id);

      let isAllocated = false;
      if (resourceIds.length > 0) {
        const [allocation] = await db
          .select()
          .from(resourceAllocations)
          .where(
            and(
              eq(resourceAllocations.projectId, project.id),
              inArray(resourceAllocations.resourceId, resourceIds)
            )
          )
          .limit(1);
        if (allocation) {
          isAllocated = true;
        }
      }

      if (isAllocated) {
        return ResponseFormatter.success(res, { id: project.id, ...project.props });
      }

      return res.status(403).json({ success: false, error: "Access denied: Not authorized to view this project" });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  create = async (req: any, res: Response) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      // Check permission
      const hasPerm = await authService.hasPermission(userId, "projects.create");
      if (!hasPerm) {
        return res.status(403).json({ success: false, error: "Access denied. Missing 'projects.create' permission." });
      }

      const result = await this.projectService.createProject(req.body, userId);
      return ResponseFormatter.success(res, { project: { id: result.project.id, ...result.project.props }, lifecycle: result.lifecycle }, "Project created successfully", StatusCode.CREATED);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  update = async (req: any, res: Response) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const project = await this.projectService.getProject(req.params.id);

      // Check permission
      const hasPerm = await authService.hasPermission(userId, "projects.edit");
      const isManager = project.props.managerId === userId;
      if (!hasPerm && !isManager) {
        return res.status(403).json({ success: false, error: "Access denied. Missing 'projects.edit' permission or not the Project Manager." });
      }

      const updatedProject = await this.projectService.updateProject(req.params.id, req.body, userId);
      return ResponseFormatter.success(res, { id: updatedProject.id, ...updatedProject.props }, "Project updated successfully");
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  delete = async (req: any, res: Response) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      // Check permission
      const hasPerm = await authService.hasPermission(userId, "projects.delete");
      if (!hasPerm) {
        return res.status(403).json({ success: false, error: "Access denied. Missing 'projects.delete' permission." });
      }

      await this.projectService.deleteProject(req.params.id, userId);
      return ResponseFormatter.success(res, null, "Project deleted successfully", StatusCode.NO_CONTENT);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}
