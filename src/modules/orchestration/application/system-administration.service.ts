import { db } from "../../../shared/database/index.ts";
import { tenantSettings } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";
import logger from "../../../shared/infrastructure/logger.ts";

export class SystemAdministrationService {
  constructor() {
    // Initialization deferred to init() method
  }

  public async seedDefaultSettings() {
    try {
      const existing = await db.select().from(tenantSettings).limit(1);
      if (existing.length === 0) {
        await db.insert(tenantSettings).values({
          orgName: "FASYL PMO Global Holdings",
          maintenanceMode: false,
          licenseKey: "FASYL-ENT-2026-999-PROD",
          licenseStatus: "ACTIVE",
          settingsJson: JSON.stringify({
            divisions: ["North America Delivery", "EMEA Operations", "APAC Innovation Hub"],
            allowedSsoDomains: ["fasylpmo.com", "globalholdings.com"],
            enforcePasswordMfa: true,
          }),
        });
        logger.info("Seeded default System Administration tenant settings");
      }
    } catch (err) {
      logger.error({ err }, "Error seeding tenant settings");
    }
  }

  public async getSettings(): Promise<any> {
    try {
      const records = await db.select().from(tenantSettings).limit(1);
      return records[0] || null;
    } catch (err) {
      logger.error({ err }, "Failed to load System Administration settings");
      throw err;
    }
  }

  public async updateOrgSettings(orgName: string, settings: any): Promise<any> {
    try {
      const current = await this.getSettings();
      if (!current) throw new Error("Tenant settings record not found");

      const [record] = await db
        .update(tenantSettings)
        .set({
          orgName,
          settingsJson: JSON.stringify(settings),
          updatedAt: new Date(),
        })
        .where(eq(tenantSettings.id, current.id))
        .returning();
      return record;
    } catch (err) {
      logger.error({ err }, "Failed to update corporate settings");
      throw err;
    }
  }

  public async toggleMaintenanceMode(maintenanceMode: boolean): Promise<any> {
    try {
      const current = await this.getSettings();
      if (!current) throw new Error("Tenant settings record not found");

      const [record] = await db
        .update(tenantSettings)
        .set({
          maintenanceMode,
          updatedAt: new Date(),
        })
        .where(eq(tenantSettings.id, current.id))
        .returning();
      
      logger.warn(`[System Admin] Maintenance Mode set to: ${maintenanceMode}`);
      return record;
    } catch (err) {
      logger.error({ err }, "Failed to toggle Maintenance Mode");
      throw err;
    }
  }
}
