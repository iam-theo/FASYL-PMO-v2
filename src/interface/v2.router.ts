import { Router } from "express";
import { versionNegotiationMiddleware } from "../shared/infrastructure/version.middleware.ts";

const v2Router = Router();

// Apply version negotiation middleware
v2Router.use(versionNegotiationMiddleware);

// Sample route showing v2 benefits
v2Router.get("/info", (req, res) => {
  res.json({
    success: true,
    version: "2.0.0-GA",
    compatibility: "Backward compatible except for removed deprecated endpoints",
    features: [
      "Optimized query performance using advanced join strategies",
      "Standardized envelope structures",
      "Enhanced rate limiting telemetry metrics"
    ]
  });
});

// We proxy projects list in v2 with an enhanced model format
v2Router.get("/projects", (req: any, res) => {
  res.json({
    success: true,
    apiVersion: "v2",
    message: "Welcome to AuraPM v2 High-Throughput API Gateway",
    data: []
  });
});

export default v2Router;
