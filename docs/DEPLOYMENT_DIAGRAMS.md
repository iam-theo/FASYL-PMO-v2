# Deployment Diagrams

This document details the production cloud topology and server-side deployment architectures for the AuraPM Enterprise platform.

---

## 1. Google Cloud Platform (GCP) Production Architecture

AuraPM is built to deploy on serverless Google Cloud structures, maximizing scalability and reducing idle compute cost.

```
       [ Client Browser ] (HTTPS)
               |
               v
  +--------------------------+
  | Google Cloud Load Bal.   | (SSL Termination, DNS Routing)
  +--------------------------+
               |
               v
  +--------------------------+
  |   Cloud Run Container    | (Docker Sandbox, Auto-scaling)
  |                          |
  |   +------------------+   |
  |   |    Nginx Proxy   |   | (Port 3000 Ingress routing)
  |   +------------------+   |
  |            |             |
  |            v             |
  |   +------------------+   |
  |   | Node.js Express  |   | (Clean Architecture Backend)
  |   +------------------+   |
  +--------------------------+
          /          \
         /            \
        v              v
+----------------+   +--------------------+
|  Cloud SQL     |   |   Firebase Auth    | (Federated Google / Email Login)
|  (PostgreSQL)  |   +--------------------+
+----------------+
```

---

## 2. Component Deployment Details

### 2.1. Cloud Run Compute Container
* **Runtime**: Docker image built on Alpine Node.js.
* **Auto-scaling**: Scales from 0 to 100 container instances based on CPU utilization thresholds (default: 70%).
* **Memory Limits**: 512MB RAM minimum, 2GB RAM maximum per instance.

### 2.2. Cloud SQL Persistence
* **Engine**: PostgreSQL 15.
* **Storage**: High-Availability (HA) Regional SSD with automated daily backups and point-in-time recovery (PITR) enabled.
* **Connection Pooling**: Managed via `pg` / `drizzle-orm` pool sizing inside Express, with max pool limits set to 50 active clients per container.

### 2.3. Reverse Proxy Layer
* **Web Server**: Nginx is compiled inside the container to intercept incoming traffic on port 3000. It handles gzip compression, static assets serving in `/dist`, rate-limiting protection, and routes API requests to the local Node.js process.
