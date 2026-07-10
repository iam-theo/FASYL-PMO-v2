import { db } from "../../../shared/database/index.ts";
import { deliveryNotifications } from "../../../db/schema.ts";
import { eq, desc } from "drizzle-orm";
import logger from "../../../shared/infrastructure/logger.ts";
import { ConfigurationCenterService } from "./configuration-center.service.ts";

export class NotificationCenterService {
  private configCenter = new ConfigurationCenterService();

  public async send(
    recipientId: string,
    channel: "IN_APP" | "EMAIL" | "SMS" | "SLACK" | "TEAMS" | "WEBHOOK",
    templateKey: string,
    placeholders: Record<string, string>,
    priority: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM"
  ): Promise<any> {
    try {
      // Fetch the template configured in Configuration Center
      const template = await this.configCenter.get<any>(
        templateKey,
        {
          title: "FASYL PMO Alert",
          body: "System Alert: Notification payload missing for " + templateKey,
        }
      );

      let title = template.title || "Alert";
      let body = template.body || "";
      
      const enabledChannels: ("IN_APP" | "EMAIL" | "SMS")[] = [];
      if (template.inAppEnabled !== false) enabledChannels.push("IN_APP"); // Default to true if not specified
      if (template.emailEnabled) enabledChannels.push("EMAIL");
      if (template.smsEnabled) enabledChannels.push("SMS");

      // Replace placeholders
      for (const [key, value] of Object.entries(placeholders)) {
        title = title.replace(new RegExp(`{${key}}`, "g"), value);
        body = body.replace(new RegExp(`{${key}}`, "g"), value);
      }

      const results = [];
      for (const targetChannel of enabledChannels) {
        // Record dispatch in Delivery Notifications Table
        const [record] = await db
          .insert(deliveryNotifications)
          .values({
            recipientId,
            channel: targetChannel as any,
            title,
            message: targetChannel === "SMS" && template.sms ? template.sms.replace(new RegExp(`{${Object.keys(placeholders).join("|")}|}`, "g"), (m: string) => placeholders[m.replace(/[{}]/g, "")] || m) : body,
            status: "PENDING",
            retries: 0,
          })
          .returning();

        // Simulate channel connectors / handlers
        this.dispatchToChannel(record.id, targetChannel, title, body)
          .then(async (success) => {
            if (success) {
              await db
                .update(deliveryNotifications)
                .set({
                  status: "SENT",
                  sentAt: new Date(),
                })
                .where(eq(deliveryNotifications.id, record.id));
            } else {
              await db
                .update(deliveryNotifications)
                .set({
                  status: "FAILED",
                })
                .where(eq(deliveryNotifications.id, record.id));
            }
          })
          .catch((err) => {
            logger.error({ err }, `Notification delivery thread failed for notification ${record.id}`);
          });
        
        results.push(record);
      }

      return results;
    } catch (err) {
      logger.error({ err }, `Failed to send unified notification to recipient: ${recipientId}`);
      throw err;
    }
  }

  private async dispatchToChannel(
    notificationId: string,
    channel: string,
    title: string,
    body: string
  ): Promise<boolean> {
    logger.info(`[Channel Connect] Dispatching '${title}' via channel ${channel}...`);
    
    // Failover simulator
    if (Math.random() < 0.05) {
      logger.warn(`[Channel Connect] Transmit failure on ${channel} for ${notificationId}. Retrying...`);
      return false; // Triggers simulated retry flow
    }
    
    logger.info(`[Channel Connect] Confirmed delivery on ${channel} for ${notificationId}`);
    return true;
  }

  public async markAsRead(notificationId: string): Promise<any> {
    try {
      const [record] = await db
        .update(deliveryNotifications)
        .set({
          status: "READ",
          readAt: new Date(),
        })
        .where(eq(deliveryNotifications.id, notificationId))
        .returning();
      return record;
    } catch (err) {
      logger.error({ err }, `Failed to record read receipt for notification: ${notificationId}`);
      throw err;
    }
  }

  public async getUnreadInApp(recipientId: string): Promise<any[]> {
    try {
      return await db
        .select()
        .from(deliveryNotifications)
        .where(eq(deliveryNotifications.recipientId, recipientId))
        .orderBy(desc(deliveryNotifications.createdAt));
    } catch (err) {
      logger.error({ err }, `Failed to fetch unread in-app notifications for: ${recipientId}`);
      return [];
    }
  }

  public async generateDigest(recipientId: string): Promise<string> {
    try {
      const unread = await this.getUnreadInApp(recipientId);
      if (unread.length === 0) {
        return "No unread alerts in your digest.";
      }
      
      const lines = unread.map((n) => `- [${n.channel}] ${n.title}: ${n.message}`);
      return `Daily Digest for ${recipientId}:\n\n` + lines.join("\n");
    } catch (err) {
      logger.error({ err }, "Failed to generate summary digest list");
      return "Digest creation failed.";
    }
  }
}
