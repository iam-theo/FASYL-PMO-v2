import nodemailer from "nodemailer";

export interface EmailOptions {
  from?: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export class EmailProvider {
  private transporter: nodemailer.Transporter | null = null;
  private config: SMTPConfig | null = null;

  constructor(config?: SMTPConfig) {
    if (config) {
      this.initialize(config);
    }
  }

  initialize(config: SMTPConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  async send(options: EmailOptions) {
    if (!this.transporter || !this.config) {
      throw new Error("Email provider not initialized");
    }

    const info = await this.transporter.sendMail({
      from: options.from || `"${this.config.fromName}" <${this.config.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return info;
  }

  async verifyConnection() {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("SMTP Connection failed:", error);
      return false;
    }
  }
}
