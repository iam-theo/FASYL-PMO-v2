import { DeliverablesDocsRepository } from "./repository.ts";
import { Deliverable, Document, Comment } from "../../types.ts";
import { dbState } from "../../db.ts";

export interface ThreadedComment extends Comment {
  authorName: string;
  replies: ThreadedComment[];
}

export class DeliverablesDocsService {
  private repository = new DeliverablesDocsRepository();

  // ==========================================
  // DELIVERABLES
  // ==========================================
  async getDeliverables(projectId: string): Promise<Deliverable[]> {
    return this.repository.getDeliverablesByProject(projectId);
  }

  async createDeliverable(data: Partial<Deliverable>): Promise<Deliverable> {
    return this.repository.createDeliverable(data);
  }

  async updateDeliverable(id: string, data: Partial<Deliverable>): Promise<Deliverable> {
    const updated = await this.repository.updateDeliverable(id, data);
    if (!updated) throw new Error("Deliverable record not found to update");
    return updated;
  }

  async deleteDeliverable(id: string): Promise<boolean> {
    return this.repository.deleteDeliverable(id);
  }

  // ==========================================
  // DOCUMENTS & FOLDERS
  // ==========================================
  async getDocuments(projectId: string, folderPath?: string): Promise<Document[]> {
    return this.repository.getDocumentsByProject(projectId, folderPath);
  }

  async uploadDocument(data: Partial<Document>): Promise<Document> {
    return this.repository.createDocument(data);
  }

  /**
   * Get folder tree structure of the documents directory
   */
  async getFolderDirectories(projectId: string) {
    const docs = await this.getDocuments(projectId);
    const folders = new Set<string>(["/"]); // root always exists

    docs.forEach(d => {
      folders.add(d.folderPath);
    });

    return Array.from(folders).sort();
  }

  // ==========================================
  // COMMENTS - THREADING ENGINE
  // ==========================================
  async createComment(data: Partial<Comment>): Promise<Comment> {
    return this.repository.createComment(data);
  }

  async toggleReaction(commentId: string, reaction: string, teamMemberId: string) {
    const updated = await this.repository.addReaction(commentId, reaction, teamMemberId);
    if (!updated) throw new Error("Comment not found to apply reaction");
    return updated;
  }

  async deleteComment(id: string): Promise<boolean> {
    return this.repository.deleteComment(id);
  }

  /**
   * Retrieve comments for an entity, formatted into a rich nested threaded tree structure
   */
  async getThreadedComments(entityType: string, entityId: string): Promise<ThreadedComment[]> {
    const comments = await this.repository.getCommentsByEntity(entityType, entityId);
    
    // Sort oldest first so threads read naturally
    comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const commentMap: Record<string, ThreadedComment> = {};
    const rootComments: ThreadedComment[] = [];

    // First pass: map and inject author names
    comments.forEach(c => {
      const author = dbState.teamMembers.find(tm => tm.id === c.authorId);
      const authorName = author ? author.name : "Anonymous Contributor";
      
      commentMap[c.id] = {
        ...c,
        authorName,
        replies: []
      };
    });

    // Second pass: wire parents to children threads
    comments.forEach(c => {
      const threadedNode = commentMap[c.id];
      if (c.parentId && commentMap[c.parentId]) {
        commentMap[c.parentId].replies.push(threadedNode);
      } else {
        rootComments.push(threadedNode);
      }
    });

    return rootComments;
  }
}
