# AuraPM Enterprise API Versioning & Governance Policy

This document defines the official **API Versioning, Lifecycle, and Deprecation Framework** for the AuraPM Enterprise Portfolio Management Platform. This policy is designed to guarantee high system availability, predictable upgrade paths, and absolute backward compatibility for Fortune 500 corporate integrations.

---

## 1. API VERSION POLICY

AuraPM enforces a multi-tier version routing policy across its API Gateways:

### 1.1 URL Versioning (Core Channels)
Each major API release is isolated in its own routing namespace:
* `/api/v1` (Active / Deprecated): Original production API suite.
* `/api/v2` (GA / Current): Upgraded, high-throughput database-optimized API suite.
* `/api/v3` (Proposed): Sandbox/future development.

### 1.2 Header-based & Content-Type Versioning (Enterprise Channels)
For dynamic, non-disruptive runtime switches, the API Gateway inspects incoming headers:
* **Custom Request Header**: `X-API-Version: 2`
* **Media Type (Accept Header)**: `Accept: application/vnd.aurapm.v2+json`

### 1.3 Backward Compatibility Guarantees
Major versions are supported for **24 months** minimum. Within any major version (e.g., `v2`), the following rules apply to maintain backward compatibility:
* **Allowed (Non-Breaking)**:
  * Adding new optional parameters to request bodies or queries.
  * Adding new properties to response JSON envelopes.
  * Registering new endpoint routes.
* **Forbidden (Breaking)**:
  * Modifying existing JSON key names or data types (e.g., changing string to integer).
  * Removing existing parameters or query constraints.
  * Deleting endpoints or changing their HTTP methods.
  * Altering default authorization/role rules.

---

## 2. DEPRECATION & SUNSET CHRONOLOGICAL TIMELINE

When a major version is flagged for retirement, AuraPM triggers a structured sunset cycle:

```
[DEPRECATION ANNOUNCED] ---> [DEPRECATION HEADERS INJECTED] ---> [SUNSET PERIOD (12 MONTHS)] ---> [RETIREMENT]
```

### 2.1 Deprecation Signaling Standard (RFC-8594)
Deprecating APIs inject the following system headers into every single response:
1. `Deprecation: true` (Signifies that this route is deprecated).
2. `Sunset: Thu, 31 Dec 2026 23:59:59 GMT` (The exact scheduled date of route termination).
3. `Link: <https://aurapm.com/docs/api/v1-migration>; rel="deprecation-guide"` (Hypermedia link to the migration blueprint).

---

## 3. VERSION REGISTRY SUPPORT MATRIX

| Major Version | Release Date | Deprecation Date | Sunset Date | Support Tier | Recommended Action |
|---------------|--------------|------------------|-------------|--------------|--------------------|
| **v1**        | 2024-01-15   | 2025-07-01       | 2026-12-31  | Deprecated   | Migrate to v2 ASAP |
| **v2** (GA)   | 2026-07-03   | N/A              | N/A         | Active GA    | Use for New Apps   |

---

## 4. BACKWARD COMPATIBILITY CHECKLIST FOR RELEASES

Prior to promoting any pipeline build to production, the QA pipeline evaluates this 10-point checklist:

- [ ] **Data Types**: All response keys match existing TypeScript interface types exactly.
- [ ] **Optional Fields**: Newly added request properties are fully optional or default-assigned.
- [ ] **Status Codes**: Standard HTTP status response ranges remain unmodified.
- [ ] **Auth Context**: No additional permissions overrides have been introduced into existing endpoints.
- [ ] **Required Parameters**: Existing mandatory parameters are neither removed nor changed.
- [ ] **Rate Limits**: Rate limits for existing routes are not decreased.
- [ ] **Validation Schemas**: JSON-Schema definitions match previous minor versions.
- [ ] **CORS Origins**: Active CORS settings remain permissive for registered tenants.
- [ ] **Query Filtering**: No existing query filter keys have been modified or deleted.
- [ ] **Idempotency Headers**: Idempotency parameters are fully backward compatible.

---

## 5. MIGRATION TEMPLATE: UPGRADING FROM V1 TO V2

### 5.1 Project Payload Enhancements
In `v1`, projects budget was returned as a basic unformatted number. In `v2`, budgets return enriched currency metadata fields:

```json
// OLD v1 Response format:
{
  "id": "e0bfa595-b6e9-40b1-b2a4-c12f62979be4",
  "name": "Apex Expansion Platform",
  "budget": 250000.00
}

// NEW v2 Response format:
{
  "id": "e0bfa595-b6e9-40b1-b2a4-c12f62979be4",
  "name": "Apex Expansion Platform",
  "financials": {
    "budget": 250000.00,
    "currency": "USD",
    "allocatedCost": 150000.00,
    "actualCost": 120000.00,
    "variance": 30000.00
  },
  "metadata": {
    "version": "2.0",
    "environment": "production"
  }
}
```

### 5.2 Step-by-Step Upgrade Guide
1. **Header Updates**: Swap HTTP request header `X-API-Version: 1` to `X-API-Version: 2` or update URL prefixes from `/api/v1` to `/api/v2`.
2. **Handle Currency Envelope**: Unnest project `.budget` and map it to `.financials.budget` inside client-side stores.
3. **Assert Token Validations**: Ensure token authentication is handled via the Firebase Admin SDK header format.
