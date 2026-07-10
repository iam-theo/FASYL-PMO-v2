import { NotificationRepository } from "../infrastructure/repositories/notification.repository";
import { TemplateService } from "./template.service";
import { EmailService } from "./email.service";
import { SmsService } from "./sms.service";
import { InAppService } from "./inapp.service";
import { db } from "../../../shared/database/index.ts";
import { users } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";

export interface NotificationTrigger {
  eventCode: string;
  userId: string;
  data: Record<string, any>;
  entityInfo?: {
    type: string;
    id: string;
    url?: string;
  };
}

export class NotificationService {
  private templateService: TemplateService;
  private emailService: EmailService;
  private smsService: SmsService;
  private inAppService: InAppService;

  constructor(private repository: NotificationRepository) {
    this.templateService = new TemplateService();
    this.emailService = new EmailService(repository);
    this.smsService = new SmsService(repository);
    this.inAppService = new InAppService(repository);
  }

  async notify(trigger: NotificationTrigger) {
    console.log(`Processing notification for event: ${trigger.eventCode}, User: ${trigger.userId}`);

    // 1. Get User
    const [user] = await db.select().from(users).where(eq(users.id, trigger.userId as any)).limit(1);
    if (!user) {
      console.warn(`User ${trigger.userId} not found. Notification aborted.`);
      return;
    }

    // 2. Get Template
    const template = await this.repository.getTemplate(trigger.eventCode);
    if (!template) {
      console.warn(`Template for ${trigger.eventCode} not found. Notification aborted.`);
      return;
    }

    // 3. Get Preferences
    const preference = await this.repository.getPreference(trigger.userId, trigger.eventCode);
    
    // Default preferences if not set, combined with global template toggles
    const emailEnabled = template.emailEnabled && (preference ? preference.emailEnabled : true);
    const smsEnabled = template.smsEnabled && (preference ? preference.smsEnabled : false);
    const inAppEnabled = template.inAppEnabled && (preference ? preference.inAppEnabled : true);

    // 4. Prepare Content
    const data = {
      ...trigger.data,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      date: this.templateService.formatDate(new Date()),
    };

    const subject = this.templateService.parse(template.subject || "", data);
    const bodyHtml = this.templateService.parse(template.bodyHtml || "", data);
    const bodyText = this.templateService.parse(template.bodyText || "", data);
    const smsBody = this.templateService.parse(template.smsBody || template.bodyText || "", data);

    const results: any[] = [];

    // 5. Dispatch In-App
    if (inAppEnabled) {
      const result = await this.inAppService.send(trigger.userId, {
        title: subject || template.name,
        message: bodyText,
        type: trigger.eventCode,
        priority: "MEDIUM",
        entityType: trigger.entityInfo?.type,
        entityId: trigger.entityInfo?.id,
        actionUrl: trigger.entityInfo?.url,
      });
      results.push({ channel: "IN_APP", ...result });
    }

    // 6. Dispatch Email
    if (emailEnabled && user.email) {
      const result = await this.emailService.send(user.email, subject, bodyHtml, bodyText);
      results.push({ channel: "EMAIL", ...result });
    }

    // 7. Dispatch SMS
    if (smsEnabled && user.phoneNumber) {
      const result = await this.smsService.send(user.phoneNumber, smsBody);
      results.push({ channel: "SMS", ...result });
    }

    // 8. Log Delivery
    for (const res of results) {
      await this.repository.logDelivery({
        recipientId: trigger.userId,
        channel: res.channel,
        title: subject || template.name,
        message: bodyText || smsBody,
        status: res.status,
        providerResponse: res.providerResponse,
        error: res.error,
        sentAt: res.status === "SENT" ? new Date() : null,
      });
    }

    return results;
  }
}
