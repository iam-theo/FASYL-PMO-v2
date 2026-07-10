import axios from "axios";

export interface TermiiConfig {
  apiKey: string;
  senderId: string;
  channel: string; // dnd, whatsapp, generic
}

export class TermiiProvider {
  private config: TermiiConfig | null = null;
  private readonly baseUrl = "https://api.ng.termii.com/api";

  constructor(config?: TermiiConfig) {
    if (config) {
      this.config = config;
    }
  }

  initialize(config: TermiiConfig) {
    this.config = config;
  }

  async sendSMS(to: string, message: string) {
    if (!this.config) {
      throw new Error("Termii provider not initialized");
    }

    // Ensure phone number format
    const formattedTo = to.startsWith("+") ? to.substring(1) : to;

    const payload = {
      to: formattedTo,
      from: this.config.senderId,
      sms: message,
      type: "plain",
      channel: this.config.channel,
      api_key: this.config.apiKey,
    };

    const response = await axios.post(`${this.baseUrl}/sms/send`, payload);
    return response.data;
  }

  async verifyConnection() {
    if (!this.config) return false;
    try {
      // Small check to verify API Key
      await axios.get(`${this.baseUrl}/get-balance?api_key=${this.config.apiKey}`);
      return true;
    } catch (error) {
      console.error("Termii connection failed:", error);
      return false;
    }
  }
}
