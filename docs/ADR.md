# Architecture Decision Records (ADRs)

This document chronicles the key design and architectural decisions made for the AuraPM Enterprise platform orchestration layer (EPOL).

---

## ADR-001: Separation of Concerns via Modular Clean Architecture

### Status
Accepted

### Context
AuraPM is a highly scaleable enterprise Project Management platform. A classic monolithic architecture would quickly lead to high coupling, making the code difficult to maintain, test, and scale independently.

### Decision
We adopt a **Clean Architecture** organized around modular domains. Each domain is self-contained with the following boundaries:
1. **Domain Layer**: Core business models, entities, and repository interfaces (completely decoupled from frameworks).
2. **Application Layer**: Use cases, workflow orchestrations, and coordination services.
3. **Infrastructure Layer**: Concrete implementations of databases (Drizzle ORM), messaging bus, and integrations.
4. **Interface Layer**: REST controllers, versioned Express routers, and entry-point API boundaries.

### Consequences
- **Pros**: Independent deployability of domains, excellent mockability for unit testing, framework independence.
- **Cons**: Slightly higher boilerplate on initial setups due to multiple folders (`domain`, `application`, `infrastructure`, `interface`).

---

## ADR-002: EPOL Reactive Event Bus for Inter-Module Communication

### Status
Accepted

### Context
When events such as `lead.converted` or `workflow.transition.completed` occur, multiple secondary actions are required (e.g., audit logging, scheduling checks, sending alerts, or refreshing cache layers). Hardcoding these calls introduces direct coupling.

### Decision
We implement a **reactive, message-driven event bus** within the Enterprise Platform Orchestration Layer (EPOL). Modules publish asynchronous transactional events. Other modules register as subscribers without direct dependency on the event origin.

### Consequences
- **Pros**: Dynamic extension of new business triggers, failure containment, and real-time observability of event traces.
- **Cons**: Asynchronous eventual consistency challenges and increased debugging complexity across subscribers.

---

## ADR-003: Drizzle ORM and PostgreSQL Relational Engine

### Status
Accepted

### Context
Project scheduling (Gantt, milestones, dependencies) and audit logs require highly relational schemas with transaction boundaries, foreign key integrity, and advanced indexes. NoSQL would require complex application-level joining.

### Decision
We standardize on **PostgreSQL** as the primary relational persistence engine, mapped via **Drizzle ORM** for full type safety, SQL-first migrations, and direct query performance tuning.

### Consequences
- **Pros**: ACID transactions, built-in referential constraints, indexing optimizations, and lightning-fast JSON operations.
- **Cons**: Requires active database instance setup and migration cycles.

---

## ADR-004: Unified RBAC & PBAC Security Enforcement

### Status
Accepted

### Context
Enterprise platforms require security checks verifying both simple user roles (Role-Based Access Control - RBAC) and context parameters (Parameter-Based Access Control - PBAC), such as project allocations or budget ownership.

### Decision
Implement a custom hierarchical **Authorization Service** exposed as an Express router middleware. It validates roles (e.g., PMO Director, Assignee) and dynamic parameters (e.g., maximum budget thresholds, assigned tasks) prior to route dispatch.

### Consequences
- **Pros**: Centralized security auditing, clear declarability of endpoint requirements, and robust threat protection.
- **Cons**: Minor overhead to fetch permissions cache on incoming requests.

---

## ADR-005: Resilient AI Gateway Broker with Response Cache

### Status
Accepted

### Context
Large language model (LLM) calls (e.g. Gemini API) are costly and suffer from potential rate-limits or transient latency spikes. Calling them raw during background task execution can block workers or balloon operational costs.

### Decision
All AI requests are routed through a secure **AI Gateway Broker**. The broker handles:
1. Dynamic response caching via an encrypted in-memory/cache store.
2. Graceful fallback templates (SLA draft warnings, etc.) on latency timeouts.
3. Transaction tracking to record execution logs and token usage metrics.

### Consequences
- **Pros**: Significantly reduced cost, guaranteed low latency, and full compliance reporting.
- **Cons**: Dynamic outputs require Cache-Bust flags to ensure freshness.
