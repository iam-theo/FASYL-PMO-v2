# AuraPM Developer Portal Backend Specification

The Developer Portal serves as the primary gateway for enterprise integration developers, allowing self-service client onboarding, API key rotation, webhook subscriptions management, and runtime telemetry observation.

---

## 1. DEV PORTAL LOGICAL SCHEMA

To support developer portal services, AuraPM deploys these tables in the PostgreSQL relational schema.

```sql
-- 1. Applications & OAuth Clients Table
CREATE TABLE developer_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    client_id VARCHAR(100) UNIQUE NOT NULL,
    client_secret_hash VARCHAR(255) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    webhook_url VARCHAR(512),
    status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL, -- ACTIVE, SUSPENDED, DEPRECATED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Webhook Event Delivery Logs (Immutable Audit Trails)
CREATE TABLE developer_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID REFERENCES developer_applications(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- e.g., 'project.created'
    payload TEXT NOT NULL,
    response_status_code INTEGER,
    response_body TEXT,
    retry_count INTEGER DEFAULT 0 NOT NULL,
    delivery_status VARCHAR(50) DEFAULT 'SUCCESS' NOT NULL, -- SUCCESS, FAILED, RETRYING
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add high-performance indexing for audit retrieval
CREATE INDEX idx_wh_app_events ON developer_webhook_logs (app_id, event_type);
CREATE INDEX idx_wh_created ON developer_webhook_logs (created_at DESC);
```

---

## 2. API ENDPOINT REGISTER & REFERENCE

Below is the summary of backend endpoints mounted live under `/api/v1/devportal`:

### 2.1 Application Onboarding (`POST /apps`)
* **Request Payload**:
  ```json
  {
    "name": "Apex Custom Portal integration",
    "webhookUrl": "https://customer.api.com/webhooks/aurapm"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Application registered successfully. Guard your client credentials and API keys.",
    "data": {
      "id": "app-771",
      "name": "Apex Custom Portal integration",
      "clientId": "client_id_apex_88291",
      "clientSecret": "client_secret_apex_9921_secret",
      "apiKey": "aurapm_live_key_99182390a18f",
      "webhookUrl": "https://customer.api.com/webhooks/aurapm",
      "status": "ACTIVE",
      "createdAt": "2026-07-03T08:19:51.000Z"
    }
  }
  ```

### 2.2 Rotate API Integration Key (`POST /apps/:id/rotate-key`)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "API Key successfully rotated. Revoke the old key from your integrations immediately.",
    "data": {
      "id": "app-771",
      "apiKey": "aurapm_live_key_f29c21820bdae0"
    }
  }
  ```

### 2.3 Replay Failed Webhook Event (`POST /webhooks/replay/:logId`)
Allows developers to manually trigger a retry of a webhook payload that failed delivery due to network drops or recipient timeouts.
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Replay request queued successfully for event: project.created",
    "data": {
      "originalLogId": "wh-log-001",
      "status": "QUEUED",
      "targetUrl": "https://customer.api.com/webhooks/aurapm",
      "timestamp": "2026-07-03T08:19:51.000Z"
    }
  }
  ```

### 2.4 Developer Portal Telemetry Analytics Dashboard (`GET /telemetry`)
* **Success Response (200 OK)**: Returns real-time metrics on current API usage rates, response times by path, and rate limit exhaustion status.
  ```json
  {
    "success": true,
    "data": {
      "rateLimit": {
        "limit": 100000,
        "remaining": 98150,
        "resetSeconds": 1450
      },
      "usageStats": [
        { "date": "2026-07-03", "getProjects": 1100, "postProjects": 55, "errors": 0 }
      ],
      "apiResponseTimesMs": {
        "projectsList": 42,
        "projectsCreate": 124
      }
    }
  }
  ```
