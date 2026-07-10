import { dbState, generateUUID, saveDatabase } from "../../db.ts";
import { Meeting } from "../../types.ts";

export class MeetingsResourcesRepository {
  // ==========================================
  // MEETINGS
  // ==========================================
  async getMeetingsByProject(projectId: string): Promise<Meeting[]> {
    return dbState.meetings.filter(m => m.projectId === projectId);
  }

  async findMeetingById(id: string): Promise<Meeting | null> {
    return dbState.meetings.find(m => m.id === id) || null;
  }

  async createMeeting(data: Partial<Meeting>): Promise<Meeting> {
    const newMeeting: Meeting = {
      id: generateUUID(),
      projectId: data.projectId!,
      title: data.title!,
      description: data.description || "",
      scheduledAt: data.scheduledAt!,
      durationMinutes: data.durationMinutes || 30,
      agenda: data.agenda || [],
      minutes: null,
      attendance: data.attendance || [],
      actionItems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      googleMeetLink: data.googleMeetLink || undefined,
      googleEventId: data.googleEventId || undefined
    };

    dbState.meetings.push(newMeeting);
    saveDatabase();
    return newMeeting;
  }

  async updateMeeting(id: string, data: Partial<Meeting>): Promise<Meeting | null> {
    const index = dbState.meetings.findIndex(m => m.id === id);
    if (index === -1) return null;

    dbState.meetings[index] = {
      ...dbState.meetings[index],
      ...data,
      updatedAt: new Date().toISOString()
    };

    saveDatabase();
    return dbState.meetings[index];
  }
}
