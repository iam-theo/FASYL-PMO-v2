import { NotificationRepository } from "./repositories/notification.repository";
import { DomainEvents } from "../domain/events";

export async function seedNotifications() {
  const repository = new NotificationRepository();

  console.log("Seeding Notification Templates...");

  const templates = [
    {
      code: DomainEvents.USER_CREATED,
      name: "Welcome Email",
      subject: "Welcome to AuraPM, {{ firstName }}!",
      bodyHtml: "<h3>Welcome!</h3><p>Hello {{ fullName }}, your account has been created successfully. You can now log in to the portal.</p>",
      bodyText: "Hello {{ fullName }}, your account has been created successfully. Welcome to AuraPM!",
      smsBody: "Welcome to AuraPM, {{ firstName }}! Your account is ready.",
      category: "IAM",
      emailEnabled: true,
      smsEnabled: true,
      inAppEnabled: true
    },
    {
      code: DomainEvents.TASK_ASSIGNED,
      name: "Task Assignment",
      subject: "New Task Assigned: {{ taskName }}",
      bodyHtml: "<h3>New Task!</h3><p>You have been assigned a new task: <strong>{{ taskName }}</strong>.</p><p>Due Date: {{ dueDate }}</p>",
      bodyText: "You have been assigned a new task: {{ taskName }}. Due Date: {{ dueDate }}",
      smsBody: "AuraPM: New task assigned - {{ taskName }}. Due: {{ dueDate }}",
      category: "TASK",
      emailEnabled: true,
      smsEnabled: false,
      inAppEnabled: true
    },
    {
      code: DomainEvents.TASK_OVERDUE,
      name: "Task Reminder",
      subject: "Reminder: {{ taskName }} is due in {{ daysLeft }} days",
      bodyHtml: "<h3>Task Reminder</h3><p>The task <strong>{{ taskName }}</strong> is due in {{ daysLeft }} days ({{ dueDate }}).</p>",
      bodyText: "The task {{ taskName }} is due in {{ daysLeft }} days ({{ dueDate }}).",
      smsBody: "AuraPM Reminder: {{ taskName }} is due in {{ daysLeft }} days.",
      category: "TASK",
      emailEnabled: true,
      smsEnabled: false,
      inAppEnabled: true
    },
    {
      code: DomainEvents.PROJECT_ASSIGNED,
      name: "Project Assignment",
      subject: "Project Assigned: {{ projectName }}",
      bodyHtml: "<h3>New Project Assignment</h3><p>You have been assigned to the project: <strong>{{ projectName }}</strong>.</p>",
      bodyText: "You have been assigned to the project: {{ projectName }}.",
      smsBody: "AuraPM: You've been assigned to project {{ projectName }}.",
      category: "PROJECT",
      emailEnabled: true,
      smsEnabled: false,
      inAppEnabled: true
    }
  ];

  for (const template of templates) {
    await repository.upsertTemplate(template);
  }

  console.log("Seeding Default Notification Settings...");

  const defaultSettings = [
    // SMTP (Placeholders)
    { key: "SMTP_HOST", value: "smtp.example.com", category: "EMAIL", isSecret: false },
    { key: "SMTP_PORT", value: "587", category: "EMAIL", isSecret: false },
    { key: "SMTP_USER", value: "user@example.com", category: "EMAIL", isSecret: false },
    { key: "SMTP_PASS", value: "password", category: "EMAIL", isSecret: true },
    { key: "SMTP_FROM_NAME", value: "AuraPM Notifications", category: "EMAIL", isSecret: false },
    { key: "SMTP_FROM_EMAIL", value: "no-reply@aurapm.com", category: "EMAIL", isSecret: false },
    { key: "SMTP_SECURE", value: "false", category: "EMAIL", isSecret: false },
    
    // Termii (Placeholders)
    { key: "TERMII_API_KEY", value: "your_api_key", category: "SMS", isSecret: true },
    { key: "TERMII_SENDER_ID", value: "AuraPM", category: "SMS", isSecret: false },
    { key: "TERMII_CHANNEL", value: "generic", category: "SMS", isSecret: false },

    // Workflow Reminder Rules
    { key: "TASK_REMINDER_DAYS", value: "3", category: "WORKFLOW", isSecret: false },
    { key: "PROJECT_REMINDER_DAYS", value: "7", category: "WORKFLOW", isSecret: false },
    { key: "RISK_REVIEW_REMINDER_DAYS", value: "5", category: "WORKFLOW", isSecret: false }
  ];

  for (const setting of defaultSettings) {
    await repository.updateSetting(setting.key, setting.value, setting.category, setting.isSecret);
  }

  console.log("Notification Seeding completed.");
}
