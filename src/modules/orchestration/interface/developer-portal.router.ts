import { Router } from "express";
import { v4 as uuidv4 } from "uuid";

const devPortalRouter = Router();

// Mock database storage for Developer Portal entities
interface DevApp {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;
  webhookUrl?: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
}

interface WebhookLog {
  id: string;
  appId: string;
  event: string;
  payload: string;
  responseCode: number;
  responseBody: string;
  timestamp: string;
}

const appsDb: DevApp[] = [
  {
    id: "app-771",
    name: "Apex Custom Portal integration",
    clientId: "client_id_apex_88291",
    clientSecret: "client_secret_apex_9921_secret",
    apiKey: "aurapm_live_key_99182390a18f",
    webhookUrl: "https://customer.api.com/webhooks/aurapm",
    status: "ACTIVE",
    createdAt: new Date().toISOString()
  }
];

const webhookLogsDb: WebhookLog[] = [
  {
    id: "wh-log-001",
    appId: "app-771",
    event: "project.created",
    payload: JSON.stringify({ projectId: "e0bfa595-b6e9-40b1-b2a4-c12f62979be4", code: "APEX-2026" }),
    responseCode: 200,
    responseBody: "{\"received\": true}",
    timestamp: new Date().toISOString()
  }
];

/**
 * @swagger
 * /devportal/apps:
 *   post:
 *     summary: Register a new developer application / OAuth client
 *     tags: [Developer Portal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               webhookUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Application registered
 */
devPortalRouter.post("/apps", (req, res) => {
  const { name, webhookUrl } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: { message: "Application name is required" } });
  }

  const newApp: DevApp = {
    id: `app-${uuidv4().substring(0, 8)}`,
    name,
    clientId: `client_id_${uuidv4().substring(0, 16)}`,
    clientSecret: `client_secret_${uuidv4().replace(/-/g, "")}`,
    apiKey: `aurapm_live_key_${uuidv4().replace(/-/g, "")}`,
    webhookUrl,
    status: "ACTIVE",
    createdAt: new Date().toISOString()
  };

  appsDb.push(newApp);

  res.status(201).json({
    success: true,
    message: "Application registered successfully. Guard your client credentials and API keys.",
    data: newApp
  });
});

/**
 * @swagger
 * /devportal/apps:
 *   get:
 *     summary: List registered application profiles
 *     tags: [Developer Portal]
 *     responses:
 *       200:
 *         description: List of applications
 */
devPortalRouter.get("/apps", (req, res) => {
  res.json({
    success: true,
    data: appsDb
  });
});

/**
 * @swagger
 * /devportal/apps/{id}/rotate-key:
 *   post:
 *     summary: Rotate application credentials or API Key
 *     tags: [Developer Portal]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Key rotated
 */
devPortalRouter.post("/apps/:id/rotate-key", (req, res) => {
  const app = appsDb.find(a => a.id === req.params.id);
  if (!app) {
    return res.status(404).json({ success: false, error: { message: "Application not found" } });
  }

  app.apiKey = `aurapm_live_key_${uuidv4().replace(/-/g, "")}`;

  res.json({
    success: true,
    message: "API Key successfully rotated. Revoke the old key from your integrations immediately.",
    data: {
      id: app.id,
      apiKey: app.apiKey
    }
  });
});

/**
 * @swagger
 * /devportal/apps/{id}/webhook-logs:
 *   get:
 *     summary: Get Webhook Delivery Logs for an application
 *     tags: [Developer Portal]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook logs
 */
devPortalRouter.get("/apps/:id/webhook-logs", (req, res) => {
  const logs = webhookLogsDb.filter(l => l.appId === req.params.id);
  res.json({
    success: true,
    data: logs
  });
});

/**
 * @swagger
 * /devportal/webhooks/replay/{logId}:
 *   post:
 *     summary: Replay failed webhooks for auditing purposes
 *     tags: [Developer Portal]
 *     parameters:
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Replay request queued
 */
devPortalRouter.post("/webhooks/replay/:logId", (req, res) => {
  const log = webhookLogsDb.find(l => l.id === req.params.logId);
  if (!log) {
    return res.status(404).json({ success: false, error: { message: "Webhook execution log not found" } });
  }

  // Simulated replay attempt
  res.json({
    success: true,
    message: `Replay request queued successfully for event: ${log.event}`,
    data: {
      originalLogId: log.id,
      status: "QUEUED",
      targetUrl: "https://customer.api.com/webhooks/aurapm",
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * @swagger
 * /devportal/telemetry:
 *   get:
 *     summary: Fetch dynamic Rate Limit & Analytics Dashboard telemetry metrics
 *     tags: [Developer Portal]
 *     responses:
 *       200:
 *         description: Telemetry metrics
 */
devPortalRouter.get("/telemetry", (req, res) => {
  res.json({
    success: true,
    data: {
      rateLimit: {
        limit: 100000,
        remaining: 98150,
        resetSeconds: 1450
      },
      usageStats: [
        { date: "2026-06-27", getProjects: 450, postProjects: 12, errors: 1 },
        { date: "2026-06-28", getProjects: 600, postProjects: 20, errors: 0 },
        { date: "2026-06-29", getProjects: 720, postProjects: 15, errors: 2 },
        { date: "2026-07-01", getProjects: 810, postProjects: 25, errors: 4 },
        { date: "2026-07-02", getProjects: 950, postProjects: 40, errors: 1 },
        { date: "2026-07-03", getProjects: 1100, postProjects: 55, errors: 0 }
      ],
      apiResponseTimesMs: {
        projectsList: 42,
        projectsCreate: 124,
        taskUpdate: 35,
        authVerify: 18
      }
    }
  });
});

export default devPortalRouter;
