# AuraPM Enterprise Operational Readiness & Performance Framework

This document details the performance testing suites, security audits (SAST/DAST), chaos engineering protocols, and infrastructure scaling recommendations required to support AuraPM under high corporate loads.

---

## 1. AUTOMATED LOAD TESTING SCRIPT (k6)

AuraPM utilizes **k6** (by Grafana) to execute API performance verification. Below is the active production stress-testing script targeting critical API endpoints.

```javascript
// k6-stress-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // ramp up to 100 users
    { duration: '5m', target: 100 }, // stay at 100 users for 5 minutes
    { duration: '1m', target: 500 }, // spike up to 500 users (Spike Testing)
    { duration: '3m', target: 500 }, // sustain spike
    { duration: '2m', target: 0 },   // ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<150'], // 95% of requests must complete under 150ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
  },
};

export default function () {
  const url = 'http://localhost:3000/api/v2/projects';
  const params = {
    headers: {
      'Authorization': 'Bearer pmo_master_token_secret_jwt',
      'Content-Type': 'application/json',
      'X-API-Version': '2'
    },
  };

  const response = http.get(url, params);
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'success is true': (r) => JSON.parse(r.body).success === true,
  });

  sleep(1);
}
```

To execute this test:
```bash
k6 run k6-stress-test.js
```

---

## 2. SPIKE & CONCURRENCY SCENARIO SCRIPT (ARTILLERY)

For quick scenario testing on local dev clusters, **Artillery** defines this orchestration simulation file:

```yaml
# artillery-load-profile.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 5
      name: Warm up phase
    - duration: 120
      arrivalRate: 20
      rampTo: 100
      name: Ramp up concurrency
    - duration: 300
      arrivalRate: 100
      name: Sustain peak corporate load
  defaults:
    headers:
      Authorization: "Bearer pmo_master_token_secret_jwt"
      X-API-Version: "2"
scenarios:
  - name: "Fetch projects and telemetry"
    flow:
      - get:
          url: "/api/v2/projects"
      - think: 1
      - get:
          url: "/api/v1/devportal/telemetry"
```

---

## 3. OWASP ZAP SECURITY PENETRATION PROFILE (DAST)

AuraPM is integrated into the nightly security pipeline using OWASP ZAP. The profile runs in daemon mode using the official container.

```bash
docker run -v $(pwd):/zap/wrk/:rw -t owasp/zap2docker-stable zap-full-scan.py \
  -t http://localhost:3000/api/v1/health \
  -P 5000 \
  -J zap-report.json \
  -r zap-report.html
```

### 3.1 Security Hardening Directives
* **SAST Scanning**: Executed via **Snyk** and **SonarQube** on every pull request. No high or critical vulnerabilities are permitted to merge.
* **CORS Policy**: Configured to restrict ingress strictly to registered enterprise subdomains.
* **Helmet Middleware**: Integrated on the Express server to enforce secure headers (Strict-Transport-Security, Content-Security-Policy, X-Content-Type-Options).

---

## 4. CAPACITY PLANNING & SCALING RECOMMENDATIONS

Based on database profiling and stress test outcomes, we define the following target limits:

### 4.1 Computational Matrix
| Corporate Concurrent Users | Required CPU | Required RAM | PostgreSQL Instance size | Max Redis Cache Memory |
|----------------------------|--------------|--------------|--------------------------|------------------------|
| **1,000** (Base)           | 2 Cores      | 4 GB         | db.t4g.large             | 2 GB                   |
| **5,000** (Sustained)      | 4 Cores      | 8 GB         | db.r6g.xlarge            | 8 GB                   |
| **10,000+** (Fortune 100)  | 8 Cores      | 16 GB        | db.r6g.2xlarge (Cluster) | 16 GB                  |

### 4.2 Horizontal Autoscaling Strategy (Cloud Run / Kubernetes)
* **Target Metric**: CPU Utilization threshold set to `70%` or memory utilization set to `75%`.
* **Min Instances**: 2 replicas (to prevent cold starts and guarantee high availability).
* **Max Instances**: 50 replicas.
* **Graceful Shutdown**: Enforced 15-second delay to complete outstanding database commits before container recycling.
