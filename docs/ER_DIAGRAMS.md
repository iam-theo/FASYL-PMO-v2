# Entity Relationship (ER) Diagram

This document details the normalized relational database schemas of AuraPM Enterprise, implemented on PostgreSQL 15+ via Drizzle ORM.

---

## 1. Schema Diagram

```
                 +---------------------------+
                 |         projects          |
                 +---------------------------+
                 | PK | id (UUID)            |<-------------------------+
                 |    | name (VARCHAR)       |                          |
                 | UK | code (VARCHAR)       |                          |
                 |    | progress (INTEGER)   |                          |
                 |    | status (VARCHAR)     |                          |
                 |    | created_at (TIMESTAMP)|                         |
                 +---------------------------+                          |
                               |                                        |
         +---------------------+-----------------------+                |
         | (1:N)                                       | (1:N)          | (1:N)
         v                                             v                v
+---------------------------+                 +---------------------------+   +---------------------------+
|        milestones         |                 |       team_members        |   |       audit_ledger        |
+---------------------------+                 +---------------------------+   +---------------------------+
| PK | id (UUID)            |                 | PK | id (UUID)            |   | PK | id (BIGINT)          |
| FK | project_id (UUID)    |--+              | FK | project_id (UUID)    |   |    | actor_id (VARCHAR)   |
|    | title (VARCHAR)      |  |              |    | user_id (VARCHAR)    |   |    | action (VARCHAR)     |
|    | target_date (DATE)   |  |              |    | role (VARCHAR)       |   |    | module_name (VARCHAR)|
+---------------------------+  |              +---------------------------+   |    | details (TEXT)       |
                               | (1:N)                     |                  |    | created_at (TIMESTAMP)|
                               v                           | (1:N)            +---------------------------+
                      +---------------------------+        |
                      |           tasks           |        |
                      +---------------------------+        |
                      | PK | id (UUID)            |        |
                      | FK | project_id (UUID)    |        |
                      | FK | milestone_id (UUID)  |        |
                      | FK | assignee_id (UUID)   |<-------+
                      |    | title (VARCHAR)      |
                      |    | status (VARCHAR)     |
                      +---------------------------+
```

---

## 2. Table Specifications

### 2.1. `projects` Table
| Column Name | Data Type | Key Type | Nullable | Constraints / Defaults |
|-------------|-----------|-----------|----------|------------------------|
| `id` | `UUID` | Primary Key | No | `DEFAULT gen_random_uuid()` |
| `name` | `VARCHAR(255)` | - | No | - |
| `code` | `VARCHAR(50)` | Unique | No | Must be upper-case |
| `status` | `VARCHAR(50)` | - | No | `DEFAULT 'PLANNING'` |
| `budget` | `NUMERIC(15,2)`| - | No | `DEFAULT 0.00` |
| `progress` | `INTEGER` | - | No | `CHECK (progress BETWEEN 0 AND 100)`|
| `created_at`| `TIMESTAMP` | - | No | `DEFAULT CURRENT_TIMESTAMP` |

### 2.2. `system_configurations` Table
| Column Name | Data Type | Key Type | Nullable | Constraints / Defaults |
|-------------|-----------|-----------|----------|------------------------|
| `id` | `SERIAL` | Primary Key | No | Auto-increment |
| `config_key` | `VARCHAR(255)` | Unique | No | - |
| `config_value`| `TEXT` | - | No | Serialized JSON string |
| `category` | `VARCHAR(100)` | - | No | (e.g. 'SLA', 'FEATURE_FLAGS') |
| `updated_at`| `TIMESTAMP` | - | No | `DEFAULT CURRENT_TIMESTAMP` |

### 2.3. `audit_ledger` Table
| Column Name | Data Type | Key Type | Nullable | Constraints / Defaults |
|-------------|-----------|-----------|----------|------------------------|
| `id` | `BIGSERIAL` | Primary Key | No | Auto-increment |
| `actor_id` | `VARCHAR(255)` | - | No | Operator UID |
| `action` | `VARCHAR(100)` | - | No | Operational action verb |
| `module_name`| `VARCHAR(100)`| - | No | e.g., 'ORCHESTRATION' |
| `details` | `TEXT` | - | No | Detailed change records |
| `created_at`| `TIMESTAMP` | - | No | `DEFAULT CURRENT_TIMESTAMP` |

---

## 3. Database Integrity & Triggers

1. **Foreign Key Cascades**: Any deletion of a `project` automatically cascades to delete associated `tasks`, `milestones`, and `team_members` to avoid orphan records.
2. **Partial Indexes**: Partial indexing is applied to query performance optimization:
   ```sql
   CREATE INDEX idx_projects_active ON projects (status) WHERE deleted_at IS NULL;
   ```
3. **Transaction Isolation**: All write operations modifying schedules, finances, or stages are executed under standard SQL **READ COMMITTED** isolation levels to ensure data consistency during concurrent updates.
