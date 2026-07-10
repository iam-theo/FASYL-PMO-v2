import fs from "fs";
import path from "path";
import { db } from "../../shared/database/index.ts";
import {
  projects as pgProjectsTable,
  tasks as pgTasksTable,
  resources as pgResourcesTable,
  resourceAllocations as pgResourceAllocationsTable,
  risksAndIssues as pgRisksAndIssuesTable,
  deliverables as pgDeliverablesTable,
  auditLogs as pgAuditLogsTable,
  notifications as pgNotificationsTable,
  chatMessages as pgChatMessagesTable
} from "../../db/schema.ts";
import {
  Project,
  TeamMember,
  Task,
  Subtask,
  Milestone,
  Dependency,
  TimeLog,
  Issue,
  Risk,
  Deliverable,
  Document,
  Comment,
  Meeting,
  AuditLog,
  Notification,
  ChatMessage,
  ProjectStatus,
  ProjectHealth,
  TaskStatus,
  TaskPriority,
  DependencyType,
  IssueSeverity,
  IssueStatus,
  RiskProbability,
  RiskImpact,
  DeliverableStatus
} from "./types.ts";

const DB_FILE_PATH = path.join(process.cwd(), "project_tracker_db.json");

export interface DatabaseState {
  projects: Project[];
  teamMembers: TeamMember[];
  tasks: Task[];
  subtasks: Subtask[];
  milestones: Milestone[];
  dependencies: Dependency[];
  timeLogs: TimeLog[];
  issues: Issue[];
  risks: Risk[];
  deliverables: Deliverable[];
  documents: Document[];
  comments: Comment[];
  meetings: Meeting[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  chatMessages: ChatMessage[];
}

let dbState: DatabaseState = {
  projects: [],
  teamMembers: [],
  tasks: [],
  subtasks: [],
  milestones: [],
  dependencies: [],
  timeLogs: [],
  issues: [],
  risks: [],
  deliverables: [],
  documents: [],
  comments: [],
  meetings: [],
  auditLogs: [],
  notifications: [],
  chatMessages: []
};

// Simple UUID generator
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Pre-seeded data generator
function seedDatabase(): DatabaseState {
  const p1Id = "p1-uuid-erp-migration-2026";
  const p2Id = "p2-uuid-devops-pipeline-2026";

  const projects: Project[] = [
    {
      id: p1Id,
      name: "Apollo Cloud ERP Migration",
      code: "APOLLO-ERP",
      description: "Complete migration of legacy on-premise ERP application to secure cloud microservices architecture. Includes database normalization, API gateway setup, and real-time financial dashboards.",
      status: ProjectStatus.IN_PROGRESS,
      health: ProjectHealth.NEEDS_ATTENTION,
      startDate: "2026-05-01",
      endDate: "2026-12-15",
      budget: 450000,
      progress: 42,
      createdAt: "2026-04-15T10:00:00Z",
      updatedAt: "2026-07-02T12:00:00Z",
      deletedAt: null
    },
    {
      id: p2Id,
      name: "Zeus DevOps CI/CD Pipelines",
      code: "ZEUS-DEVOPS",
      description: "Implementation of global multi-region container orchestration using Kubernetes, automatic scaling, vulnerability scanners, and continuous deployment workflows.",
      status: ProjectStatus.IN_PROGRESS,
      health: ProjectHealth.HEALTHY,
      startDate: "2026-06-01",
      endDate: "2026-10-30",
      budget: 180000,
      progress: 65,
      createdAt: "2026-05-10T09:00:00Z",
      updatedAt: "2026-07-02T15:00:00Z",
      deletedAt: null
    }
  ];

  const teamMembers: TeamMember[] = [
    // Apollo ERP Team
    {
      id: "tm-1",
      projectId: p1Id,
      userId: "usr-alex",
      name: "Alex Rivera",
      email: "alex.rivera@enterprise.com",
      role: "Lead Solutions Architect",
      capacity: 40,
      allocation: 100,
      availability: "AVAILABLE",
      createdAt: "2026-04-20T08:00:00Z",
      updatedAt: "2026-04-20T08:00:00Z",
      deletedAt: null
    },
    {
      id: "tm-2",
      projectId: p1Id,
      userId: "usr-sarah",
      name: "Sarah Chen",
      email: "sarah.chen@enterprise.com",
      role: "Senior Backend Developer",
      capacity: 40,
      allocation: 80,
      availability: "AVAILABLE",
      createdAt: "2026-04-20T08:30:00Z",
      updatedAt: "2026-04-20T08:30:00Z",
      deletedAt: null
    },
    {
      id: "tm-3",
      projectId: p1Id,
      userId: "usr-marcus",
      name: "Marcus Vance",
      email: "marcus.vance@enterprise.com",
      role: "QA Automation Engineer",
      capacity: 40,
      allocation: 50,
      availability: "LIMITED",
      createdAt: "2026-04-22T09:00:00Z",
      updatedAt: "2026-04-22T09:00:00Z",
      deletedAt: null
    },
    // Zeus DevOps Team
    {
      id: "tm-4",
      projectId: p2Id,
      userId: "usr-elena",
      name: "Elena Rostova",
      email: "elena.rostova@enterprise.com",
      role: "DevOps Tech Lead",
      capacity: 40,
      allocation: 100,
      availability: "AVAILABLE",
      createdAt: "2026-05-12T08:00:00Z",
      updatedAt: "2026-05-12T08:00:00Z",
      deletedAt: null
    },
    {
      id: "tm-5",
      projectId: p2Id,
      userId: "usr-dave",
      name: "David Karr",
      email: "dave.karr@enterprise.com",
      role: "Cloud Engineer",
      capacity: 40,
      allocation: 100,
      availability: "AVAILABLE",
      createdAt: "2026-05-12T08:30:00Z",
      updatedAt: "2026-05-12T08:30:00Z",
      deletedAt: null
    }
  ];

  const milestones: Milestone[] = [
    // Apollo ERP Milestones
    {
      id: "ms-1",
      projectId: p1Id,
      title: "ERP DB Relational Schema Sign-off",
      description: "Completion and approvals for the normalized PostgreSQL database architecture.",
      targetDate: "2026-05-30",
      actualDate: "2026-05-28",
      isCompleted: true,
      progress: 100,
      createdAt: "2026-04-18T10:00:00Z",
      updatedAt: "2026-05-28T17:00:00Z",
      deletedAt: null
    },
    {
      id: "ms-2",
      projectId: p1Id,
      title: "Core Service Containerization & Migration",
      description: "Migration of core services (Financials & Inventory) to cloud Docker containers.",
      targetDate: "2026-08-15",
      actualDate: null,
      isCompleted: false,
      progress: 35,
      createdAt: "2026-04-18T10:00:00Z",
      updatedAt: "2026-07-02T12:00:00Z",
      deletedAt: null
    },
    {
      id: "ms-3",
      projectId: p1Id,
      title: "User Acceptance Testing (UAT)",
      description: "Enterprise stakeholder testing and validations across all finance modules.",
      targetDate: "2026-11-30",
      actualDate: null,
      isCompleted: false,
      progress: 0,
      createdAt: "2026-04-18T10:00:00Z",
      updatedAt: "2026-04-18T10:00:00Z",
      deletedAt: null
    },
    // Zeus DevOps Milestones
    {
      id: "ms-4",
      projectId: p2Id,
      title: "Infrastructure as Code (IaC) Provisioning",
      description: "Provisioning all environments (Dev, Staging, Prod) via Terraform scripts.",
      targetDate: "2026-06-30",
      actualDate: "2026-06-29",
      isCompleted: true,
      progress: 100,
      createdAt: "2026-05-11T10:00:00Z",
      updatedAt: "2026-06-29T18:00:00Z",
      deletedAt: null
    },
    {
      id: "ms-5",
      projectId: p2Id,
      title: "Security Pipeline Integration",
      description: "Static and dynamic analysis scans integrated with CI triggers.",
      targetDate: "2026-08-10",
      actualDate: null,
      isCompleted: false,
      progress: 40,
      createdAt: "2026-05-11T10:00:00Z",
      updatedAt: "2026-07-02T11:00:00Z",
      deletedAt: null
    }
  ];

  const tasks: Task[] = [
    // Apollo ERP Tasks
    {
      id: "tk-1",
      projectId: p1Id,
      title: "Draft Initial Schema",
      description: "Drafting the normalized schemas for Users, Orders, Ledger, and inventory tables.",
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      startDate: "2026-05-02",
      dueDate: "2026-05-15",
      assigneeId: "tm-1",
      milestoneId: "ms-1",
      labels: ["Database", "Design"],
      estimatedHours: 24,
      actualHours: 28,
      completedAt: "2026-05-14T16:00:00Z",
      createdAt: "2026-04-20T09:00:00Z",
      updatedAt: "2026-05-14T16:00:00Z",
      deletedAt: null
    },
    {
      id: "tk-2",
      projectId: p1Id,
      title: "Run Schema Migration Scripts",
      description: "Executing migration scripts in the Staging database and verifying constraints.",
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      startDate: "2026-05-16",
      dueDate: "2026-05-25",
      assigneeId: "tm-2",
      milestoneId: "ms-1",
      labels: ["Database", "Migration"],
      estimatedHours: 16,
      actualHours: 14,
      completedAt: "2026-05-24T15:30:00Z",
      createdAt: "2026-04-20T09:00:00Z",
      updatedAt: "2026-05-24T15:30:00Z",
      deletedAt: null
    },
    {
      id: "tk-3",
      projectId: p1Id,
      title: "Set up API Gateway routing",
      description: "Deploying Express router with JWT middleware proxies to microservices.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      startDate: "2026-06-10",
      dueDate: "2026-07-15",
      assigneeId: "tm-2",
      milestoneId: "ms-2",
      labels: ["Routing", "Security"],
      estimatedHours: 40,
      actualHours: 22,
      completedAt: null,
      createdAt: "2026-04-20T09:00:00Z",
      updatedAt: "2026-07-02T12:00:00Z",
      deletedAt: null
    },
    {
      id: "tk-4",
      projectId: p1Id,
      title: "Dockerize Ledger Microservice",
      description: "Writing multi-stage Dockerfiles and containerizing the ledger microservice.",
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      startDate: "2026-07-05",
      dueDate: "2026-07-28",
      assigneeId: "tm-1",
      milestoneId: "ms-2",
      labels: ["Docker", "Microservice"],
      estimatedHours: 32,
      actualHours: 0,
      completedAt: null,
      createdAt: "2026-04-20T09:00:00Z",
      updatedAt: "2026-07-02T12:00:00Z",
      deletedAt: null
    },
    {
      id: "tk-5",
      projectId: p1Id,
      title: "Write QA Integration Tests",
      description: "Write end-to-end integration test suites using Jest and Supertest.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.LOW,
      startDate: "2026-06-15",
      dueDate: "2026-08-10",
      assigneeId: "tm-3",
      milestoneId: "ms-2",
      labels: ["Testing", "QA"],
      estimatedHours: 45,
      actualHours: 30,
      completedAt: null,
      createdAt: "2026-04-22T09:30:00Z",
      updatedAt: "2026-07-02T12:00:00Z",
      deletedAt: null
    },
    // Zeus DevOps Tasks
    {
      id: "tk-6",
      projectId: p2Id,
      title: "Write Terraform Configurations",
      description: "Defining VPCs, Subnets, and EKS clusters as code using modular structures.",
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      startDate: "2026-06-02",
      dueDate: "2026-06-20",
      assigneeId: "tm-4",
      milestoneId: "ms-4",
      labels: ["Terraform", "Cloud"],
      estimatedHours: 30,
      actualHours: 32,
      completedAt: "2026-06-19T17:00:00Z",
      createdAt: "2026-05-12T09:00:00Z",
      updatedAt: "2026-06-19T17:00:00Z",
      deletedAt: null
    },
    {
      id: "tk-7",
      projectId: p2Id,
      title: "Deploy EKS clusters via CD",
      description: "Executing Terraform scripts and deploying clusters across us-east and eu-west.",
      status: TaskStatus.DONE,
      priority: TaskPriority.URGENT,
      startDate: "2026-06-21",
      dueDate: "2026-06-29",
      assigneeId: "tm-5",
      milestoneId: "ms-4",
      labels: ["Kubernetes", "EKS"],
      estimatedHours: 20,
      actualHours: 19,
      completedAt: "2026-06-28T16:30:00Z",
      createdAt: "2026-05-12T09:00:00Z",
      updatedAt: "2026-06-28T16:30:00Z",
      deletedAt: null
    },
    {
      id: "tk-8",
      projectId: p2Id,
      title: "Integrate SonarQube Scanner",
      description: "Adding static analysis scans to trigger automatically on Pull Requests.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      startDate: "2026-06-29",
      dueDate: "2026-07-15",
      assigneeId: "tm-4",
      milestoneId: "ms-5",
      labels: ["Security", "CI"],
      estimatedHours: 16,
      actualHours: 8,
      completedAt: null,
      createdAt: "2026-05-12T09:00:00Z",
      updatedAt: "2026-07-02T15:00:00Z",
      deletedAt: null
    }
  ];

  const subtasks: Subtask[] = [
    {
      id: "sub-1",
      taskId: "tk-1",
      title: "Create users relational model",
      isCompleted: true,
      orderIndex: 0,
      createdAt: "2026-05-02T10:00:00Z",
      updatedAt: "2026-05-03T12:00:00Z",
      deletedAt: null
    },
    {
      id: "sub-2",
      taskId: "tk-1",
      title: "Define primary keys and indexes",
      isCompleted: true,
      orderIndex: 1,
      createdAt: "2026-05-03T10:00:00Z",
      updatedAt: "2026-05-05T14:00:00Z",
      deletedAt: null
    },
    {
      id: "sub-3",
      taskId: "tk-3",
      title: "Design dynamic path matching regex",
      isCompleted: true,
      orderIndex: 0,
      createdAt: "2026-06-11T10:00:00Z",
      updatedAt: "2026-06-15T15:00:00Z",
      deletedAt: null
    },
    {
      id: "sub-4",
      taskId: "tk-3",
      title: "Code proxy controller for rate limits",
      isCompleted: false,
      orderIndex: 1,
      createdAt: "2026-06-11T10:00:00Z",
      updatedAt: "2026-07-02T12:00:00Z",
      deletedAt: null
    }
  ];

  const dependencies: Dependency[] = [
    // Task 2 depends on Task 1 finishing
    {
      id: "dep-1",
      projectId: p1Id,
      type: DependencyType.FS,
      predecessorId: "tk-1",
      successorId: "tk-2",
      predecessorType: "TASK",
      successorType: "TASK",
      lagDays: 0,
      createdAt: "2026-04-20T10:00:00Z"
    },
    // Task 7 depends on Task 6 finishing
    {
      id: "dep-2",
      projectId: p2Id,
      type: DependencyType.FS,
      predecessorId: "tk-6",
      successorId: "tk-7",
      predecessorType: "TASK",
      successorType: "TASK",
      lagDays: 0,
      createdAt: "2026-05-12T10:00:00Z"
    }
  ];

  const timeLogs: TimeLog[] = [
    {
      id: "tl-1",
      projectId: p1Id,
      taskId: "tk-1",
      teamMemberId: "tm-1",
      hours: 6,
      date: "2026-05-03",
      description: "Initial ledger draft mapping",
      isBillable: true,
      isApproved: true,
      approvedBy: "usr-alex",
      createdAt: "2026-05-03T18:00:00Z"
    },
    {
      id: "tl-2",
      projectId: p1Id,
      taskId: "tk-3",
      teamMemberId: "tm-2",
      hours: 4.5,
      date: "2026-06-12",
      description: "Proxy gateway path logic programming",
      isBillable: true,
      isApproved: false,
      createdAt: "2026-06-12T17:30:00Z"
    },
    {
      id: "tl-3",
      projectId: p2Id,
      taskId: "tk-6",
      teamMemberId: "tm-4",
      hours: 8,
      date: "2026-06-05",
      description: "Terraform module structuring",
      isBillable: false,
      isApproved: true,
      approvedBy: "usr-elena",
      createdAt: "2026-06-05T18:00:00Z"
    }
  ];

  const issues: Issue[] = [
    {
      id: "is-1",
      projectId: p1Id,
      title: "Query timeouts in financial reporting test",
      description: "E2E integration test suite triggers postgres deadlock / timeout on bulk ledger inserts.",
      severity: IssueSeverity.CRITICAL,
      priority: TaskPriority.HIGH,
      status: IssueStatus.INVESTIGATING,
      reporterId: "tm-3",
      assigneeId: "tm-2",
      rootCause: "Database transactions locking too many child rows during simultaneous ledger validations.",
      resolution: null,
      createdAt: "2026-06-20T10:00:00Z",
      updatedAt: "2026-07-02T11:00:00Z",
      deletedAt: null
    },
    {
      id: "is-2",
      projectId: p1Id,
      title: "Broken docker registry login on local builds",
      description: "Docker push fails during dev builds due to expired credential helper tokens.",
      severity: IssueSeverity.LOW,
      priority: TaskPriority.LOW,
      status: IssueStatus.RESOLVED,
      reporterId: "tm-1",
      assigneeId: "tm-1",
      rootCause: "GCP credential helper path not loaded in terminal subprocess environment.",
      resolution: "Configured static keychain plugin helper with secure token refresh intervals.",
      createdAt: "2026-06-15T09:00:00Z",
      updatedAt: "2026-06-16T15:00:00Z",
      deletedAt: null
    }
  ];

  const risks: Risk[] = [
    {
      id: "rk-1",
      projectId: p1Id,
      title: "GCP Cloud SQL Migration Lag",
      description: "Data transfer latency of historical tables may delay final cut-over window.",
      probability: RiskProbability.MEDIUM,
      impact: RiskImpact.HIGH,
      mitigationStrategy: "Perform staggered offline syncs of archive tables and apply final replication log delta.",
      escalationPlan: "Escalate to Infrastructure VP to provision dedicated express routing channel.",
      status: "IDENTIFIED",
      ownerId: "tm-1",
      createdAt: "2026-05-10T11:00:00Z",
      updatedAt: "2026-07-02T12:00:00Z",
      deletedAt: null
    },
    {
      id: "rk-2",
      projectId: p2Id,
      title: "AWS Cluster Upgrade Interruption",
      description: "Upgrading underlying EKS control plane to v1.30 might break ingress API annotations.",
      probability: RiskProbability.LOW,
      impact: RiskImpact.CRITICAL,
      mitigationStrategy: "Run dry upgrade in sandbox cluster first and review deployment specifications.",
      escalationPlan: "Revert cluster version instantly from Terraform state rollbacks.",
      status: "MITIGATED",
      ownerId: "tm-4",
      createdAt: "2026-06-02T10:00:00Z",
      updatedAt: "2026-06-25T14:00:00Z",
      deletedAt: null
    }
  ];

  const deliverables: Deliverable[] = [
    {
      id: "dl-1",
      projectId: p1Id,
      title: "Financial Ledger Relational Database Design Doc",
      description: "Pristine detailing of schemas, relationships, constraints, indexes, and soft-delete behaviors.",
      dueDate: "2026-05-25",
      status: DeliverableStatus.APPROVED,
      ownerId: "tm-1",
      reviewers: ["tm-2", "tm-3"],
      acceptanceCriteria: "Signed off by Architecture Lead and verified against standard schema structures.",
      attachments: ["ERD_Schema_v2.pdf", "Migrations_Script_Staging.sql"],
      createdAt: "2026-05-10T10:00:00Z",
      updatedAt: "2026-05-26T09:00:00Z",
      deletedAt: null
    },
    {
      id: "dl-2",
      projectId: p1Id,
      title: "Microservice Ingress Gateway Configurations",
      description: "Gateway router config specifications supporting rate limiting and JWT decryption.",
      dueDate: "2026-07-20",
      status: DeliverableStatus.IN_REVIEW,
      ownerId: "tm-2",
      reviewers: ["tm-1"],
      acceptanceCriteria: "Zero latency leaks on request routing under load testing spikes.",
      attachments: ["gateway_config.yml"],
      createdAt: "2026-06-10T09:00:00Z",
      updatedAt: "2026-07-02T12:00:00Z",
      deletedAt: null
    }
  ];

  const documents: Document[] = [
    {
      id: "doc-1",
      projectId: p1Id,
      name: "ERD_Schema_v2.pdf",
      folderPath: "/Architecture",
      version: 2,
      tags: ["Database", "PDF", "Design"],
      category: "Design Specs",
      fileSize: 2450000,
      mimeType: "application/pdf",
      uploadedBy: "tm-1",
      status: "FINAL",
      createdAt: "2026-05-12T10:30:00Z",
      updatedAt: "2026-05-12T10:30:00Z",
      deletedAt: null
    },
    {
      id: "doc-2",
      projectId: p1Id,
      name: "gateway_config.yml",
      folderPath: "/Configuration",
      version: 1,
      tags: ["YAML", "Cloud", "Ingress"],
      category: "Config Files",
      fileSize: 4500,
      mimeType: "text/yaml",
      uploadedBy: "tm-2",
      status: "DRAFT",
      createdAt: "2026-06-28T14:00:00Z",
      updatedAt: "2026-06-28T14:00:00Z",
      deletedAt: null
    }
  ];

  const comments: Comment[] = [
    {
      id: "cm-1",
      projectId: p1Id,
      entityType: "TASK",
      entityId: "tk-3",
      parentId: null,
      authorId: "tm-1",
      content: "Hi Sarah Chen, can you please review the rate limiter values in the route parameters? Let's make sure we allow up to 200 requests/min from the Financial mobile clients.",
      reactions: { "👍": ["tm-2"] },
      createdAt: "2026-06-14T10:30:00Z",
      updatedAt: "2026-06-14T10:30:00Z",
      deletedAt: null
    },
    {
      id: "cm-2",
      projectId: p1Id,
      entityType: "TASK",
      entityId: "tk-3",
      parentId: "cm-1",
      authorId: "tm-2",
      content: "Sure Alex, added the rate limiter middleware check. Let's audit it during our staging tests tomorrow.",
      reactions: { "🙌": ["tm-1"] },
      createdAt: "2026-06-15T09:00:00Z",
      updatedAt: "2026-06-15T09:00:00Z",
      deletedAt: null
    }
  ];

  const meetings: Meeting[] = [
    {
      id: "mt-1",
      projectId: p1Id,
      title: "Apollo Architecture Sync: Rate Limit Review",
      description: "Discussing rate-limiting configurations, routing proxies, and testing procedures for the microservices backend.",
      scheduledAt: "2026-07-03T10:00:00-07:00",
      durationMinutes: 45,
      agenda: [
        "Present staging gateway YAML parameters",
        "Benchmark concurrent rate-limiting responses",
        "Sign-off ingress deliverables"
      ],
      minutes: null,
      attendance: ["tm-1", "tm-2", "tm-3"],
      actionItems: [
        { text: "Verify proxy payload sizes in Jest integration spec", assigneeId: "tm-3", isCompleted: false },
        { text: "Upload final gateway_config.yml to workspace directory", assigneeId: "tm-2", isCompleted: false }
      ],
      createdAt: "2026-07-02T14:00:00Z",
      updatedAt: "2026-07-02T14:00:00Z"
    },
    {
      id: "mt-2",
      projectId: p2Id,
      title: "Zeus DevOps Retrospective Sprint 3",
      description: "Reviewing cluster deployment successes, IaC scripts execution times, and planning sonar security setups.",
      scheduledAt: "2026-06-30T11:00:00-07:00",
      durationMinutes: 60,
      agenda: [
        "Terraform dry-run review",
        "Kubernetes multi-region failover tests results",
        "Developer team retro feedback"
      ],
      minutes: "Successfully finished retro. Staging and production instances fully deployed. Performance is within limits.",
      attendance: ["tm-4", "tm-5"],
      actionItems: [],
      createdAt: "2026-06-29T10:00:00Z",
      updatedAt: "2026-06-30T13:00:00Z"
    }
  ];

  const auditLogs: AuditLog[] = [
    {
      id: "al-1",
      projectId: p1Id,
      userId: "usr-alex",
      userName: "Alex Rivera",
      action: "CREATE",
      entityType: "TASK",
      entityId: "tk-1",
      details: "Created task 'Draft Initial Schema' with high priority.",
      timestamp: "2026-04-20T09:00:00Z"
    },
    {
      id: "al-2",
      projectId: p1Id,
      userId: "usr-sarah",
      userName: "Sarah Chen",
      action: "UPDATE",
      entityType: "TASK",
      entityId: "tk-2",
      details: "Updated status of task 'Run Schema Migration Scripts' to 'DONE'.",
      timestamp: "2026-05-24T15:30:00Z"
    },
    {
      id: "al-3",
      projectId: p2Id,
      userId: "usr-elena",
      userName: "Elena Rostova",
      action: "CREATE",
      entityType: "MILESTONE",
      entityId: "ms-4",
      details: "Created milestone 'Infrastructure as Code (IaC) Provisioning'.",
      timestamp: "2026-05-11T10:00:00Z"
    }
  ];

  const notifications: Notification[] = [
    {
      id: "nt-1",
      projectId: p1Id,
      userId: "usr-alex",
      title: "Deliverable Ready for Review",
      message: "Gateway Config Specifications (DL-2) is ready for review by Sarah Chen.",
      isRead: false,
      type: "DELIVERABLE_REVIEW",
      createdAt: "2026-07-02T12:00:00Z"
    },
    {
      id: "nt-2",
      projectId: p2Id,
      userId: "usr-elena",
      title: "Task Completed",
      message: "David Karr has completed task 'Deploy EKS clusters via CD'.",
      isRead: true,
      type: "SYSTEM",
      createdAt: "2026-06-28T16:30:00Z"
    }
  ];

  return {
    projects: [],
    teamMembers: [],
    tasks: [],
    subtasks: [],
    milestones: [],
    dependencies: [],
    timeLogs: [],
    issues: [],
    risks: [],
    deliverables: [],
    documents: [],
    comments: [],
    meetings: [],
    auditLogs: [],
    notifications: [],
    chatMessages: []
  };
}

export async function syncStateFromPostgres() {
  try {
    let pgProjects = await db.select().from(pgProjectsTable);

    if (pgProjects.length === 0) {
      // Seed Projects
      const GPX_ID = "p-gpx-payment-gateway-2026";
      const LRE_ID = "p-lre-retail-expansion-2026";
      const DGA_ID = "p-dga-governance-audit-2026";
      const QCI_ID = "p-qci-compute-infra-2026";
      const MOB_ID = "p-mob-client-rewrite-2026";

      await db.insert(pgProjectsTable).values([
        {
          id: GPX_ID,
          name: "Global Payment Gateway",
          description: "Global payment processing gateway with webhook integration and fraud detection.",
          status: "ACTIVE",
          health: "ON_TRACK",
          budget: "5400000.00",
          actualCost: "3672000.00",
          clientName: "Fintech Expansion"
        },
        {
          id: LRE_ID,
          name: "Lumina Retail Expansion",
          description: "Expansion of brick-and-mortar retail footprint to regional centers.",
          status: "ACTIVE",
          health: "AT_RISK",
          budget: "4800000.00",
          actualCost: "1152000.00",
          clientName: "Retail Strategy"
        },
        {
          id: DGA_ID,
          name: "Data Governance Audit",
          description: "Comprehensive review of enterprise GDPR and security policies.",
          status: "PLANNING",
          health: "STABLE",
          budget: "1200000.00",
          actualCost: "96000.00",
          clientName: "Compliance"
        },
        {
          id: QCI_ID,
          name: "Quantum Compute Infrastructure",
          description: "Provisioning specialized quantum compute clusters for high-performance R&D.",
          status: "ACTIVE",
          health: "ON_TRACK",
          budget: "6200000.00",
          actualCost: "3348000.00",
          clientName: "R&D"
        },
        {
          id: MOB_ID,
          name: "Mobile Client Rewrite",
          description: "Re-architecting mobile application to native modular framework.",
          status: "ACTIVE",
          health: "CRITICAL",
          budget: "1000000.00",
          actualCost: "410000.00",
          clientName: "Product"
        }
      ]);

      // Seed Resources
      const rMarcus = "r-marcus-thorne-uuid";
      const rSarah = "r-sarah-jenkins-uuid";
      const rChen = "r-chen-wei-uuid";
      const rAmara = "r-amara-okafor-uuid";
      const rRavi = "r-ravi-kapoor-uuid";

      await db.insert(pgResourcesTable).values([
        { id: rMarcus, name: "Marcus Thorne", type: "EMPLOYEE", department: "Fintech Expansion" },
        { id: rSarah, name: "Sarah Jenkins", type: "EMPLOYEE", department: "Retail Strategy" },
        { id: rChen, name: "Chen Wei", type: "EMPLOYEE", department: "Compliance" },
        { id: rAmara, name: "Dr. Amara Okafor", type: "EMPLOYEE", department: "R&D" },
        { id: rRavi, name: "Ravi Kapoor", type: "EMPLOYEE", department: "Product" }
      ]);

      // Seed Allocations
      await db.insert(pgResourceAllocationsTable).values([
        { resourceId: rMarcus, projectId: GPX_ID, startDate: new Date(), allocationPercentage: 100 },
        { resourceId: rSarah, projectId: LRE_ID, startDate: new Date(), allocationPercentage: 112 },
        { resourceId: rChen, projectId: DGA_ID, startDate: new Date(), allocationPercentage: 80 },
        { resourceId: rAmara, projectId: QCI_ID, startDate: new Date(), allocationPercentage: 100 },
        { resourceId: rRavi, projectId: MOB_ID, startDate: new Date(), allocationPercentage: 100 }
      ]);

      // Seed Tasks
      await db.insert(pgTasksTable).values([
        {
          projectId: GPX_ID,
          title: "Integrate Stripe & Adyen webhook layer",
          description: "Implement robust webhook listeners and transaction mapping.",
          status: "IN_PROGRESS",
          priority: "HIGH",
          assigneeId: "usr-alex",
          estimatedHours: "40",
          dueDate: new Date("2026-07-14")
        },
        {
          id: "lre-121-task-id",
          projectId: LRE_ID,
          title: "Store locator API contract review",
          description: "Review geo-location contract specs and endpoint parameters.",
          status: "IN_PROGRESS",
          priority: "MEDIUM",
          assigneeId: "usr-alex",
          estimatedHours: "24",
          dueDate: new Date("2026-07-12")
        },
        {
          projectId: MOB_ID,
          title: "Refactor auth state machine",
          description: "Clean up native login flow and session renewal loops.",
          status: "ASSIGNED",
          priority: "HIGH",
          assigneeId: "usr-alex",
          estimatedHours: "32",
          dueDate: new Date("2026-07-20")
        },
        {
          projectId: DGA_ID,
          title: "Prompt evaluation harness",
          description: "Build testing suites for LLM latency and validation rates.",
          status: "ASSIGNED",
          priority: "LOW",
          assigneeId: "usr-alex",
          estimatedHours: "16",
          dueDate: new Date("2026-07-15")
        },
        {
          projectId: QCI_ID,
          title: "Cryogenic rack telemetry ingestion",
          description: "Integrate temperature logs with Grafana alerting stack.",
          status: "ASSIGNED",
          priority: "HIGH",
          assigneeId: "usr-alex",
          estimatedHours: "40",
          dueDate: new Date("2026-07-18")
        }
      ]);

      // Seed Risks & Issues
      await db.insert(pgRisksAndIssuesTable).values([
        {
          projectId: GPX_ID,
          title: "Vendor SLA breach on payment rails",
          description: "Third-party payment gateway fails to meet 99.9% uptime criteria.",
          type: "RISK",
          status: "OPEN",
          priority: "HIGH",
          ownerId: "usr-alex",
          impact: "HIGH",
          probability: 2
        },
        {
          projectId: LRE_ID,
          title: "Retail lease renegotiation delay",
          description: "Landlord negotiations pushing past target lease agreement sign dates.",
          type: "RISK",
          status: "OPEN",
          priority: "HIGH",
          ownerId: "usr-alex",
          impact: "HIGH",
          probability: 3
        }
      ]);

      // Seed Audit Logs / Activity Feed
      await db.insert(pgAuditLogsTable).values([
        { projectId: LRE_ID, userId: "usr-alex", action: "MOVED_STAGE", entityType: "TASK", entityId: "lre-121-task-id", details: "Sarah J. moved LRE-121 to review" },
        { projectId: GPX_ID, userId: "usr-alex", action: "COMMENT_ADDED", entityType: "COMMENT", entityId: "gpx-402-comment-id", details: "Marcus T. commented on GPX-402" },
        { projectId: DGA_ID, userId: "usr-alex", action: "CLOSED_TASK", entityType: "TASK", entityId: "dga-04-id", details: "Chen W. closed DGA-04" },
        { projectId: MOB_ID, userId: "usr-alex", action: "OPENED_RISK", entityType: "RISK", entityId: "mob-risk-id", details: "Ravi K. opened risk on MOB" }
      ]);

      pgProjects = await db.select().from(pgProjectsTable);
    }

    const pgTasks = await db.select().from(pgTasksTable);
    const pgResources = await db.select().from(pgResourcesTable);
    const pgAllocations = await db.select().from(pgResourceAllocationsTable);
    const pgRisksAndIssues = await db.select().from(pgRisksAndIssuesTable);
    const pgDeliverables = await db.select().from(pgDeliverablesTable);
    const pgAuditLogs = await db.select().from(pgAuditLogsTable);
    const pgNotifications = await db.select().from(pgNotificationsTable);
    const pgChatMessages = await db.select().from(pgChatMessagesTable);

    // Map projects
    dbState.milestones = [];
    dbState.projects = pgProjects.map(p => {
      // Extract milestones if they exist in JSON
      if (p.milestonesJson) {
        try {
          const projectMilestones = JSON.parse(p.milestonesJson);
          if (Array.isArray(projectMilestones)) {
            projectMilestones.forEach(m => {
              dbState.milestones.push({
                ...m,
                projectId: p.id
              });
            });
          }
        } catch (e) {
          console.error("Failed to parse milestones JSON for project", p.id);
        }
      }

      const pTasks = pgTasks.filter(t => t.projectId === p.id);
      const doneTasks = pTasks.filter(t => t.status === "ARCHIVED" || t.status === "REVIEW");
      const progress = pTasks.length > 0 ? Math.round((doneTasks.length / pTasks.length) * 100) : 0;
      
      return {
        id: p.id,
        name: p.name,
        code: p.name.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, "-"),
        description: p.description || "",
        status: p.status as any,
        health: p.health as any,
        startDate: p.startDate ? p.startDate.toISOString().split("T")[0] : "",
        endDate: p.endDate ? p.endDate.toISOString().split("T")[0] : "",
        budget: p.budget ? parseFloat(p.budget) : 0,
        progress,
        createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString(),
        deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null
      };
    });

    // Map tasks
    dbState.tasks = pgTasks.map(t => {
      let mappedStatus = TaskStatus.TODO;
      if (t.status === "REVIEW") {
        mappedStatus = TaskStatus.IN_REVIEW;
      } else if (t.status === "IN_PROGRESS" || t.status === "BLOCKED") {
        mappedStatus = TaskStatus.IN_PROGRESS;
      } else if (t.status === "ARCHIVED") {
        mappedStatus = TaskStatus.DONE;
      }
      return {
        id: t.id,
        projectId: t.projectId,
        title: t.title,
        description: t.description || "",
        status: mappedStatus,
        priority: t.priority as any,
        startDate: t.createdAt ? t.createdAt.toISOString().split("T")[0] : "",
        dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : "",
        assigneeId: t.assigneeId || null,
        milestoneId: t.parentId || null,
        labels: [],
        estimatedHours: t.estimatedHours ? parseFloat(t.estimatedHours) : 0,
        actualHours: t.actualHours ? parseFloat(t.actualHours) : 0,
        completedAt: t.status === "ARCHIVED" ? (t.updatedAt ? t.updatedAt.toISOString() : new Date().toISOString()) : null,
        createdAt: t.createdAt ? t.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: t.updatedAt ? t.updatedAt.toISOString() : new Date().toISOString(),
        deletedAt: t.deletedAt ? t.deletedAt.toISOString() : null
      };
    });

    // Map teamMembers
    dbState.teamMembers = pgAllocations.map(alloc => {
      const resource = pgResources.find(r => r.id === alloc.resourceId);
      return {
        id: alloc.id,
        projectId: alloc.projectId,
        userId: resource ? resource.id : alloc.resourceId,
        name: resource ? resource.name : "Allocated Resource",
        email: resource ? `${resource.name.toLowerCase().replace(/\s+/g, ".")}@enterprise.com` : "resource@enterprise.com",
        role: resource ? resource.department || "Team Member" : "Team Member",
        capacity: 40,
        allocation: alloc.allocationPercentage,
        availability: "AVAILABLE" as any,
        createdAt: alloc.createdAt ? alloc.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: alloc.createdAt ? alloc.createdAt.toISOString() : new Date().toISOString(),
        deletedAt: null
      };
    });

    // Map issues and risks
    dbState.issues = pgRisksAndIssues.filter(r => r.type === "ISSUE").map(r => ({
      id: r.id,
      projectId: r.projectId,
      title: r.title,
      description: r.description || "",
      severity: (r.priority === "URGENT" || r.priority === "HIGH" ? "HIGH" : r.priority === "LOW" ? "LOW" : "MEDIUM") as any,
      priority: (r.priority === "URGENT" ? "URGENT" : r.priority === "HIGH" ? "HIGH" : r.priority === "LOW" ? "LOW" : "MEDIUM") as any,
      status: (r.status === "CLOSED" ? "CLOSED" : r.status === "RESOLVED" ? "RESOLVED" : "OPEN") as any,
      reporterId: r.ownerId || "usr-alex",
      assigneeId: null,
      rootCause: null,
      resolution: null,
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: r.updatedAt ? r.updatedAt.toISOString() : new Date().toISOString(),
      deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null
    }));

    dbState.risks = pgRisksAndIssues.filter(r => r.type === "RISK").map(r => ({
      id: r.id,
      projectId: r.projectId,
      title: r.title,
      description: r.description || "",
      status: (r.status === "CLOSED" ? "CLOSED" : r.status === "MITIGATED" ? "MITIGATED" : "IDENTIFIED") as any,
      impact: (r.impact || "MEDIUM") as any,
      probability: (r.probability === 1 ? "LOW" : r.probability === 3 ? "HIGH" : "MEDIUM") as any,
      mitigationStrategy: r.mitigationPlan || "",
      escalationPlan: "",
      ownerId: r.ownerId || "usr-alex",
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: r.updatedAt ? r.updatedAt.toISOString() : new Date().toISOString(),
      deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null
    }));

    // Map deliverables
    dbState.deliverables = pgDeliverables.map(d => ({
      id: d.id,
      projectId: d.projectId,
      title: d.name,
      description: "",
      dueDate: d.dueDate ? d.dueDate.toISOString().split("T")[0] : "",
      status: (d.status === "APPROVED" ? "APPROVED" : d.status === "REJECTED" ? "REJECTED" : d.status === "IN_REVIEW" ? "IN_REVIEW" : "DRAFT") as any,
      ownerId: "usr-alex",
      reviewers: [],
      acceptanceCriteria: "",
      attachments: d.fileUrl ? [d.fileUrl] : [],
      createdAt: d.createdAt ? d.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: d.updatedAt ? d.updatedAt.toISOString() : new Date().toISOString(),
      deletedAt: null
    }));

    // Map auditLogs
    dbState.auditLogs = pgAuditLogs.map(l => ({
      id: l.id,
      projectId: l.projectId || "",
      userId: l.userId,
      userName: "System User",
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      details: l.details || "",
      timestamp: l.createdAt ? l.createdAt.toISOString() : new Date().toISOString()
    }));

    // Map notifications
    dbState.notifications = pgNotifications.map(n => {
      let mappedType: "TASK_ASSIGNED" | "COMMENT_MENTION" | "RISK_ESCALATED" | "DELIVERABLE_REVIEW" | "MEETING_SCHEDULED" | "SYSTEM" | "CHAT_MESSAGE" = "SYSTEM";
      if (n.type === "TASK_ASSIGNED" || n.type === "COMMENT_MENTION" || n.type === "RISK_ESCALATED" || n.type === "DELIVERABLE_REVIEW" || n.type === "MEETING_SCHEDULED" || n.type === "SYSTEM" || n.type === "CHAT_MESSAGE") {
        mappedType = n.type as any;
      }
      return {
        id: n.id,
        userId: n.userId,
        projectId: "",
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        type: mappedType,
        createdAt: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString()
      };
    });

    // Map chatMessages
    dbState.chatMessages = pgChatMessages.map(m => ({
      id: m.id,
      projectId: m.projectId,
      authorId: m.authorId,
      authorName: m.authorName,
      content: m.content,
      createdAt: m.createdAt ? m.createdAt.toISOString() : new Date().toISOString()
    }));

  } catch (err) {
    console.error("Failed to sync project-tracker state with PostgreSQL:", err);
  }
}

export function loadDatabase(): DatabaseState {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const data = fs.readFileSync(DB_FILE_PATH, "utf-8");
      dbState = JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load project database, seeding instead...", error);
  }
  
  const defaults = seedDatabase();
  dbState = { ...defaults, ...dbState };
  // Clean out any mock projects or tasks loaded from old JSON file
  dbState.projects = dbState.projects.filter(p => p.id !== "p1-uuid-erp-migration-2026" && p.id !== "p2-uuid-devops-pipeline-2026");
  dbState.tasks = dbState.tasks.filter(t => t.projectId !== "p1-uuid-erp-migration-2026" && t.projectId !== "p2-uuid-devops-pipeline-2026");
  dbState.teamMembers = dbState.teamMembers.filter(m => m.projectId !== "p1-uuid-erp-migration-2026" && m.projectId !== "p2-uuid-devops-pipeline-2026");
  
  return dbState;
}

export function saveDatabase(): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dbState, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to persist database state to disk", error);
  }
}

// Global active instance loaded on import
loadDatabase();

export { dbState };

export async function createNotification(userId: string, title: string, message: string, type: string) {
  try {
    const id = generateUUID();
    await db.insert(pgNotificationsTable).values({
      id,
      userId,
      title,
      message,
      type,
      isRead: false,
    });

    dbState.notifications.unshift({
      id,
      userId,
      projectId: "",
      title,
      message,
      isRead: false,
      type: type as any,
      createdAt: new Date().toISOString()
    });
    saveDatabase();
  } catch (err) {
    console.error("Failed to insert notification into database:", err);
  }
}

export async function createAuditLog(projectId: string | null, userId: string, action: string, entityType: string, entityId: string, details: string) {
  try {
    const id = generateUUID();
    await db.insert(pgAuditLogsTable).values({
      id,
      projectId,
      userId,
      action,
      entityType,
      entityId,
      details,
    });

    dbState.auditLogs.unshift({
      id,
      projectId: projectId || "",
      userId,
      userName: "System User",
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString()
    });
    saveDatabase();
  } catch (err) {
    console.error("Failed to insert audit log into database:", err);
  }
}

