import Joi from "joi";
import { Request, Response, NextFunction } from "express";
import { sendError } from "./response.ts";
import { TaskStatus, TaskPriority, DependencyType, IssueSeverity, IssueStatus, RiskProbability, RiskImpact, DeliverableStatus } from "../types.ts";

// Shared UUID Regex validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const customUuidSchema = Joi.string().pattern(uuidRegex).message("Invalid UUID format");

/**
 * JOI SCHEMAS DEFINITION
 */
export const schemas = {
  // Team Management
  teamMemberCreate: Joi.object({
    projectId: Joi.string().required(),
    userId: Joi.string().optional(),
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    role: Joi.string().min(2).max(100).required(),
    capacity: Joi.number().integer().min(1).max(168).default(40),
    allocation: Joi.number().min(1).max(100).default(100),
    availability: Joi.string().valid("AVAILABLE", "LIMITED", "UNAVAILABLE").default("AVAILABLE")
  }),

  teamMemberUpdate: Joi.object({
    role: Joi.string().min(2).max(100),
    capacity: Joi.number().integer().min(1).max(168),
    allocation: Joi.number().min(1).max(100),
    availability: Joi.string().valid("AVAILABLE", "LIMITED", "UNAVAILABLE")
  }),

  // Tasks
  taskCreate: Joi.object({
    projectId: Joi.string().required(),
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().allow("").default(""),
    status: Joi.string().valid(...Object.values(TaskStatus)).default(TaskStatus.TODO),
    priority: Joi.string().valid(...Object.values(TaskPriority)).default(TaskPriority.MEDIUM),
    startDate: Joi.string().required(),
    dueDate: Joi.string().required(),
    assigneeId: Joi.string().allow(null).default(null),
    milestoneId: Joi.string().allow(null).default(null),
    labels: Joi.array().items(Joi.string()).default([]),
    estimatedHours: Joi.number().min(0).default(0)
  }),

  taskUpdate: Joi.object({
    title: Joi.string().min(3).max(200),
    description: Joi.string().allow(""),
    status: Joi.string().valid(...Object.values(TaskStatus)),
    priority: Joi.string().valid(...Object.values(TaskPriority)),
    startDate: Joi.string(),
    dueDate: Joi.string(),
    assigneeId: Joi.string().allow(null),
    milestoneId: Joi.string().allow(null),
    labels: Joi.array().items(Joi.string()),
    estimatedHours: Joi.number().min(0),
    actualHours: Joi.number().min(0)
  }),

  taskBulkUpdate: Joi.object({
    taskIds: Joi.array().items(Joi.string()).min(1).required(),
    status: Joi.string().valid(...Object.values(TaskStatus)),
    priority: Joi.string().valid(...Object.values(TaskPriority)),
    assigneeId: Joi.string().allow(null)
  }),

  taskBulkDelete: Joi.object({
    taskIds: Joi.array().items(Joi.string()).min(1).required()
  }),

  // Subtasks
  subtaskCreate: Joi.object({
    taskId: Joi.string().required(),
    title: Joi.string().min(2).max(200).required()
  }),

  subtaskUpdate: Joi.object({
    title: Joi.string().min(2).max(200),
    isCompleted: Joi.boolean()
  }),

  // Milestones
  milestoneCreate: Joi.object({
    projectId: Joi.string().required(),
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().allow("").default(""),
    targetDate: Joi.string().required()
  }),

  milestoneUpdate: Joi.object({
    title: Joi.string().min(3).max(200),
    description: Joi.string().allow(""),
    targetDate: Joi.string(),
    isCompleted: Joi.boolean(),
    actualDate: Joi.string().allow(null)
  }),

  // Dependencies
  dependencyCreate: Joi.object({
    projectId: Joi.string().required(),
    type: Joi.string().valid(...Object.values(DependencyType)).default(DependencyType.FS),
    predecessorId: Joi.string().required(),
    successorId: Joi.string().required(),
    predecessorType: Joi.string().valid("TASK", "MILESTONE").required(),
    successorType: Joi.string().valid("TASK", "MILESTONE").required(),
    lagDays: Joi.number().integer().min(0).default(0)
  }),

  // Time Logs
  timeLogCreate: Joi.object({
    projectId: Joi.string().required(),
    taskId: Joi.string().allow(null).default(null),
    teamMemberId: Joi.string().required(),
    hours: Joi.number().positive().max(24).required(),
    date: Joi.string().required(),
    description: Joi.string().min(3).required(),
    isBillable: Joi.boolean().default(true)
  }),

  // Issues
  issueCreate: Joi.object({
    projectId: Joi.string().required(),
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().required(),
    severity: Joi.string().valid(...Object.values(IssueSeverity)).default(IssueSeverity.MEDIUM),
    priority: Joi.string().valid(...Object.values(TaskPriority)).default(TaskPriority.MEDIUM),
    reporterId: Joi.string().required(),
    assigneeId: Joi.string().allow(null).default(null)
  }),

  issueUpdate: Joi.object({
    title: Joi.string().min(3).max(200),
    description: Joi.string(),
    severity: Joi.string().valid(...Object.values(IssueSeverity)),
    priority: Joi.string().valid(...Object.values(TaskPriority)),
    status: Joi.string().valid(...Object.values(IssueStatus)),
    assigneeId: Joi.string().allow(null),
    rootCause: Joi.string().allow(""),
    resolution: Joi.string().allow("")
  }),

  // Risks
  riskCreate: Joi.object({
    projectId: Joi.string().required(),
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().required(),
    probability: Joi.string().valid(...Object.values(RiskProbability)).required(),
    impact: Joi.string().valid(...Object.values(RiskImpact)).required(),
    mitigationStrategy: Joi.string().required(),
    escalationPlan: Joi.string().allow("").default(""),
    ownerId: Joi.string().required()
  }),

  riskUpdate: Joi.object({
    title: Joi.string().min(3).max(200),
    description: Joi.string(),
    probability: Joi.string().valid(...Object.values(RiskProbability)),
    impact: Joi.string().valid(...Object.values(RiskImpact)),
    mitigationStrategy: Joi.string(),
    escalationPlan: Joi.string().allow(""),
    status: Joi.string().valid("IDENTIFIED", "MITIGATED", "OCCURRED", "CLOSED"),
    ownerId: Joi.string()
  }),

  // Deliverables
  deliverableCreate: Joi.object({
    projectId: Joi.string().required(),
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().allow("").default(""),
    dueDate: Joi.string().required(),
    ownerId: Joi.string().required(),
    reviewers: Joi.array().items(Joi.string()).default([]),
    acceptanceCriteria: Joi.string().required()
  }),

  deliverableUpdate: Joi.object({
    title: Joi.string().min(3).max(200),
    description: Joi.string().allow(""),
    dueDate: Joi.string(),
    status: Joi.string().valid(...Object.values(DeliverableStatus)),
    ownerId: Joi.string(),
    reviewers: Joi.array().items(Joi.string()),
    acceptanceCriteria: Joi.string()
  }),

  // Documents
  documentCreate: Joi.object({
    projectId: Joi.string().required(),
    name: Joi.string().min(2).max(100).required(),
    folderPath: Joi.string().min(1).default("/"),
    tags: Joi.array().items(Joi.string()).default([]),
    category: Joi.string().min(2).max(100).required(),
    fileSize: Joi.number().integer().positive().required(),
    mimeType: Joi.string().required(),
    uploadedBy: Joi.string().required()
  }),

  // Comments
  commentCreate: Joi.object({
    projectId: Joi.string().required(),
    entityType: Joi.string().valid("TASK", "ISSUE", "RISK", "DELIVERABLE", "MEETING").required(),
    entityId: Joi.string().required(),
    parentId: Joi.string().allow(null).default(null),
    authorId: Joi.string().required(),
    content: Joi.string().min(1).required()
  }),

  // Meetings
  meetingCreate: Joi.object({
    projectId: Joi.string().required(),
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().allow("").default(""),
    scheduledAt: Joi.string().required(),
    durationMinutes: Joi.number().integer().positive().max(480).default(30),
    agenda: Joi.array().items(Joi.string()).default([]),
    attendance: Joi.array().items(Joi.string()).default([]),
    googleMeetLink: Joi.string().allow(null, "").optional(),
    googleEventId: Joi.string().allow(null, "").optional()
  }),

  meetingUpdate: Joi.object({
    title: Joi.string().min(3).max(200),
    description: Joi.string().allow(""),
    scheduledAt: Joi.string(),
    durationMinutes: Joi.number().integer().positive().max(480),
    agenda: Joi.array().items(Joi.string()),
    minutes: Joi.string().allow(null, ""),
    attendance: Joi.array().items(Joi.string()),
    googleMeetLink: Joi.string().allow(null, "").optional(),
    googleEventId: Joi.string().allow(null, "").optional(),
    actionItems: Joi.array().items(Joi.object({
      text: Joi.string().required(),
      assigneeId: Joi.string().allow(null).default(null),
      isCompleted: Joi.boolean().default(false)
    }))
  })
};

/**
 * Validation middleware function generator
 */
export const validateSchema = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    
    if (error) {
      const errorDetails = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message
      }));
      return sendError(res, "Request payload validation failed", errorDetails, 400);
    }
    
    req.body = value;
    next();
  };
};
