import { Request, Response, NextFunction } from "express";
import { sendError } from "./response.ts";
import { dbState, saveDatabase, generateUUID } from "../db.ts";

export interface MockAuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

/**
 * Enterprise Authentication Simulation Middleware
 * Reads from Authorization headers if provided, or injects a default Enterprise user (Alex Rivera)
 * to allow instant preview capability in the sandbox.
 */
export const requireAuth = (req: MockAuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    // Mimic checking real tokens
    if (token === "token-sarah") {
      req.user = { id: "usr-sarah", name: "Sarah Chen", email: "sarah.chen@enterprise.com", role: "DEVELOPER" };
    } else if (token === "token-elena") {
      req.user = { id: "usr-elena", name: "Elena Rostova", email: "elena.rostova@enterprise.com", role: "LEAD" };
    } else {
      req.user = { id: "usr-alex", name: "Alex Rivera", email: "alex.rivera@enterprise.com", role: "ADMIN" };
    }
  } else {
    // Inject Default Sandbox Admin to ensure zero-config functionality in AI Studio preview
    req.user = {
      id: "usr-alex",
      name: "Alex Rivera",
      email: "alex.rivera@enterprise.com",
      role: "ADMIN"
    };
  }
  
  next();
};

/**
 * Role-Based Access Control (RBAC) Verification Middleware
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: MockAuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, "Access Denied: Authentication required", [], 401);
    }
    
    // Admin bypass
    if (req.user.role === "ADMIN") {
      return next();
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, `Access Denied: Required role [${allowedRoles.join(", ")}] not possessed`, [], 403);
    }
    
    next();
  };
};

/**
 * Auto-Audit Logging Middleware
 * Captures all POST, PATCH, PUT, and DELETE operations, automatically generating highly structured
 * audit logs which are instantly appended to our database audit registry.
 */
export const auditLogger = (entityType: string) => {
  return (req: MockAuthRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    // Intercept response to write audit log ONLY on success
    res.send = function (body): any {
      const statusCode = res.statusCode;
      
      if (statusCode >= 200 && statusCode < 300 && ["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
        try {
          const user = req.user || { id: "usr-anonymous", name: "System User" };
          let parsedBody = typeof body === "string" ? JSON.parse(body) : body;
          
          let entityId = "N/A";
          if (parsedBody && parsedBody.data && parsedBody.data.id) {
            entityId = parsedBody.data.id;
          } else if (req.params.id) {
            entityId = req.params.id;
          }
          
          let action = "UPDATE";
          if (req.method === "POST") action = "CREATE";
          if (req.method === "DELETE") action = "DELETE";
          
          const details = `${action} performed on ${entityType} ID: ${entityId} by ${user.name}. Data: ${JSON.stringify(req.body)}`;
          
          // Construct Enterprise Audit Log record
          const logEntry = {
            id: generateUUID(),
            projectId: req.body.projectId || req.query.projectId || req.params.projectId || dbState.projects[0].id,
            userId: user.id,
            userName: user.name,
            action,
            entityType,
            entityId,
            details,
            timestamp: new Date().toISOString()
          };
          
          dbState.auditLogs.unshift(logEntry);
          saveDatabase();
        } catch (err) {
          console.error("Failed to generate audit log entry:", err);
        }
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  };
};
