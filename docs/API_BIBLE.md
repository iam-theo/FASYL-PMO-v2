# AuraPM Enterprise Platform Master API Contract (The API Bible)

Welcome to the **AuraPM Enterprise Platform Orchestration Layer (EPOL) Master API Reference Specification**. This document serves as the absolute source of truth for backend services, API gateways, frontend clients, mobile apps, and third-party enterprise integrations.

All endpoints adhere strictly to JSON-RPC over RESTful conventions, utilizing `https://<domain>/api/v1` as the production base routing root.

---

## SECTION 1: GLOBAL STANDARDS & ARCHITECTURAL GUIDELINES

### 1.1 protocol Standards
1. **Response Formats**: Every response payload is returned as a JSON object containing a standard success envelope or standard error detail.
2. **Correlation IDs**: All requests must supply a unique UUID in the `X-Correlation-ID` header. If missing, the API Gateway auto-assigns one. This correlation ID maps audit trails to application log streams.
3. **Idempotency**: All `POST` write-operations support the `Idempotency-Key` header. When supplied, the API Gateway caches response vectors for 24 hours to prevent duplicate state mutations.

### 1.2 Standard Success Response Envelope
```json
{
  "success": true,
  "message": "Resource successfully retrieved",
  "data": {},
  "meta": {
    "limit": 100,
    "offset": 0,
    "totalCount": 1840
  },
  "links": {
    "self": "/api/v1/projects?limit=100&offset=0",
    "next": "/api/v1/projects?limit=100&offset=100"
  }
}
```

### 1.3 Standard Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_CONFLICT",
    "message": "Unique code constraint violated.",
    "details": [
      "The project identifier APEX-2026 is already assigned to active project 'e0bfa595-b6e9-40b1-b2a4-c12f62979be4'."
    ]
  },
  "traceId": "corr-uuid-99a3-4f91"
}
```

---

## SECTION 2: THE 40-MODULE SYSTEM-WIDE CRUD MATRIX

The table below represents the system matrix of all core EPPM modules. All active modules map to corresponding REST endpoints described in detail in Section 3.

| # | Enterprise Module | GET Coll | GET Sing | POST | PUT | PATCH | DELETE | SPECIAL BUSINESS ACTIONS |
|---|-------------------|:--------:|:--------:|:----:|:---:|:-----:|:------:|--------------------------|
| 1 | Authentication | | | | | | | Resolve Profile Footprint, Terminate Session |
| 2 | Users | YES | YES | YES | YES | YES | YES | Impersonate, Lock Account, Unlock |
| 3 | Organizations | YES | YES | YES | YES | NO | YES | Align Global Tenant Configuration |
| 4 | Departments | YES | YES | YES | YES | NO | YES | Move Cost Center Allocations |
| 5 | Branches | YES | YES | YES | YES | NO | YES | Regional Ingress Overrides |
| 6 | Business Units | YES | YES | YES | YES | NO | YES | Strategic Cost Center Grouping |
| 7 | Roles | YES | YES | YES | YES | NO | YES | Register Custom Corporate Roles |
| 8 | Permissions | YES | YES | NO | NO | NO | NO | Deep Dynamic Permissions Search |
| 9 | User Permissions | YES | NO | YES | NO | NO | YES | Assign/Revoke Direct Direct Overrides |
| 10| Role Assignments | YES | NO | YES | NO | NO | YES | Attach/Detach Enterprise Roles to Users |
| 11| Lifecycle Gateway | YES | YES | YES | YES | NO | YES | Promote, Demote, Rollback Stage-gates |
| 12| Lifecycle Templates| YES | YES | YES | YES | NO | YES | Initialize Default PMO Blueprints |
| 13| Lifecycle Stages | YES | YES | YES | YES | NO | YES | Modify Stage-gate Phase Constraints |
| 14| Lifecycle Checklists| YES | YES | YES | YES | YES | YES | Toggle Completion Metrics, Reset Checklists |
| 15| Lifecycle Documents| YES | YES | YES | YES | NO | YES | Upload Version, Certify Document, Reject |
| 16| Lifecycle Approvals| YES | YES | YES | NO | NO | YES | Stakeholder Cast Vote, Revoke Vote |
| 17| Head of Ops Reviews| YES | YES | YES | NO | NO | NO | Master Gatekeeper Sign-off, Operations Veto |
| 18| Lifecycle Alerts | YES | NO | YES | NO | NO | YES | Dispatch SLA warning messages to email/SMS |
| 19| Lifecycle Dashboards| YES | NO | NO | NO | NO | NO | Load executive governance KPI matrixes |
| 20| Workflow Engine | YES | YES | YES | YES | YES | YES | Boot State Machine, transition status |
| 21| Workflow Definitions| YES | YES | YES | YES | NO | YES | Register state transitions graphs |
| 22| Workflow States | YES | YES | YES | YES | NO | YES | Assign custom validation hooks to states |
| 23| Workflow Transitions| YES | YES | YES | YES | NO | YES | Execute condition checks, escalate SLA |
| 24| Workflow Instances | YES | YES | YES | YES | YES | YES | Query active running orchestrations |
| 25| Workflow Approvals | YES | YES | YES | NO | NO | NO | Sign, Delegate, Escalate CAB approval loops |
| 26| Workflow Comments | YES | NO | YES | NO | NO | YES | Add historical context audit strings |
| 27| Workflow History | YES | NO | NO | NO | NO | NO | Trace states transitions, duration metrics |
| 28| Projects | YES | YES | YES | YES | YES | YES | Clone Project, Archive, Restore, Export |
| 29| Project Templates | YES | YES | YES | YES | NO | YES | Instantiate Project from blueprint |
| 30| Project Types | YES | YES | YES | YES | NO | YES | Configure specialized governance schema |
| 31| Project Categories | YES | YES | YES | YES | NO | YES | Group portfolio records |
| 32| Programs | YES | YES | YES | YES | YES | YES | Consolidate budgets, track EVM Index |
| 33| Portfolios | YES | YES | YES | YES | NO | YES | Aggregate multi-program performance KPI |
| 34| Milestones | YES | YES | YES | YES | YES | YES | Baselines status, predict slippage |
| 35| Deliverables | YES | YES | YES | YES | YES | YES | Track checklist completions, sign-off |
| 36| Tasks | YES | YES | YES | YES | YES | YES | Create task, Assign operator, Status PATCH |
| 37| Subtasks | YES | YES | YES | YES | YES | YES | Track execution dependencies |
| 38| Task Dependencies | YES | NO | YES | NO | NO | YES | Link tasks FS, SS, FF constraints |
| 39| Task Comments | YES | NO | YES | YES | NO | YES | Message assignees, log notes |
| 40| Task Attachments | YES | YES | YES | NO | NO | YES | Store binary logs, download files |

---

## SECTION 3: IN-DEPTH ENDPOINT REFERENCE (CORE ACTIVE IMPLEMENTED SERVICES)

### 3.1 PROJECTS MODULE

#### 3.1.1 List Projects
* **HTTP Method**: `GET`
* **URL**: `/api/v1/projects`
* **Purpose**: Query active system projects with filters, text searching, and pagination limits.
* **Authentication Required**: Bearer JWT token in headers.
* **Permission Required (RBAC/PBAC)**: `projects.view`
* **Roles Allowed**: `pmo_director`, `project_manager`, `developer_resource`
* **Headers**: 
  * `Authorization: Bearer <TOKEN>`
  * `X-Correlation-ID: <UUID>`
* **Path Parameters**: None.
* **Query Parameters**:
  * `limit` (integer, default: 100): Maximum records returned.
  * `offset` (integer, default: 0): Records to skip.
  * `search` (string, optional): Full-text search string matching code or name.
  * `sortField` (string, default: "createdAt"): Field to sort by.
  * `sortOrder` (ASC | DESC, default: "DESC"): Sorting order.
* **Request Body Schema**: None.
* **Validation & Business Rules**: Checks user context. Filters out records matching `deletedAt` timestamps (soft-delete enforcement).
* **Workflow & Lifecycle Effects**: None.
* **Events Published**: None.
* **Notifications Triggered**: None.
* **Audit Logs Generated**: Generates read log only if database metrics profiling is set to active.
* **Database Tables Affected**: `projects`
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Projects catalog loaded successfully",
    "data": [
      {
        "id": "e0bfa595-b6e9-40b1-b2a4-c12f62979be4",
        "name": "Apex Expansion Platform",
        "code": "APEX-2026",
        "status": "IN_PROGRESS",
        "budget": 250000.00,
        "progress": 65,
        "description": "Expanding AuraPM cloud capabilities to sovereign host clusters.",
        "startDate": "2026-01-15T00:00:00.000Z",
        "endDate": "2026-12-31T00:00:00.000Z",
        "createdAt": "2026-01-01T08:00:00.000Z"
      }
    ]
  }
  ```
* **Validation Errors (400)**: Standard payload structure.
* **Permission Errors (403)**: Returned if JWT lacks `projects.view` permission scope.
* **Conflict Errors (409)**: None.
* **Rate Limits**: 120 requests per minute.
* **Idempotency Rules**: Not applicable to GET.
* **Related Endpoints**: `POST /projects`, `GET /projects/:id`.

#### 3.1.2 Create Project
* **HTTP Method**: `POST`
* **URL**: `/api/v1/projects`
* **Purpose**: Register a new enterprise project and launch corresponding stage-gate lifecycles.
* **Authentication Required**: Yes.
* **Permission Required**: `projects.create`
* **Roles Allowed**: `pmo_director`, `project_manager`
* **Headers**:
  * `Authorization: Bearer <TOKEN>`
  * `Content-Type: application/json`
  * `Idempotency-Key: <UUID>`
* **Path Parameters**: None.
* **Query Parameters**: None.
* **Request Body Schema**:
  ```json
  {
    "name": "Project Name (string, length 3-100)",
    "code": "UPPERCASE unique project identifier (string, matching ^[A-Z0-9-]{3,15}$)",
    "budget": "Total allocated project budget (number, min: 0)",
    "description": "A description of the project (string, optional)",
    "startDate": "ISO-8601 Timestamp (optional)",
    "endDate": "ISO-8601 Timestamp (optional)"
  }
  ```
* **Validation Rules**:
  * `code` must be uppercase, unique across all non-deleted project records.
  * `budget` must be greater than or equal to zero.
* **Business Rules**: Automatically spins up an initial phase-gating tracker utilizing the default PMO organization template configuration.
* **Workflow & Lifecycle Effects**: Initializes Stage-Gate Lifecycle at `STAGE_1_INITIATION`. Sets dynamic warnings counters for compliance auditing.
* **Events Published**: `project.created`
* **Notifications Triggered**: In-app alerts to PMO governance auditors. Email triggers to assigning Project Sponsor.
* **Audit Logs Generated**: `PROJECT_CREATED` action logs inside the system immutable ledger.
* **Database Tables Affected**: `projects`, `lifecycle_instances`, `audit_ledger`
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Project record successfully initialized",
    "data": {
      "id": "e0bfa595-b6e9-40b1-b2a4-c12f62979be4",
      "name": "Apex Expansion Platform",
      "code": "APEX-2026",
      "status": "PLANNING",
      "budget": 250000.00,
      "progress": 0,
      "createdAt": "2026-07-03T08:00:00.000Z"
    }
  }
  ```
* **Validation Errors (400)**:
  ```json
  {
    "success": false,
    "error": {
      "code": "INVALID_PAYLOAD",
      "message": "Validation schema errors detected.",
      "details": ["'code' must contain uppercase alphanumeric characters and hyphens only."]
    }
  }
  ```
* **Permission Errors (403)**: Missing `projects.create` permission.
* **Conflict Errors (409)**: Code duplicated or conflicting with existing record.
* **Rate Limits**: 40 mutations per minute.
* **Idempotency Rules**: Strictly enforced with redis-cached transaction states.

---

### 3.2 SECURITY, IDENTITY, AND RBAC MODULE

#### 3.2.1 Get Authenticated Profile
* **HTTP Method**: `GET`
* **URL**: `/api/v1/auth/users/me/profile`
* **Purpose**: Parse user JWT claims, resolve operational role memberships and active permissions overrides.
* **Authentication Required**: Yes.
* **Permission Required**: None (Open to all authenticated workspace members).
* **Roles Allowed**: `pmo_director`, `project_manager`, `developer_resource`
* **Path Parameters**: None.
* **Query Parameters**: None.
* **Request Body Schema**: None.
* **Validation & Business Rules**: Requires active Firebase JWT validation check. If revoked, sessions terminate immediately.
* **Database Tables Affected**: `user_roles`, `role_permissions`
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "userId": "user-pmo-99",
      "email": "pmo.director@aurapm.com",
      "roles": ["pmo_director"],
      "permissions": [
        "admin.permissions",
        "admin.roles",
        "admin.role_assignment",
        "admin.logs",
        "projects.create",
        "projects.delete",
        "projects.view",
        "tasks.create",
        "tasks.update"
      ],
      "directOverrides": []
    }
  }
  ```

#### 3.2.2 Register Custom Role
* **HTTP Method**: `POST`
* **URL**: `/api/v1/auth/roles`
* **Purpose**: Establish custom enterprise roles, defining mapping permissions to control RBAC scopes.
* **Authentication Required**: Yes.
* **Permission Required**: `admin.roles`
* **Roles Allowed**: `pmo_director` (System Administrators only).
* **Request Body Schema**:
  ```json
  {
    "code": "snake_case alphanumeric identifier (string, required)",
    "name": "Custom Role Display Name (string, required)",
    "description": "Definition of functional duties (string, optional)",
    "permissions": ["array of valid system permission key strings (required)"]
  }
  ```
* **Events Published**: `security.role.created`
* **Database Tables Affected**: `user_roles`, `role_permissions`, `audit_ledger`
* **Success Response (210 Created)**:
  ```json
  {
    "success": true,
    "message": "Enterprise role 'pmo_compliance_auditor' successfully registered.",
    "data": {
      "code": "pmo_compliance_auditor",
      "name": "PMO Compliance Auditor",
      "permissions": ["admin.logs", "projects.view"]
    }
  }
  ```

---

### 3.3 WORKFLOW GOVERNANCE ENGINE MODULE

#### 3.3.1 Start Stateful Workflow Instance
* **HTTP Method**: `POST`
* **URL**: `/api/v1/workflows/:id/start`
* **Purpose**: Instantiate a running state-machine tracker associated with a target project record.
* **Authentication Required**: Yes.
* **Permission Required**: `workflows.manage`
* **Roles Allowed**: `pmo_director`, `project_manager`
* **Path Parameters**:
  * `id`: Code of preset PMO workflow blueprint (e.g. `CHANGE_CONTROL`, `BUDGET_REVISE`).
* **Request Body Schema**:
  ```json
  {
    "projectId": "Target project UUID (string, required)",
    "initiatorId": "User UUID launching action (string, required)"
  }
  ```
* **Business Rules**: Validates that no conflicting workflow instance of type `id` is currently in non-terminal states for target project.
* **Events Published**: `workflow.instance.started`
* **Database Tables Affected**: `workflow_instances`, `workflow_logs`
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Workflow engine instantiated successfully.",
    "data": {
      "instanceId": "wf-inst-7711",
      "templateId": "CHANGE_CONTROL",
      "projectId": "e0bfa595-b6e9-40b1-b2a4-c12f62979be4",
      "currentStep": "DRAFT",
      "status": "RUNNING"
    }
  }
  ```

#### 3.3.2 Transition Workflow Step
* **HTTP Method**: `POST`
* **URL**: `/api/v1/workflows/:id/transition`
* **Purpose**: Trigger state-machine transition step to advance workflows progression.
* **Authentication Required**: Yes.
* **Permission Required**: `workflows.transition`
* **Roles Allowed**: Assigned transition actor role.
* **Request Body Schema**:
  ```json
  {
    "instanceId": "Workflow instance ID (string, required)",
    "targetStep": "Target step alphanumeric identifier (string, required)",
    "payload": {
      "comments": "Mandatory rationale string (string)",
      "metadata": "Key-value extra payload parameters (object, optional)"
    }
  }
  ```
* **Validation Rules**: Target step must be a valid edge defined inside the workflow templates DAG.
* **Events Published**: `workflow.instance.transitioned`
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Workflow transitioned to TECHNICAL_REVIEW successfully.",
    "data": {
      "instanceId": "wf-inst-7711",
      "currentStep": "TECHNICAL_REVIEW",
      "status": "RUNNING"
    }
  }
  ```

---

### 3.4 STAGE-GATE SLA LIFECYCLE GATEWAY

#### 3.4.1 Get Project Lifecycle Gate
* **HTTP Method**: `GET`
* **URL**: `/api/v1/lifecycle/instances/:projectId`
* **Purpose**: Fetch details of the active stage-gate progression checklist, document uploads compliance requirements and remaining SLA hours.
* **Authentication Required**: Yes.
* **Permission Required**: `lifecycle.view`
* **Roles Allowed**: `pmo_director`, `project_manager`, `developer_resource`
* **Path Parameters**:
  * `projectId`: Active project UUID.
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "instanceId": "lc-inst-881",
      "projectId": "e0bfa595-b6e9-40b1-b2a4-c12f62979be4",
      "activeStage": "STAGE_1_INITIATION",
      "slaRemainingHours": 72,
      "documents": [
        {
          "id": "doc-req-1",
          "title": "Business Case Specification",
          "status": "APPROVED",
          "fileUrl": "https://storage.aurapm.com/docs/APEX-BC.pdf"
        }
      ],
      "checklists": [
        {
          "id": "chk-1-1",
          "text": "Identify stakeholder committee",
          "complete": true
        }
      ]
    }
  }
  ```

#### 3.4.2 Submit Head of Operations Review Gate (Operations Veto)
* **HTTP Method**: `POST`
* **URL**: `/api/v1/lifecycle/instances/:instanceId/stages/:stageId/operations-review`
* **Purpose**: head of Operations master sign-off to authorize phase advancement.
* **Authentication Required**: Yes.
* **Permission Required**: `lifecycle.gating.signoff` (Exclusive PBAC check).
* **Roles Allowed**: `head_of_operations` (Restricted to director level).
* **Request Body Schema**:
  ```json
  {
    "decision": "PROMOTED | REJECTED (required)",
    "feedback": "Administrative commentary detail string (required)"
  }
  ```
* **Business Rules**: All checklist items must match `complete: true` and all mandatory documents must match `status: APPROVED` before promotion can execute successfully. If rejected, rollback transitions execute.
* **Events Published**: `lifecycle.stage.promoted` or `lifecycle.stage.rejected`
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Lifecycle instance successfully promoted to STAGE_2_PLANNING.",
    "data": {
      "instanceId": "lc-inst-881",
      "newActiveStage": "STAGE_2_PLANNING",
      "unlockedAt": "2026-07-03T08:15:00.000Z"
    }
  }
  ```

---

### 3.5 ORCHESTRATION & PLATFORM SYSTEM CONTROLS (EPOL)

#### 3.5.1 Bulk Save System Config Thresholds
* **HTTP Method**: `POST`
* **URL**: `/api/v1/orchestration/configs/bulk`
* **Purpose**: Batch commit multiple system variables and dynamic thresholds transactionally.
* **Authentication Required**: Yes.
* **Permission Required**: `admin.settings`
* **Roles Allowed**: `pmo_director` (System Admins only).
* **Request Body Schema**:
  ```json
  {
    "actorId": "Audited actor UUID (string, required)",
    "configs": [
      {
        "key": "Configuration key path identifier (string, required)",
        "value": "JSON serializable config details (any, required)",
        "category": "SLA | FEATURE_FLAGS | AI | CALENDAR | NOTIFICATION | FINANCE (string, required)"
      }
    ]
  }
  ```
* **Events Published**: `system.config.updated`
* **Database Tables Affected**: `system_configurations`, `audit_ledger`
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Successfully bulk updated 1 configuration thresholds.",
    "data": null
  }
  ```

#### 3.5.2 Fetch System Audit Logs
* **HTTP Method**: `GET`
* **URL**: `/api/v1/orchestration/audit`
* **Purpose**: Read the system's immutable audit trial logs with paginated offsets and advanced text search query.
* **Authentication Required**: Yes.
* **Permission Required**: `admin.logs`
* **Roles Allowed**: `pmo_director`
* **Query Parameters**:
  * `limit`, `offset`, `search`, `sortField`, `sortOrder`, `actorId`, `moduleName`, `action`
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "184",
        "actorId": "admin-system",
        "action": "SET_CONFIG",
        "moduleName": "ORCHESTRATION",
        "details": "{\"key\":\"sla.warning.hours\",\"value\":48}",
        "createdAt": "2026-07-03T06:10:00.000Z"
      }
    ]
  }
  ```

---

## SECTION 4: THE EPOL EVENT BUS & WEBHOOK REGISTER

AuraPM is built on an asynchronous, event-driven orchestration architecture. The following catalog defines the events dispatched across the **Reactive Event Bus** which can be captured via configured webhooks.

| Event Key | Triggering Endpoint | Event Payload Schema Details | Core Downstream Consumer |
|-----------|---------------------|-----------------------------|--------------------------|
| `project.created` | `POST /projects` | `projectId` (UUID), `code` (string), `budget` (num) | StageGateLifecycleEngine |
| `task.status.changed`| `PATCH /tasks/:id/status`| `taskId` (UUID), `status` (string), `projectId` (UUID) | ProgressAggregator |
| `threat.identified` | `POST /risks-issues` | `threatId` (UUID), `severity` (string), `projectId` | EscalationTimer |
| `lifecycle.promoted` | `POST /lifecycle/.../ops-review` | `instanceId` (UUID), `stage` (string) | NotificationCenter |
| `system.config.updated`| `POST /orchestration/configs/bulk`| `actorId` (string), `updatedKeys` (string[]) | CacheManagerStore |

---

## SECTION 5: RATE LIMITING, GATEWAY CONTROLS & IDEMPOTENCY

### 5.1 Rate Limiting (SLA-Tier Controls)
Rate limits are checked at the ingress API gateway level based on user authentication contexts:
* **Standard Tier**: 100 requests / minute. HTTP Headers returned:
  * `X-RateLimit-Limit`: `100`
  * `X-RateLimit-Remaining`: `94`
  * `X-RateLimit-Reset`: `1728000300`
* **VIP/PMO Admin Tier**: 500 requests / minute.

If threshold limits are exceeded, a standard `429 Too Many Requests` status is returned.

### 5.2 Idempotency Flow Design
For safe network write mutations, clients include the `Idempotency-Key` header with a unique UUID.
1. The gateway checks if the key exists in Redis cache store.
2. If the key exists, the cached response payload is immediately returned.
3. If not, a lock is established, the request executes on the API container, the results are stored in Redis cache for 24 hours, and then returned to the caller client.
