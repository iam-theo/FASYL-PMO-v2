export interface PermissionCategoryDef {
  code: string;
  name: string;
  description: string;
}

export interface PermissionGroupDef {
  code: string;
  name: string;
  categoryCode: string;
  description: string;
}

export interface PermissionDef {
  name: string;
  label: string;
  groupCode: string;
  description: string;
  isSystem?: boolean;
}

export interface RoleDef {
  code: string;
  name: string;
  description: string;
  isSystem?: boolean;
}

export const CATEGORIES: PermissionCategoryDef[] = [
  { code: "core", name: "Core Modules", description: "Standard project, task, milestone, and risk-management functions" },
  { code: "collaboration", name: "Collaboration & Tracking", description: "Communication, document control, meetings, time tracking, and analytics" },
  { code: "administration", name: "Administration & Settings", description: "Security configurations, audit trail logging, and platform administration" }
];

export const GROUPS: PermissionGroupDef[] = [
  // Core
  { code: "projects", name: "Project Management", categoryCode: "core", description: "Creation, budgeting, team assignments, and lifecycle stages of projects" },
  { code: "tasks", name: "Task Management", categoryCode: "core", description: "Operational work breakdown, checklists, and dependency management" },
  { code: "subtasks", name: "Subtask Management", categoryCode: "core", description: "Granular execution steps linked to main tasks" },
  { code: "milestones", name: "Milestone Tracking", categoryCode: "core", description: "Key stage gate tracking and target deadlines" },
  { code: "issues", name: "Issue Resolution", categoryCode: "core", description: "Problem and impediment logging, assignments, and resolutions" },
  { code: "risks", name: "Risk Management", categoryCode: "core", description: "Risk analysis, probability assessments, and mitigation plans" },
  { code: "deliverables", name: "Project Deliverables", categoryCode: "core", description: "Submission and approval flows for tangible artifacts" },

  // Collaboration
  { code: "documents", name: "Document Control", categoryCode: "collaboration", description: "Uploading, versioning, tagging, and sharing project documentation" },
  { code: "comments", name: "Commentary & Mentions", categoryCode: "collaboration", description: "Interactive user discussions, replies, and pinning" },
  { code: "time", name: "Time Tracking", categoryCode: "collaboration", description: "Timesheet logging, clock ins, and management approvals" },
  { code: "meetings", name: "Meeting Scheduler", categoryCode: "collaboration", description: "Scheduling, agendas, minutes recording, and attendances" },
  { code: "notifications", name: "Notification Manager", categoryCode: "collaboration", description: "Subscribing, broadcasting, and triggering user alerts" },
  { code: "reports", name: "BI & Reporting", categoryCode: "collaboration", description: "Generating, scheduling, and exporting custom PDF/Excel reports" },
  { code: "dashboard", name: "Dashboards", categoryCode: "collaboration", description: "Analytical visualizations, team boards, and finance widgets" },
  { code: "ai", name: "AI Copilot Integration", categoryCode: "collaboration", description: "LLM-powered document summaries, task generators, and risks predictions" },

  // Administration
  { code: "team", name: "Team Management", categoryCode: "administration", description: "Resource scheduling, invites, role assignments, and member deactivations" },
  { code: "audit", name: "Compliance & Audit Logs", categoryCode: "administration", description: "Reviewing raw action histories, exporting compliance trails, and archiving logs" },
  { code: "settings", name: "Settings & Customizations", categoryCode: "administration", description: "Managing project templates, lookup tables, and workflow paths" },
  { code: "admin", name: "System Administration", categoryCode: "administration", description: "Database maintenance, API keys, feature flags, queue managers, and backups" }
];

export const PERMISSIONS: PermissionDef[] = [
  // PROJECTS
  { name: "projects.create", label: "Create Projects", groupCode: "projects", description: "Allows creating a new project in AuraPM" },
  { name: "projects.view", label: "View Projects", groupCode: "projects", description: "Allows viewing basic details of projects" },
  { name: "projects.edit", label: "Edit Projects", groupCode: "projects", description: "Allows modifying standard project fields" },
  { name: "projects.delete", label: "Delete Projects", groupCode: "projects", description: "Allows permanently deleting projects" },
  { name: "projects.approve", label: "Approve Projects", groupCode: "projects", description: "Allows approving project proposals or changes" },
  { name: "projects.reject", label: "Reject Projects", groupCode: "projects", description: "Allows rejecting project proposals" },
  { name: "projects.assign", label: "Assign Projects", groupCode: "projects", description: "Allows assigning projects to managers or owners" },
  { name: "projects.archive", label: "Archive Projects", groupCode: "projects", description: "Allows moving active projects to archived status" },
  { name: "projects.restore", label: "Restore Projects", groupCode: "projects", description: "Allows restoring archived projects to active state" },
  { name: "projects.close", label: "Close Projects", groupCode: "projects", description: "Allows setting projects as fully completed or closed" },
  { name: "projects.reopen", label: "Reopen Projects", groupCode: "projects", description: "Allows reopening closed projects" },
  { name: "projects.clone", label: "Clone Projects", groupCode: "projects", description: "Allows duplicating projects and their tasks/structures" },
  { name: "projects.export", label: "Export Projects", groupCode: "projects", description: "Allows exporting project metadata to external formats" },
  { name: "projects.import", label: "Import Projects", groupCode: "projects", description: "Allows importing project structures from files" },
  { name: "projects.change_manager", label: "Change Project Manager", groupCode: "projects", description: "Allows reassigning the lead project manager" },
  { name: "projects.change_status", label: "Change Project Status", groupCode: "projects", description: "Allows manually updating project lifecycle stage" },
  { name: "projects.view_budget", label: "View Project Budgets", groupCode: "projects", description: "Allows viewing project financial estimates and costs" },
  { name: "projects.edit_budget", label: "Edit Project Budgets", groupCode: "projects", description: "Allows updating budget thresholds and costs" },
  { name: "projects.view_health", label: "View Project Health Indicator", groupCode: "projects", description: "Allows viewing automatic health scores and status" },
  { name: "projects.manage_tags", label: "Manage Project Tags", groupCode: "projects", description: "Allows creating and assigning organization tags" },
  { name: "projects.manage_custom_fields", label: "Manage Custom Fields", groupCode: "projects", description: "Allows adding metadata custom attributes" },
  { name: "projects.manage_team", label: "Manage Project Team", groupCode: "projects", description: "Allows defining team composition for a project" },
  { name: "projects.view_audit", label: "View Project Audit Trails", groupCode: "projects", description: "Allows viewing raw action lists for a specific project" },
  { name: "projects.view_documents", label: "View Project Documents", groupCode: "projects", description: "Allows viewing document folder structures in projects" },
  { name: "projects.manage_workflow", label: "Manage Project Workflows", groupCode: "projects", description: "Allows customizing Kanban columns or stage gates" },

  // TASKS
  { name: "tasks.create", label: "Create Tasks", groupCode: "tasks", description: "Allows creating tasks within projects" },
  { name: "tasks.view", label: "View Tasks", groupCode: "tasks", description: "Allows viewing project tasks list" },
  { name: "tasks.edit", label: "Edit Tasks", groupCode: "tasks", description: "Allows modifying task fields and descriptions" },
  { name: "tasks.delete", label: "Delete Tasks", groupCode: "tasks", description: "Allows deleting tasks" },
  { name: "tasks.assign", label: "Assign Tasks", groupCode: "tasks", description: "Allows assigning tasks to team members" },
  { name: "tasks.unassign", label: "Unassign Tasks", groupCode: "tasks", description: "Allows clearing task assignments" },
  { name: "tasks.complete", label: "Complete Tasks", groupCode: "tasks", description: "Allows setting task status to completed" },
  { name: "tasks.reopen", label: "Reopen Tasks", groupCode: "tasks", description: "Allows reopening completed or closed tasks" },
  { name: "tasks.move", label: "Move Tasks Across Columns", groupCode: "tasks", description: "Allows changing task status column on board" },
  { name: "tasks.reorder", label: "Reorder Tasks", groupCode: "tasks", description: "Allows sorting tasks within a column" },
  { name: "tasks.approve", label: "Approve Completed Tasks", groupCode: "tasks", description: "Allows reviewing and signing off completed tasks" },
  { name: "tasks.review", label: "Submit Tasks for Review", groupCode: "tasks", description: "Allows shifting tasks to peer review stage" },
  { name: "tasks.archive", label: "Archive Tasks", groupCode: "tasks", description: "Allows archiving old tasks" },
  { name: "tasks.restore", label: "Restore Archived Tasks", groupCode: "tasks", description: "Allows restoring archived tasks" },
  { name: "tasks.bulk_update", label: "Bulk Update Tasks", groupCode: "tasks", description: "Allows changing fields on multiple tasks at once" },
  { name: "tasks.bulk_delete", label: "Bulk Delete Tasks", groupCode: "tasks", description: "Allows deleting multiple tasks at once" },
  { name: "tasks.import", label: "Import Tasks", groupCode: "tasks", description: "Allows importing tasks from CSV or JSON" },
  { name: "tasks.export", label: "Export Tasks", groupCode: "tasks", description: "Allows exporting tasks to external formats" },
  { name: "tasks.comment", label: "Comment on Tasks", groupCode: "tasks", description: "Allows placing comments directly in tasks" },
  { name: "tasks.attach_file", label: "Attach Files to Tasks", groupCode: "tasks", description: "Allows uploading attachments in tasks context" },
  { name: "tasks.manage_dependencies", label: "Manage Task Dependencies", groupCode: "tasks", description: "Allows establishing blocks or pre-requisites between tasks" },
  { name: "tasks.manage_checklists", label: "Manage Task Checklists", groupCode: "tasks", description: "Allows creating, ticking, and ordering sub-checklists inside tasks" },
  { name: "tasks.create_template", label: "Create Task Templates", groupCode: "tasks", description: "Allows converting a task layout into a reusable template" },
  { name: "tasks.use_template", label: "Use Task Templates", groupCode: "tasks", description: "Allows using pre-existing templates to spawn tasks" },

  // SUBTASKS
  { name: "subtasks.create", label: "Create Subtasks", groupCode: "subtasks", description: "Allows spawning child-level subtasks" },
  { name: "subtasks.view", label: "View Subtasks", groupCode: "subtasks", description: "Allows viewing child-level work structures" },
  { name: "subtasks.edit", label: "Edit Subtasks", groupCode: "subtasks", description: "Allows editing details of subtasks" },
  { name: "subtasks.delete", label: "Delete Subtasks", groupCode: "subtasks", description: "Allows deleting subtasks" },
  { name: "subtasks.assign", label: "Assign Subtasks", groupCode: "subtasks", description: "Allows assigning subtasks to assignees" },
  { name: "subtasks.complete", label: "Complete Subtasks", groupCode: "subtasks", description: "Allows finishing subtasks and updating percentages" },
  { name: "subtasks.reopen", label: "Reopen Subtasks", groupCode: "subtasks", description: "Allows re-enabling completed subtasks" },

  // MILESTONES
  { name: "milestones.create", label: "Create Milestones", groupCode: "milestones", description: "Allows establishing key project milestones" },
  { name: "milestones.view", label: "View Milestones", groupCode: "milestones", description: "Allows viewing milestones and Gantt charts" },
  { name: "milestones.edit", label: "Edit Milestones", groupCode: "milestones", description: "Allows modifying milestone deadlines and properties" },
  { name: "milestones.delete", label: "Delete Milestones", groupCode: "milestones", description: "Allows deleting project milestones" },
  { name: "milestones.complete", label: "Complete Milestones", groupCode: "milestones", description: "Allows marking milestones as fully reached" },

  // ISSUES
  { name: "issues.create", label: "Create Issues", groupCode: "issues", description: "Allows opening new issues and impediments" },
  { name: "issues.view", label: "View Issues", groupCode: "issues", description: "Allows tracking current project logs of issues" },
  { name: "issues.edit", label: "Edit Issues", groupCode: "issues", description: "Allows altering issue properties and severities" },
  { name: "issues.delete", label: "Delete Issues", groupCode: "issues", description: "Allows deleting issue records" },
  { name: "issues.assign", label: "Assign Issues", groupCode: "issues", description: "Allows assigning owners or solvers to issues" },
  { name: "issues.resolve", label: "Resolve Issues", groupCode: "issues", description: "Allows registering an issue as resolved with resolution details" },
  { name: "issues.close", label: "Close Issues", groupCode: "issues", description: "Allows sealing resolved issues" },

  // RISKS
  { name: "risks.create", label: "Create Risks", groupCode: "risks", description: "Allows logging potential risks in a risk register" },
  { name: "risks.view", label: "View Risks", groupCode: "risks", description: "Allows viewing project risk matrices" },
  { name: "risks.edit", label: "Edit Risks", groupCode: "risks", description: "Allows changing risk scope or categories" },
  { name: "risks.delete", label: "Delete Risks", groupCode: "risks", description: "Allows deleting risk log rows" },
  { name: "risks.assess", label: "Assess Risks Impact/Probability", groupCode: "risks", description: "Allows defining probability multipliers and score maps" },
  { name: "risks.mitigate", label: "Create Mitigation Plan", groupCode: "risks", description: "Allows planning fallback routes and contingencies" },
  { name: "risks.approve", label: "Approve Risk Acceptance", groupCode: "risks", description: "Allows formally accepting risk exposure" },
  { name: "risks.close", label: "Close Risks", groupCode: "risks", description: "Allows moving identified risks to closed states" },

  // DELIVERABLES
  { name: "deliverables.create", label: "Create Deliverables", groupCode: "deliverables", description: "Allows logging project delivery requirements" },
  { name: "deliverables.view", label: "View Deliverables", groupCode: "deliverables", description: "Allows reviewing tangible artifact registers" },
  { name: "deliverables.edit", label: "Edit Deliverables", groupCode: "deliverables", description: "Allows renaming or shifting delivery targets" },
  { name: "deliverables.delete", label: "Delete Deliverables", groupCode: "deliverables", description: "Allows dropping delivery requirement items" },
  { name: "deliverables.submit", label: "Submit Deliverables", groupCode: "deliverables", description: "Allows uploading attachments and submitting for sign-off" },
  { name: "deliverables.approve", label: "Approve Deliverables", groupCode: "deliverables", description: "Allows formal acceptance of deliverables" },
  { name: "deliverables.reject", label: "Reject Deliverables", groupCode: "deliverables", description: "Allows rejecting submissions and prompting feedback" },

  // DOCUMENTS
  { name: "documents.upload", label: "Upload Documents", groupCode: "documents", description: "Allows adding PDF, Word or Excel files to repository" },
  { name: "documents.download", label: "Download Documents", groupCode: "documents", description: "Allows pulling documents out of system folders" },
  { name: "documents.preview", label: "Preview Documents", groupCode: "documents", description: "Allows in-app rendered previews" },
  { name: "documents.delete", label: "Delete Documents", groupCode: "documents", description: "Allows soft deleting documents" },
  { name: "documents.restore", label: "Restore Deleted Documents", groupCode: "documents", description: "Allows recovering deleted file rows" },
  { name: "documents.approve", label: "Approve Documents", groupCode: "documents", description: "Allows publishing document releases" },
  { name: "documents.reject", label: "Reject Documents", groupCode: "documents", description: "Allows rejecting peer drafts" },
  { name: "documents.version", label: "Manage Document Versions", groupCode: "documents", description: "Allows committing over existing versions" },
  { name: "documents.share", label: "Share Documents", groupCode: "documents", description: "Allows creating secure links or emails to third parties" },
  { name: "documents.print", label: "Print Documents", groupCode: "documents", description: "Allows document generation for paper templates" },
  { name: "documents.move", label: "Move Documents Between Folders", groupCode: "documents", description: "Allows organizing files physically" },
  { name: "documents.archive", label: "Archive Old Documents", groupCode: "documents", description: "Allows freezing document edits into read-only vaults" },
  { name: "documents.rename", label: "Rename Documents", groupCode: "documents", description: "Allows modifying visual names" },
  { name: "documents.tag", label: "Tag Documents", groupCode: "documents", description: "Allows adding keyword search labels" },
  { name: "documents.categorize", label: "Categorize Documents", groupCode: "documents", description: "Allows organizing files into specific types" },

  // COMMENTS
  { name: "comments.create", label: "Create Comments", groupCode: "comments", description: "Allows submitting updates to feeds" },
  { name: "comments.edit", label: "Edit Own Comments", groupCode: "comments", description: "Allows correcting text errors within limits" },
  { name: "comments.delete", label: "Delete Comments", groupCode: "comments", description: "Allows deleting comments on task boards" },
  { name: "comments.reply", label: "Reply to Comments", groupCode: "comments", description: "Allows nested discussions" },
  { name: "comments.pin", label: "Pin Comments", groupCode: "comments", description: "Allows highlight-pinning important details" },
  { name: "comments.mention", label: "Mention Users (@)", groupCode: "comments", description: "Allows generating instant notification tags" },
  { name: "comments.resolve", label: "Resolve Comment Threads", groupCode: "comments", description: "Allows wrapping resolved question threads" },
  { name: "comments.lock", label: "Lock Comment Threads", groupCode: "comments", description: "Allows shutting down interactive feeds on completed cards" },

  // TIME TRACKING
  { name: "time.clock_in", label: "Clock In Sessions", groupCode: "time", description: "Allows initiating stopwatch tracking on tasks" },
  { name: "time.clock_out", label: "Clock Out Sessions", groupCode: "time", description: "Allows halting stopwatch tracking and calculating intervals" },
  { name: "time.manual_entry", label: "Manual Timesheet Entry", groupCode: "time", description: "Allows recording offline timesheet hours" },
  { name: "time.approve", label: "Approve Team Timesheets", groupCode: "time", description: "Allows managers to lock and approve billing timesheets" },
  { name: "time.reject", label: "Reject Timesheets", groupCode: "time", description: "Allows requesting reviews on entered times" },
  { name: "time.edit", label: "Edit Recorded Timesheet Lines", groupCode: "time", description: "Allows tweaking manual hours records" },
  { name: "time.delete", label: "Delete Recorded Timesheet Lines", groupCode: "time", description: "Allows purging errant logs" },
  { name: "time.export", label: "Export Timesheets to Payroll", groupCode: "time", description: "Allows generating CSV schedules for finance integration" },

  // MEETINGS
  { name: "meetings.create", label: "Create Meetings", groupCode: "meetings", description: "Allows initializing a meeting event" },
  { name: "meetings.schedule", label: "Schedule Calendar Invites", groupCode: "meetings", description: "Allows sending formal invites and calendar integrations" },
  { name: "meetings.edit", label: "Edit Meeting Details", groupCode: "meetings", description: "Allows modifying times, agendas, or online links" },
  { name: "meetings.cancel", label: "Cancel Meetings", groupCode: "meetings", description: "Allows calling off scheduled slots" },
  { name: "meetings.delete", label: "Delete Meeting Records", groupCode: "meetings", description: "Allows purging meetings history" },
  { name: "meetings.record_minutes", label: "Record Meeting Minutes", groupCode: "meetings", description: "Allows attaching action items and summaries" },
  { name: "meetings.manage_attendance", label: "Manage Attendee Lists", groupCode: "meetings", description: "Allows recording present or absent team members" },

  // TEAM MANAGEMENT
  { name: "team.invite", label: "Invite Team Members", groupCode: "team", description: "Allows emailing invitations to join the tenant workspace" },
  { name: "team.remove", label: "Remove Members", groupCode: "team", description: "Allows removing team members from project rosters" },
  { name: "team.assign_role", label: "Assign Workspace Roles", groupCode: "team", description: "Allows matching accounts with system access roles" },
  { name: "team.change_role", label: "Change Assigned Roles", groupCode: "team", description: "Allows shifting permissions of team members" },
  { name: "team.deactivate", label: "Deactivate Member Accounts", groupCode: "team", description: "Allows freezing access credentials cleanly" },
  { name: "team.reactivate", label: "Reactivate Member Accounts", groupCode: "team", description: "Allows restoring suspended account privileges" },

  // NOTIFICATIONS
  { name: "notifications.view", label: "View Own Notifications", groupCode: "notifications", description: "Allows viewing dynamic alert tray logs" },
  { name: "notifications.send", label: "Trigger Notifications", groupCode: "notifications", description: "Allows system actions to distribute transactional emails/pushes" },
  { name: "notifications.broadcast", label: "Broadcast Global Alerts", groupCode: "notifications", description: "Allows sending push banners to all active sessions" },
  { name: "notifications.delete", label: "Delete Alerts History", groupCode: "notifications", description: "Allows clearing notification histories" },
  { name: "notifications.configure", label: "Configure Notification Feeds", groupCode: "notifications", description: "Allows selecting email/push thresholds" },

  // BI & REPORTING
  { name: "reports.view", label: "View Generated Reports", groupCode: "reports", description: "Allows opening PDF templates" },
  { name: "reports.generate", label: "Trigger Real-time Reports", groupCode: "reports", description: "Allows hitting BI calculation engines" },
  { name: "reports.export_pdf", label: "Export PDF Reports", groupCode: "reports", description: "Allows pulling polished presentations" },
  { name: "reports.export_excel", label: "Export Excel Reports", groupCode: "reports", description: "Allows pulling raw financial spreadsheets" },
  { name: "reports.export_csv", label: "Export CSV Schedules", groupCode: "reports", description: "Allows simple exports for integration feeds" },
  { name: "reports.share", label: "Share Reports Externally", groupCode: "reports", description: "Allows sending secure report scopes" },
  { name: "reports.schedule", label: "Schedule Automatic Reports", groupCode: "reports", description: "Allows automated cron report mailers" },
  { name: "reports.delete", label: "Delete Saved Reports Templates", groupCode: "reports", description: "Allows clean-up of dashboard reports lists" },

  // AUDIT LOGS
  { name: "audit.view", label: "View Audit Log Registers", groupCode: "audit", description: "Allows view access to action histories" },
  { name: "audit.export", label: "Export Compliance Audit Trails", groupCode: "audit", description: "Allows pulling signed audit summaries" },
  { name: "audit.delete", label: "Delete Audit Log Records", groupCode: "audit", description: "Allows purging audit files, usually restricted to Super Admins" },
  { name: "audit.archive", label: "Archive Logs Vaults", groupCode: "audit", description: "Allows freezing old logs off-site" },

  // DASHBOARDS
  { name: "dashboard.view_executive", label: "View Portfolio Executive Dashboard", groupCode: "dashboard", description: "Allows viewing aggregate charts" },
  { name: "dashboard.view_financial", label: "View Financial Costs Dashboard", groupCode: "dashboard", description: "Allows looking at actual costs vs budgets" },
  { name: "dashboard.view_team", label: "View Resource Team Dashboard", groupCode: "dashboard", description: "Allows analyzing workloads and velocity charts" },
  { name: "dashboard.view_portfolio", label: "View Multi-Project Dashboard", groupCode: "dashboard", description: "Allows program managers to track portfolio timelines" },
  { name: "dashboard.customize", label: "Customize Personal Dashboards Layouts", groupCode: "dashboard", description: "Allows resizing and picking personal bento widgets" },

  // SETTINGS & CUSTOMIZATIONS
  { name: "settings.system", label: "Modify System Environment Settings", groupCode: "settings", description: "Allows editing core configuration variables" },
  { name: "settings.security", label: "Modify Security Policies & Password Rules", groupCode: "settings", description: "Allows configuring RBAC gates and token lifespans" },
  { name: "settings.workflow", label: "Customize Business Workflows & Columns", groupCode: "settings", description: "Allows modifying Kanban logic gates" },
  { name: "settings.notification", label: "Configure Tenant Level Mailer Rules", groupCode: "settings", description: "Allows defining global mail templates" },
  { name: "settings.project_templates", label: "Manage Base Project Blueprints", groupCode: "settings", description: "Allows managing organization pre-defined blueprints" },
  { name: "settings.lookup_tables", label: "Modify Lookup Tables Dropdowns", groupCode: "settings", description: "Allows editing dictionary drop-down entries" },

  // AI COPILOT
  { name: "ai.use", label: "Access AI Copilot Assistant UI", groupCode: "ai", description: "Allows prompting the AuraPM assistant chat" },
  { name: "ai.generate_tasks", label: "Generate Smart Tasks Lists", groupCode: "ai", description: "Allows AI to parse emails into tasks lists" },
  { name: "ai.generate_reports", label: "Generate AI Summary Reports", groupCode: "ai", description: "Allows auto-drafting project updates narratives" },
  { name: "ai.generate_risks", label: "Generate Predictive Risks Vectors", groupCode: "ai", description: "Allows AI to forecast blocks based on records history" },
  { name: "ai.generate_documents", label: "Generate Smart Documents Content", groupCode: "ai", description: "Allows drafting policy guidelines pages automatically" },
  { name: "ai.analyze_projects", label: "Run Advanced Projects Diagnosis", groupCode: "ai", description: "Allows analyzing projects health maps recursively" },
  { name: "ai.summarize_meetings", label: "Generate Meetings Action Items Summaries", groupCode: "ai", description: "Allows transcribing and extracting action tables" },

  // SYSTEM ADMINISTRATION
  { name: "admin.users", label: "Administrate User Accounts Lifecycle", groupCode: "admin", description: "Allows creating, updating, or deleting user accounts" },
  { name: "admin.roles", label: "Administrate RBAC Roles Dictionary", groupCode: "admin", description: "Allows creating custom company roles" },
  { name: "admin.permissions", label: "Administrate System Permissions Mapping", groupCode: "admin", description: "Allows modifying security mapping matrices" },
  { name: "admin.role_assignment", label: "Administrate Enterprise Roles Assignments", groupCode: "admin", description: "Allows mapping roles directly to key staffs" },
  { name: "admin.user_assignment", label: "Administrate Direct Permissions Assignments", groupCode: "admin", description: "Allows hardcoding override permission rules" },
  { name: "admin.system_config", label: "Modify Root System Properties", groupCode: "admin", description: "Allows editing tenant properties" },
  { name: "admin.backup", label: "Trigger Direct Database Backup", groupCode: "admin", description: "Allows exporting database state dumps" },
  { name: "admin.restore", label: "Restore Database from Storage Backup", groupCode: "admin", description: "Allows re-importing db states" },
  { name: "admin.api_keys", label: "Manage Developer API Credentials", groupCode: "admin", description: "Allows creating workspace client keys" },
  { name: "admin.logs", label: "View Raw Server Telemetry Logs", groupCode: "admin", description: "Allows reviewing low-level error histories" },
  { name: "admin.db_maintenance", label: "Perform Database Indexes Rebuilding", groupCode: "admin", description: "Allows running migration routines" },
  { name: "admin.queue_management", label: "Administrate System Action Queues", groupCode: "admin", description: "Allows pausing background processing queues" },
  { name: "admin.feature_flags", label: "Toggle System Feature Flags", groupCode: "admin", description: "Allows enabling beta feature systems" },
  { name: "admin.dashboards", label: "Administrate System Dashboards", groupCode: "admin", description: "Allows managing, customising, creating and deleting system dashboards templates and widgets" },
  { name: "admin.notifications", label: "Administrate Notification Engine", groupCode: "admin", description: "Allows managing notification templates, global settings, and viewing delivery logs" }
];

export const ROLES: RoleDef[] = [
  { code: "super_admin", name: "Super Administrator", description: "Unrestricted master developer role. Has access to all administrative, configuration, and transactional actions.", isSystem: true },
  { code: "system_admin", name: "System Administrator", description: "Focuses on infrastructure support, queue setups, API keys, logs, settings, and database backups.", isSystem: true },
  { code: "portfolio_director", name: "Portfolio Director", description: "Executively reviews multi-project portfolios. Focuses on executive reporting, financial overview, and high-level workflow pipelines." },
  { code: "pmo_director", name: "PMO Director", description: "Standard PMO head. Sets project status pathways, manages base blueprints/templates, oversees global resource allocations, and runs BI analytics." },
  { code: "project_director", name: "Project Director", description: "Directs programs of linked projects. Reviews overall budgets, manages team rosters, and approves strategic milestones." },
  { code: "project_manager", name: "Project Manager", description: "Operational leader for assigned projects. Owns project tasks, timelines, milestones, risks, issues, meetings, and team assignments." },
  { code: "assistant_project_manager", name: "Assistant Project Manager", description: "Helps operational leader coordinate. Has task modifications and view-only budget access." },
  { code: "team_lead", name: "Team Lead", description: "Directs developer tasks delivery. Owns assignment queues, milestone completions, checklists, and timesheets entries." },
  { code: "developer", name: "Developer", description: "Core project contributor. Delivers tasks, files timesheets, posts task commentary, and raises subtasks." },
  { code: "qa_engineer", name: "QA Engineer", description: "Quality checking contributor. Focuses on issue logging, tracking resolutions, and verifying peer deliveries." },
  { code: "business_analyst", name: "Business Analyst", description: "Requirements compiler. Views gantt milestones, compiles project documents, and runs predictive reports." },
  { code: "product_owner", name: "Product Owner", description: "Requirements prioritizer. Signs off deliverable submissions, orders tasks queues, and approves milestone targets." },
  { code: "scrum_master", name: "Scrum Master", description: "Process facilitator. Schedules agile meetings, manages team boards, and logs impediments." },
  { code: "risk_manager", name: "Risk Manager", description: "Focused on compliance and mitigation. Logs risks, models impact scales, and signs off acceptance policies." },
  { code: "quality_manager", name: "Quality Manager", description: "Compliance inspector. Focuses on audit logging reviews, document releases approvals, and deliverable metrics." },
  { code: "finance_manager", name: "Finance Manager", description: "Financial checker. Modifies project budgets, reviews cost indices, and approves timesheets." },
  { code: "procurement_officer", name: "Procurement Officer", description: "Vendor contracts manager. Reviews deliverable guidelines, views budgets, and handles contracts documentation." },
  { code: "document_controller", name: "Document Controller", description: "Master archivist. Manages version tracks, document folder maps, sharing rules, and tag dictionaries." },
  { code: "client_representative", name: "Client Representative", description: "External project stakeholder. Has read-only task progress maps, downloads signed deliverables, and leaves reviews." },
  { code: "executive_viewer", name: "Executive Viewer", description: "High-level board stakeholder. Has clean aggregate dashboards access, and reads portfolio statuses." },
  { code: "auditor", name: "Auditor", description: "External regulator. Reads system logs registers, extracts action compliance histories, and checks security configurations." },
  { code: "guest", name: "Guest", description: "Limited external observer. Views specific assigned cards progress, and leaves task comments." }
];

// Map of Role to Permission prefixes or explicit list of permissions
// For simplicity and maintainability, we can define a function or static list mapping
// our default roles to their actual permissions lists.
export const ROLE_PERMISSION_MAPPINGS: Record<string, string[]> = {
  super_admin: ["*"], // Wildcard meaning everything

  system_admin: [
    "notifications.view", "notifications.send", "notifications.broadcast", "notifications.delete", "notifications.configure",
    "audit.view", "audit.export", "audit.delete", "audit.archive",
    "settings.system", "settings.security", "settings.workflow", "settings.notification", "settings.project_templates", "settings.lookup_tables",
    "admin.users", "admin.roles", "admin.permissions", "admin.role_assignment", "admin.user_assignment", "admin.system_config", "admin.backup", "admin.restore", "admin.api_keys", "admin.logs", "admin.db_maintenance", "admin.queue_management", "admin.feature_flags", "admin.dashboards"
  ],

  portfolio_director: [
    "projects.view", "projects.export", "projects.view_budget", "projects.view_health", "projects.view_audit", "projects.view_documents",
    "tasks.view", "tasks.export",
    "milestones.view",
    "risks.view", "issues.view", "deliverables.view",
    "documents.preview", "documents.download", "documents.share",
    "reports.view", "reports.generate", "reports.export_pdf", "reports.export_excel", "reports.export_csv", "reports.share", "reports.schedule",
    "dashboard.view_executive", "dashboard.view_financial", "dashboard.view_team", "dashboard.view_portfolio", "dashboard.customize",
    "ai.use", "ai.analyze_projects", "ai.generate_reports"
  ],

  pmo_director: [
    "projects.create", "projects.view", "projects.edit", "projects.approve", "projects.reject", "projects.archive", "projects.restore", "projects.close", "projects.reopen", "projects.clone", "projects.export", "projects.import", "projects.view_budget", "projects.edit_budget", "projects.view_health", "projects.manage_tags", "projects.manage_custom_fields", "projects.manage_team", "projects.view_audit", "projects.view_documents", "projects.manage_workflow",
    "tasks.view", "tasks.export", "tasks.create_template", "tasks.use_template",
    "milestones.view", "milestones.create", "milestones.edit", "milestones.delete", "milestones.complete",
    "risks.view", "issues.view",
    "deliverables.view", "deliverables.approve", "deliverables.reject",
    "documents.upload", "documents.download", "documents.preview", "documents.delete", "documents.restore", "documents.approve", "documents.reject", "documents.version", "documents.share", "documents.print", "documents.move", "documents.archive", "documents.rename", "documents.tag", "documents.categorize",
    "team.invite", "team.remove", "team.assign_role", "team.change_role",
    "notifications.view", "notifications.send", "notifications.broadcast",
    "reports.view", "reports.generate", "reports.export_pdf", "reports.export_excel", "reports.export_csv", "reports.share", "reports.schedule", "reports.delete",
    "dashboard.view_executive", "dashboard.view_financial", "dashboard.view_team", "dashboard.view_portfolio", "dashboard.customize",
    "ai.use", "ai.generate_tasks", "ai.generate_reports", "ai.generate_risks", "ai.generate_documents", "ai.analyze_projects", "ai.summarize_meetings",
    "settings.project_templates", "settings.lookup_tables"
  ],

  project_director: [
    "projects.view", "projects.edit", "projects.archive", "projects.restore", "projects.close", "projects.reopen", "projects.clone", "projects.export", "projects.view_budget", "projects.view_health", "projects.manage_team", "projects.view_audit", "projects.view_documents",
    "tasks.view", "tasks.export", "tasks.create_template", "tasks.use_template",
    "milestones.view", "milestones.create", "milestones.edit", "milestones.delete", "milestones.complete",
    "risks.view", "issues.view",
    "deliverables.view", "deliverables.approve", "deliverables.reject",
    "documents.upload", "documents.download", "documents.preview", "documents.version", "documents.share", "documents.print", "documents.tag", "documents.categorize",
    "team.invite", "team.remove",
    "reports.view", "reports.generate", "reports.export_pdf", "reports.export_excel", "reports.export_csv", "reports.share", "reports.schedule",
    "dashboard.view_executive", "dashboard.view_financial", "dashboard.view_team", "dashboard.view_portfolio", "dashboard.customize",
    "ai.use", "ai.generate_reports", "ai.analyze_projects"
  ],

  project_manager: [
    "projects.view", "projects.edit", "projects.clone", "projects.export", "projects.view_budget", "projects.view_health", "projects.manage_tags", "projects.manage_team", "projects.view_audit", "projects.view_documents", "projects.manage_workflow",
    "tasks.create", "tasks.view", "tasks.edit", "tasks.delete", "tasks.assign", "tasks.unassign", "tasks.complete", "tasks.reopen", "tasks.move", "tasks.reorder", "tasks.approve", "tasks.review", "tasks.archive", "tasks.restore", "tasks.bulk_update", "tasks.bulk_delete", "tasks.import", "tasks.export", "tasks.comment", "tasks.attach_file", "tasks.manage_dependencies", "tasks.manage_checklists", "tasks.use_template",
    "subtasks.create", "subtasks.view", "subtasks.edit", "subtasks.delete", "subtasks.assign", "subtasks.complete", "subtasks.reopen",
    "milestones.create", "milestones.view", "milestones.edit", "milestones.delete", "milestones.complete",
    "issues.create", "issues.view", "issues.edit", "issues.delete", "issues.assign", "issues.resolve", "issues.close",
    "risks.create", "risks.view", "risks.edit", "risks.delete", "risks.assess", "risks.mitigate", "risks.close",
    "deliverables.create", "deliverables.view", "deliverables.edit", "deliverables.delete", "deliverables.submit", "deliverables.approve", "deliverables.reject",
    "documents.upload", "documents.download", "documents.preview", "documents.delete", "documents.restore", "documents.version", "documents.share", "documents.print", "documents.move", "documents.archive", "documents.rename", "documents.tag", "documents.categorize",
    "comments.create", "comments.edit", "comments.delete", "comments.reply", "comments.pin", "comments.mention", "comments.resolve",
    "time.clock_in", "time.clock_out", "time.manual_entry", "time.approve", "time.reject", "time.edit", "time.delete", "time.export",
    "meetings.create", "meetings.schedule", "meetings.edit", "meetings.cancel", "meetings.delete", "meetings.record_minutes", "meetings.manage_attendance",
    "team.invite", "team.remove",
    "notifications.view", "notifications.send",
    "reports.view", "reports.generate", "reports.export_pdf", "reports.export_excel", "reports.export_csv", "reports.share",
    "dashboard.view_team", "dashboard.view_portfolio", "dashboard.customize",
    "ai.use", "ai.generate_tasks", "ai.generate_reports", "ai.generate_risks", "ai.generate_documents", "ai.analyze_projects", "ai.summarize_meetings"
  ],

  assistant_project_manager: [
    "projects.view", "projects.view_budget", "projects.view_health", "projects.view_documents",
    "tasks.create", "tasks.view", "tasks.edit", "tasks.assign", "tasks.unassign", "tasks.complete", "tasks.reopen", "tasks.move", "tasks.reorder", "tasks.review", "tasks.comment", "tasks.attach_file", "tasks.manage_dependencies", "tasks.manage_checklists", "tasks.use_template",
    "subtasks.create", "subtasks.view", "subtasks.edit", "subtasks.assign", "subtasks.complete", "subtasks.reopen",
    "milestones.view",
    "issues.create", "issues.view", "issues.edit", "issues.assign", "issues.resolve",
    "risks.create", "risks.view", "risks.edit", "risks.mitigate",
    "deliverables.view", "deliverables.submit",
    "documents.upload", "documents.download", "documents.preview", "documents.version", "documents.share", "documents.print", "documents.tag", "documents.categorize",
    "comments.create", "comments.edit", "comments.reply", "comments.mention", "comments.resolve",
    "time.clock_in", "time.clock_out", "time.manual_entry", "time.edit",
    "meetings.create", "meetings.schedule", "meetings.edit", "meetings.record_minutes", "meetings.manage_attendance",
    "notifications.view",
    "reports.view", "reports.generate", "reports.export_pdf", "reports.export_csv",
    "dashboard.view_team", "dashboard.customize",
    "ai.use", "ai.generate_tasks", "ai.generate_reports", "ai.summarize_meetings"
  ],

  team_lead: [
    "projects.view", "projects.view_documents",
    "tasks.create", "tasks.view", "tasks.edit", "tasks.assign", "tasks.unassign", "tasks.complete", "tasks.reopen", "tasks.move", "tasks.reorder", "tasks.review", "tasks.comment", "tasks.attach_file", "tasks.manage_dependencies", "tasks.manage_checklists",
    "subtasks.create", "subtasks.view", "subtasks.edit", "subtasks.assign", "subtasks.complete", "subtasks.reopen",
    "milestones.view", "milestones.complete",
    "issues.create", "issues.view", "issues.edit", "issues.assign", "issues.resolve",
    "risks.view",
    "deliverables.view", "deliverables.submit",
    "documents.upload", "documents.download", "documents.preview", "documents.version", "documents.tag",
    "comments.create", "comments.edit", "comments.reply", "comments.pin", "comments.mention", "comments.resolve",
    "time.clock_in", "time.clock_out", "time.manual_entry", "time.edit",
    "meetings.create", "meetings.schedule", "meetings.record_minutes", "meetings.manage_attendance",
    "notifications.view",
    "reports.view", "reports.generate",
    "dashboard.view_team", "dashboard.customize",
    "ai.use", "ai.generate_tasks", "ai.summarize_meetings"
  ],

  developer: [
    "projects.view",
    "tasks.view", "tasks.complete", "tasks.review", "tasks.comment", "tasks.attach_file", "tasks.manage_checklists",
    "subtasks.create", "subtasks.view", "subtasks.edit", "subtasks.complete",
    "issues.create", "issues.view",
    "documents.download", "documents.preview", "documents.upload",
    "comments.create", "comments.edit", "comments.reply", "comments.mention",
    "time.clock_in", "time.clock_out", "time.manual_entry",
    "meetings.schedule", "meetings.manage_attendance",
    "notifications.view",
    "dashboard.view_team", "dashboard.customize",
    "ai.use"
  ],

  qa_engineer: [
    "projects.view",
    "tasks.view", "tasks.review", "tasks.comment", "tasks.attach_file",
    "issues.create", "issues.view", "issues.edit", "issues.assign", "issues.resolve", "issues.close",
    "documents.download", "documents.preview", "documents.upload",
    "comments.create", "comments.edit", "comments.reply", "comments.mention", "comments.resolve",
    "time.clock_in", "time.clock_out", "time.manual_entry",
    "notifications.view",
    "dashboard.view_team",
    "ai.use"
  ],

  business_analyst: [
    "projects.view", "projects.view_documents",
    "tasks.view", "tasks.export",
    "milestones.view",
    "issues.view", "risks.view",
    "deliverables.view", "deliverables.create", "deliverables.edit",
    "documents.upload", "documents.download", "documents.preview", "documents.version", "documents.tag", "documents.categorize",
    "comments.create", "comments.reply", "comments.mention",
    "meetings.schedule", "meetings.record_minutes",
    "reports.view", "reports.generate", "reports.export_pdf", "reports.export_excel",
    "dashboard.view_team",
    "ai.use", "ai.analyze_projects", "ai.generate_reports", "ai.generate_documents"
  ],

  product_owner: [
    "projects.view", "projects.view_documents",
    "tasks.view", "tasks.approve", "tasks.review", "tasks.comment", "tasks.reorder",
    "milestones.view", "milestones.complete",
    "issues.view", "risks.view",
    "deliverables.view", "deliverables.approve", "deliverables.reject",
    "documents.download", "documents.preview", "documents.approve", "documents.reject",
    "comments.create", "comments.reply", "comments.mention", "comments.resolve", "comments.lock",
    "meetings.create", "meetings.schedule",
    "reports.view", "reports.generate",
    "dashboard.view_executive", "dashboard.view_portfolio",
    "ai.use"
  ],

  scrum_master: [
    "projects.view",
    "tasks.view", "tasks.move", "tasks.reorder", "tasks.comment", "tasks.manage_dependencies", "tasks.manage_checklists",
    "milestones.view",
    "issues.create", "issues.view", "issues.edit", "issues.assign", "issues.resolve",
    "documents.download", "documents.preview",
    "comments.create", "comments.edit", "comments.reply", "comments.pin", "comments.mention", "comments.resolve",
    "meetings.create", "meetings.schedule", "meetings.edit", "meetings.cancel", "meetings.record_minutes", "meetings.manage_attendance",
    "reports.view", "reports.generate",
    "dashboard.view_team", "dashboard.customize",
    "ai.use", "ai.summarize_meetings"
  ],

  risk_manager: [
    "projects.view",
    "tasks.view",
    "issues.create", "issues.view", "issues.edit", "issues.assign", "issues.resolve", "issues.close",
    "risks.create", "risks.view", "risks.edit", "risks.delete", "risks.assess", "risks.mitigate", "risks.approve", "risks.close",
    "documents.download", "documents.preview", "documents.upload",
    "comments.create", "comments.reply",
    "reports.view", "reports.generate",
    "dashboard.view_portfolio",
    "ai.use", "ai.generate_risks"
  ],

  quality_manager: [
    "projects.view", "projects.view_audit",
    "tasks.view", "tasks.review", "tasks.approve",
    "issues.view", "risks.view",
    "deliverables.view", "deliverables.approve", "deliverables.reject",
    "documents.download", "documents.preview", "documents.approve", "documents.reject", "documents.archive",
    "audit.view", "audit.export",
    "comments.create", "comments.reply", "comments.resolve",
    "reports.view", "reports.generate",
    "dashboard.view_portfolio",
    "ai.use"
  ],

  finance_manager: [
    "projects.view", "projects.view_budget", "projects.edit_budget",
    "tasks.view",
    "time.approve", "time.reject", "time.export", "time.manual_entry", "time.edit", "time.delete",
    "reports.view", "reports.generate", "reports.export_pdf", "reports.export_excel",
    "dashboard.view_executive", "dashboard.view_financial",
    "ai.use"
  ],

  procurement_officer: [
    "projects.view", "projects.view_budget",
    "deliverables.view",
    "documents.upload", "documents.download", "documents.preview", "documents.version", "documents.share",
    "comments.create", "comments.reply",
    "reports.view", "reports.generate", "reports.export_pdf", "reports.export_excel",
    "dashboard.view_financial",
    "ai.use"
  ],

  document_controller: [
    "projects.view", "projects.view_documents",
    "documents.upload", "documents.download", "documents.preview", "documents.delete", "documents.restore", "documents.approve", "documents.reject", "documents.version", "documents.share", "documents.print", "documents.move", "documents.archive", "documents.rename", "documents.tag", "documents.categorize",
    "comments.create", "comments.reply",
    "reports.view",
    "dashboard.customize",
    "ai.use", "ai.generate_documents"
  ],

  client_representative: [
    "projects.view",
    "tasks.view",
    "milestones.view",
    "deliverables.view", "deliverables.submit",
    "documents.download", "documents.preview",
    "comments.create", "comments.reply", "comments.mention",
    "dashboard.view_portfolio"
  ],

  executive_viewer: [
    "projects.view", "projects.view_budget", "projects.view_health", "projects.view_documents",
    "tasks.view",
    "milestones.view",
    "issues.view", "risks.view", "deliverables.view",
    "documents.preview", "documents.download",
    "reports.view", "reports.export_pdf", "reports.export_excel",
    "dashboard.view_executive", "dashboard.view_financial", "dashboard.view_team", "dashboard.view_portfolio"
  ],

  auditor: [
    "projects.view", "projects.view_budget", "projects.view_health", "projects.view_audit", "projects.view_documents",
    "tasks.view",
    "milestones.view",
    "issues.view", "risks.view", "deliverables.view",
    "documents.preview", "documents.download",
    "audit.view", "audit.export",
    "reports.view",
    "admin.users", "admin.roles", "admin.permissions" // read only views are mapped to these in router
  ],

  guest: [
    "projects.view",
    "tasks.view",
    "comments.create", "comments.reply"
  ]
};
