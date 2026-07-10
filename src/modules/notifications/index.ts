import { NotificationRepository } from "./infrastructure/repositories/notification.repository";
import { NotificationService } from "./application/notification.service";
import { EventListener } from "./application/event.listener";
import { NotificationScheduler } from "./application/notification.scheduler";
import { notificationRouter } from "./interface/notification.router";

class NotificationModule {
  private repository: NotificationRepository;
  private service: NotificationService;
  private listener: EventListener;
  private scheduler: NotificationScheduler;

  constructor() {
    this.repository = new NotificationRepository();
    this.service = new NotificationService(this.repository);
    this.listener = new EventListener(this.service);
    this.scheduler = new NotificationScheduler();
  }

  async init() {
    this.listener.listen();
    this.scheduler.start();
    console.log("Notification Module initialized successfully.");
  }

  getRouter() {
    return notificationRouter;
  }
}

export const notificationModule = new NotificationModule();
export default notificationModule;
