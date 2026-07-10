# Developer Guide

Welcome to the AuraPM Enterprise codebase! This guide helps you get onboarded, set up your environment, and understand our coding standards and clean architecture layers.

---

## 1. Quick Local Onboarding

### 1.1. System Requirements
* **Runtime**: Node.js v18+ (LTS recommended)
* **Package Manager**: npm v9+
* **Database**: PostgreSQL 15+

### 1.2. Setup Instructions
1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Setup Environment Variables**:
   Create a local `.env` file copied from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Provide your local PostgreSQL database URL and Gemini API Key details.
3. **Database Migration**:
   Compile schemas and run migrations using Drizzle kit:
   ```bash
   npm run build
   ```
4. **Launch Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to preview the local client.

---

## 2. Directory Structure Conventions

AuraPM enforces a modular **Clean Architecture** to maintain high independence:

```
src/
├── db/                       # PostgreSQL schema definitions and migrations
├── interface/                # Versioned Express routing entry points (v1.router.ts)
├── shared/                   # Shared database pools, loggers, and middlewares
└── modules/                  # Modular domain bounds
    ├── projects/             # Project Management domain
    ├── tasks/                # Work Package / task management
    ├── issues-risks/         # Risk and Mitigation tracking
    ├── authorization/        # Hierarchical RBAC / PBAC Security Checkers
    └── orchestration/        # EPOL Central Scheduler, Audit, and Event registries
        ├── domain/           # Core typescript entities and interfaces
        ├── application/      # Domain Services (e.g. Scheduler, AI Gateway)
        ├── infrastructure/   # Data Repositories, Event Bus, external Connectors
        └── interface/        # REST Controllers and Router endpoints
```

---

## 3. Best Practices & Guidelines

### 3.1. TypeScript Strictness
* **No `any` castings**: Always write typed models.
* **Enums**: Always use standard `enum` declarations, NOT `const enum`.
* **Named Imports**: Always prefer named imports for readability.

### 3.2. Relational Querying (Drizzle)
When fetching associated objects, write clean join statements inside repositories rather than executing secondary queries inside controllers.
```typescript
// Good Pattern: Joined query
const records = await db
  .select()
  .from(projects)
  .leftJoin(teamMembers, eq(projects.id, teamMembers.projectId));
```

### 3.3. Logging
Never use raw `console.log`. Always import the custom `logger` utility to output standardized, structured Bunyan JSON logs in production.
```typescript
import logger from "../../../shared/infrastructure/logger.ts";

logger.info({ projectId }, "Project successfully registered in ledger");
```
