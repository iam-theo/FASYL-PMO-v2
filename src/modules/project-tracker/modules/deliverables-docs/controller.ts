import { Response } from "express";
import { MockAuthRequest } from "../../shared/middleware.ts";
import { DeliverablesDocsService } from "./service.ts";
import { sendSuccess, sendError } from "../../shared/response.ts";

export class DeliverablesDocsController {
  private service = new DeliverablesDocsService();

  // ==========================================
  // DELIVERABLES
  // ==========================================
  listDeliverables = async (req: MockAuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const data = await this.service.getDeliverables(projectId);
      return sendSuccess(res, "Project deliverables loaded successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to load project deliverables", [error.message]);
    }
  };

  createDeliverable = async (req: MockAuthRequest, res: Response) => {
    try {
      const data = await this.service.createDeliverable(req.body);
      return sendSuccess(res, "Deliverable initialized successfully", data, 201);
    } catch (error: any) {
      return sendError(res, "Failed to initialize deliverable", [error.message]);
    }
  };

  updateDeliverable = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = await this.service.updateDeliverable(id, req.body);
      return sendSuccess(res, "Deliverable updated successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to update deliverable record", [error.message]);
    }
  };

  deleteDeliverable = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.deleteDeliverable(id);
      return sendSuccess(res, "Deliverable deleted successfully", { id });
    } catch (error: any) {
      return sendError(res, "Failed to delete deliverable", [error.message]);
    }
  };

  // ==========================================
  // DOCUMENTS & FOLDERS
  // ==========================================
  listDocuments = async (req: MockAuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const { folderPath } = req.query as { folderPath?: string };
      const data = await this.service.getDocuments(projectId, folderPath);
      return sendSuccess(res, "Documents repository listing loaded successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to load documents repository", [error.message]);
    }
  };

  listFolders = async (req: MockAuthRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const data = await this.service.getFolderDirectories(projectId);
      return sendSuccess(res, "Folders structure directory compiled successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to compile folders structure directory", [error.message]);
    }
  };

  uploadDocument = async (req: MockAuthRequest, res: Response) => {
    try {
      const data = await this.service.uploadDocument(req.body);
      return sendSuccess(res, "Document uploaded and registered successfully", data, 201);
    } catch (error: any) {
      return sendError(res, "Failed to upload document", [error.message]);
    }
  };

  // ==========================================
  // COMMENTS
  // ==========================================
  listThreadedComments = async (req: MockAuthRequest, res: Response) => {
    try {
      const { entityType, entityId } = req.params;
      const data = await this.service.getThreadedComments(entityType, entityId);
      return sendSuccess(res, "Threaded comment tree loaded successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to build threaded comment tree", [error.message]);
    }
  };

  createComment = async (req: MockAuthRequest, res: Response) => {
    try {
      const data = await this.service.createComment(req.body);
      return sendSuccess(res, "Comment registered successfully", data, 201);
    } catch (error: any) {
      return sendError(res, "Failed to register comment", [error.message]);
    }
  };

  toggleReaction = async (req: MockAuthRequest, res: Response) => {
    try {
      const { commentId } = req.params;
      const { reaction, teamMemberId } = req.body;
      const data = await this.service.toggleReaction(commentId, reaction, teamMemberId);
      return sendSuccess(res, "Reaction toggled on comment successfully", data);
    } catch (error: any) {
      return sendError(res, "Failed to toggle reaction on comment", [error.message]);
    }
  };

  deleteComment = async (req: MockAuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.deleteComment(id);
      return sendSuccess(res, "Comment removed successfully", { id });
    } catch (error: any) {
      return sendError(res, "Failed to remove comment", [error.message]);
    }
  };
}
