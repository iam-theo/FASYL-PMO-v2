import { eventBus, DomainEvents } from "../domain/events";
import { NotificationService } from "./notification.service";

export class EventListener {
  constructor(private notificationService: NotificationService) {}

  listen() {
    // Register listeners for all domain events
    Object.values(DomainEvents).forEach(event => {
      eventBus.subscribe(event, async (data: any) => {
        try {
          console.log(`[EventListener] Received event: ${event}`);
          await this.notificationService.notify({
            eventCode: event,
            userId: data.userId,
            data: data.payload || {},
            entityInfo: data.entityInfo
          });
        } catch (error) {
          console.error(`[EventListener] Error processing event ${event}:`, error);
        }
      });
    });

    console.log("Notification Event Listener started and subscribed to DomainEvents.");
  }
}
