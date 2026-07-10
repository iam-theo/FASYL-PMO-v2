import { db } from "../../../shared/database/index.ts";
import { sql } from "drizzle-orm";
import logger from "../../../shared/infrastructure/logger.ts";

export class ObservabilityService {
  private activeTraces = new Map<string, { startTime: number; label: string }>();

  public startTrace(correlationId: string, label: string): void {
    this.activeTraces.set(correlationId, {
      startTime: Date.now(),
      label,
    });
    logger.info(`[Telemetry-Trace] STARTED [${correlationId}] - ${label}`);
  }

  public endTrace(correlationId: string): number {
    const trace = this.activeTraces.get(correlationId);
    if (!trace) return 0;

    const duration = Date.now() - trace.startTime;
    this.activeTraces.delete(correlationId);
    
    logger.info(`[Telemetry-Trace] COMPLETED [${correlationId}] - ${trace.label} in ${duration}ms`);
    return duration;
  }

  public async getSystemHealth(): Promise<any> {
    const memoryUsage = process.memoryUsage();
    
    let dbStatus = "HEALTHY";
    let dbLatencyMs = 0;
    
    try {
      const startDb = Date.now();
      await db.execute(sql`SELECT 1`);
      dbLatencyMs = Date.now() - startDb;
    } catch (err) {
      dbStatus = "UNHEALTHY";
      logger.error({ err }, "Database connection health check failed");
    }

    return {
      status: dbStatus === "HEALTHY" ? "OPERATIONAL" : "DEGRADED",
      timestamp: new Date(),
      uptimeSeconds: process.uptime(),
      systemResources: {
        memoryHeapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
        memoryHeapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
        cpuUsageUserMS: process.cpuUsage().user,
      },
      databases: {
        postgres: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        redis: {
          status: "HEALTHY", // Mocked internal state
          pingLatencyMs: 1,
        },
      },
      activeTraceCount: this.activeTraces.size,
    };
  }
}
