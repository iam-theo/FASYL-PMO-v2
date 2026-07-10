import { Request, Response } from "express";
import { IAMService } from "../application/iam.service";

export class IAMController {
  static async getEffectivePermissions(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const permissions = await IAMService.getEffectivePermissions(userId);
      res.json({ permissions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async listRoles(req: Request, res: Response) {
    try {
      const roles = await IAMService.getRoles();
      res.json(roles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createRole(req: Request, res: Response) {
    try {
      const role = await IAMService.createRole(req.body);
      res.status(201).json(role);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async assignPermissions(req: Request, res: Response) {
    try {
      const { roleId } = req.params;
      const { permissionIds } = req.body;
      await IAMService.assignPermissionsToRole(roleId, permissionIds);
      res.json({ message: "Permissions assigned successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
