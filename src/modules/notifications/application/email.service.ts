import { EmailProvider, SMTPConfig } from "../infrastructure/providers/smtp.provider";
import { NotificationRepository } from "../infrastructure/repositories/notification.repository";

export class EmailService {
  private provider: EmailProvider;

  constructor(private repository: NotificationRepository) {
    this.provider = new EmailProvider();
  }

  private async getSMTPConfig(): Promise<SMTPConfig | null> {
    const settings = await this.repository.getSettingsByCategory("EMAIL");
    if (settings.length === 0) return null;

    const find = (key: string) => settings.find(s => s.key === key)?.value;

    return {
      host: find("SMTP_HOST") || "",
      port: Number(find("SMTP_PORT") || 587),
      secure: find("SMTP_SECURE") === "true",
      user: find("SMTP_USER") || "",
      pass: find("SMTP_PASS") || "",
      fromName: find("SMTP_FROM_NAME") || "AuraPM",
      fromEmail: find("SMTP_FROM_EMAIL") || "",
    };
  }

  async send(to: string, subject: string, html: string, text?: string) {
    try {
      const config = await this.getSMTPConfig();
      if (!config || !config.host) {
        console.warn("SMTP not configured. Skipping email.");
        return { status: "SKIPPED", reason: "NOT_CONFIGURED" };
      }

      this.provider.initialize(config);
      const result = await this.provider.send({ to, subject, html, text });
      return { status: "SENT", providerResponse: result };
    } catch (error: any) {
      console.error("Failed to send email:", error);
      return { status: "FAILED", error: error.message };
    }
  }

  async testConnection(config: SMTPConfig, testRecipient: string) {
    this.provider.initialize(config);
    const result = await this.provider.send({
      to: testRecipient,
      subject: "AuraPM SMTP Test Connection",
      html: "<h3>Success!</h3><p>This is a test email from AuraPM to verify your SMTP configuration.</p>"
    });
    return result;
  }
}
