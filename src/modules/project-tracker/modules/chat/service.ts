import { ChatRepository } from "./repository.ts";
import { ChatMessage } from "../../types.ts";

export class ChatService {
  private repository = new ChatRepository();

  async getMessages(projectId: string): Promise<ChatMessage[]> {
    return this.repository.getMessagesByProject(projectId);
  }

  async sendMessage(data: Partial<ChatMessage>): Promise<ChatMessage> {
    if (!data.content || !data.projectId || !data.authorId) {
      throw new Error("Missing required message fields");
    }
    return this.repository.createMessage(data);
  }
}
