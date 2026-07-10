import { db } from "../../../shared/database/index.ts";
import { backgroundJobs, schedulerJobs } from "../../../db/schema.ts";
import { eq, desc } from "drizzle-orm";
import logger from "../../../shared/infrastructure/logger.ts";
import { ConfigurationCenterService } from "./configuration-center.service.ts";

export class SchedulerService {
  private configCenter = new ConfigurationCenterService();

  public async scheduleJob(
    name: string,
    payload: any,
    options: {
      priority?: number; // 0 = lowest, 10 = critical
      runAt?: Date; // delayed trigger
      maxRetries?: number;
      queueName?: string;
    } = {}
  ): Promise<any> {
    try {
      // Validate with Working Hours and Calendar (from Config Center) if necessary
      const holidays = await this.configCenter.get<string[]>("system.holiday_calendar", []);
      const workingHours = await this.configCenter.get<any>("system.working_hours", {
        days: [1, 2, 3, 4, 5],
      });

      let targetDate = options.runAt || new Date();

      // Simple Calendar Correction: if runAt falls on weekend/holiday, shift to next business day morning
      const isWeekend = (d: Date) => !workingHours.days.includes(d.getDay());
      const isHoliday = (d: Date) => {
        const isoString = d.toISOString().split("T")[0];
        return holidays.includes(isoString);
      };

      while (isWeekend(targetDate) || isHoliday(targetDate)) {
        targetDate.setDate(targetDate.getDate() + 1);
        targetDate.setHours(9, 0, 0, 0); // adjust to morning office hours
      }

      const [job] = await db
        .insert(backgroundJobs)
        .values({
          name,
          status: "PENDING",
          priority: options.priority !== undefined ? options.priority : 0,
          payload: JSON.stringify(payload),
          retries: 0,
          maxRetries: options.maxRetries !== undefined ? options.maxRetries : 3,
          queueName: options.queueName || "default",
          runAt: targetDate,
        })
        .returning();

      logger.info(`[Scheduler] Registered job ${job.id} ('${name}') scheduled at ${targetDate.toISOString()}`);
      return job;
    } catch (err) {
      logger.error({ err }, `Scheduler failed to queue job '${name}'`);
      throw err;
    }
  }

  public async recordSchedulerHeartbeat(jobName: string, status: "SUCCESS" | "FAILED", errorMessage?: string): Promise<void> {
    try {
      await db.insert(schedulerJobs).values({
        jobName,
        lastRunAt: new Date(),
        status,
        errorMessage: errorMessage || null,
      });
    } catch (err) {
      logger.error({ err }, `Failed to audit scheduler run for cron: ${jobName}`);
    }
  }

  public async listActiveJobs(): Promise<any[]> {
    try {
      return await db
        .select()
        .from(backgroundJobs)
        .where(eq(backgroundJobs.status, "PENDING"))
        .orderBy(desc(backgroundJobs.priority));
    } catch (err) {
      logger.error({ err }, "Failed to load active scheduler jobs list");
      return [];
    }
  }
}
