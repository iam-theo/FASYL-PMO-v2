import { db } from "../../../shared/database/index.ts";
import { universalTimeline } from "../../../db/schema.ts";
import { eq, desc } from "drizzle-orm";
import logger from "../../../shared/infrastructure/logger.ts";

export class TimelineEngineService {
  public async logTimelineEvent(
    projectId: string | null,
    entityType: string,
    entityId: string,
    activityType: string,
    activityName: string,
    actorId: string,
    details?: any
  ): Promise<any> {
    try {
      const detailsStr = details ? (typeof details === "string" ? details : JSON.stringify(details)) : null;

      const [record] = await db
        .insert(universalTimeline)
        .values({
          projectId: projectId ? projectId : null,
          entityType,
          entityId,
          activityType,
          activityName,
          actorId,
          details: detailsStr,
        })
        .returning();

      logger.info(`[Timeline] Recorded event '${activityName}' on ${entityType}:${entityId}`);
      return record;
    } catch (err) {
      logger.error({ err }, "Failed to log timeline event in Universal Timeline Engine");
      throw err;
    }
  }

  public async getTimeline(projectId: string): Promise<any[]> {
    try {
      return await db
        .select()
        .from(universalTimeline)
        .where(eq(universalTimeline.projectId, projectId))
        .orderBy(desc(universalTimeline.createdAt));
    } catch (err) {
      logger.error({ err }, `Failed to fetch universal timeline for project: ${projectId}`);
      return [];
    }
  }

  public async searchTimeline(projectId: string, searchTerm: string): Promise<any[]> {
    try {
      const events = await this.getTimeline(projectId);
      const lowerSearch = searchTerm.toLowerCase();
      return events.filter(
        (e) =>
          e.activityName.toLowerCase().includes(lowerSearch) ||
          e.activityType.toLowerCase().includes(lowerSearch) ||
          (e.details && e.details.toLowerCase().includes(lowerSearch))
      );
    } catch (err) {
      logger.error({ err }, "Failed to perform searchable timeline query");
      return [];
    }
  }
}
