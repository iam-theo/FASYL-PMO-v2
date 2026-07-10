# Enterprise Project Tracking Module: Architecture & Relational Schema (PostgreSQL)

This document details the production-grade **Enterprise Project Tracking Module** database schemas, relationships, Clean Architecture layout, and business rules.

---

## 1. Relational Database Schema & ERD

The database uses a normalized PostgreSQL structure, ensuring high-performance querying and strong referential integrity. All table records map directly back to a core `project_id` or `project_uuid` to partition data effectively.

### ERD Relationship Diagram

```
                 +-----------------------+
                 |       projects        |
                 +-----------------------+
                 | PK: id (UUID)         |<------------------------+
                 | name (VARCHAR)        |                         |
                 | code (VARCHAR, UNIQUE)|                         |
                 | progress (INT)        |                         |
                 | ...                   |                         |
                 +-----------------------+                         |
                             |                                     |
         +-------------------+-------------------+                 |
         |                   |                   |                 |
         v                   v                   v                 |
+-----------------+ +-----------------+ +-----------------+        |
|  team_members   | |   milestones    | |   audit_logs    |        |
+-----------------+ +-----------------+ +-----------------+        |
| PK: id (UUID)   | | PK: id (UUID)   | | PK: id (UUID)   |        |
| FK: project_id  | | FK: project_id  | | FK: project_id  |        |
| role (VARCHAR)  | | title (VARCHAR) | | action (VARCHAR)|        |
| allocation (INT)| | ...             | | details (TEXT)  |        |
+-----------------+ +-----------------+ +-----------------+        |
     |   |                   |                                     |
     |   |                   +-------------+                       |
     |   |                                 |                       |
     |   |                                 v                       |
     |   |                      +-----------------+                |
     |   |                      |      tasks      |                |
     |   |                      +-----------------+                |
     |   +--------------------->| PK: id (UUID)   |<---------+     |
     |                          | FK: project_id  |          |     |
     |                          | FK: assignee_id |          |     |
     |                          | FK: milestone_id|          |     |
     |                          | title (VARCHAR) |          |     |
     |                          | status (VARCHAR)|          |     |
     |                          +-----------------+          |     |
     |                               |         |             |     |
     |         +---------------------+         |             |     |
     |         v                               v             |     |
     |  +-----------------+           +-----------------+    |     |
     |  |    subtasks     |           |  dependencies   |    |     |
     |  +-----------------+           +-----------------+    |     |
     |  | PK: id (UUID)   |           | PK: id (UUID)   |    |     |
     |  | FK: task_id     |           | FK: project_id  |    |     |
     |  | title (VARCHAR) |           | predecessor_id  |----+     |
     |  +-----------------+           | successor_id    |----------+
     |                                +-----------------+
     |                                
     +-----------+-------------+-------------+-------------+
     |           |             |             |             |
     v           v             v             v             v
+----------+ +----------+ +----------+ +----------+ +----------+
|time_logs | |  issues  | |  risks   | |deliverab.| | comments |
+----------+ +----------+ +----------+ +----------+ +----------+
|PK: id    | |PK: id    | |PK: id    | |PK: id    | |PK: id    |
|FK: tm_id | |FK: proj  | |FK: proj  | |FK: proj  | |FK: proj  |
|FK: task  | |FK: assign| |FK: owner | |FK: owner | |FK: auth  |
+----------+ +----------+ +----------+ +----------+ +----------+
```

---

## 2. PostgreSQL DDL Migration Spec (PostgreSQL 15+)

Below is the production-grade DDL implementing the normalized structure with index optimization, constraints, cascade updates, and soft-delete defaults.

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROJECTS
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNING',
    health VARCHAR(50) NOT NULL DEFAULT 'HEALTHY',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NULL;

-- 2. TEAM MEMBERS
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    capacity INT NOT NULL DEFAULT 40,
    allocation INT NOT NULL DEFAULT 100 CHECK (allocation >= 1 AND allocation <= 100),
    availability VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(project_id, user_id)
);
CREATE INDEX idx_team_members_project_id ON team_members(project_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- 3. MILESTONES
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE NOT NULL,
    actual_date DATE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_milestones_project_id ON milestones(project_id);

-- 4. TASKS
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'TODO',
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    assignee_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
    milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
    labels TEXT[],
    estimated_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    actual_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_dates CHECK (due_date >= start_date)
);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_milestone_id ON tasks(milestone_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);

-- 5. SUBTASKS
CREATE TABLE subtasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_subtasks_task_id ON subtasks(task_id);

-- 6. DEPENDENCIES
CREATE TABLE dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL DEFAULT 'FS',
    predecessor_id UUID NOT NULL,
    successor_id UUID NOT NULL,
    predecessor_type VARCHAR(20) NOT NULL CHECK (predecessor_type IN ('TASK', 'MILESTONE')),
    successor_type VARCHAR(20) NOT NULL CHECK (successor_type IN ('TASK', 'MILESTONE')),
    lag_days INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_self_dependency CHECK (predecessor_id <> successor_id)
);
CREATE INDEX idx_dependencies_project_id ON dependencies(project_id);
CREATE INDEX idx_dependencies_pair ON dependencies(predecessor_id, successor_id);

-- 7. TIME LOGS
CREATE TABLE time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    hours NUMERIC(4, 2) NOT NULL CHECK (hours > 0 AND hours <= 24.00),
    date DATE NOT NULL,
    description TEXT NOT NULL,
    is_billable BOOLEAN NOT NULL DEFAULT TRUE,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_time_logs_task_id ON time_logs(task_id);
CREATE INDEX idx_time_logs_member_id ON time_logs(team_member_id);

-- 8. ISSUES
CREATE TABLE issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    reporter_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
    root_cause TEXT,
    resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_issues_project_id ON issues(project_id);
CREATE INDEX idx_issues_status ON issues(status);

-- 9. RISKS
CREATE TABLE risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    probability VARCHAR(50) NOT NULL,
    impact VARCHAR(50) NOT NULL,
    mitigation_strategy TEXT NOT NULL,
    escalation_plan TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'IDENTIFIED',
    owner_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_risks_project_id ON risks(project_id);

-- 10. DELIVERABLES
CREATE TABLE deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    owner_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    reviewers UUID[] NOT NULL,
    acceptance_criteria TEXT NOT NULL,
    attachments TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_deliverables_project_id ON deliverables(project_id);

-- 11. DOCUMENTS
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    folder_path VARCHAR(255) NOT NULL DEFAULT '/',
    version INT NOT NULL DEFAULT 1,
    tags TEXT[],
    category VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_documents_project_id ON documents(project_id);

-- 12. COMMENTS
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    reactions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);

-- 13. MEETINGS
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 30,
    agenda TEXT[],
    minutes TEXT,
    attendance UUID[],
    action_items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_meetings_project_id ON meetings(project_id);

-- 14. AUDIT LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    details TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_logs_project_id ON audit_logs(project_id);

-- 15. NOTIFICATIONS
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
```

---

## 3. Separation of Concerns & Clean Architecture Boundaries

To preserve strict solid principles and readability, each feature module contains five decoupled layers:

1. **Routes Layer (`routes.ts`)**: Binds Express paths to the controller methods. Integrates authentication, permission guards, and auto-generated Audit Logging.
2. **Controller Layer (`controller.ts`)**: Strictly acts as an HTTP request-response translation boundary. Extracts parameters, delegates business logic to the Service Layer, and maps returned objects to standard REST JSON. Keeps logic thin.
3. **Service Layer (`service.ts`)**: Houses the absolute, reusable core business logic. Performs validation checks, state calculations (e.g. recalculating Milestone progress, task health, or critical paths), and orchestrates multi-repository atomic transactions.
4. **Repository Layer (`repository.ts`)**: Communicates directly with the SQL query executor (or memory database mapping layer). Houses ONLY database operations: insertions, filters, queries, soft deletes, and join queries. Avoids all controller or HTTP contexts.
5. **Index Entrypoint (`index.ts`)**: Aggregates the route definitions, exporting them as a unified mounting router for the Express system.
