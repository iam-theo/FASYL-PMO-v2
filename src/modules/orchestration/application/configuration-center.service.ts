import { db } from "../../../shared/database/index.ts";
import { systemConfigurations } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";
import logger from "../../../shared/infrastructure/logger.ts";

export interface ConfigItem {
  key: string;
  value: any;
  category: string;
  updatedBy?: string;
}

export class ConfigurationCenterService {
  private cache = new Map<string, any>();

  constructor() {
    // Initialization deferred to init() method
  }

  public async seedDefaultConfigs() {
    try {
      const defaults: ConfigItem[] = [
        {
          key: "sla.default.duration.days",
          value: 30,
          category: "SLA",
        },
        {
          key: "sla.escalation.matrix",
          value: {
            level1: { warningDays: 5, role: "pmo_director" },
            level2: { warningDays: 10, role: "head_of_operations" },
            level3: { warningDays: 15, role: "vp_delivery" },
          },
          category: "SLA",
        },
        {
          key: "notification.templates.welcome",
          value: {
            title: "Welcome to FASYL PMO Enterprise",
            body: "Hello {name}, your enterprise delivery account is activated.",
            sms: "FASYL PMO Account Activated: Hello {name}!",
          },
          category: "NOTIFICATION",
        },
        {
          key: "notification.templates.stage_unlocked",
          value: {
            title: "Project stage gate unlocked!",
            body: "Attention: Project '{projectName}' has successfully transitioned to Stage '{stageName}'.",
          },
          category: "NOTIFICATION",
        },
        {
          key: "feature.flags.ai_hallucination_guard",
          value: true,
          category: "FEATURE_FLAGS",
        },
        {
          key: "feature.flags.oauth_auto_reconnect",
          value: false,
          category: "FEATURE_FLAGS",
        },
        {
          key: "system.holiday_calendar",
          value: ["2026-01-01", "2026-07-04", "2026-12-25"],
          category: "CALENDAR",
        },
        {
          key: "system.working_hours",
          value: { start: "09:00", end: "17:00", days: [1, 2, 3, 4, 5] },
          category: "CALENDAR",
        },
        {
          key: "finance.currencies",
          value: { primary: "USD", allowed: ["USD", "EUR", "GBP", "SGD"] },
          category: "FINANCE",
        },
        {
          key: "ai.model.primary",
          value: "gemini-3.5-flash",
          category: "AI",
        },
        {
          key: "ai.model.fallback",
          value: "gemini-3.1-flash-lite",
          category: "AI",
        },
        {
          key: "ai.rate_limits.tokens_per_minute",
          value: 100000,
          category: "AI",
        },
      ];

      for (const item of defaults) {
        const existing = await db
          .select()
          .from(systemConfigurations)
          .where(eq(systemConfigurations.configKey, item.key))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(systemConfigurations).values({
            configKey: item.key,
            configValue: JSON.stringify(item.value),
            category: item.category,
            updatedBy: "system-setup",
          });
          logger.info(`Seeded default config: ${item.key}`);
        }
      }
    } catch (err) {
      logger.error({ err }, "Error seeding default configuration matrices");
    }
  }

  public async get<T>(key: string, defaultValue?: T): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    try {
      const records = await db
        .select()
        .from(systemConfigurations)
        .where(eq(systemConfigurations.configKey, key))
        .limit(1);

      if (records.length > 0) {
        const parsed = JSON.parse(records[0].configValue);
        this.cache.set(key, parsed);
        return parsed as T;
      }
    } catch (err) {
      logger.error({ err }, `Failed to fetch config key: ${key}`);
    }

    return defaultValue as T;
  }

  public async set<T>(key: string, value: T, category: string, actorId: string): Promise<void> {
    const serializedValue = JSON.stringify(value);
    try {
      const existing = await db
        .select()
        .from(systemConfigurations)
        .where(eq(systemConfigurations.configKey, key))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(systemConfigurations)
          .set({
            configValue: serializedValue,
            category,
            updatedBy: actorId,
            updatedAt: new Date(),
          })
          .where(eq(systemConfigurations.configKey, key));
      } else {
        await db.insert(systemConfigurations).values({
          configKey: key,
          configValue: serializedValue,
          category,
          updatedBy: actorId,
        });
      }

      this.cache.set(key, value);
      logger.info(`Configuration updated: ${key} by ${actorId}`);
    } catch (err) {
      logger.error({ err }, `Failed to set config key: ${key}`);
      throw err;
    }
  }

  public async getByCategory(category: string): Promise<Record<string, any>> {
    try {
      const records = await db
        .select()
        .from(systemConfigurations)
        .where(eq(systemConfigurations.category, category));

      const configs: Record<string, any> = {};
      for (const r of records) {
        configs[r.configKey] = JSON.parse(r.configValue);
      }
      return configs;
    } catch (err) {
      logger.error({ err }, `Failed to fetch configs for category: ${category}`);
      return {};
    }
  }

  public clearCache(): void {
    this.cache.clear();
  }
}
