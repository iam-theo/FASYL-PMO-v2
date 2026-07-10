# AuraPM Enterprise Consumer Contract Testing Framework

Consumer Contract Testing ensures that services can safely evolve independently without causing runtime failures. It acts as a safety shield between the AuraPM EPOL Core Platform and its downstream consumer channels (web portals, mobile SDKs, corporate analytics platforms).

---

## 1. CONTRACT DESIGN PRINCIPLES

1. **Consumer-Driven**: Downstream clients declare exactly what fields they require and in what format.
2. **Strict Schema Validation**: Uses standard OpenAPI or JSON Schema specification vectors.
3. **Decoupled Verification**: Contracts are verified against both mock providers and the actual running platform.
4. **Zero-Trust Boundary**: Out-of-bounds keys are discarded or highlighted for deprecation.

---

## 2. THE CONTRACT DEFINITION FILE (PACT FORMAT)

Downstream consumers publish pact files into the **Pact Broker Registry**. Below is the verified contract for the AuraPM Project Consumer:

```json
{
  "consumer": {
    "name": "AuraPM-Developer-Portal-SPA"
  },
  "provider": {
    "name": "AuraPM-EPOL-Core-Service"
  },
  "interactions": [
    {
      "description": "A request for all active project records",
      "providerState": "projects exist in database",
      "request": {
        "method": "GET",
        "path": "/api/v1/projects",
        "headers": {
          "Authorization": "Bearer pmo_master_token_secret_jwt",
          "X-Correlation-ID": "test-correlation-uuid-999"
        }
      },
      "response": {
        "status": 200,
        "headers": {
          "Content-Type": "application/json; charset=utf-8"
        },
        "body": {
          "success": true,
          "data": [
            {
              "id": "e0bfa595-b6e9-40b1-b2a4-c12f62979be4",
              "name": "Apex Expansion Platform",
              "code": "APEX-2026",
              "status": "PLANNING",
              "budget": "250000.00"
            }
          ]
        },
        "matchingRules": {
          "$.body.data[*].id": {
            "match": "type"
          },
          "$.body.data[*].code": {
            "match": "regex",
            "regex": "^[A-Z0-9-]{3,15}$"
          }
        }
      }
    }
  ],
  "metadata": {
    "pactSpecification": {
      "version": "3.0.0"
    }
  }
}
```

---

## 3. PROVIDER VERIFICATION PIPELINE

The Provider Verification pipeline verifies that the actual running server matches the compiled contracts.

### 3.1 Contract Verification Test Script (`/tests/contract.test.ts`)
```typescript
import { expect } from "chai";
import request from "supertest";
import { app } from "../server";

describe("AuraPM Provider Contract Verification", () => {
  it("Verify contract matches GET /api/v1/projects response schema", async () => {
    const response = await request(app)
      .get("/api/v1/projects")
      .set("Authorization", "Bearer pmo_master_token_secret_jwt")
      .set("X-Correlation-ID", "test-correlation-uuid-999");

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property("success", true);
    expect(response.body.data).to.be.an("array");

    if (response.body.data.length > 0) {
      const project = response.body.data[0];
      expect(project).to.have.property("id");
      expect(project).to.have.property("name");
      expect(project).to.have.property("code");
      expect(project.code).to.match(/^[A-Z0-9-]{3,15}$/);
    }
  });
});
```

---

## 4. CI CONTINUOUS INTEGRATION CONTRACT VERIFICATION

The contract validation runs inside the GitHub Actions CI pipeline on every Pull Request to block breaking changes.

### 4.1 GitHub Actions Workflow: `contract-verification.yml`
```yaml
name: Consumer Contract Verification

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  contract-test:
    name: Verify Consumer Contracts
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: aurapm_test
          POSTGRES_PASSWORD: testpassword
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - name: Check out code
      uses: actions/checkout@v3

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-size: '18'
        cache: 'npm'

    - name: Install Dependencies
      run: npm ci

    - name: Start Mock Services & Run Contract Tests
      env:
        DATABASE_URL: postgresql://postgres:testpassword@localhost:5432/aurapm_test
        NODE_ENV: test
      run: |
        npm run db:migrate
        npm run test:contract

    - name: Publish Verification Results to Pact Broker
      if: success()
      run: |
        npx pact-broker publish-verification-results \
          --broker-base-url https://aurapm.pactflow.io \
          --broker-token ${{ secrets.PACT_BROKER_TOKEN }} \
          --provider-app-version $GITHUB_SHA
```
