import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { dbState, saveDatabase, generateUUID } from "../../db.ts";
import { Task, Milestone, Comment, Meeting, TaskStatus, TaskPriority, DeliverableStatus } from "../../types.ts";

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Robust generateContent wrapper with automatic retry (exponential backoff) and model fallback
async function generateContentWithRetryAndFallback(params: {
  contents: any;
  config?: any;
  primaryModel?: string;
}) {
  const primaryModel = params.primaryModel || "gemini-3.5-flash";
  const fallbackModels = ["gemini-flash-latest", "gemini-3.1-flash-lite"];
  
  const modelsToTry = [primaryModel, ...fallbackModels];
  let lastError: any = null;

  for (const model of modelsToTry) {
    let attempts = 2;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        console.log(`[Gemini Agent] Attempting generateContent with model: ${model} (Attempt ${attempt}/${attempts})`);
        const response = await ai.models.generateContent({
          model: model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini Agent] Model ${model} failed (Attempt ${attempt}/${attempts}):`, err.message || err);
        if (attempt < attempts) {
          const delay = attempt * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content with all Gemini models.");
}

// Tool declarations
const getProjectSummaryDeclaration: FunctionDeclaration = {
  name: "get_project_summary",
  description: "Get a high-level summary of the current project, including milestones, tasks, meetings, and team members.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const createTaskDeclaration: FunctionDeclaration = {
  name: "create_task",
  description: "Create a new task in the project tracker.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The title of the task." },
      description: { type: Type.STRING, description: "Detailed explanation of the work Package." },
      priority: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], description: "The priority level." },
      status: { type: Type.STRING, enum: ["TODO", "IN_PROGRESS", "DONE"], description: "Current workflow status." },
      dueDate: { type: Type.STRING, description: "Due date of the task in YYYY-MM-DD format." },
      startDate: { type: Type.STRING, description: "Start date of the task in YYYY-MM-DD format." },
      assigneeId: { type: Type.STRING, description: "The team member ID to assign this task to (optional)." },
    },
    required: ["title", "dueDate", "startDate"],
  },
};

const createMilestoneDeclaration: FunctionDeclaration = {
  name: "create_milestone",
  description: "Create a new milestone for tracking project progress.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The title of the milestone." },
      description: { type: Type.STRING, description: "The milestone goal and significance." },
      targetDate: { type: Type.STRING, description: "Target completion date in YYYY-MM-DD format." },
    },
    required: ["title", "targetDate"],
  },
};

const scheduleMeetingDeclaration: FunctionDeclaration = {
  name: "schedule_meeting",
  description: "Schedule a team briefing / meeting. Optionally integrates with Google Calendar and Google Meet if authorized.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The meeting or briefing title." },
      description: { type: Type.STRING, description: "Description or objectives of the session." },
      scheduledAt: { type: Type.STRING, description: "Scheduled ISO-8601 date-time string (e.g., 2026-07-03T10:00:00-07:00)." },
      durationMinutes: { type: Type.INTEGER, description: "Duration in minutes (default 30)." },
      agenda: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of items/topics to discuss.",
      },
      createGoogleEvent: {
        type: Type.BOOLEAN,
        description: "Whether to create a Google Calendar event with a Google Meet link.",
      },
    },
    required: ["title", "scheduledAt", "durationMinutes"],
  },
};

const addCommentDeclaration: FunctionDeclaration = {
  name: "add_comment",
  description: "Add a collaborative comment / reply thread on a specific entity like a task, meeting, etc.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      entityType: { type: Type.STRING, enum: ["TASK", "MEETING"], description: "Type of the entity to comment on." },
      entityId: { type: Type.STRING, description: "ID of the specific task or meeting." },
      content: { type: Type.STRING, description: "The markdown or text content of the comment." },
    },
    required: ["entityType", "entityId", "content"],
  },
};

export const tools = [
  {
    functionDeclarations: [
      getProjectSummaryDeclaration,
      createTaskDeclaration,
      createMilestoneDeclaration,
      scheduleMeetingDeclaration,
      addCommentDeclaration,
    ],
  },
];

// Helper to create a calendar event and Meet link via Google Calendar API
async function createGoogleCalendarEvent(
  accessToken: string,
  eventData: {
    title: string;
    description: string;
    scheduledAt: string;
    durationMinutes: number;
  }
) {
  try {
    const startTime = new Date(eventData.scheduledAt);
    const endTime = new Date(startTime.getTime() + eventData.durationMinutes * 60 * 1000);

    const body = {
      summary: eventData.title,
      description: eventData.description,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "UTC",
      },
      conferenceData: {
        createRequest: {
          requestId: generateUUID(),
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    };

    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Google Calendar API Error:", errorText);
      throw new Error(`Google Calendar API Error: ${res.statusText}`);
    }

    const data = await res.json();
    const eventLink = data.htmlLink;
    const meetLink = data.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video")?.uri;

    return {
      eventId: data.id,
      eventLink,
      meetLink,
    };
  } catch (err) {
    console.error("Failed to create Google Calendar / Meet event:", err);
    return null;
  }
}

export async function handleAgentChat(params: {
  message: string;
  projectId: string;
  googleAccessToken?: string;
  history?: any[];
}) {
  const { message, projectId, googleAccessToken, history = [] } = params;

  // Format system prompt
  const systemInstruction = `You are the Apollo Execution Agent, an advanced, high-precision AI project manager and assistant embedded in the Enterprise Project Execution Tracker Module.
Your main responsibilities are:
1. Help users review, coordinate, and act on their projects.
2. Directly execute action commands like creating tasks, scheduling meetings/briefings, tracking milestones, and commenting on project deliverables.
3. Help sync and coordinate Google Calendar events and Google Meet links when requested.

Current Project ID: "${projectId}"
Active Year: 2026

When executing tools, do so on behalf of the user. Be concise, professional, and clear.`;

  // First request to Gemini with tools
  const response = await generateContentWithRetryAndFallback({
    contents: [
      ...history,
      { role: "user", parts: [{ text: message }] }
    ],
    config: {
      systemInstruction,
      tools,
    },
  });

  const functionCalls = response.functionCalls;
  if (!functionCalls || functionCalls.length === 0) {
    return {
      text: response.text || "I'm not sure how to assist with that. Let me know if you'd like to manage tasks, schedule briefings, or coordinate with Google Calendar.",
      executedActions: [],
    };
  }

  const executedActions: any[] = [];
  const toolOutputs: any[] = [];

  for (const call of functionCalls) {
    const { name, args, id } = call as any;

    if (name === "get_project_summary") {
      const pTasks = dbState.tasks.filter((t) => t.projectId === projectId && !t.deletedAt);
      const pMilestones = dbState.milestones.filter((m) => m.projectId === projectId && !m.deletedAt);
      const pMeetings = dbState.meetings.filter((m) => m.projectId === projectId);
      const pTeam = dbState.teamMembers.filter((t) => t.projectId === projectId && !t.deletedAt);

      toolOutputs.push({
        name,
        id,
        response: {
          projectId,
          totalTasks: pTasks.length,
          tasks: pTasks.map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate })),
          milestones: pMilestones.map((m) => ({ id: m.id, title: m.title, targetDate: m.targetDate, isCompleted: m.isCompleted })),
          meetings: pMeetings.map((mt) => ({ id: mt.id, title: mt.title, scheduledAt: mt.scheduledAt, durationMinutes: mt.durationMinutes })),
          team: pTeam.map((m) => ({ id: m.id, name: m.name, role: m.role })),
        },
      });

      executedActions.push({
        type: "summary",
        description: "Retrieved current project status and details to answer your query.",
      });
    }

    if (name === "create_task") {
      const { title, description = "", priority = "MEDIUM", status = "TODO", dueDate, startDate, assigneeId = null } = args as any;

      const newTask: Task = {
        id: `tk-${generateUUID().substring(0, 8)}`,
        projectId,
        title,
        description,
        status: status as TaskStatus,
        priority: priority as TaskPriority,
        dueDate,
        startDate,
        assigneeId,
        milestoneId: null,
        labels: ["AI-Generated"],
        estimatedHours: 4,
        actualHours: 0,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      dbState.tasks.push(newTask);
      saveDatabase();

      toolOutputs.push({
        name,
        id,
        response: { success: true, task: newTask },
      });

      executedActions.push({
        type: "task_created",
        description: `Successfully created task: "${title}" (Due: ${dueDate})`,
        data: newTask,
      });
    }

    if (name === "create_milestone") {
      const { title, description = "", targetDate } = args as any;

      const newMilestone: Milestone = {
        id: `ms-${generateUUID().substring(0, 8)}`,
        projectId,
        title,
        description,
        targetDate,
        actualDate: null,
        isCompleted: false,
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      dbState.milestones.push(newMilestone);
      saveDatabase();

      toolOutputs.push({
        name,
        id,
        response: { success: true, milestone: newMilestone },
      });

      executedActions.push({
        type: "milestone_created",
        description: `Successfully established project milestone: "${title}" (Target: ${targetDate})`,
        data: newMilestone,
      });
    }

    if (name === "schedule_meeting") {
      const { title, description = "", scheduledAt, durationMinutes = 30, agenda = [], createGoogleEvent = false } = args as any;

      let googleDetails: any = null;
      let finalDesc = description;

      if (createGoogleEvent && googleAccessToken) {
        googleDetails = await createGoogleCalendarEvent(googleAccessToken, {
          title,
          description,
          scheduledAt,
          durationMinutes,
        });

        if (googleDetails?.meetLink) {
          finalDesc = `${description}\n\n🎥 Google Meet Link: ${googleDetails.meetLink}\n📅 Google Calendar Link: ${googleDetails.eventLink}`;
        }
      }

      const newMeeting: Meeting = {
        id: `mt-${generateUUID().substring(0, 8)}`,
        projectId,
        title,
        description: finalDesc,
        scheduledAt,
        durationMinutes,
        agenda,
        minutes: null,
        attendance: [],
        actionItems: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dbState.meetings.push(newMeeting);
      saveDatabase();

      toolOutputs.push({
        name,
        id,
        response: {
          success: true,
          meeting: newMeeting,
          googleSync: googleDetails ? { success: true, meetLink: googleDetails.meetLink } : { success: false, reason: "Unauthorized or requested without sync" },
        },
      });

      executedActions.push({
        type: "meeting_scheduled",
        description: `Scheduled team briefing session: "${title}" on ${scheduledAt.replace("T", " ")} ${googleDetails?.meetLink ? "with Google Meet link generated" : ""}`,
        data: {
          ...newMeeting,
          meetLink: googleDetails?.meetLink,
        },
      });
    }

    if (name === "add_comment") {
      const { entityType, entityId, content } = args as any;

      const newComment: Comment = {
        id: `cm-${generateUUID().substring(0, 8)}`,
        projectId,
        entityType,
        entityId,
        parentId: null,
        authorId: "tm-1", // default Alex Rivera
        content,
        reactions: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      dbState.comments.push(newComment);
      saveDatabase();

      toolOutputs.push({
        name,
        id,
        response: { success: true, comment: newComment },
      });

      executedActions.push({
        type: "comment_added",
        description: `Added collaborative briefing comment on ${entityType} ${entityId}`,
        data: newComment,
      });
    }
  }

  // Second call to provide tool responses to the model to get final text
  const userMsgPart = { role: "user", parts: [{ text: message }] };
  const modelMsgPart = response.candidates?.[0]?.content;

  const toolResponsePart = {
    role: "user",
    parts: toolOutputs.map((out) => ({
      functionResponse: {
        name: out.name,
        response: out.response,
        id: out.id,
      },
    })),
  };

  const finalResponse = await generateContentWithRetryAndFallback({
    contents: [
      ...history,
      userMsgPart,
      modelMsgPart,
      toolResponsePart,
    ],
    config: {
      systemInstruction,
    },
  });

  return {
    text: finalResponse.text || "Execution completed. Please check your dashboard for updates.",
    executedActions,
  };
}

export async function getExecutiveInsights(projectId: string) {
  try {
    const project = dbState.projects.find((p) => p.id === projectId && !p.deletedAt) || dbState.projects[0];
    const tasks = dbState.tasks.filter((t) => t.projectId === projectId && !t.deletedAt);
    const risks = dbState.risks.filter((r) => r.projectId === projectId && !r.deletedAt);
    const issues = dbState.issues.filter((i) => i.projectId === projectId && !i.deletedAt);
    const team = dbState.teamMembers.filter((t) => t.projectId === projectId && !t.deletedAt);

    const projectDataSummary = {
      name: project?.name,
      code: project?.code,
      status: project?.status,
      budget: project?.budget,
      progress: project?.progress,
      tasksCount: tasks.length,
      tasksCompleted: tasks.filter(t => {
        const stat = String((t as any).status || "").toUpperCase();
        return stat === "DONE" || stat === "COMPLETED";
      }).length,
      tasksInProgress: tasks.filter(t => {
        const stat = String((t as any).status || "").toUpperCase();
        return stat === "IN_PROGRESS";
      }).length,
      tasksTodo: tasks.filter(t => {
        const stat = String((t as any).status || "").toUpperCase();
        return stat === "TODO";
      }).length,
      risksCount: risks.length,
      highRisksCount: risks.filter(r => {
        const priority = String((r as any).priority || "").toUpperCase();
        const impact = String((r as any).impact || "").toUpperCase();
        return priority === "HIGH" || priority === "URGENT" || impact === "HIGH";
      }).length,
      issuesCount: issues.length,
      criticalIssuesCount: issues.filter(i => {
        const severity = String((i as any).severity || "").toUpperCase();
        return severity === "CRITICAL" || severity === "HIGH";
      }).length,
      teamCount: team.length
    };

    const prompt = `You are the lead PMO Strategist and Executive Advisor for AuraPM.
Based on the following real-time project metrics, write an expert, high-precision Executive Strategic Insights Report.
Include:
1. **Executive Summary**: High-level overview of execution momentum and strategic posture.
2. **Financial Health Analysis**: Analyze budget vs actual cost pacing, financial risks, and burn-rate warnings.
3. **Bottleneck Analysis & Risks**: Highlight critical paths, blocker patterns, and high severity risks.
4. **Actionable Strategic Recommendations**: 2-3 specific, high-leverage steps the executive can take to resolve bottlenecks or secure delivery.

Project Context Data:
${JSON.stringify(projectDataSummary, null, 2)}

Requirements:
- Speak in an authoritative, professional, and clear corporate tone.
- Keep the language clean and elegant, avoiding generic placeholder advice.
- Return the response formatted as structured Markdown. Keep it concise but insightful.
`;

    const response = await generateContentWithRetryAndFallback({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are the Lead PMO Director and AI Executive Consultant for AuraPM."
      }
    });

    return response.text || "No insights resolved.";
  } catch (err: any) {
    console.error("Failed to generate executive insights:", err);
    return `Error resolving insights: ${err.message || "Unknown error"}`;
  }
}

