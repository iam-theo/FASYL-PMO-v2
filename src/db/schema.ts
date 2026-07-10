import { pgTable, uuid, text, timestamp, boolean, varchar, pgEnum, integer, decimal, index, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Enums
export const projectStatusEnum = pgEnum("project_status", ["DRAFT", "PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]);
export const projectHealthEnum = pgEnum("project_health", ["STABLE", "AT_RISK", "CRITICAL", "ON_TRACK"]);
export const taskStatusEnum = pgEnum("task_status", ["DRAFT", "ASSIGNED", "IN_PROGRESS", "BLOCKED", "REVIEW", "COMPLETED", "ARCHIVED"]);
export const issueStatusEnum = pgEnum("issue_status", ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"]);
export const riskStatusEnum = pgEnum("risk_status", ["IDENTIFIED", "ASSESSED", "MITIGATED", "ACCEPTED", "CLOSED"]);
export const priorityEnum = pgEnum("priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const portfolioStatusEnum = pgEnum("portfolio_status", ["ACTIVE", "ARCHIVED"]);
export const programStatusEnum = pgEnum("program_status", ["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]);
export const resourceTypeEnum = pgEnum("resource_type", ["EMPLOYEE", "CONTRACTOR"]);
export const resourceStatusEnum = pgEnum("resource_status", ["ACTIVE", "ON_LEAVE", "INACTIVE"]);

// NEW IAM & Dashboard Enums
export const roleStatusEnum = pgEnum("role_status", ["ACTIVE", "INACTIVE", "ARCHIVED"]);
export const permissionOverrideTypeEnum = pgEnum("permission_override_type", ["ALLOW", "DENY"]);
export const moduleStatusEnum = pgEnum("module_status", ["ACTIVE", "INACTIVE", "MAINTENANCE", "DEPRECATED"]);
export const featureStatusEnum = pgEnum("feature_status", ["ACTIVE", "INACTIVE", "BETA", "DEPRECATED"]);
export const dashboardVisibilityEnum = pgEnum("dashboard_visibility", ["GLOBAL", "DEPARTMENT", "BUSINESS_UNIT", "ROLE", "PRIVATE"]);
export const policyLevelEnum = pgEnum("policy_level", ["ORGANIZATION", "DEPARTMENT", "BUSINESS_UNIT"]);
export const genericStatusEnum = pgEnum("generic_status", ["DRAFT", "OPEN", "PENDING", "ACTIVE", "IN_PROGRESS", "RUNNING", "COMPLETED", "APPROVED", "REJECTED", "ARCHIVED", "SUSPENDED", "CANCELLED", "TERMINATED", "RESOLVED", "CLOSED", "LOCKED", "PLANNING", "ON_HOLD", "STABLE", "AT_RISK", "CRITICAL", "ON_TRACK", "VERIFIED", "SUPERSEDED", "DELEGATED", "ESCALATED", "REWORK", "PASSED", "FAILED", "NOT_STARTED", "AWAITING_REVIEW", "REVIEW", "SIGN_OFF", "REWORK_REQUESTED", "CLARIFICATION_REQUESTED", "SUBMITTED", "REVIEWED", "IDENTIFIED", "ASSESSED", "MITIGATED", "ACCEPTED", "IN_REVIEW", "CHANGES_REQUESTED"]);
export const lifecycleDecisionEnum = pgEnum("lifecycle_decision", ["APPROVE", "REJECT", "REWORK", "CLARIFICATION", "PASSED", "FAILED", "VERIFIED", "SUBMITTED", "REVIEWED", "AWAITING_REVIEW", "APPROVED", "REJECTED", "REWORK_REQUESTED", "CLARIFICATION_REQUESTED"]);
export const proficiencyLevelEnum = pgEnum("proficiency_level", ["BEGINNER", "INTERMEDIATE", "EXPERT"]);
export const policyTypeEnum = pgEnum("policy_type", ["ACCESS", "FINANCE", "GOVERNANCE", "SECURITY", "RESOURCE"]);

// Portfolios Table
export const portfolios = pgTable("portfolios", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  managerId: varchar("manager_id", { length: 255 }).notNull(),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  status: portfolioStatusEnum("status").default("ACTIVE").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Programs Table
export const programs = pgTable("programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  portfolioId: uuid("portfolio_id").references(() => portfolios.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  managerId: varchar("manager_id", { length: 255 }).notNull(),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  status: programStatusEnum("status").default("ACTIVE").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Resources Table
export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: resourceTypeEnum("type").notNull(),
  department: varchar("department", { length: 100 }),
  costPerHour: decimal("cost_per_hour", { precision: 10, scale: 2 }),
  status: resourceStatusEnum("status").default("ACTIVE").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Resource Allocations Table
export const resourceAllocations = pgTable("resource_allocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  resourceId: uuid("resource_id").references(() => resources.id).notNull(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  allocationPercentage: integer("allocation_percentage").default(100).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Projects Table (Root Aggregate)
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: uuid("program_id").references(() => programs.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: projectStatusEnum("status").default("DRAFT").notNull(),
  health: projectHealthEnum("health").default("ON_TRACK").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  managerId: varchar("manager_id", { length: 255 }), // User ID from Firebase
  clientName: varchar("client_name", { length: 255 }),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 12, scale: 2 }).default("0"),
  healthScore: integer("health_score").default(100),
  milestonesJson: text("milestones_json"),
  tasksJson: text("tasks_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Tasks Table
export const tasks = pgTable("tasks", {
  lifecycleStageId: uuid("lifecycle_stage_id").references(() => lifecycleStages.id),
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("DRAFT").notNull(),
  priority: priorityEnum("priority").default("MEDIUM").notNull(),
  assigneeId: varchar("assignee_id", { length: 255 }),
  dueDate: timestamp("due_date"),
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 5, scale: 2 }).default("0"),
  completionPercentage: integer("completion_percentage").default(0),
  parentId: uuid("parent_id"), // For WBS / Subtasks
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Issues & Risks Table
export const risksAndIssues = pgTable("risks_and_issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(), // 'ISSUE' or 'RISK'
  status: genericStatusEnum("status").default("OPEN").notNull(), 
  priority: priorityEnum("priority").default("MEDIUM").notNull(),
  ownerId: varchar("owner_id", { length: 255 }),
  mitigationPlan: text("mitigation_plan"),
  impact: text("impact"),
  probability: integer("probability"), // 1-100 for Risks
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Deliverables & Documents
export const deliverables = pgTable("deliverables", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: genericStatusEnum("status").default("PENDING").notNull(),
  dueDate: timestamp("due_date"),
  fileUrl: text("file_url"),
  version: varchar("version", { length: 50 }).default("1.0.0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Audit Log
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id),
  userId: varchar("user_id", { length: 255 }).notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 255 }).notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  priority: varchar("priority", { length: 50 }).default("MEDIUM").notNull(),
  icon: varchar("icon", { length: 100 }),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: varchar("entity_id", { length: 255 }),
  actionUrl: varchar("action_url", { length: 255 }),
  isDelivered: boolean("is_delivered").default(false).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chat Messages
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  authorId: varchar("author_id", { length: 255 }).notNull(),
  authorName: varchar("author_name", { length: 255 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- ENTERPRISE RBAC & PBAC SCHEMA ---

// Permission Categories Table
export const permissionCategories = pgTable("permission_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  code: varchar("code", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Permission Groups Table
export const permissionGroups = pgTable("permission_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => permissionCategories.id).notNull(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  code: varchar("code", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Modules Table
export const modules = pgTable("modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  description: text("description"),
  version: varchar("version", { length: 50 }).default("1.0.0"),
  status: moduleStatusEnum("status").default("ACTIVE").notNull(),
  dependenciesJson: text("dependencies_json"), // JSON array of module codes
  visibility: dashboardVisibilityEnum("visibility").default("GLOBAL").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Features Table
export const features = pgTable("features", {
  id: uuid("id").primaryKey().defaultRandom(),
  moduleId: uuid("module_id").references(() => modules.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  description: text("description"),
  status: featureStatusEnum("status").default("ACTIVE").notNull(),
  permissionRequired: varchar("permission_required", { length: 255 }), // Permission key
  isBeta: boolean("is_beta").default(false).notNull(),
  isDeprecated: boolean("is_deprecated").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Organization Policies Table
export const organizationPolicies = pgTable("organization_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  type: policyTypeEnum("type").notNull(),
  level: policyLevelEnum("level").notNull(),
  targetId: varchar("target_id", { length: 255 }), // Dept ID, BU ID, or Org ID
  valueJson: text("value_json"), // Policy configuration
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Dashboard Widgets Table
export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  moduleId: uuid("module_id").references(() => modules.id),
  featureId: uuid("feature_id").references(() => features.id),
  permissionRequired: varchar("permission_required", { length: 255 }),
  apiEndpoint: varchar("api_endpoint", { length: 512 }),
  refreshInterval: integer("refresh_interval").default(300), // seconds
  componentType: varchar("component_type", { length: 100 }).notNull(), // CHART, KPI, TABLE, LIST
  defaultConfigJson: text("default_config_json"),
  visibilityRulesJson: text("visibility_rules_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Dashboard Templates Table
export const dashboardTemplates = pgTable("dashboard_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  roleId: uuid("role_id").references(() => roles.id),
  department: varchar("department", { length: 100 }),
  businessUnit: varchar("business_unit", { length: 100 }),
  visibility: dashboardVisibilityEnum("visibility").default("GLOBAL").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Dashboard Layouts Table (Template-Widget Mapping)
export const dashboardLayouts = pgTable("dashboard_layouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id").references(() => dashboardTemplates.id).notNull(),
  widgetId: uuid("widget_id").references(() => dashboardWidgets.id).notNull(),
  gridPosX: integer("grid_pos_x").notNull(),
  gridPosY: integer("grid_pos_y").notNull(),
  gridWidth: integer("grid_width").notNull(),
  gridHeight: integer("grid_height").notNull(),
  isCollapsed: boolean("is_collapsed").default(false).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User Dashboard Preferences Table
export const userDashboardPreferences = pgTable("user_dashboard_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  templateId: uuid("template_id").references(() => dashboardTemplates.id),
  layoutOverridesJson: text("layout_overrides_json"), // User-specific grid changes
  hiddenWidgetsJson: text("hidden_widgets_json"),
  pinnedWidgetsJson: text("pinned_widgets_json"),
  favoritesJson: text("favorites_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("user_dash_pref_idx").on(table.userId, table.templateId)
]);

// Role Custom Fields Table (Metadata-driven role attributes)
export const roleCustomFields = pgTable("role_custom_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  roleId: uuid("role_id").references(() => roles.id).notNull(),
  fieldName: varchar("field_name", { length: 100 }).notNull(), // approvalLimit, budgetLimit
  fieldType: varchar("field_type", { length: 50 }).notNull(), // STRING, NUMBER, BOOLEAN, JSON
  fieldValue: text("field_value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("role_field_idx").on(table.roleId, table.fieldName)
]);

// Permissions Table
export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => permissionGroups.id).notNull(),
  name: varchar("name", { length: 255 }).notNull().unique(), // dot notation (e.g., projects.create)
  module: varchar("module", { length: 100 }).notNull(),
  feature: varchar("feature", { length: 100 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  permissionKey: varchar("permission_key", { length: 255 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  dependency: varchar("dependency", { length: 255 }), // key of dependent permission
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Roles Table
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  code: varchar("code", { length: 255 }).notNull().unique(),
  description: text("description"),
  color: varchar("color", { length: 50 }).default("#6366f1"),
  icon: varchar("icon", { length: 100 }).default("Shield"),
  hierarchyLevel: integer("hierarchy_level").default(0).notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  status: roleStatusEnum("status").default("ACTIVE").notNull(),
  departmentScope: varchar("department_scope", { length: 100 }),
  businessUnitScope: varchar("business_unit_scope", { length: 100 }),
  createdBy: varchar("created_by", { length: 255 }),
  updatedBy: varchar("updated_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Role Permissions Mapping Table
export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  roleId: uuid("role_id").references(() => roles.id).notNull(),
  permissionId: uuid("permission_id").references(() => permissions.id).notNull(),
  assignedBy: varchar("assigned_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("role_perm_idx").on(table.roleId, table.permissionId)
]);

// User Roles Mapping Table
export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(), // string Firebase user ID
  roleId: uuid("role_id").references(() => roles.id).notNull(),
  assignedBy: varchar("assigned_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("user_role_idx").on(table.userId, table.roleId)
]);

// User Permissions Mapping Table (Direct overrides, dynamic PBAC)
export const userPermissions = pgTable("user_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  permissionId: uuid("permission_id").references(() => permissions.id).notNull(),
  type: varchar("type", { length: 50 }).default("ALLOW").notNull(), // "ALLOW" or "DENY" override
  assignedBy: varchar("assigned_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("user_perm_idx").on(table.userId, table.permissionId)
]);

// Permission Audit Logs Table
export const permissionAuditLogs = pgTable("permission_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: varchar("actor_id", { length: 255 }).notNull(),
  action: varchar("action", { length: 255 }).notNull(), // ROLE_CREATE, PERMISSION_ASSIGN, etc.
  targetType: varchar("target_type", { length: 50 }).notNull(), // ROLE, USER, PERMISSION, etc.
  targetId: varchar("target_id", { length: 255 }).notNull(),
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("perm_audit_actor_idx").on(table.actorId),
  index("perm_audit_target_idx").on(table.targetType, table.targetId)
]);


// --- ENTERPRISE WORKFLOW ENGINE SCHEMA ---

// 1. Workflow Definitions Table
export const workflowDefinitions = pgTable("workflow_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  latestVersion: integer("latest_version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  uniqueIndex("workflow_def_code_idx").on(table.code)
]);

// 2. Workflow Versions Table
export const workflowVersions = pgTable("workflow_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id").references(() => workflowDefinitions.id).notNull(),
  version: integer("version").notNull(),
  definition: text("definition"), // Stored JSON configuration of states and transitions
  isActive: boolean("is_active").default(false).notNull(),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("workflow_ver_parent_idx").on(table.workflowId)
]);

// 3. Workflow States Table
export const workflowStates = pgTable("workflow_states", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id").references(() => workflowDefinitions.id).notNull(),
  versionId: uuid("version_id").references(() => workflowVersions.id).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isInitial: boolean("is_initial").default(false).notNull(),
  isFinal: boolean("is_final").default(false).notNull(),
  slaHours: integer("sla_hours"), // Service Level Agreement in hours for this state
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("workflow_state_parent_idx").on(table.workflowId),
  uniqueIndex("workflow_state_code_ver_idx").on(table.workflowId, table.versionId, table.code)
]);

// 4. Workflow Transitions Table
export const workflowTransitions = pgTable("workflow_transitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id").references(() => workflowDefinitions.id).notNull(),
  versionId: uuid("version_id").references(() => workflowVersions.id).notNull(),
  fromStateId: uuid("from_state_id").references(() => workflowStates.id), // Nullable for start transitions
  toStateId: uuid("to_state_id").references(() => workflowStates.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  triggerType: varchar("trigger_type", { length: 50 }).default("MANUAL").notNull(), // MANUAL, AUTO, TIME_OUT
  slaHours: integer("sla_hours"), // Timeout/escalation limit for the transition
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("workflow_trans_parent_idx").on(table.workflowId),
  index("workflow_trans_states_idx").on(table.fromStateId, table.toStateId)
]);

// 5. Workflow Roles Table (Who is allowed to execute a transition based on RBAC Roles)
export const workflowRoles = pgTable("workflow_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  transitionId: uuid("transition_id").references(() => workflowTransitions.id).notNull(),
  roleCode: varchar("role_code", { length: 255 }).notNull(), // RBAC role code, e.g. 'pmo_director'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("workflow_roles_trans_idx").on(table.transitionId)
]);

// 6. Workflow Permissions Table (Who is allowed to execute a transition based on PBAC Permissions)
export const workflowPermissions = pgTable("workflow_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  transitionId: uuid("transition_id").references(() => workflowTransitions.id).notNull(),
  permissionCode: varchar("permission_code", { length: 255 }).notNull(), // dot notation permission, e.g. 'projects.approve'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("workflow_perms_trans_idx").on(table.transitionId)
]);

// 7. Workflow Conditions Table (Business Rules Engine config)
export const workflowConditions = pgTable("workflow_conditions", {
  id: uuid("id").primaryKey().defaultRandom(),
  transitionId: uuid("transition_id").references(() => workflowTransitions.id).notNull(),
  logicalOperator: varchar("logical_operator", { length: 10 }).default("AND").notNull(), // AND, OR, NOT
  field: varchar("field", { length: 255 }), // Field on entity e.g., 'budget', 'riskScore'
  operator: varchar("operator", { length: 50 }), // GREATER_THAN, LESS_THAN, EQUAL_TO, CONTAINS
  value: text("value"), // Serialized value to check against
  customExpression: text("custom_expression"), // Advanced expressions
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("workflow_cond_trans_idx").on(table.transitionId)
]);

// 8. Workflow Actions Table (Extensible Automatic Actions)
export const workflowActions = pgTable("workflow_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  transitionId: uuid("transition_id").references(() => workflowTransitions.id), // If triggered by transition
  stateId: uuid("state_id").references(() => workflowStates.id), // If triggered by state entry/exit
  triggerType: varchar("trigger_type", { length: 50 }).notNull(), // ON_ENTRY, ON_EXIT, ON_TRANSITION
  actionType: varchar("action_type", { length: 50 }).notNull(), // SEND_NOTIFICATION, ASSIGN_USER, CREATE_TASK, EVENT_BUS, WEBHOOK, UPDATE_STATUS
  parameters: text("parameters"), // JSON configuration parameters for the action
  executionOrder: integer("execution_order").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("workflow_act_trans_idx").on(table.transitionId),
  index("workflow_act_state_idx").on(table.stateId)
]);

// 9. Workflow Instances Table
export const workflowInstances = pgTable("workflow_instances", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id").references(() => workflowDefinitions.id).notNull(),
  versionId: uuid("version_id").references(() => workflowVersions.id).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(), // PROJECT, TASK, RISK, ISSUE, DELIVERABLE, etc.
  entityId: varchar("entity_id", { length: 255 }).notNull(), // UUID or string id of the governed entity
  currentStateId: uuid("current_state_id").references(() => workflowStates.id).notNull(),
  status: genericStatusEnum("status").default("ACTIVE").notNull(), 
  startedBy: varchar("started_by", { length: 255 }).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  slaDueDate: timestamp("sla_due_date"),
  optimisticLock: integer("optimistic_lock").default(1).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("workflow_inst_entity_idx").on(table.entityType, table.entityId),
  index("workflow_inst_state_idx").on(table.currentStateId)
]);

// 10. Workflow Instance History Table
export const workflowInstanceHistory = pgTable("workflow_instance_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => workflowInstances.id).notNull(),
  fromStateId: uuid("from_state_id").references(() => workflowStates.id),
  toStateId: uuid("to_state_id").references(() => workflowStates.id).notNull(),
  transitionId: uuid("transition_id").references(() => workflowTransitions.id),
  actionBy: varchar("action_by", { length: 255 }).notNull(),
  actionAt: timestamp("action_at").defaultNow().notNull(),
  durationSeconds: integer("duration_seconds"),
}, (table) => [
  index("workflow_hist_inst_idx").on(table.instanceId)
]);

// 11. Workflow Approvals Table
export const workflowApprovals = pgTable("workflow_approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => workflowInstances.id).notNull(),
  transitionId: uuid("transition_id").references(() => workflowTransitions.id),
  stateId: uuid("state_id").references(() => workflowStates.id),
  approverId: varchar("approver_id", { length: 255 }).notNull(), // User UUID
  status: genericStatusEnum("status").default("PENDING").notNull(), 
  actionAt: timestamp("action_at"),
  slaDueDate: timestamp("sla_due_date"),
  isEscalated: boolean("is_escalated").default(false).notNull(),
  escalatedTo: varchar("escalated_to", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("workflow_appr_inst_idx").on(table.instanceId),
  index("workflow_appr_user_idx").on(table.approverId)
]);

// 12. Workflow Comments Table
export const workflowComments = pgTable("workflow_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => workflowInstances.id).notNull(),
  stateId: uuid("state_id").references(() => workflowStates.id),
  userId: varchar("user_id", { length: 255 }).notNull(),
  userName: varchar("user_name", { length: 255 }),
  commentText: text("comment_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("workflow_comm_inst_idx").on(table.instanceId)
]);

// 13. Workflow Notifications Table
export const workflowNotifications = pgTable("workflow_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => workflowInstances.id).notNull(),
  recipientId: varchar("recipient_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isSent: boolean("is_sent").default(false).notNull(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("workflow_notif_inst_idx").on(table.instanceId)
]);

// 14. Workflow Events Table
export const workflowEvents = pgTable("workflow_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => workflowInstances.id).notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(), // workflow.started, transitioned, etc.
  payload: text("payload"), // JSON payload
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("workflow_ev_inst_idx").on(table.instanceId)
]);

// 15. Workflow Variables Table
export const workflowVariables = pgTable("workflow_variables", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => workflowInstances.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  value: text("value"), // Serialized value
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("workflow_var_inst_idx").on(table.instanceId, table.name)
]);

// 16. Workflow Templates Table
export const workflowTemplates = pgTable("workflow_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  description: text("description"),
  definition: text("definition"), // Stored JSON configuration for imports
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("workflow_tmpl_code_idx").on(table.code)
]);

// 17. Workflow Logs Table
export const workflowLogs = pgTable("workflow_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => workflowInstances.id).notNull(),
  level: varchar("level", { length: 50 }).default("INFO").notNull(), // INFO, WARN, ERROR, DEBUG
  message: text("message").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("workflow_logs_inst_idx").on(table.instanceId)
]);


// --- ENTERPRISE EPPM NEW TABLES ---

// 1. Resource Skills Table
export const resourceSkills = pgTable("resource_skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  resourceId: uuid("resource_id").references(() => resources.id).notNull(),
  skill: varchar("skill", { length: 255 }).notNull(),
  proficiencyLevel: proficiencyLevelEnum("proficiency_level").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. Resource Certifications Table
export const resourceCertifications = pgTable("resource_certifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  resourceId: uuid("resource_id").references(() => resources.id).notNull(),
  certificationName: varchar("certification_name", { length: 255 }).notNull(),
  issuingOrganization: varchar("issuing_organization", { length: 255 }),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. Resource Calendars / Leave / Holiday Table
export const resourceCalendars = pgTable("resource_calendars", {
  id: uuid("id").primaryKey().defaultRandom(),
  resourceId: uuid("resource_id").references(() => resources.id), // Nullable if company-wide holiday
  eventType: varchar("event_type", { length: 100 }).notNull(), // HOLIDAY, LEAVE, TRAINING, SHIFT_PATTERN
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  workingHoursPerDay: integer("working_hours_per_day").default(8),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. Department Capacities Table (Capacity Planning)
export const departmentCapacities = pgTable("department_capacities", {
  id: uuid("id").primaryKey().defaultRandom(),
  department: varchar("department", { length: 100 }).notNull().unique(),
  totalHeads: integer("total_heads").notNull(),
  availableHoursPerMonth: integer("available_hours_per_month").notNull(),
  targetUtilization: integer("target_utilization").default(80).notNull(), // Target %
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 5. Cost Centers Table
export const costCenters = pgTable("cost_centers", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  managerId: varchar("manager_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6. Project Expenses Table
export const projectExpenses = pgTable("project_expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  costCenterId: uuid("cost_center_id").references(() => costCenters.id),
  category: varchar("category", { length: 100 }).notNull(), // TRAVEL, SOFTWARE, HARDWARE, etc.
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: genericStatusEnum("status").default("PENDING").notNull(),
  approvedBy: varchar("approved_by", { length: 255 }),
  description: text("description"),
  expenseDate: timestamp("expense_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 7. Baselines Table (Unlimited baselines per project)
export const projectBaselines = pgTable("project_baselines", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  originalScheduleJson: text("original_schedule_json"), // Snapshot of task start/end dates
  originalBudget: decimal("original_budget", { precision: 15, scale: 2 }),
  originalScope: text("original_scope"),
  originalMilestonesJson: text("original_milestones_json"),
  originalResourcesJson: text("original_resources_json"),
  isCurrentBaseline: boolean("is_current_baseline").default(false).notNull(),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 8. Earned Value Management (EVM) Snapshots
export const evmSnapshots = pgTable("evm_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  pv: decimal("pv", { precision: 12, scale: 2 }).notNull(), // Planned Value
  ev: decimal("ev", { precision: 12, scale: 2 }).notNull(), // Earned Value
  ac: decimal("ac", { precision: 12, scale: 2 }).notNull(), // Actual Cost
  spi: decimal("spi", { precision: 5, scale: 2 }).notNull(), // Schedule Performance Index
  cpi: decimal("cpi", { precision: 5, scale: 2 }).notNull(), // Cost Performance Index
  eac: decimal("eac", { precision: 12, scale: 2 }).notNull(), // Estimate At Completion
  vac: decimal("vac", { precision: 12, scale: 2 }).notNull(), // Variance At Completion
  tcpi: decimal("tcpi", { precision: 5, scale: 2 }).notNull(), // To Complete Performance Index
  snapshotDate: timestamp("snapshot_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 9. Change Requests Table
export const changeRequests = pgTable("change_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  impactAnalysis: text("impact_analysis"),
  proposedBudgetChange: decimal("proposed_budget_change", { precision: 12, scale: 2 }).default("0"),
  proposedScheduleChangeDays: integer("proposed_schedule_change_days").default(0),
  status: genericStatusEnum("status").default("PENDING").notNull(),
  approvalWorkflowInstanceId: uuid("approval_workflow_instance_id"),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 10. Project Templates Table
export const projectTemplates = pgTable("project_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  tasksJson: text("tasks_json"), // Template tasks list JSON
  milestonesJson: text("milestones_json"),
  risksJson: text("risks_json"),
  workflowTemplatesJson: text("workflow_templates_json"),
  budgetTemplatesJson: text("budget_templates_json"),
  checklistTemplatesJson: text("checklist_templates_json"),
  documentTemplatesJson: text("document_templates_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 11. KPI Metrics Table
export const kpiMetrics = pgTable("kpi_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // PORTFOLIO, PROGRAM, PROJECT, ENTERPRISE
  entityId: uuid("entity_id").notNull(),
  kpiName: varchar("kpi_name", { length: 100 }).notNull(),
  kpiValue: decimal("kpi_value", { precision: 12, scale: 2 }).notNull(),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

// --- STAGE-GATE GOVERNANCE (PLGS) TABLES ---

// 1. Lifecycle Templates
export const lifecycleTemplates = pgTable("lifecycle_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Lifecycle Versions
export const lifecycleVersions = pgTable("lifecycle_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id").references(() => lifecycleTemplates.id).notNull(),
  version: integer("version").notNull(),
  status: genericStatusEnum("status").default("PENDING").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. Lifecycle Stages
export const lifecycleStages = pgTable("lifecycle_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id").references(() => lifecycleTemplates.id).notNull(),
  versionId: uuid("version_id").references(() => lifecycleVersions.id),
  name: varchar("name", { length: 255 }).notNull(),
  stageNumber: integer("stage_number").notNull(),
  description: text("description"),
  businessObjective: text("business_objective"),
  estimatedDurationDays: integer("estimated_duration_days").default(30).notNull(),
  maxSlaDurationDays: integer("max_sla_duration_days").default(45).notNull(),
  warningThresholdDays: integer("warning_threshold_days").default(35).notNull(),
  escalationThresholdDays: integer("escalation_threshold_days").default(40).notNull(),
  ownerRole: varchar("owner_role", { length: 100 }),
  approverRoles: text("approver_roles"), // JSON string/array of roles
  headOfOperationsReviewerId: varchar("head_of_operations_reviewer_id", { length: 255 }),
  requiredPermissions: text("required_permissions"), // JSON array
  workflowMapping: varchar("workflow_mapping", { length: 100 }),
  entryRulesJson: text("entry_rules_json"),
  exitRulesJson: text("exit_rules_json"),
  stageWeight: integer("stage_weight").default(10).notNull(),
  displayOrder: integer("display_order").notNull(),
  dependenciesJson: text("dependencies_json"),
  isLockedByDefault: boolean("is_locked_by_default").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. Lifecycle Instances (The Active Lifecycle status tracker per Project)
export const lifecycleInstances = pgTable("lifecycle_instances", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  templateId: uuid("template_id").references(() => lifecycleTemplates.id).notNull(),
  versionId: uuid("version_id").references(() => lifecycleVersions.id),
  currentStageId: uuid("current_stage_id").references(() => lifecycleStages.id),
  status: genericStatusEnum("status").default("PENDING").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 5. Stage Documents Configuration (Required documents per stage definition)
export const stageDocuments = pgTable("stage_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  stageId: uuid("stage_id").references(() => lifecycleStages.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // CHARTER, BUSINESS_CASE, FEASIBILITY, etc.
  isMandatory: boolean("is_mandatory").default(true).notNull(),
  description: text("description"),
  allowedFormatsJson: text("allowed_formats_json"), // JSON string array (e.g., ["pdf", "docx"])
  maxFileSizeMb: integer("max_file_size_mb").default(50).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6. Document Versions (Uploaded artifacts)
export const documentVersions = pgTable("document_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => lifecycleInstances.id).notNull(),
  stageDocumentId: uuid("stage_document_id").references(() => stageDocuments.id).notNull(),
  filePath: varchar("file_path", { length: 512 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  version: integer("version").default(1).notNull(),
  status: genericStatusEnum("status").default("PENDING").notNull(),
  uploadedBy: varchar("uploaded_by", { length: 255 }).notNull(),
  verificationStatus: genericStatusEnum("verification_status").default("PENDING").notNull(),
  reviewerNotes: text("reviewer_notes"),
  checksum: varchar("checksum", { length: 255 }),
  virusScanPassed: boolean("virus_scan_passed").default(true).notNull(),
  digitalSignature: text("digital_signature"),
  isOcrReady: boolean("is_ocr_ready").default(false).notNull(),
  retentionDate: timestamp("retention_date"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

// 7. Document Verifications Tracker
export const documentVerifications = pgTable("document_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentVersionId: uuid("document_version_id").references(() => documentVersions.id).notNull(),
  reviewerId: varchar("reviewer_id", { length: 255 }).notNull(),
  status: genericStatusEnum("status").notNull(),
  notes: text("notes"),
  verifiedAt: timestamp("verified_at").defaultNow().notNull(),
});

// 8. Stage Checklists Configuration
export const stageChecklists = pgTable("stage_checklists", {
  id: uuid("id").primaryKey().defaultRandom(),
  stageId: uuid("stage_id").references(() => lifecycleStages.id).notNull(),
  itemText: text("item_text").notNull(),
  isMandatory: boolean("is_mandatory").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 9. Checklist Responses
export const checklistResponses = pgTable("checklist_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => lifecycleInstances.id).notNull(),
  checklistId: uuid("checklist_id").references(() => stageChecklists.id).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedBy: varchar("completed_by", { length: 255 }),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 10. Stage Approvals (Mandatory role approvals)
export const stageApprovals = pgTable("stage_approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => lifecycleInstances.id).notNull(),
  stageId: uuid("stage_id").references(() => lifecycleStages.id).notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  assignedApproverId: varchar("assigned_approver_id", { length: 255 }),
  status: genericStatusEnum("status").default("PENDING").notNull(),
  comments: text("comments"),
  signedAt: timestamp("signed_at"),
  digitalSignature: text("digital_signature"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 11. Head of Operations Reviews
export const headOfOperationsReviews = pgTable("head_of_operations_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => lifecycleInstances.id).notNull(),
  stageId: uuid("stage_id").references(() => lifecycleStages.id).notNull(),
  reviewerId: varchar("reviewer_id", { length: 255 }).notNull(),
  status: genericStatusEnum("status").default("PENDING").notNull(),
  comments: text("comments"),
  rejectedChecklistItemsJson: text("rejected_checklist_items_json"),
  rejectedDocumentsJson: text("rejected_documents_json"),
  resubmissionDueDate: timestamp("resubmission_due_date"),
  digitalSignature: text("digital_signature"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 12. Lifecycle History
export const lifecycleHistory = pgTable("lifecycle_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => lifecycleInstances.id).notNull(),
  stageId: uuid("stage_id").references(() => lifecycleStages.id).notNull(),
  action: varchar("action", { length: 100 }).notNull(), // STAGE_STARTED, STAGE_SUBMITTED, STAGE_APPROVED, STAGE_REJECTED, REWORK_REQUESTED, CLARIFICATION_REQUESTED
  performedBy: varchar("performed_by", { length: 255 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 13. Lifecycle Notifications
export const lifecycleNotifications = pgTable("lifecycle_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => lifecycleInstances.id).notNull(),
  recipientId: varchar("recipient_id", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // IN_APP, EMAIL, SMS, SLACK, MS_TEAMS
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  channel: varchar("channel", { length: 50 }).notNull(),
  isSent: boolean("is_sent").default(false).notNull(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 14. Lifecycle Escalations
export const lifecycleEscalations = pgTable("lifecycle_escalations", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => lifecycleInstances.id).notNull(),
  stageId: uuid("stage_id").references(() => lifecycleStages.id).notNull(),
  level: integer("level").default(1).notNull(),
  status: varchar("status", { length: 50 }).default("ACTIVE").notNull(), // ACTIVE, RESOLVED
  escalatedTo: varchar("escalated_to", { length: 255 }).notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// 15. Lifecycle SLAs
export const lifecycleSLAs = pgTable("lifecycle_slas", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => lifecycleInstances.id).notNull(),
  stageId: uuid("stage_id").references(() => lifecycleStages.id).notNull(),
  actualStart: timestamp("actual_start").defaultNow().notNull(),
  targetFinish: timestamp("target_finish").notNull(),
  actualFinish: timestamp("actual_finish"),
  slaStatus: varchar("sla_status", { length: 50 }).default("NORMAL").notNull(), // NORMAL, WARNING, BREACHED
  lastCheckedAt: timestamp("last_checked_at").defaultNow().notNull(),
});

// 16. Lifecycle Comments
export const lifecycleComments = pgTable("lifecycle_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => lifecycleInstances.id).notNull(),
  stageId: uuid("stage_id").references(() => lifecycleStages.id).notNull(),
  authorId: varchar("author_id", { length: 255 }).notNull(),
  content: text("content").notNull(),
  parentCommentId: uuid("parent_comment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 17. Lifecycle Decisions
export const lifecycleDecisions = pgTable("lifecycle_decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => lifecycleInstances.id).notNull(),
  stageId: uuid("stage_id").references(() => lifecycleStages.id).notNull(),
  decision: lifecycleDecisionEnum("decision").notNull(),
  madeBy: varchar("made_by", { length: 255 }).notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 18. Lifecycle Audit Logs
export const lifecycleAuditLogs = pgTable("lifecycle_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id),
  actorId: varchar("actor_id", { length: 255 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  module: varchar("module", { length: 100 }).default("PLGS").notNull(),
  entityId: uuid("entity_id").notNull(),
  payload: text("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 19. Reminder Queue
export const reminderQueue = pgTable("reminder_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => lifecycleInstances.id).notNull(),
  stageId: uuid("stage_id").references(() => lifecycleStages.id).notNull(),
  recipientId: varchar("recipient_id", { length: 255 }).notNull(),
  reminderType: varchar("reminder_type", { length: 100 }).notNull(), // UPLOAD_OVERDUE, APPROVAL_OVERDUE, HEAD_OF_OPS_OVERDUE
  scheduledFor: timestamp("scheduled_for").notNull(),
  isSent: boolean("is_sent").default(false).notNull(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 20. Escalation Queue
export const escalationQueue = pgTable("escalation_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id").references(() => lifecycleInstances.id).notNull(),
  stageId: uuid("stage_id").references(() => lifecycleStages.id).notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  level: integer("level").notNull(),
  isTriggered: boolean("is_triggered").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 21. Scheduler Jobs
export const schedulerJobs = pgTable("scheduler_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobName: varchar("job_name", { length: 100 }).notNull(),
  lastRunAt: timestamp("last_run_at").defaultNow().notNull(),
  status: varchar("status", { length: 50 }).default("SUCCESS").notNull(), // SUCCESS, FAILED
  errorMessage: text("error_message"),
});

// --- EPOL ENTERPRISE PLATFORM ORCHESTRATION LAYER TABLES ---

// 22. System Configurations Table
export const systemConfigurations = pgTable("system_configurations", {
  id: uuid("id").primaryKey().defaultRandom(),
  configKey: varchar("config_key", { length: 255 }).notNull().unique(),
  configValue: text("config_value").notNull(), // Serialized JSON or raw strings
  category: varchar("category", { length: 100 }).notNull(), // SLA, NOTIFICATION, ESCALATION, SECURITY, FEATURE_FLAGS
  updatedBy: varchar("updated_by", { length: 255 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 23. Background Jobs (Job Center Registry)
export const backgroundJobs = pgTable("background_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("PENDING").notNull(), // PENDING, RUNNING, COMPLETED, FAILED
  priority: integer("priority").default(0).notNull(), // Higher is higher priority
  payload: text("payload"), // Serialized payload parameters
  retries: integer("retries").default(0).notNull(),
  maxRetries: integer("max_retries").default(3).notNull(),
  queueName: varchar("queue_name", { length: 100 }).default("default").notNull(),
  failureReason: text("failure_reason"),
  logs: text("logs"), // Text blocks of execution output
  runAt: timestamp("run_at"), // Delayed executions
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 24. Delivery Notifications Table (Centralized multi-channel tracing)
export const deliveryNotifications = pgTable("delivery_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipientId: varchar("recipient_id", { length: 255 }).notNull(),
  channel: varchar("channel", { length: 50 }).notNull(), // IN_APP, EMAIL, SMS, TEAMS, SLACK, WEBHOOK
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 50 }).default("PENDING").notNull(), // PENDING, SENT, DELIVERED, READ, FAILED
  retries: integer("retries").default(0).notNull(),
  readAt: timestamp("read_at"),
  sentAt: timestamp("sent_at"),
  providerResponse: jsonb("provider_response"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 25. Notification Templates Table
export const notificationTemplates = pgTable("notification_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 100 }).unique().notNull(), // e.g. TASK_ASSIGNED
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  smsBody: text("sms_body"),
  pushBody: text("push_body"),
  emailEnabled: boolean("email_enabled").default(true).notNull(),
  smsEnabled: boolean("sms_enabled").default(true).notNull(),
  inAppEnabled: boolean("in_app_enabled").default(true).notNull(),
  category: varchar("category", { length: 100 }), // TASK, PROJECT, IAM, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 26. User Notification Preferences Table
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  eventCode: varchar("event_code", { length: 100 }).notNull(), // e.g. TASK_ASSIGNED
  emailEnabled: boolean("email_enabled").default(true).notNull(),
  smsEnabled: boolean("sms_enabled").default(false).notNull(),
  inAppEnabled: boolean("in_app_enabled").default(true).notNull(),
  frequency: varchar("frequency", { length: 50 }).default("IMMEDIATE").notNull(), // IMMEDIATE, DAILY_DIGEST, WEEKLY_DIGEST
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userEventIdx: uniqueIndex("user_event_idx").on(table.userId, table.eventCode),
}));

// 27. System Notification Settings Table (Global Admin Settings)
export const notificationSettings = pgTable("notification_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).unique().notNull(), // SMTP_HOST, SMTP_PORT, TERMII_API_KEY, etc.
  value: text("value"),
  isSecret: boolean("is_secret").default(false).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // EMAIL, SMS, GENERAL
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 28. Universal Corporate Activity Timeline
export const universalTimeline = pgTable("universal_timeline", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id"), // Optional if system-wide
  entityType: varchar("entity_type", { length: 100 }).notNull(), // LEAD, GOVERNANCE, PLANNING, TASK, EXECUTION, CLOSURE
  entityId: varchar("entity_id", { length: 255 }).notNull(),
  activityType: varchar("activity_type", { length: 100 }).notNull(), // CREATED, TRANSITIONED, REJECTED, COMPLETED
  activityName: varchar("activity_name", { length: 255 }).notNull(),
  actorId: varchar("actor_id", { length: 255 }).notNull(),
  details: text("details"), // Expanded contextual parameters
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 26. Integration Configurations
export const integrationConfigs = pgTable("integration_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  connectorName: varchar("connector_name", { length: 100 }).notNull().unique(), // JIRA, GITHUB, SLACK, SAP, SALESFORCE
  isEnabled: boolean("is_enabled").default(false).notNull(),
  credentialsJson: text("credentials_json"), // Encrypted configurations
  mappingJson: text("mapping_json"), // Field mappings metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 27. Event Registry Catalog
export const eventRegistryCatalog = pgTable("event_registry_catalog", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventName: varchar("event_name", { length: 255 }).notNull().unique(), // e.g., project.created
  publisher: varchar("publisher", { length: 100 }).notNull(), // Owner module name
  subscribersJson: text("subscribers_json"), // Array of module subscribers
  schemaJson: text("schema_json"), // JSON draft-07 payload specifications
  retryPolicyJson: text("retry_policy_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 28. Audit Ledger Table
export const auditLedger = pgTable("audit_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: varchar("actor_id", { length: 255 }).notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  moduleName: varchar("module_name", { length: 100 }).notNull(), // WORKFLOW, LIFECYCLE, RBAC, FINANCE, CONFIGS
  details: text("details").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 29. Tenant & System Settings Table
export const tenantSettings = pgTable("tenant_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgName: varchar("org_name", { length: 255 }).notNull(),
  maintenanceMode: boolean("maintenance_mode").default(false).notNull(),
  licenseKey: varchar("license_key", { length: 255 }),
  licenseStatus: varchar("license_status", { length: 50 }).default("ACTIVE").notNull(),
  settingsJson: text("settings_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});





export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "INACTIVE", "LOCKED", "PENDING_PASSWORD_RESET"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  phoneNumber: text("phone_number"),
  employeeId: text("employee_id"),
  department: text("department"),
  jobTitle: text("job_title"),
  organization: text("organization"),
  avatar: text("avatar"),
  status: userStatusEnum("status").default("ACTIVE"),
  isActive: boolean("is_active").default(true),
  isLocked: boolean("is_locked").default(false),
  mfaEnabled: boolean("mfa_enabled").default(false),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  tenantId: text("tenant_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const passwords = pgTable("passwords", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  hash: text("hash").notNull(),
  mustChange: boolean("must_change").default(false),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const passwordHistory = pgTable("password_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  hash: text("hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  hashedToken: text("hashed_token").notNull(),
  deviceInfo: text("device_info"),
  ipAddress: text("ip_address"),
  expiresAt: timestamp("expires_at").notNull(),
  isRevoked: boolean("is_revoked").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deviceSessions = pgTable("device_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  sessionId: text("session_id").notNull(),
  browser: text("browser"),
  os: text("os"),
  ipAddress: text("ip_address"),
  deviceName: text("device_name"),
  location: text("location"),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const loginHistory = pgTable("login_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  success: boolean("success").notNull(),
  ipAddress: text("ip_address"),
  deviceInfo: text("device_info"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  hashedToken: text("hashed_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  hashedToken: text("hashed_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const securityAuditLogs = pgTable("security_audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id"),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
