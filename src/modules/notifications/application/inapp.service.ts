import { NotificationRepository } from "../infrastructure/repositories/notification.repository";

export class InAppService {
  constructor(private repository: NotificationRepository) {}

  async send(userId: string, data: {
    title: string;
    message: string;
    type: string;
    priority?: string;
    icon?: string;
    entityType?: string;
    entityId?: string;
    actionUrl?: string;
  }) {
    try {
      const result = await this.repository.createInApp({
        userId,
        ...data,
        isRead: false,
        isDelivered: true,
        createdAt: new Date(),
      });
      return { status: "SENT", providerResponse: result };
    } catch (error: any) {
      console.error("Failed to create in-app notification:", error);
      return { status: "FAILED", error: error.message };
    }
  }
}
