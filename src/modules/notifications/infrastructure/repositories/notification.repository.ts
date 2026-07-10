import { db } from "../../../../shared/database/index.ts";
import { 
  notifications, 
  notificationTemplates, 
  userNotificationPreferences, 
  notificationSettings, 
  deliveryNotifications,
  users
} from "../../../../db/schema.ts";
import { eq, and, desc, sql } from "drizzle-orm";

export class NotificationRepository {
  async getInAppNotifications(userId: string, limit = 50, offset = 0) {
    return await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId as any))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getUnreadCount(userId: string) {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId as any), eq(notifications.isRead, false)));
    return Number(result[0]?.count || 0);
  }

  async markAsRead(id: string) {
    const [updated] = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id as any))
      .returning();
    return updated;
  }

  async markAllAsRead(userId: string) {
    return await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId as any))
      .returning();
  }

  async createInApp(data: any) {
    const [created] = await db.insert(notifications).values(data).returning();
    return created;
  }

  async logDelivery(data: any) {
    const [created] = await db.insert(deliveryNotifications).values(data).returning();
    return created;
  }

  async getTemplate(code: string) {
    const [template] = await db.select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.code, code))
      .limit(1);
    return template;
  }

  async getUserPreferences(userId: string) {
    return await db.select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId as any));
  }

  async getPreference(userId: string, eventCode: string) {
    const [pref] = await db.select()
      .from(userNotificationPreferences)
      .where(and(
        eq(userNotificationPreferences.userId, userId as any),
        eq(userNotificationPreferences.eventCode, eventCode)
      ))
      .limit(1);
    return pref;
  }

  async updatePreference(userId: string, eventCode: string, data: any) {
    const [updated] = await db.insert(userNotificationPreferences)
      .values({ userId: userId as any, eventCode, ...data })
      .onConflictDoUpdate({
        target: [userNotificationPreferences.userId, userNotificationPreferences.eventCode],
        set: { ...data, updatedAt: new Date() }
      })
      .returning();
    return updated;
  }

  async getSettings() {
    return await db.select().from(notificationSettings);
  }

  async getSettingsByCategory(category: string) {
    return await db.select()
      .from(notificationSettings)
      .where(eq(notificationSettings.category, category));
  }

  async updateSetting(key: string, value: string, category: string, isSecret = false) {
    const [updated] = await db.insert(notificationSettings)
      .values({ key, value, category, isSecret })
      .onConflictDoUpdate({
        target: [notificationSettings.key],
        set: { value, category, isSecret, updatedAt: new Date() }
      })
      .returning();
    return updated;
  }

  async getAllTemplates() {
    return await db.select().from(notificationTemplates).orderBy(notificationTemplates.code);
  }

  async upsertTemplate(data: any) {
    const [upserted] = await db.insert(notificationTemplates)
      .values(data)
      .onConflictDoUpdate({
        target: [notificationTemplates.code],
        set: { ...data, updatedAt: new Date() }
      })
      .returning();
    return upserted;
  }

  async getDeliveryLogs(limit = 100) {
    const logs = await db.select({
      id: deliveryNotifications.id,
      recipientId: deliveryNotifications.recipientId,
      channel: deliveryNotifications.channel,
      title: deliveryNotifications.title,
      message: deliveryNotifications.message,
      status: deliveryNotifications.status,
      createdAt: deliveryNotifications.createdAt,
      email: users.email,
      phoneNumber: users.phoneNumber
    })
    .from(deliveryNotifications)
    .leftJoin(users, sql`${deliveryNotifications.recipientId} = ${users.id}::text`)
    .orderBy(desc(deliveryNotifications.createdAt))
    .limit(limit);
    
    return logs.map(log => ({
      ...log,
      recipientContact: log.channel === 'EMAIL' ? log.email : (log.channel === 'SMS' ? log.phoneNumber : log.recipientId)
    }));
  }
}
