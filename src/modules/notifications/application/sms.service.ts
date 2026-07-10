import { TermiiProvider, TermiiConfig } from "../infrastructure/providers/termii.provider";
import { NotificationRepository } from "../infrastructure/repositories/notification.repository";

export class SmsService {
  private provider: TermiiProvider;

  constructor(private repository: NotificationRepository) {
    this.provider = new TermiiProvider();
  }

  private async getTermiiConfig(): Promise<TermiiConfig | null> {
    const settings = await this.repository.getSettingsByCategory("SMS");
    if (settings.length === 0) return null;

    const find = (key: string) => settings.find(s => s.key === key)?.value;

    return {
      apiKey: find("TERMII_API_KEY") || "",
      senderId: find("TERMII_SENDER_ID") || "AuraPM",
      channel: find("TERMII_CHANNEL") || "generic",
    };
  }

  async send(to: string, message: string) {
    if (!to) return { status: "SKIPPED", reason: "NO_PHONE_NUMBER" };

    try {
      const config = await this.getTermiiConfig();
      if (!config || !config.apiKey) {
        console.warn("SMS not configured. Skipping SMS.");
        return { status: "SKIPPED", reason: "NOT_CONFIGURED" };
      }

      this.provider.initialize(config);
      const result = await this.provider.sendSMS(to, message);
      return { status: "SENT", providerResponse: result };
    } catch (error: any) {
      console.error("Failed to send SMS:", error);
      return { status: "FAILED", error: error.message };
    }
  }

  async testConnection(config: TermiiConfig, testRecipient: string) {
    this.provider.initialize(config);
    const result = await this.provider.sendSMS(testRecipient, "AuraPM SMS Test: Connection Successful!");
    return result;
  }
}
