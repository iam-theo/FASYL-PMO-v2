# AuraPM Enterprise SDK Generation Platform

To guarantee developers can integrate rapidly with the AuraPM EPOL core system in their preferred language, AuraPM utilizes an automated, containerized **SDK Generation & Publishing Platform**. The platform processes the OpenAPI specification vector on every release, compiling high-performance, strongly typed client SDKs.

---

## 1. SDK GENERATION ARCHITECTURE

The generation platform uses a multi-stage Docker builder wrapping the `openapi-generator-cli` and custom Handlebars templates to enforce AuraPM design patterns (like structured error codes, logging hooks, and automated retries).

```
[openapi.yaml]
     │
     ▼
[openapi-generator-cli] ───► Handlebars Templates
     │
     ├─► TypeScript / JS SDK  ───► npm publish
     ├─► Java / Kotlin SDK    ───► Maven Central
     ├─► Python SDK           ───► PyPI upload
     ├─► Go SDK               ───► git push tagging
     ├─► Swift SDK            ───► Swift Package Registry
     └─► C# SDK (.NET)        ───► NuGet push
```

---

## 2. THE PIPELINE EXECUTION SCRIPT (`generate-sdks.sh`)

This script runs within the CD pipeline upon tagging a new release.

```bash
#!/usr/bin/env bash
set -euo pipefail

OPENAPI_PATH="./docs/openapi.json"
OUTPUT_DIR="./sdk-out"
VERSION=$(jq -r '.info.version' "$OPENAPI_PATH")

echo "=================================================="
echo "Starting SDK Generation Pipeline for AuraPM v$VERSION"
echo "=================================================="

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# 1. Generate TypeScript SDK
echo "Generating TypeScript SDK..."
docker run --rm -v "${PWD}:/local" openapitools/openapi-generator-cli generate \
  -i "/local/${OPENAPI_PATH}" \
  -g typescript-axios \
  -o "/local/${OUTPUT_DIR}/typescript" \
  --additional-properties=npmName=@aurapm/sdk-typescript,npmVersion="${VERSION}",supportsES6=true

# 2. Generate Python SDK
echo "Generating Python SDK..."
docker run --rm -v "${PWD}:/local" openapitools/openapi-generator-cli generate \
  -i "/local/${OPENAPI_PATH}" \
  -g python \
  -o "/local/${OUTPUT_DIR}/python" \
  --additional-properties=packageName=aurapm_sdk,packageVersion="${VERSION}"

# 3. Generate Java / Kotlin SDK
echo "Generating Java / Kotlin SDK..."
docker run --rm -v "${PWD}:/local" openapitools/openapi-generator-cli generate \
  -i "/local/${OPENAPI_PATH}" \
  -g kotlin \
  -o "/local/${OUTPUT_DIR}/kotlin" \
  --additional-properties=groupId=com.aurapm,artifactId=aurapm-sdk,artifactVersion="${VERSION}"

# 4. Generate Swift SDK
echo "Generating Swift SDK..."
docker run --rm -v "${PWD}:/local" openapitools/openapi-generator-cli generate \
  -i "/local/${OPENAPI_PATH}" \
  -g swift5 \
  -o "/local/${OUTPUT_DIR}/swift"

# 5. Generate Go SDK
echo "Generating Go SDK..."
docker run --rm -v "${PWD}:/local" openapitools/openapi-generator-cli generate \
  -i "/local/${OPENAPI_PATH}" \
  -g go \
  -o "/local/${OUTPUT_DIR}/go" \
  --additional-properties=packageName=aurapm,packageVersion="${VERSION}"

echo "=================================================="
echo "SDK Generation Completed Successfully!"
echo "=================================================="
```

---

## 3. CORE FEATURES IMPLEMENTED ACROSS ALL SDKS

Every generated SDK includes these production-grade traits natively:

### 3.1 Resilience & Automatic Exponential Backoff Retries
If the API experiences transient 429 (Rate Limit) or 503 (Server Busy) codes, the SDK automatically pauses and retries with exponential backoff:
```typescript
// Axel/Axios client interceptor pattern included inside TypeScript SDK
axiosInstance.interceptors.response.use(null, async (error) => {
  const { config, response } = error;
  if (response && (response.status === 429 || response.status >= 500) && config.retryCount < 3) {
    config.retryCount = (config.retryCount || 0) + 1;
    const backoffDelay = Math.pow(2, config.retryCount) * 1000;
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    return axiosInstance(config);
  }
  return Promise.reject(error);
});
```

### 3.2 Integrated Webhook Decryption & Verification Helpers
Webhooks contain cryptographically signed payloads. The SDK provides helper methods to verify the `X-Aura-Signature` headers easily:
```python
# Python Webhook signature verification helper
import hmac
import hashlib

class AuraWebhookVerifier:
    @staticmethod
    def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
        computed = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(computed, signature)
```

---

## 4. RELEASE & PUBLISHING PIPELINE (`sdk-publish.yml`)

Upon merge to `main`, GitHub Actions automatically pushes packages to upstream registries:

```yaml
name: Compile & Publish Target SDKs

on:
  release:
    types: [published]

jobs:
  publish-npm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - name: Install dependencies & build
        run: |
          cd sdk-out/typescript
          npm install
          npm run build
          npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_PUBLISH_TOKEN }}

  publish-pypi:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Build & Publish to PyPI
        run: |
          cd sdk-out/python
          pip install twine wheel setuptools
          python setup.py sdist bdist_wheel
          twine upload dist/*
        env:
          TWINE_USERNAME: __token__
          TWINE_PASSWORD: ${{ secrets.PYPI_API_TOKEN }}
```
