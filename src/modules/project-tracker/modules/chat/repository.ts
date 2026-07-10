import { dbState, generateUUID, saveDatabase } from "../../db.ts";
import { ChatMessage } from "../../types.ts";
import { db } from "../../../../shared/database/index.ts";
import { chatMessages as pgChatMessagesTable } from "../../../../db/schema.ts";

export class ChatRepository {
  async getMessagesByProject(projectId: string): Promise<ChatMessage[]> {
    return dbState.chatMessages.filter(m => m.projectId === projectId);
  }

  async createMessage(data: Partial<ChatMessage>): Promise<ChatMessage> {
    const id = generateUUID();

    const [inserted] = await db.insert(pgChatMessagesTable).values({
      id,
      projectId: data.projectId!,
      authorId: data.authorId!,
      authorName: data.authorName!,
      content: data.content!,
    }).returning();

    const newMessage: ChatMessage = {
      id: inserted.id,
      projectId: inserted.projectId,
      authorId: inserted.authorId,
      authorName: inserted.authorName,
      content: inserted.content,
      createdAt: inserted.createdAt.toISOString()
    };

    dbState.chatMessages.push(newMessage);
    saveDatabase();
    return newMessage;
  }
}
