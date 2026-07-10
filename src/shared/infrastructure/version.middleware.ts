import { Request, Response, NextFunction } from "express";

/**
 * Enterprise API Version Negotiation Middleware
 * Supports:
 * 1. Header-based Versioning (X-API-Version: 1 or 2)
 * 2. Media Type (Accept: application/vnd.aurapm.v2+json)
 * 3. Injects standard Deprecation and Sunset response headers for sunsetting versions (e.g. v1)
 */
export const versionNegotiationMiddleware = (req: any, res: Response, next: NextFunction) => {
  // 1. Determine requested version from headers
  let requestedVersion = "1"; // Default version

  const acceptHeader = req.headers.accept || "";
  const xApiVersion = req.headers["x-api-version"];

  if (xApiVersion) {
    requestedVersion = String(xApiVersion).trim();
  } else if (acceptHeader.includes("vnd.aurapm.v2+json")) {
    requestedVersion = "2";
  } else if (acceptHeader.includes("vnd.aurapm.v1+json")) {
    requestedVersion = "1";
  } else if (req.originalUrl.includes("/api/v2")) {
    requestedVersion = "2";
  } else if (req.originalUrl.includes("/api/v1")) {
    requestedVersion = "1";
  }

  req.apiVersion = requestedVersion;

  // 2. Inject Deprecation and Sunset Headers for v1
  if (requestedVersion === "1") {
    // Standard RFC Deprecation Header (date or true)
    res.setHeader("Deprecation", "true");
    // Standard Sunset date header for retiring v1 (e.g., Dec 31, 2026)
    res.setHeader("Sunset", "Thu, 31 Dec 2026 23:59:59 GMT");
    // Link header pointing to the official migration guide
    res.setHeader(
      "Link",
      `<https://aurapm.com/docs/api/v1-migration>; rel="deprecation-guide", <https://aurapm.com/docs/api/v2>; rel="latest-version"`
    );
  }

  next();
};
