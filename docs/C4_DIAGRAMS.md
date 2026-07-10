# C4 Architecture Diagrams

The following diagrams illustrate the architecture of the AuraPM Enterprise Platform across different abstraction levels of the C4 Model.

---

## Level 1: System Context Diagram

The System Context diagram shows the boundaries of the AuraPM system and how users and external software interact with it.

```
+---------------------------------------------------------------------------------+
|                                                                                 |
|  +--------------------+               +------------------+                      |
|  |   Project Manager  |               |  Executive / PMO |                      |
|  +--------------------+               +------------------+                      |
|            |                                    |                               |
|            +-----------------+   +--------------+                               |
|                              |   |                                              |
|                              v   v                                              |
|                     +----------------------+                                    |
|                     |                      |                                    |
|                     |        AuraPM        |<=========================+         |
|                     |      Enterprise      | (Rest / SOAP Sync)       |         |
|                     |        System        |                          v         |
|                     +----------------------+                  +---------------+ |
|                           |          |                        |   External    | |
|                           |          +----------------------->| Systems (SAP, | |
|                           v                                   |  Salesforce)  | |
|                     +-----------+                             +---------------+ |
|                     |  Gemini   |                                               |
|                     |  AI API   |                                               |
|                     +-----------+                                               |
|                                                                                 |
+---------------------------------------------------------------------------------+
```

---

## Level 2: Container Diagram

The Container diagram shows the high-level technical choices (containers) that compose AuraPM.

```
+--------------------------------------------------------------------------------+
| AuraPM System Boundary                                                         |
|                                                                                |
|     +-------------------------+            +-----------------------------+     |
|     |     React SPA Client    |----------->|    Reverse Proxy (Nginx)    |     |
|     | (Vite, Tailwind, Rechart|            |         (Port 3000)         |     |
|     +-------------------------+            +-----------------------------+     |
|                                                           |                    |
|                                                           v                    |
|                                            +-----------------------------+     |
|                                            |   Full-Stack Express App    |     |
|                                            |     (TypeScript Node.js)    |     |
|                                            +-----------------------------+     |
|                                               /           |            \       |
|                                              /            |             \      |
|                                             v             v              v     |
|                                      +-----------+  +-----------+  +---------+ |
|                                      | PostgreSQL|  |  BullMQ   |  | Gemini  | |
|                                      | DB Engine |  | Scheduler |  | Gateway | |
|                                      | (Drizzle) |  |  (Redis)  |  | Broker  | |
|                                      +-----------+  +-----------+  +---------+ |
+--------------------------------------------------------------------------------+
```

---

## Level 3: Component Diagram

The Component diagram shows the modular sub-systems inside the Full-Stack Express App.

```
+-----------------------------------------------------------------------------------+
| Full-Stack Express App Components                                                 |
|                                                                                   |
|                      +---------------------------------------+                    |
|                      |             Express API Router        |                    |
|                      |        (Versioned /api/v1 Endpoint)   |                    |
|                      +---------------------------------------+                    |
|                                          |                                        |
|                     +--------------------+--------------------+                   |
|                     |                                         |                   |
|                     v                                         v                   |
|        +--------------------------+              +--------------------------+     |
|        | Authorization Service    |              | Enterprise Orchestrator  |     |
|        | (RBAC & PBAC Middleware) |              |  (EPOL State Governance) |     |
|        +--------------------------+              +--------------------------+     |
|                     |                                         |                   |
|                     |                                   +-----+-----+             |
|                     |                                   |           |             |
|                     v                                   v           v             |
|        +--------------------------+        +--------------+   +-------------+     |
|        |    Drizzle Data Source   |        |  Event Bus   |   | Job Queue   |     |
|        |     (PostgreSQL Pools)   |        |  (Reactive)  |   | (Scheduler) |     |
|        +--------------------------+        +--------------+   +-------------+     |
+-----------------------------------------------------------------------------------+
```

---

## Level 4: Code Class Diagram

The Code Class diagram details the architectural code-level layers of a module (Clean Architecture).

```
+-----------------------------------------------------------------------------+
| Clean Architecture Layer Classes                                            |
|                                                                             |
|   [Interface Layer]                                                         |
|         |                                                                   |
|         v                                                                   |
|   +------------------------------------+                                    |
|   |      OrchestrationController       |                                    |
|   |  - Handles REST Requests / Responses|                                   |
|   +------------------------------------+                                    |
|         |                                                                   |
|         v                                                                   |
|   [Application Layer]                                                       |
|   +------------------------------------+                                    |
|   |      OrchestrationService          |                                    |
|   |  - Implements core use-cases       |                                    |
|   +------------------------------------+                                    |
|         |                        |                                          |
|         v                        v                                          |
|   [Domain Layer]           [Infrastructure Layer]                           |
|   +-------------------+    +------------------------------------+           |
|   | AuditLedgerEntity |    |      DrizzleAuditRepository        |           |
|   | - Logic rules     |    | - SQL Transactions                 |           |
|   +-------------------+    +------------------------------------+           |
|                                                                             |
+-----------------------------------------------------------------------------+
```
