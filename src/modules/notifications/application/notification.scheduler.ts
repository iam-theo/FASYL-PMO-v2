import cron from "node-cron";
import { NotificationService } from "./notification.service";
import { db } from "../../../shared/database/index.ts";
import { tasks, users } from "../../../db/schema.ts";
import { eq, and, isNull, sql } from "drizzle-orm";
import { DomainEvents, eventBus } from "../domain/events";

export class NotificationScheduler {
  constructor() {}

  start() {
    // Run every day at 8:00 AM
    cron.schedule("0 8 * * *", async () => {
      console.log("[Scheduler] Running daily task reminders check...");
      await this.checkTaskReminders();
    });

    console.log("Notification Scheduler started (Daily check at 08:00).");
  }

  async checkTaskReminders() {
    try {
      // 1. Find all active tasks that are not completed or archived
      const activeTasks = await db.select()
        .from(tasks)
        .where(and(
          sql`${tasks.status} NOT IN ('COMPLETED', 'ARCHIVED')`,
          isNull(tasks.deletedAt),
          sql`${tasks.dueDate} IS NOT NULL`
        ));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const task of activeTasks) {
        if (!task.dueDate || !task.assigneeId) continue;

        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Reminders at 7, 3, and 1 day(s) before
        if ([7, 3, 1].includes(diffDays)) {
          console.log(`[Scheduler] Sending ${diffDays}-day reminder for task: ${task.title} to User: ${task.assigneeId}`);
          
          eventBus.publish(DomainEvents.TASK_OVERDUE, {
            userId: task.assigneeId,
            payload: {
              taskName: task.title,
              daysLeft: diffDays,
              dueDate: task.dueDate.toLocaleDateString(),
            },
            entityInfo: {
              type: "TASK",
              id: task.id,
            }
          });
        }
      }
    } catch (error) {
      console.error("[Scheduler] Error checking task reminders:", error);
    }
  }
}
