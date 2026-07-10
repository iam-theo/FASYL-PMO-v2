# Disaster Recovery Guide

This guide describes our business continuity plans, replication topologies, backup schedules, and emergency restoration procedures for the AuraPM Enterprise platform.

---

## 1. Objectives (RPO & RTO Targets)

* **Recovery Point Objective (RPO)**: **4 Hours**. (Maximum tolerable data loss period).
* **Recovery Time Objective (RTO)**: **2 Hours**. (Maximum tolerable duration to bring the system back online after a major disaster).

---

## 2. Backup & Retention Policy

AuraPM relies on High-Availability (HA) Regional Cloud SQL configurations. Backup processes are completely automated:

1. **Automated Backups**: Backups are run daily during off-peak hours (02:00 UTC).
2. **Point-In-Time-Recovery (PITR)**: Write-Ahead Logs (WAL) are streamed continuously to a multi-regional cloud bucket, allowing restoration to any microsecond index within the last 7 days.
3. **Retention Policy**: Backup snapshots are retained for **30 Days**. Weekly archive snapshots are retained for **7 Years** to satisfy legal compliance rules.

---

## 3. High Availability & Failover Replication

To prevent downtime due to zone outages, database resources run in **High Availability** mode:

```
        +----------------------------+
        |     Client Application     |
        +----------------------------+
                       |
                       v
        +----------------------------+
        |   GCP Cloud SQL Proxy      |
        +----------------------------+
            /                    \
           /                      \ (Sync Replication)
          v                        v
  +------------------+    +------------------+
  |   Primary DB     |    |   Standby DB     |
  |  (Zone europe-a) |    |  (Zone europe-b) |
  +------------------+    +------------------+
```

During a zone outage, GCP's load balancer automatically routes traffic to the standby instance in the secondary zone without manual configuration.

---

## 4. Disaster Recovery Restoring Procedure

If the primary Cloud SQL database becomes corrupted or suffers catastrophic structural failure, execute the following restoration script:

### Step 1: Identify Target PITR Timestamp
Check audit ledger timestamps or GCP logs to identify the exact second before data corruption took place.
* E.g. `2026-07-03T05:45:00Z`

### Step 2: Create Restored Clone Database Instance
Execute the GCP CLI command to restore PITR data to a new database instance:
```bash
gcloud sql instances clone aurapm-primary aurapm-restored \
  --point-in-time "2026-07-03T05:45:00Z"
```

### Step 3: Verify Schema & Integrity
Verify database connectivity and check schema sanity before switching traffic:
```bash
# Check tables count and size
psql "postgresql://user:pass@aurapm-restored/db" -c "\dt"
```

### Step 4: Repoint API Containers to Restored Instance
Update your Cloud Run container environment variables to target the new restored DB string:
```bash
gcloud run services update aurapm-core \
  --set-env-vars DATABASE_URL="postgresql://user:pass@aurapm-restored/db"
```
Once service health-checks confirm successful startup, safely decommission the old corrupted database instance.
