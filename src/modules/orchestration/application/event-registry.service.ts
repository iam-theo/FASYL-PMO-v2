import { db } from "../../../shared/database/index.ts";
import { eventRegistryCatalog } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";
import logger from "../../../shared/infrastructure/logger.ts";

export class EventRegistryService {
  constructor() {
    // Initialization deferred to init() method
  }

  public async seedEventRegistry() {
    try {
      const defaultEvents = [
        {
          eventName: "lead.converted",
          publisher: "marketing",
          subscribers: ["enterprise", "orchestration", "analytics"],
          schema: {
            type: "object",
            properties: {
              leadId: { type: "string" },
              projectName: { type: "string" },
              convertedBy: { type: "string" },
            },
            required: ["leadId", "projectName"],
          },
        },
        {
          eventName: "lifecycle.stage.unlocked",
          publisher: "enterprise",
          subscribers: ["orchestration", "notification", "workflow"],
          schema: {
            type: "object",
            properties: {
              instanceId: { type: "string" },
              stageId: { type: "string" },
              stageName: { type: "string" },
            },
            required: ["instanceId", "stageId"],
          },
        },
        {
          eventName: "sla.escalation.triggered",
          publisher: "workflow",
          subscribers: ["orchestration", "notification", "audit"],
          schema: {
            type: "object",
            properties: {
              instanceId: { type: "string" },
              stageId: { type: "string" },
              level: { type: "integer" },
            },
            required: ["instanceId", "level"],
          },
        },
      ];

      for (const ev of defaultEvents) {
        const existing = await db
          .select()
          .from(eventRegistryCatalog)
          .where(eq(eventRegistryCatalog.eventName, ev.eventName))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(eventRegistryCatalog).values({
            eventName: ev.eventName,
            publisher: ev.publisher,
            subscribersJson: JSON.stringify(ev.subscribers),
            schemaJson: JSON.stringify(ev.schema),
            retryPolicyJson: JSON.stringify({ maxRetries: 3, backoffFactor: 2 }),
          });
          logger.info(`Seeded Event Registry item: ${ev.eventName}`);
        }
      }
    } catch (err) {
      logger.error({ err }, "Failed to seed event registry catalog");
    }
  }

  public async getEventCatalog(): Promise<any[]> {
    try {
      return await db.select().from(eventRegistryCatalog);
    } catch (err) {
      logger.error({ err }, "Failed to fetch event registry catalog list");
      return [];
    }
  }

  public async getEventSchema(eventName: string): Promise<any> {
    try {
      const records = await db
        .select()
        .from(eventRegistryCatalog)
        .where(eq(eventRegistryCatalog.eventName, eventName))
        .limit(1);
      return records.length > 0 ? JSON.parse(records[0].schemaJson || "{}") : null;
    } catch (err) {
      logger.error({ err }, `Error retrieving event schema for '${eventName}'`);
      return null;
    }
  }
}
