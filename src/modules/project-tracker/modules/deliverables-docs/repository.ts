import { dbState, generateUUID, saveDatabase } from "../../db.ts";
import { Deliverable, Document, Comment } from "../../types.ts";
import { db } from "../../../../shared/database/index.ts";
import { eq } from "drizzle-orm";
import { deliverables as pgDeliverablesTable } from "../../../../db/schema.ts";

export class DeliverablesDocsRepository {
  // ==========================================
  // DELIVERABLES
  // ==========================================
  async getDeliverablesByProject(projectId: string): Promise<Deliverable[]> {
    return dbState.deliverables.filter(d => d.projectId === projectId && !d.deletedAt);
  }

  async findDeliverableById(id: string): Promise<Deliverable | null> {
    return dbState.deliverables.find(d => d.id === id && !d.deletedAt) || null;
  }

  async createDeliverable(data: Partial<Deliverable>): Promise<Deliverable> {
    const id = generateUUID();
    const attachments = data.attachments || [];
    const fileUrl = attachments.length > 0 ? attachments[0] : null;

    const [inserted] = await db.insert(pgDeliverablesTable).values({
      id,
      projectId: data.projectId!,
      name: data.title!,
      status: (data.status || "DRAFT") as any,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      fileUrl,
      version: "1.0.0"
    }).returning();

    const newDel: Deliverable = {
      id: inserted.id,
      projectId: inserted.projectId,
      title: inserted.name,
      description: data.description || "",
      dueDate: inserted.dueDate ? inserted.dueDate.toISOString().split("T")[0] : "",
      status: (inserted.status === "APPROVED" ? "APPROVED" : inserted.status === "REJECTED" ? "REJECTED" : inserted.status === "IN_REVIEW" ? "IN_REVIEW" : "DRAFT") as any,
      ownerId: data.ownerId || "usr-alex",
      reviewers: data.reviewers || [],
      acceptanceCriteria: data.acceptanceCriteria || "",
      attachments: inserted.fileUrl ? [inserted.fileUrl] : [],
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
      deletedAt: null
    };

    dbState.deliverables.push(newDel);
    saveDatabase();
    return newDel;
  }

  async updateDeliverable(id: string, data: Partial<Deliverable>): Promise<Deliverable | null> {
    const index = dbState.deliverables.findIndex(d => d.id === id && !d.deletedAt);
    if (index === -1) return null;

    const current = dbState.deliverables[index];
    const attachments = data.attachments || current.attachments;
    const fileUrl = attachments.length > 0 ? attachments[0] : null;

    const [updated] = await db.update(pgDeliverablesTable)
      .set({
        name: data.title,
        status: data.status as any,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        fileUrl,
        updatedAt: new Date()
      })
      .where(eq(pgDeliverablesTable.id, id))
      .returning();

    dbState.deliverables[index] = {
      ...current,
      ...data,
      updatedAt: updated ? updated.updatedAt.toISOString() : new Date().toISOString()
    };

    saveDatabase();
    return dbState.deliverables[index];
  }

  async deleteDeliverable(id: string): Promise<boolean> {
    const index = dbState.deliverables.findIndex(d => d.id === id && !d.deletedAt);
    if (index === -1) return false;

    await db.update(pgDeliverablesTable)
      .set({
        deletedAt: new Date()
      })
      .where(eq(pgDeliverablesTable.id, id));

    dbState.deliverables[index].deletedAt = new Date().toISOString();
    saveDatabase();
    return true;
  }

  // ==========================================
  // DOCUMENTS
  // ==========================================
  async getDocumentsByProject(projectId: string, folderPath?: string): Promise<Document[]> {
    let docs = dbState.documents.filter(d => d.projectId === projectId && !d.deletedAt);
    if (folderPath) {
      docs = docs.filter(d => d.folderPath === folderPath);
    }
    return docs;
  }

  async createDocument(data: Partial<Document>): Promise<Document> {
    // Check if document name exists in same folderPath for version incrementing!
    const folderDocs = dbState.documents.filter(
      d => d.projectId === data.projectId && d.folderPath === data.folderPath && d.name === data.name && !d.deletedAt
    );
    
    let version = 1;
    if (folderDocs.length > 0) {
      // Soft-delete the previous versions or increment version number!
      const sorted = [...folderDocs].sort((a, b) => b.version - a.version);
      version = sorted[0].version + 1;
    }

    const newDoc: Document = {
      id: generateUUID(),
      projectId: data.projectId!,
      name: data.name!,
      folderPath: data.folderPath || "/",
      version,
      tags: data.tags || [],
      category: data.category!,
      fileSize: data.fileSize || 1024,
      mimeType: data.mimeType || "application/octet-stream",
      uploadedBy: data.uploadedBy!,
      status: "DRAFT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null
    };

    dbState.documents.push(newDoc);
    saveDatabase();
    return newDoc;
  }

  // ==========================================
  // COMMENTS
  // ==========================================
  async getCommentsByEntity(entityType: string, entityId: string): Promise<Comment[]> {
    return dbState.comments.filter(
      c => c.entityType === entityType && c.entityId === entityId && !c.deletedAt
    );
  }

  async createComment(data: Partial<Comment>): Promise<Comment> {
    const newComment: Comment = {
      id: generateUUID(),
      projectId: data.projectId!,
      entityType: data.entityType! as any,
      entityId: data.entityId!,
      parentId: data.parentId || null,
      authorId: data.authorId!,
      content: data.content!,
      reactions: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null
    };

    dbState.comments.push(newComment);
    saveDatabase();
    return newComment;
  }

  async addReaction(commentId: string, reaction: string, teamMemberId: string): Promise<Comment | null> {
    const index = dbState.comments.findIndex(c => c.id === commentId && !c.deletedAt);
    if (index === -1) return null;

    const comment = dbState.comments[index];
    if (!comment.reactions) comment.reactions = {};
    if (!comment.reactions[reaction]) comment.reactions[reaction] = [];

    // Toggle reaction
    const uIndex = comment.reactions[reaction].indexOf(teamMemberId);
    if (uIndex > -1) {
      comment.reactions[reaction].splice(uIndex, 1);
      if (comment.reactions[reaction].length === 0) {
        delete comment.reactions[reaction];
      }
    } else {
      comment.reactions[reaction].push(teamMemberId);
    }

    saveDatabase();
    return comment;
  }

  async deleteComment(id: string): Promise<boolean> {
    const index = dbState.comments.findIndex(c => c.id === id && !c.deletedAt);
    if (index === -1) return false;

    dbState.comments[index].deletedAt = new Date().toISOString();
    saveDatabase();
    return true;
  }
}
