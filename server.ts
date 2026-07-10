import "dotenv/config";
import express from "express";
import path from "path";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import trackerRouter from "./src/modules/project-tracker/index.ts";
import v1Router from "./src/interface/v1.router.ts";
import v2Router from "./src/interface/v2.router.ts";
import { versionNegotiationMiddleware } from "./src/shared/infrastructure/version.middleware.ts";
import { dbState, syncStateFromPostgres } from "./src/modules/project-tracker/index.ts";
import { ChatService } from "./src/modules/project-tracker/modules/chat/service.ts";
import { errorHandler } from "./src/shared/infrastructure/error-handler.ts";
import swaggerUi from "swagger-ui-express";
import { specs } from "./src/shared/infrastructure/swagger.ts";
import * as admin from "firebase-admin";
import { getApps, initializeApp } from "firebase-admin/app";
import { seedAuthorization } from "./src/modules/authorization/infrastructure/seeder.ts";
import { seedIAM } from "./src/modules/iam/infrastructure/seeder.ts";
import { seedNotifications } from "./src/modules/notifications/infrastructure/seeder.ts";
import { UserSyncService } from "./src/modules/iam/application/user-sync.service.ts";
import { orchestrator } from "./src/modules/orchestration/application/orchestration.service.ts";
import { notificationModule } from "./src/modules/notifications/index.ts";

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp();
}

async function startServer() {
  // Seed initial enterprise permissions and roles mapping
  try {
    await seedAuthorization();
    await seedIAM();
    await seedNotifications();
    
    // Sync users from Projects Database (Source of Truth)
    const syncService = new UserSyncService();
    await syncService.syncUsers();
  } catch (err) {
    console.error("Warning: Seeding initial permissions or users failed. Database may not be ready or migrating:", err);
  }

  // Initialize orchestration services sequentially
  try {
    await orchestrator.init();
    await notificationModule.init();
  } catch (err) {
    console.error("Warning: Orchestrator or Notification initialization failed:", err);
  }

  const app = express();
  app.set("trust proxy", 1);
  const PORT = 3000;
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" }
  });

  const chatService = new ChatService();

  // Socket logic
  io.on("connection", (socket) => {
    socket.on("join-project", (projectId) => {
      socket.join(projectId);
    });

    socket.on("send-chat-message", async (data) => {
      try {
        const savedMessage = await chatService.sendMessage(data);
        io.to(data.projectId).emit("receive-chat-message", savedMessage);
      } catch (err) {
        console.error("Chat error:", err);
      }
    });
  });

  // Body Parsing Middlewares
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Middleware to automatically sync state from PostgreSQL before handling queries
  const syncDbMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      await syncStateFromPostgres();
    } catch (err) {
      console.error("Middleware failed to sync project-tracker state:", err);
    }
    next();
  };

  // Existing Platform APIs (Mocks of Lifecycle Module)
  app.get("/api/projects", syncDbMiddleware, (req, res) => {
    // Return projects which correspond to the pre-existing Lifecycle platform module
    res.json({
      success: true,
      message: "Projects loaded from Lifecycle Management Module",
      data: dbState.projects.filter(p => !p.deletedAt)
    });
  });

  // Mount the Enterprise Project Execution Tracker Module
  app.use("/api/project-tracker", syncDbMiddleware, trackerRouter);

  // Apply Version Negotiation and Deprecation Middleware
  app.use("/api/v1", versionNegotiationMiddleware, v1Router);
  app.use("/api/v2", v2Router);

  // Swagger Documentation
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

  // Health Check Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Serve uploaded governance artifacts
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Setup Vite Dev Server / Static Ingress Fallbacks
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with dynamic Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode with static file deliveries...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Error Handler (Must be after all routes)
  app.use(errorHandler);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Enterprise Platform Service successfully bound on port ${PORT}`);
    console.log(`Local url: http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server bootstrap failure:", err);
  process.exit(1);
});
