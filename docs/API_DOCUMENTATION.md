# API Documentation

This document describes the AuraPM Enterprise REST API specifications, versioning policies, standard parameters, security enforcement, and bulk operation schemas.

---

## 1. Versioning & Root URL

AuraPM follows versioned URI routing to prevent breaking changes on legacy clients.
* **Base URL**: `https://<domain>/api/v1`

---

## 2. Global Query Parameters

All collection resource endpoints support standardized query parameters for pagination, filtering, searching, and sorting.

### 2.1. Pagination
AuraPM uses `limit` and `offset` pagination indices.
* `limit` (integer): Number of records to return. Default: `100`. Max: `500`.
* `offset` (integer): Number of records to skip. Default: `0`.

### 2.2. Filtering
Filters are passed as exact-match key-value query parameters:
* `actorId` (string): Filters logs or events created by a specific user ID.
* `moduleName` (string): Filters events associated with a specific domain, e.g., `ORCHESTRATION`.
* `action` (string): Filters logs matching an operational verb, e.g., `SET_CONFIG`.

### 2.3. Searching
Full-text searching is initiated via the `search` query parameter. It matches text across action descriptions, serialized details, and system parameters.
* `search` (string): Text string to query. Case-insensitive, partial-match.

### 2.4. Sorting
Sorting parameters define the sequence of returned payloads.
* `sortField` (string): Field to sort on, e.g. `createdAt`, `id`. Default: `createdAt`.
* `sortOrder` (string): Sorting order. Options: `ASC`, `DESC`. Default: `DESC`.

---

## 3. Core API Reference

### 3.1. Fetch Audit Logs
* **Route**: `GET /orchestration/audit`
* **Headers**: `Authorization: Bearer <JWT>`
* **Parameters**: `limit`, `offset`, `search`, `sortField`, `sortOrder`, `actorId`, `moduleName`, `action`
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "1",
        "actorId": "user-pmo-99",
        "action": "CONVERT_LEAD",
        "moduleName": "ORCHESTRATION",
        "details": "{\"leadId\":\"lead-777\",\"projectName\":\"Apex Expansion\"}",
        "createdAt": "2026-07-03T06:15:00.000Z",
        "ipAddress": "127.0.0.1"
      }
    ]
  }
  ```

### 3.2. Update Dynamic Configuration (Single)
* **Route**: `POST /orchestration/configs`
* **Headers**: `Authorization: Bearer <JWT>`
* **Body (JSON)**:
  ```json
  {
    "key": "sla.default.duration.days",
    "value": 45,
    "category": "SLA",
    "actorId": "admin-user"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Config key 'sla.default.duration.days' updated successfully."
  }
  ```

### 3.3. Update Dynamic Configurations (Bulk Operations)
* **Route**: `POST /orchestration/configs/bulk`
* **Headers**: `Authorization: Bearer <JWT>`
* **Body (JSON)**:
  ```json
  {
    "actorId": "admin-user",
    "configs": [
      {
        "key": "sla.default.duration.days",
        "value": 15,
        "category": "SLA"
      },
      {
        "key": "feature.flags.ai_hallucination_guard",
        "value": false,
        "category": "FEATURE_FLAGS"
      }
    ]
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Successfully bulk updated 2 configurations."
  }
  ```

---

## 4. Security & Access Control (RBAC & PBAC)

To safeguard endpoints, request handlers invoke the `requirePermissions` validation middleware.

1. **Role-Based Access Control (RBAC)**: Checks if the user is assigned a specific enterprise role (e.g. `pmo_director` or `admin`).
2. **Parameter-Based Access Control (PBAC)**: Checks if request parameters match authorization constraints, such as verify that the `actorId` passed in the body exactly matches the authenticated user token `uid`.

If verification fails, the server responds with a standard error:
* **401 Unauthorized**: User session context missing or expired.
* **403 Forbidden**: Access denied. Missing required enterprise permissions.
