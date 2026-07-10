import { Request, Response, NextFunction } from "express";
import { NotificationRepository } from "../infrastructure/repositories/notification.repository";
import { NotificationService } from "../application/notification.service";
import { EmailService } from "../application/email.service";
import { SmsService } from "../application/sms.service";

export class NotificationController {
  private repository: NotificationRepository;
  private notificationService: NotificationService;
  private emailService: EmailService;
  private smsService: SmsService;

  constructor() {
    this.repository = new NotificationRepository();
    this.notificationService = new NotificationService(this.repository);
    this.emailService = new EmailService(this.repository);
    this.smsService = new SmsService(this.repository);
  }

  getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const notifications = await this.repository.getInAppNotifications(userId, limit, offset);
      const unreadCount = await this.repository.getUnreadCount(userId);
      
      res.json({
        status: "success",
        data: {
          notifications,
          unreadCount
        }
      });
    } catch (error) {
      next(error);
    }
  };

  getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const unreadCount = await this.repository.getUnreadCount(userId);
      res.json({ status: "success", data: { unreadCount } });
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.repository.markAsRead(id);
      res.json({ status: "success", message: "Notification marked as read" });
    } catch (error) {
      next(error);
    }
  };

  markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      await this.repository.markAllAsRead(userId);
      res.json({ status: "success", message: "All notifications marked as read" });
    } catch (error) {
      next(error);
    }
  };

  getPreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const preferences = await this.repository.getUserPreferences(userId);
      res.json({ status: "success", data: preferences });
    } catch (error) {
      next(error);
    }
  };

  updatePreference = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const { eventCode, emailEnabled, smsEnabled, inAppEnabled, frequency } = req.body;
      const pref = await this.repository.updatePreference(userId, eventCode, {
        emailEnabled,
        smsEnabled,
        inAppEnabled,
        frequency
      });
      res.json({ status: "success", data: pref });
    } catch (error) {
      next(error);
    }
  };

  // ADMIN ENDPOINTS
  getSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await this.repository.getSettings();
      // Mask secret values
      const masked = settings.map(s => s.isSecret ? { ...s, value: "********" } : s);
      res.json({ status: "success", data: masked });
    } catch (error) {
      next(error);
    }
  };

  updateSetting = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { key, category, isSecret } = req.body;
      let { value } = req.body;

      if (value === "********") {
        return res.json({ status: "success", data: { key, category, isSecret, value: "********" } });
      }

      // Trim whitespace from config values to prevent ENOTFOUND errors
      if (typeof value === "string") {
        value = value.trim();
      }

      const setting = await this.repository.updateSetting(key, value, category, isSecret);
      res.json({ status: "success", data: { ...setting, value: isSecret ? "********" : setting.value } });
    } catch (error) {
      next(error);
    }
  };

  getTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const templates = await this.repository.getAllTemplates();
      res.json({ status: "success", data: templates });
    } catch (error) {
      next(error);
    }
  };

  updateTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.params;
      const data = req.body;
      const template = await this.repository.upsertTemplate({ ...data, code });
      res.json({ status: "success", data: template });
    } catch (error) {
      next(error);
    }
  };

  testEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { config, recipient } = req.body;
      const settings = await this.repository.getSettingsByCategory("EMAIL");
      const realConfig = { ...config };

      // Trim values
      Object.keys(realConfig).forEach(key => {
        if (typeof realConfig[key] === "string") {
          realConfig[key] = realConfig[key].trim();
        }
      });
      
      if (realConfig.pass === "********") {
        realConfig.pass = settings.find(s => s.key === "SMTP_PASS")?.value || "";
      }

      const result = await this.emailService.testConnection(realConfig, recipient);
      res.json({ status: "success", data: result });
    } catch (error) {
      next(error);
    }
  };

  testSms = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { config, recipient } = req.body;
      const settings = await this.repository.getSettingsByCategory("SMS");
      const realConfig = { ...config };

      // Trim values
      Object.keys(realConfig).forEach(key => {
        if (typeof realConfig[key] === "string") {
          realConfig[key] = realConfig[key].trim();
        }
      });
      
      if (realConfig.apiKey === "********") {
        realConfig.apiKey = settings.find(s => s.key === "TERMII_API_KEY")?.value || "";
      }

      const result = await this.smsService.testConnection(realConfig, recipient);
      res.json({ status: "success", data: result });
    } catch (error) {
      next(error);
    }
  };

  getLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const logs = await this.repository.getDeliveryLogs();
      const enriched = logs.map(log => ({
        ...log,
        recipientContact: log.channel === "EMAIL" ? log.email : (log.channel === "SMS" ? log.phoneNumber : log.email || log.phoneNumber)
      }));
      res.json({ status: "success", data: enriched });
    } catch (error) {
      next(error);
    }
  };
}
