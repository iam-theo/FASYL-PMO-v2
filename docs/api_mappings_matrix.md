# AuraPM Mappings Matrix & Integration Reference

This document provides administrative mappings, cross-references, permissions matrices, database relationships, error indexes, changelogs, and onboarding guides for AuraPM.

---

## 1. Complete API Endpoint Index

| Method | Endpoint | Description | Domain Module |
|--------|----------|-------------|---------------|
| `GET` | `/api/v1/projects` | Query projects catalog | Projects |
| `GET` | `/api/v1/projects/:id` | Fetch specific project details | Projects |
| `POST` | `/api/v1/projects` | Create a new project record | Projects |
| `PUT` | `/api/v1/projects/:id` | Update project parameters | Projects |
| `DELETE` | `/api/v1/projects/:id` | Delete project and cascade child elements | Projects |
| `GET` | `/api/v1/tasks/project/:projectId` | Fetch tasks mapped to a project | Tasks |
| `POST` | `/api/v1/tasks` | Create work breakdown schedule task | Tasks |
| `PATCH` | `/api/v1/tasks/:id/status`| Update status of a single task | Tasks |
| `GET` | `/api/v1/risks-issues/project/:projectId` | Fetch risks/issues checklist | Issues & Risks |
| `POST` | `/api/v1/risks-issues` | Raise an issue or define delivery risk | Issues & Risks |
| `GET` | `/api/v1/auth/users/me/profile` | Resolve dynamic profile context permissions | Security & Identity |
| `GET` | `/api/v1/auth/matrix` | Fetch active role-to-permission mapping | Security & Identity |
| `POST` | `/api/v1/auth/roles` | Register custom enterprise roles | Security & Identity |
| `GET` | `/api/v1/workflows/templates`| List active PMO workflow processes | Workflow Engine |
| `POST` | `/api/v1/workflows/:id/start`| Bootstrap running workflow state machine | Workflow Engine |
| `GET` | `/api/v1/orchestration/health` | Diagnostic metrics and resource indexes | EPOL Administration |
| `GET` | `/api/v1/orchestration/audit` | Query immutable operational ledger | EPOL Administration |
| `POST` | `/api/v1/orchestration/configs/bulk` | Batch commit threshold configurations | EPOL Administration |

---

## 2. API Permissions Matrix (RBAC & PBAC)

| Endpoint Path | Required Permission Key | PMO Director | Project Manager | Engineer / Resource |
|---------------|-------------------------|:------------:|:---------------:|:-------------------:|
| `/api/v1/projects` [GET] | `projects.view` | **YES** | **YES** | **YES** |
| `/api/v1/projects` [POST] | `projects.create` | **YES** | **YES** | NO |
| `/api/v1/projects/:id` [DELETE] | `projects.delete` | **YES** | NO | NO |
| `/api/v1/tasks` [POST] | `tasks.create` | **YES** | **YES** | NO |
| `/api/v1/tasks/:id/status` [PATCH]| `tasks.update` | **YES** | **YES** | **YES** (Assigned) |
| `/api/v1/risks-issues` [POST] | `risks.create` | **YES** | **YES** | **YES** |
| `/api/v1/auth/matrix` [GET] | `admin.permissions` | **YES** | NO | NO |
| `/api/v1/orchestration/configs/bulk` [POST] | `admin.settings` | **YES** | NO | NO |
| `/api/v1/orchestration/audit` [GET] | `admin.logs` | **YES** | NO | NO |

---

## 3. Event-to-Endpoint Mapping

The following table connects REST endpoints to the asynchronous events published on the **EPOL Reactive Event Bus**:

| Endpoint Request Triggered | Asynchronous Event Published | Payload Attributes | Key Registered Subscriber |
|----------------------------|------------------------------|--------------------|---------------------------|
| `POST /api/v1/projects` | `project.created` | `id`, `code`, `ownerId` | StageGateLifecycleEngine |
| `PUT /api/v1/projects/:id` | `project.updated` | `id`, `progress`, `status` | EarnedValueEngine |
| `POST /api/v1/tasks` | `task.assigned` | `id`, `assigneeId`, `dueDate` | NotificationCenter, SlackBot |
| `PATCH /api/v1/tasks/:id/status` | `task.status.changed` | `id`, `oldStatus`, `newStatus` | ProjectProgressAggregator |
| `POST /api/v1/risks-issues` | `threat.identified` | `id`, `severity`, `ownerId` | SlackAlerts, EscalationTimer |
| `POST /api/v1/orchestration/configs/bulk` | `system.config.updated` | `actorId`, `updatedKeys[]` | InMemoryCacheStore, Logger |

---

## 4. Database Table-to-Endpoint Mapping

| Relational Database Table | Primary Interacting Endpoints | Mutation Types | Transaction Isolation |
|---------------------------|-------------------------------|----------------|-----------------------|
| `projects` | `/projects` | CRUD | `READ COMMITTED` |
| `tasks` | `/tasks` | CRUD | `READ COMMITTED` |
| `risks_issues` | `/risks-issues` | CRUD | `READ COMMITTED` |
| `system_configurations` | `/orchestration/configs/bulk` | Update | `REPEATABLE READ` |
| `audit_ledger` | `/orchestration/audit` | Insert | `READ COMMITTED` |
| `user_roles` | `/auth/roles` | Create / Assign| `SERIALIZABLE` |

---

## 5. Error Code Reference

AuraPM API uses standardized error codes passed under `error.code` payload.

| HTTP Status | Error Code | Description | Corrective Operator Action |
|-------------|------------|-------------|----------------------------|
| `400` | `INVALID_PAYLOAD` | Request body failed JSON validation rules | Check schema rules and resubmit query |
| `401` | `UNAUTHORIZED` | Authorization header or token is missing/expired | Renew access token and retry |
| `403` | `FORBIDDEN` | Missing required RBAC or PBAC permission key | Contact PMO administrator to upgrade role |
| `404` | `RESOURCE_NOT_FOUND` | Target resource ID cannot be located in DB | Check spelling of query UUID parameter |
| `409` | `RESOURCE_CONFLICT` | Unique key violation (e.g. duplicate project code) | Provide a new unique project code |
| `429` | `RATE_LIMIT_EXCEEDED` | Request frequency exceeds 100 reqs/minute limit | Queue client request side; wait 60 seconds |
| `500` | `INTERNAL_SERVER_ERROR`| Unhandled server process exception | Check server Bunyan JSON trace output logs |

---

## 6. API Changelog

### Version 1.0.0 (July 3, 2026)
* **Feature**: Added endpoint `/api/v1/orchestration/configs/bulk` for dynamic, batch configuration adjustments.
* **Feature**: Added query parameter searching, sorting, and pagination options to `/api/v1/orchestration/audit`.
* **Fix**: Enforced parameter-based security validations (PBAC) across projects deletion workflows.

---

## 7. Third-Party Integration Guide

### Onboarding Steps
1. **Request API Credentials**: Contact security officers to generate a secure client API token.
2. **Setup Base Endpoint**: Point your SDK Client configuration to target:
   `https://aurapm.company.com/api/v1`
3. **Include Headers**: Every outgoing HTTP request must contain the following headers:
   ```http
   Authorization: Bearer <CLIENT_API_TOKEN>
   Content-Type: application/json
   X-Correlation-ID: <UUID_CLIENT_REQUEST_ID>
   ```
4. **Subscribe to Webhooks**: Register secure callback receiver endpoints in your Integration Hub configuration to catch `project.created` and `threat.identified` event hooks.
