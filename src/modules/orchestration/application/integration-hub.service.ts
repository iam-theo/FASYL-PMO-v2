import { db } from "../../../shared/database/index.ts";
import { integrationConfigs } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";
import logger from "../../../shared/infrastructure/logger.ts";

export class IntegrationHubService {
  constructor() {
    // Initialization deferred to init() method
  }

  public async seedDefaultConnectors() {
    try {
      const defaultConnectors = [
        { name: "SAP", isEnabled: true },
        { name: "JIRA", isEnabled: true },
        { name: "SALESFORCE", isEnabled: false },
        { name: "GITHUB", isEnabled: true },
        { name: "SLACK", isEnabled: false },
      ];

      for (const conn of defaultConnectors) {
        const existing = await db
          .select()
          .from(integrationConfigs)
          .where(eq(integrationConfigs.connectorName, conn.name))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(integrationConfigs).values({
            connectorName: conn.name,
            isEnabled: conn.isEnabled,
            credentialsJson: JSON.stringify({ host: `https://api.enterprise.domain/${conn.name.toLowerCase()}` }),
            mappingJson: JSON.stringify({
              projectCode: "custom_field_1001",
              budget: "amount_field",
              status: "state_field",
            }),
          });
          logger.info(`Seeded Integration Hub connector: ${conn.name}`);
        }
      }
    } catch (err) {
      logger.error({ err }, "Error seeding standard integration hub configurations");
    }
  }

  public async getConnectors(): Promise<any[]> {
    try {
      return await db.select().from(integrationConfigs);
    } catch (err) {
      logger.error({ err }, "Failed to load integration configurations");
      return [];
    }
  }

  public async toggleConnector(name: string, isEnabled: boolean): Promise<any> {
    try {
      const [record] = await db
        .update(integrationConfigs)
        .set({
          isEnabled,
          updatedAt: new Date(),
        })
        .where(eq(integrationConfigs.connectorName, name))
        .returning();
      return record;
    } catch (err) {
      logger.error({ err }, `Failed to toggle integration connector state for: ${name}`);
      throw err;
    }
  }

  public async syncEntity(connectorName: string, entityType: string, payload: any): Promise<any> {
    try {
      const records = await db
        .select()
        .from(integrationConfigs)
        .where(eq(integrationConfigs.connectorName, connectorName))
        .limit(1);

      if (records.length === 0 || !records[0].isEnabled) {
        throw new Error(`Connector '${connectorName}' is either non-existent or disabled.`);
      }

      logger.info(`[Integration Hub] Syncing ${entityType} via connector ${connectorName}...`);
      
      // Perform simulated sync and return ticket details
      const ticketId = `TKT-${Math.floor(Math.random() * 900000) + 100000}`;
      return {
        status: "SYNCHRONIZED",
        connector: connectorName,
        remoteTicketId: ticketId,
        syncedAt: new Date(),
        payloadExchanged: payload,
      };
    } catch (err) {
      logger.error({ err }, `Sync failed on connector ${connectorName} for entity ${entityType}`);
      throw err;
    }
  }
}
