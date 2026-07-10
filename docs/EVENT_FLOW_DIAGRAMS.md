# Event Flow Diagrams

This document details the reactive, message-driven event topology that powers the AuraPM Enterprise Platform Orchestration Layer (EPOL).

---

## 1. Universal Reactive Event Topology

AuraPM decouples domain micro-operations using an internal asynchronous reactive event bus. 

```
                                +-----------------------------+
                                |      Reactive Event Bus     |
                                +-----------------------------+
                                               |
         +-------------------------------------+-------------------------------------+
         | (Broadcasts)                        | (Broadcasts)                        | (Broadcasts)
         v                                     v                                     v
+-----------------------------+       +-----------------------------+       +-----------------------------+
|    Subscriber: AuditLog     |       |    Subscriber: SLA Engine   |       |   Subscriber: Notification  |
|          Handler            |       |           Handler           |       |           Handler           |
+-----------------------------+       +-----------------------------+       +-----------------------------+
         |                                     |                                     |
         v                                     v                                     v
   Insert Record                         Recalculate Stage                      Send In-App /
   in Audit Ledger                         Gate Durations                      Email Template
```

---

## 2. Event Chain Scenarios

The following event chains outline exactly which triggers fire during domain state shifts.

### Scenario A: Business Lead Converted
```
[User Action: Convert Lead]
            |
            v
   (Event: lead.converted)
            |
            +-------> Subscriber A: EnterpriseOrchestrator
            |         Action: Create Lifecycle state-machine tracking instance.
            |
            +-------> Subscriber B: NotificationCenter
            |         Action: Render 'WELCOME' template, send PMO board alerts.
            |
            +-------> Subscriber C: AuditLedger
                      Action: Append immutable cryptographic ledger seal: LEAD_CONVERTED.
```

### Scenario B: SLA Target Breach Escalation
```
[Scheduler: Active Job Tick]
            |
            v
   (Event: sla.breach.identified)
            |
            +-------> Subscriber A: NotificationCenter
            |         Action: Compose priority level SLA breach notification template.
            |
            +-------> Subscriber B: DashboardEngine
            |         Action: Mark project health indicator with "CRITICAL" / "AT_RISK".
            |
            +-------> Subscriber C: SystemAdmin
                      Action: Execute fail-safe recovery fallback routines if configured.
```

### Scenario C: Budget Allocation Change
```
[Financial Controller: Adjust Budget]
            |
            v
   (Event: financial.budget.changed)
            |
            +-------> Subscriber A: BaselineManager
            |         Action: Perform variance analysis vs original forecast budget.
            |
            +-------> Subscriber B: AuditLedger
                      Action: Commit audit trail recording old vs new allocation values.
```
