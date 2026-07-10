# Sequence Diagrams

The following sequence diagrams illustrate the runtime execution traces for key business scenarios in AuraPM Enterprise.

---

## 1. Project Creation & Stage Gate Initialization

This diagram outlines what happens when a Project Manager creates a new project, establishing stage gate rules and registering the initial audit entry.

```
[User]             [SPA Client]            [API Gateway]            [Orchestrator]            [Database]
  |                     |                        |                         |                      |
  |-- Create Project -->|                        |                         |                      |
  |                     |----- POST /projects -->|                         |                      |
  |                     |                        |----- CreateProject ---->|                      |
  |                     |                        |                         |---- Insert Record -->|
  |                     |                        |                         |<--- OK (UUID) -------|
  |                     |                        |                         |                      |
  |                     |                        |                         |-- Trigger Stage Gate-|
  |                     |                        |                         |   Initialization     |
  |                     |                        |                         |---- Seed SLA Config->|
  |                     |                        |                         |<--- OK --------------|
  |                     |                        |                         |                      |
  |                     |                        |                         |-- Log Audit Entry -->|
  |                     |                        |                         |<--- OK --------------|
  |                     |                        |<--- Response (201) -----|                      |
  |                     |<-- Toast Success ------|                         |                      |
  |<-- Screen Rendered -|                        |                         |                      |
```

---

## 2. Event-Driven SLA Escalation Flow

This diagram traces how a background timer triggers a job that evaluates project deadlines, detects breaches, updates status, and sends out priority escalations.

```
[Scheduler Job]       [SLA Engine]        [Event Registry]       [Notification Center]       [Recipient]
       |                    |                    |                         |                      |
       |--- Tick (Interval) |                    |                         |                      |
       |                    |                    |                         |                      |
       |---- runCheck() --->|                    |                         |                      |
       |                    |-- Fetch Breaches ->|                         |                      |
       |                    |   from Database    |                         |                      |
       |                    |<-- Breach List ----|                         |                      |
       |                    |                    |                         |                      |
       |                    |=== BREACH DETECTED =================================================|
       |                    |                    |                         |                      |
       |                    |--- Publish -------->|                         |                      |
       |                    |    ("sla.breach")  |                         |                      |
       |                    |                    |--- Dispatch Event ----->|                      |
       |                    |                    |    Subscriber Trigger   |                      |
       |                    |                    |                         |--- Send Warning ---->|
       |                    |                    |                         |    (Email / In-App)  |
       |                    |                    |<-- Success Receipt -----|                      |
       |<-- Job Completed --|                    |                         |                      |
```

---

## 3. Resilient AI Prompt Generation (Broker & Cache)

This diagram shows how requests route through the AI Gateway Broker, check cache keys, handle fallback, and log costs securely.

```
[Controller]            [AI Broker]            [Cache Store]          [Gemini API Client]      [Audit Ledger]
     |                       |                       |                         |                      |
     |-- generateText() ---->|                       |                         |                      |
     |   (prompt, cacheKey)  |-- checkCache(Key) --->|                         |                      |
     |                       |<-- CACHE HIT (Data) --|                         |                      |
     |                       |                       |                         |                      |
     |                       |=== CACHE MISS ==================================|                      |
     |                       |                       |                         |                      |
     |                       |------------------ GenerateContent ------------->|                      |
     |                       |<----------------- Synthesized Text -------------|                      |
     |                       |                       |                         |                      |
     |                       |-- setCache(Key) ----->|                         |                      |
     |                       |                       |                         |                      |
     |                       |-- logTokensUsed() ---------------------------------------------------->|
     |                       |<-- OK -----------------------------------------------------------------|
     |<-- JSON Response -----|                       |                         |                      |
```
