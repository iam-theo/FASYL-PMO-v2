import { Request, Response } from "express";
import { orchestrator } from "../application/orchestration.service.ts";
import logger from "../../../shared/infrastructure/logger.ts";

export class OrchestrationController {
  
  // 1. Dashboard Engine
  public getExecutiveDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await orchestrator.dashboardEngine.getExecutiveDashboard();
      res.json({ success: true, data });
    } catch (err: any) {
      logger.error({ err }, "Controller failed to fetch executive dashboard");
      res.status(500).json({ success: false, error: err.message });
    }
  };

  // 2. Analytics Engine
  public getAnalyticsMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await orchestrator.analyticsEngine.getAnalyticsMetrics();
      res.json({ success: true, data });
    } catch (err: any) {
      logger.error({ err }, "Controller failed to fetch analytics metrics");
      res.status(500).json({ success: false, error: err.message });
    }
  };

  // 3. Observability & Health
  public getSystemHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await orchestrator.observability.getSystemHealth();
      res.json({ success: true, data });
    } catch (err: any) {
      logger.error({ err }, "Controller failed to check system health");
      res.status(500).json({ success: false, error: err.message });
    }
  };

  // 4. Configuration Center
  public getConfigs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { category } = req.query;
      if (category) {
        const data = await orchestrator.configCenter.getByCategory(String(category));
        res.json({ success: true, data });
      } else {
        res.json({ success: true, message: "Please specify a config category as a query parameter (e.g. SLA, NOTIFICATION, FEATURE_FLAGS)." });
      }
    } catch (err: any) {
      logger.error({ err }, "Controller failed to fetch configs");
      res.status(500).json({ success: false, error: err.message });
    }
  };

  public updateConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const { key, value, category, actorId } = req.body;
      if (!key || value === undefined || !category || !actorId) {
        res.status(400).json({ success: false, error: "Missing key, value, category or actorId in body" });
        return;
      }
      await orchestrator.configCenter.set(key, value, category, actorId);
      res.json({ success: true, message: `Config key '${key}' updated successfully.` });
    } catch (err: any) {
      logger.error({ err }, "Controller failed to update config");
      res.status(500).json({ success: false, error: err.message });
    }
  };

  public bulkUpdateConfigs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { configs, actorId } = req.body;
      if (!configs || !Array.isArray(configs) || !actorId) {
        res.status(400).json({ success: false, error: "Missing configs array or actorId in body" });
        return;
      }
      for (const cfg of configs) {
        const { key, value, category } = cfg;
        if (!key || value === undefined || !category) {
          res.status(400).json({ success: false, error: "Each config must contain key, value, and category" });
          return;
        }
        await orchestrator.configCenter.set(key, value, category, actorId);
      }
      res.json({ success: true, message: `Successfully bulk updated ${configs.length} configurations.` });
    } catch (err: any) {
      logger.error({ err }, "Controller failed to bulk update configs");
      res.status(500).json({ success: false, error: err.message });
    }
  };

  // 5. Integration Hub
  public getIntegrations = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await orchestrator.integrationHub.getConnectors();
      res.json({ success: true, data });
    } catch (err: any) {
      logger.error({ err }, "Controller failed to fetch integrations list");
      res.status(500).json({ success: false, error: err.message });
    }
  };

  public toggleIntegration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, isEnabled } = req.body;
      if (!name || isEnabled === undefined) {
        res.status(400).json({ success: false, error: "Missing name or isEnabled state in body" });
        return;
      }
      const data = await orchestrator.integrationHub.toggleConnector(name, isEnabled);
      res.json({ success: true, data });
    } catch (err: any) {
      logger.error({ err }, "Controller failed to toggle integration state");
      res.status(500).json({ success: false, error: err.message });
    }
  };

  public syncEntity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { connectorName, entityType, payload } = req.body;
      if (!connectorName || !entityType || !payload) {
        res.status(400).json({ success: false, error: "Missing connectorName, entityType, or payload in body" });
        return;
      }
      const data = await orchestrator.integrationHub.syncEntity(connectorName, entityType, payload);
      res.json({ success: true, data });
    } catch (err: any) {
      logger.error({ err }, "Controller failed to sync integration entity");
      res.status(500).json({ success: false, error: err.message });
    }
  };

  // 6. Scheduler & Job Center Queue
  public listActiveJobs = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await orchestrator.scheduler.listActiveJobs();
      res.json({ success: true, data });
    } catch (err: any) {
      logger.error({ err }, "Controller failed to list active background tasks");
      res.status(500).json({ success: false, error: err.message });
    }
  };

  public triggerManualJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, payload, priority, maxRetries } = req.body;
      if (!name || !payload) {
        res.status(400).json({ success: false, error: "Missing name or payload in request body" });
        return;
      }
      const data = await orchestrator.scheduler.scheduleJob(name, payload, { priority, maxRetries });
      res.json({ success: true, message: "Manual job scheduled in queue successfully.", data });
    } catch (err: any) {
      logger.error({ err }, "Controller failed to trigger manual job");
      res.status(500).json({ success: false, error: err.message });
    }
  };

  // 7. Event Registry
  public getEventCatalog = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await orchestrator.eventRegistry.getEventCatalog();
      res.json({ success: true, data });
    } catch (err: any) {
      logger.error({ err }, "Controller failed to get event catalog");
      res.status(500).json({ success: false, error: err.message });
    }
  };

  // 8. Audit Ledger logs
  public getAuditLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { actorId, moduleName, action, search, sortField, sortOrder, limit, offset } = req.query;
      const data = await orchestrator.auditCenter.getLogs({
        actorId: actorId ? String(actorId) : undefined,
        moduleName: moduleName ? String(moduleName) : undefined,
        action: action ? String(action) : undefined,
        search: search ? String(search) : undefined,
        sortField: sortField ? String(sortField) : undefined,
        sortOrder: sortOrder ? (String(sortOrder) as "ASC" | "DESC") : undefined,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });
      res.json({ success: true, data });
    } catch (err: any) {
      logger.error({ err }, "Controller failed to fetch audit ledger logs");
      res.status(500).json({ success: false, error: err.message });
    }
  };

  // 9. Universal Timeline
  public getProjectTimeline = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      if (!projectId) {
        res.status(400).json({ success: false, error: "Missing projectId parameter" });
        return;
      }
      const data = await orchestrator.timelineEngine.getTimeline(projectId);
      res.json({ success: true, data });
    } catch (err: any) {
      logger.error({ err }, "Controller failed to fetch project timeline stream");
      res.status(500).json({ success: false, error: err.message });
    }
  };

  // 10. Smart AI Gateway
  public generateAiText = async (req: Request, res: Response): Promise<void> => {
    try {
      const { prompt, cacheKey } = req.body;
      if (!prompt) {
        res.status(400).json({ success: false, error: "Missing prompt parameter in request body" });
        return;
      }
      const data = await orchestrator.aiOrchestration.generateText(prompt, cacheKey);
      res.json({ success: true, data });
    } catch (err: any) {
      logger.error({ err }, "Controller failed to call AI Gateway generator");
      res.status(500).json({ success: false, error: err.message });
    }
  };

  // 11. System Administration & Maintenance
  public getSystemSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await orchestrator.systemAdmin.getSettings();
      res.json({ success: true, data });
    } catch (err: any) {
      logger.error({ err }, "Controller failed to fetch system administration settings");
      res.status(500).json({ success: false, error: err.message });
    }
  };

  public toggleMaintenanceMode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { maintenanceMode } = req.body;
      if (maintenanceMode === undefined) {
        res.status(400).json({ success: false, error: "Missing maintenanceMode in body" });
        return;
      }
      const data = await orchestrator.systemAdmin.toggleMaintenanceMode(maintenanceMode);
      res.json({ success: true, message: `System Maintenance Mode updated to: ${maintenanceMode}`, data });
    } catch (err: any) {
      logger.error({ err }, "Controller failed to toggle maintenance mode flag");
      res.status(500).json({ success: false, error: err.message });
    }
  };
}
