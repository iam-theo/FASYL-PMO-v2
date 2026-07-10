/**
 * Enterprise Project Tracker Types and Enums
 * Represents the normalized PostgreSQL database schemas
 */

export enum ProjectHealth {
  HEALTHY = "HEALTHY",
  NEEDS_ATTENTION = "NEEDS_ATTENTION",
  AT_RISK = "AT_RISK",
  CRITICAL = "CRITICAL"
}

export enum ProjectStatus {
  PLANNING = "PLANNING",
  IN_PROGRESS = "IN_PROGRESS",
  ON_HOLD = "ON_HOLD",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED"
}

export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT"
}

export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  IN_REVIEW = "IN_REVIEW",
  DONE = "DONE"
}

export enum DependencyType {
  FS = "FS", // Finish-to-Start (Standard)
  SS = "SS", // Start-to-Start
  FF = "FF", // Finish-to-Finish
  SF = "SF"  // Start-to-Finish
}

export enum IssueSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL"
}

export enum IssueStatus {
  OPEN = "OPEN",
  INVESTIGATING = "INVESTIGATING",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED"
}

export enum RiskProbability {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH"
}

export enum RiskImpact {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL"
}

export enum DeliverableStatus {
  DRAFT = "DRAFT",
  IN_REVIEW = "IN_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"
}

export interface Project {
  id: string; // UUID
  name: string;
  code: string;
  description: string;
  status: ProjectStatus;
  health: ProjectHealth;
  startDate: string; // ISO Date
  endDate: string; // ISO Date
  budget: number;
  progress: number; // 0-100 percentage
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface TeamMember {
  id: string; // UUID
  projectId: string; // FK to Project
  lifecycleStageId?: string; // FK to lifecycleStages.id
  userId: string; // Simulated existing platform user ID
  name: string;
  email: string;
  role: string; // Lead, Developer, QA, Designer, Manager
  capacity: number; // Hours per week (e.g., 40)
  allocation: number; // Percentage allocated to this project (e.g., 100)
  availability: "AVAILABLE" | "LIMITED" | "UNAVAILABLE";
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Task {
  id: string; // UUID
  projectId: string; // FK to Project
  lifecycleStageId?: string; // FK to lifecycleStages.id
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  startDate: string;
  assigneeId: string | null; // FK to TeamMember.id
  milestoneId: string | null; // FK to Milestone.id
  labels: string[]; // Tag array
  estimatedHours: number;
  actualHours: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Subtask {
  id: string; // UUID
  taskId: string; // FK to Task
  title: string;
  isCompleted: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Milestone {
  id: string; // UUID
  projectId: string; // FK to Project
  lifecycleStageId?: string; // FK to lifecycleStages.id
  title: string;
  description: string;
  targetDate: string;
  actualDate: string | null;
  isCompleted: boolean;
  progress: number; // calculated automatically based on tasks or manual
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Dependency {
  id: string; // UUID
  projectId: string; // FK to Project
  lifecycleStageId?: string; // FK to lifecycleStages.id
  type: DependencyType;
  predecessorId: string; // Task UUID or Milestone UUID
  successorId: string; // Task UUID or Milestone UUID
  predecessorType: "TASK" | "MILESTONE";
  successorType: "TASK" | "MILESTONE";
  lagDays: number;
  createdAt: string;
}

export interface TimeLog {
  id: string; // UUID
  projectId: string; // FK to Project
  lifecycleStageId?: string; // FK to lifecycleStages.id
  taskId: string | null; // FK to Task
  teamMemberId: string; // FK to TeamMember
  hours: number;
  date: string; // YYYY-MM-DD
  description: string;
  isBillable: boolean;
  isApproved: boolean;
  approvedBy?: string; // User ID
  createdAt: string;
}

export interface Issue {
  id: string; // UUID
  projectId: string; // FK to Project
  lifecycleStageId?: string; // FK to lifecycleStages.id
  title: string;
  description: string;
  severity: IssueSeverity;
  priority: TaskPriority;
  status: IssueStatus;
  reporterId: string; // FK to TeamMember
  assigneeId: string | null; // FK to TeamMember
  rootCause: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Risk {
  id: string; // UUID
  projectId: string; // FK to Project
  lifecycleStageId?: string; // FK to lifecycleStages.id
  title: string;
  description: string;
  probability: RiskProbability;
  impact: RiskImpact;
  mitigationStrategy: string;
  escalationPlan: string;
  status: "IDENTIFIED" | "MITIGATED" | "OCCURRED" | "CLOSED";
  ownerId: string; // FK to TeamMember
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Deliverable {
  id: string; // UUID
  projectId: string; // FK to Project
  lifecycleStageId?: string; // FK to lifecycleStages.id
  title: string;
  description: string;
  dueDate: string;
  status: DeliverableStatus;
  ownerId: string; // FK to TeamMember
  reviewers: string[]; // Array of TeamMember IDs
  acceptanceCriteria: string;
  attachments: string[]; // file names/urls
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Document {
  id: string; // UUID
  projectId: string; // FK to Project
  lifecycleStageId?: string; // FK to lifecycleStages.id
  name: string;
  folderPath: string; // e.g., "/Design", "/Requirements"
  version: number;
  tags: string[];
  category: string;
  fileSize: number; // in bytes
  mimeType: string;
  uploadedBy: string; // FK to TeamMember
  status: "DRAFT" | "FINAL" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Comment {
  id: string; // UUID
  projectId: string; // FK to Project
  lifecycleStageId?: string; // FK to lifecycleStages.id
  entityType: "TASK" | "ISSUE" | "RISK" | "DELIVERABLE" | "MEETING";
  entityId: string; // UUID of target entity
  parentId: string | null; // FK to Comment (for threading)
  authorId: string; // FK to TeamMember
  content: string;
  reactions: Record<string, string[]>; // Map of reaction string to array of TeamMember IDs (e.g. { "👍": ["mem1", "mem2"] })
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Meeting {
  id: string; // UUID
  projectId: string; // FK to Project
  lifecycleStageId?: string; // FK to lifecycleStages.id
  title: string;
  description: string;
  scheduledAt: string; // ISO datetime
  durationMinutes: number;
  agenda: string[];
  minutes: string | null;
  attendance: string[]; // Array of TeamMember IDs
  actionItems: { text: string; assigneeId: string | null; isCompleted: boolean }[];
  createdAt: string;
  updatedAt: string;
  googleMeetLink?: string;
  googleEventId?: string;
}

export interface AuditLog {
  id: string; // UUID
  projectId: string; // FK to Project
  lifecycleStageId?: string; // FK to lifecycleStages.id
  userId: string; // Simulated platform user ID
  userName: string;
  action: string; // CREATE, UPDATE, DELETE, ASSIGN, etc.
  entityType: string; // TASK, TEAM, MILESTONE, etc.
  entityId: string;
  details: string; // Human readable change summary
  timestamp: string;
}

export interface Notification {
  id: string; // UUID
  projectId: string; // FK to Project
  lifecycleStageId?: string; // FK to lifecycleStages.id
  userId: string; // Simulated platform user ID
  title: string;
  message: string;
  isRead: boolean;
  type: "TASK_ASSIGNED" | "COMMENT_MENTION" | "RISK_ESCALATED" | "DELIVERABLE_REVIEW" | "MEETING_SCHEDULED" | "SYSTEM" | "CHAT_MESSAGE";
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}
