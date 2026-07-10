# Operational Runbooks

This document contains standard operating procedures (SOPs) and operational runbooks for managing, scaling, and maintaining the AuraPM Enterprise platform.

---

## Runbook 01: Maintenance Mode Activation & Deactivation

### Objective
Safely put AuraPM into maintenance mode to run migration scripts, apply database updates, or perform infrastructure maintenance without losing ongoing user requests.

### Steps
1. **Activate Maintenance Mode**:
   Submit a POST request to `/api/v1/orchestration/maintenance` with the parameter `maintenanceMode: true`:
   ```bash
   curl -X POST https://<domain>/api/v1/orchestration/maintenance \
     -H "Content-Type: application/json" \
     -d '{"maintenanceMode": true}'
   ```
   *Result*: The platform will reject incoming non-admin requests with an eye-safe "System Undergoing Scheduled Updates" maintenance page, while active background queues continue finishing remaining jobs.

2. **Verify Maintenance State**:
   Execute the health endpoint check:
   ```bash
   curl -X GET https://<domain>/api/v1/orchestration/settings
   ```
   *Expectation*: `"maintenanceMode": true` in response settings.

3. **Deactivate Maintenance Mode**:
   Once update tasks are complete, restore live operations:
   ```bash
   curl -X POST https://<domain>/api/v1/orchestration/maintenance \
     -H "Content-Type: application/json" \
     -d '{"maintenanceMode": false}'
   ```

---

## Runbook 02: Responding to System CPU & Memory Overload

### Symptoms
* Ingress latency indexes on `/api/v1/orchestration/health` rise above 200ms.
* Heap memory usage exceeds 85% of total allocated buffer.
* UI dashboard elements flicker or display websocket reconnection error messages.

### Actions
1. **Increase Cloud Run Instance Max Limits**:
   Scale the instance memory to prevent Out-Of-Memory (OOM) process crashes:
   ```bash
   gcloud run services update aurapm-core \
     --memory 2Gi \
     --cpu 2 \
     --region europe-west2
   ```

2. **Mitigate Queue Congestion**:
   If background workers are overwhelmed, bulk-update scheduling configurations to postpone lower-priority cleanups:
   ```bash
   curl -X POST https://<domain>/api/v1/orchestration/configs/bulk \
     -H "Content-Type: application/json" \
     -d '{
       "actorId": "admin-system",
       "configs": [
         { "key": "sla.default.duration.days", "value": 60, "category": "SLA" },
         { "key": "feature.flags.ai_hallucination_guard", "value": false, "category": "FEATURE_FLAGS" }
       ]
     }'
   ```

3. **Perform Cold Reboot of Dev Containers**:
   If server modules are unresponsive due to zombie processes, restart the dev service to clear internal state.
   *(In AI Studio UI: Click the "Restart Server" option in the settings menu.)*

---

## Runbook 03: Clearing Cache and Refreshing Core Configs

### Objective
Force clean stale configuration objects from node memory cache to apply emergency settings overrides.

### Steps
1. Execute the configuration refresh endpoint. This will empty internal Maps cache memory and reload parameters fresh from the PostgreSQL db:
   ```bash
   curl -X POST https://<domain>/api/v1/orchestration/configs \
     -H "Content-Type: application/json" \
     -d '{"key":"system.working_hours","value":{"start":"08:00","end":"18:00","days":[1,2,3,4,5]},"category":"CALENDAR","actorId":"admin-operator"}'
   ```
2. Verify update via:
   ```bash
   curl -X GET "https://<domain>/api/v1/orchestration/configs?category=CALENDAR"
   ```
