import { Request, Response, NextFunction } from "express";
import { ProgramService } from "../application/program.service.ts";
import { ResourceService } from "../application/resource.service.ts";
import { FinanceService } from "../application/finance.service.ts";
import { BaselineService } from "../application/baseline.service.ts";
import { ChangeService } from "../application/change.service.ts";
import { TemplateService } from "../application/template.service.ts";
import { KPIHealthService } from "../application/kpi-health.service.ts";
import { AIService } from "../application/ai.service.ts";
import { LifecycleService } from "../application/lifecycle.service.ts";
import { ResponseFormatter, StatusCode } from "../../../shared/infrastructure/response.ts";

export class EnterpriseController {
  private readonly programService = new ProgramService();
  private readonly resourceService = new ResourceService();
  private readonly financeService = new FinanceService();
  private readonly baselineService = new BaselineService();
  private readonly changeService = new ChangeService();
  private readonly templateService = new TemplateService();
  private readonly kpiHealthService = new KPIHealthService();
  private readonly aiService = new AIService();
  private readonly lifecycleService = new LifecycleService();

  // --- SIMULATION TESTS ---
  runSimulationTests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { executeEnterpriseTests } = await import("../tests/run-enterprise-tests.ts");
      const result = await executeEnterpriseTests();
      
      const { executeOrchestrationTests } = await import("../../orchestration/tests/run-orchestration-tests.ts");
      const orchResult = await executeOrchestrationTests();

      return ResponseFormatter.success(
        res,
        { enterpriseResult: result, orchestrationResult: orchResult },
        "Enterprise & Orchestration (EPOL) simulation tests completed successfully"
      );
    } catch (err) {
      next(err);
    }
  };

  // --- PROGRAMS ---
  createProgram = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const program = await this.programService.createProgram(actorId, req.body);
      return ResponseFormatter.success(res, program, "Program created successfully", StatusCode.CREATED);
    } catch (err) {
      next(err);
    }
  };

  updateProgram = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const program = await this.programService.updateProgram(actorId, req.params.id, req.body);
      return ResponseFormatter.success(res, program, "Program updated successfully");
    } catch (err) {
      next(err);
    }
  };

  archiveProgram = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const program = await this.programService.archiveProgram(actorId, req.params.id);
      return ResponseFormatter.success(res, program, "Program archived successfully");
    } catch (err) {
      next(err);
    }
  };

  getProgram = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const program = await this.programService.getProgram(req.params.id);
      return ResponseFormatter.success(res, program);
    } catch (err) {
      next(err);
    }
  };

  listPrograms = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const portfolioId = req.query.portfolioId as string | undefined;
      const programs = await this.programService.listPrograms(portfolioId);
      return ResponseFormatter.success(res, programs);
    } catch (err) {
      next(err);
    }
  };

  getProgramDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dashboard = await this.programService.getProgramDashboard(req.params.id);
      return ResponseFormatter.success(res, dashboard);
    } catch (err) {
      next(err);
    }
  };

  // --- RESOURCES & ALLOCATION ---
  createResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const resource = await this.resourceService.createResource(actorId, req.body);
      return ResponseFormatter.success(res, resource, "Resource created successfully", StatusCode.CREATED);
    } catch (err) {
      next(err);
    }
  };

  getResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resource = await this.resourceService.getResource(req.params.id);
      return ResponseFormatter.success(res, resource);
    } catch (err) {
      next(err);
    }
  };

  listResources = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const department = req.query.department as string | undefined;
      const resourcesList = await this.resourceService.listResources(department);
      return ResponseFormatter.success(res, resourcesList);
    } catch (err) {
      next(err);
    }
  };

  addResourceSkill = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const skill = await this.resourceService.addResourceSkill(actorId, req.params.id, req.body);
      return ResponseFormatter.success(res, skill, "Skill added to resource", StatusCode.CREATED);
    } catch (err) {
      next(err);
    }
  };

  addResourceCertification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const cert = await this.resourceService.addResourceCertification(actorId, req.params.id, req.body);
      return ResponseFormatter.success(res, cert, "Certification added to resource", StatusCode.CREATED);
    } catch (err) {
      next(err);
    }
  };

  addCalendarEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      // resourceId in path, or null if company holiday
      const resourceId = req.params.id === "company" ? null : req.params.id;
      const event = await this.resourceService.addCalendarEvent(actorId, resourceId, req.body);
      return ResponseFormatter.success(res, event, "Calendar event logged successfully", StatusCode.CREATED);
    } catch (err) {
      next(err);
    }
  };

  allocateResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const allocation = await this.resourceService.allocateResource(actorId, req.body);
      return ResponseFormatter.success(res, allocation, "Resource allocated successfully", StatusCode.CREATED);
    } catch (err) {
      next(err);
    }
  };

  releaseResource = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const result = await this.resourceService.releaseResource(actorId, req.params.id);
      return ResponseFormatter.success(res, result, "Resource allocation released successfully");
    } catch (err) {
      next(err);
    }
  };

  // --- CAPACITY PLANNING ---
  setDepartmentCapacity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const capacity = await this.resourceService.setDepartmentCapacity(actorId, req.body);
      return ResponseFormatter.success(res, capacity, "Department capacity set successfully");
    } catch (err) {
      next(err);
    }
  };

  getCapacityDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dashboard = await this.resourceService.getCapacityDashboard();
      return ResponseFormatter.success(res, dashboard);
    } catch (err) {
      next(err);
    }
  };

  // --- PROJECT FINANCE & EVM ---
  createCostCenter = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const cc = await this.financeService.createCostCenter(actorId, req.body);
      return ResponseFormatter.success(res, cc, "Cost center created successfully", StatusCode.CREATED);
    } catch (err) {
      next(err);
    }
  };

  listCostCenters = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const centers = await this.financeService.listCostCenters();
      return ResponseFormatter.success(res, centers);
    } catch (err) {
      next(err);
    }
  };

  createExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const expense = await this.financeService.createExpense(actorId, req.body);
      return ResponseFormatter.success(res, expense, "Expense submitted successfully", StatusCode.CREATED);
    } catch (err) {
      next(err);
    }
  };

  approveExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const result = await this.financeService.approveExpense(actorId, req.params.id, req.body.status);
      return ResponseFormatter.success(res, result, `Expense ${req.body.status.toLowerCase()} successfully`);
    } catch (err) {
      next(err);
    }
  };

  getProjectExpenses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const expenses = await this.financeService.getProjectExpenses(req.params.id);
      return ResponseFormatter.success(res, expenses);
    } catch (err) {
      next(err);
    }
  };

  calculateProjectEVM = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const evm = await this.financeService.calculateProjectEVM(actorId, req.params.id);
      return ResponseFormatter.success(res, evm, "EVM metrics calculated successfully");
    } catch (err) {
      next(err);
    }
  };

  getEVMSnapshots = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const snapshots = await this.financeService.getEVMSnapshots(req.params.id);
      return ResponseFormatter.success(res, snapshots);
    } catch (err) {
      next(err);
    }
  };

  // --- BASELINES ---
  createBaseline = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const baseline = await this.baselineService.createBaseline(actorId, req.params.id, req.body.name, req.body.description);
      return ResponseFormatter.success(res, baseline, "Baseline created successfully", StatusCode.CREATED);
    } catch (err) {
      next(err);
    }
  };

  getBaselines = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const baselines = await this.baselineService.getBaselines(req.params.id);
      return ResponseFormatter.success(res, baselines);
    } catch (err) {
      next(err);
    }
  };

  compareBaseline = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const comparison = await this.baselineService.compareBaseline(req.params.projectId, req.params.baselineId);
      return ResponseFormatter.success(res, comparison);
    } catch (err) {
      next(err);
    }
  };

  // --- CHANGE MANAGEMENT ---
  createChangeRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const cr = await this.changeService.createChangeRequest(actorId, req.body);
      return ResponseFormatter.success(res, cr, "Change request submitted successfully", StatusCode.CREATED);
    } catch (err) {
      next(err);
    }
  };

  reviewChangeRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const cr = await this.changeService.reviewChangeRequest(actorId, req.params.id, req.body.status);
      return ResponseFormatter.success(res, cr, `Change request reviewed with status: ${req.body.status}`);
    } catch (err) {
      next(err);
    }
  };

  listChangeRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const requests = await this.changeService.listChangeRequests(projectId);
      return ResponseFormatter.success(res, requests);
    } catch (err) {
      next(err);
    }
  };

  // --- TEMPLATES ---
  createTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const tmpl = await this.templateService.createTemplate(actorId, req.body);
      return ResponseFormatter.success(res, tmpl, "Project template created successfully", StatusCode.CREATED);
    } catch (err) {
      next(err);
    }
  };

  listTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const templates = await this.templateService.listTemplates();
      return ResponseFormatter.success(res, templates);
    } catch (err) {
      next(err);
    }
  };

  instantiateProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const project = await this.templateService.instantiateProject(actorId, req.params.id, req.body);
      return ResponseFormatter.success(res, project, "Project instantiated from template successfully", StatusCode.CREATED);
    } catch (err) {
      next(err);
    }
  };

  // --- HEALTH & KPIs ---
  recalculateProjectHealth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const health = await this.kpiHealthService.recalculateProjectHealth(actorId, req.params.id);
      return ResponseFormatter.success(res, health, "Project health score updated successfully");
    } catch (err) {
      next(err);
    }
  };

  getEnterpriseKPIs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const kpis = await this.kpiHealthService.getEnterpriseKPIs();
      return ResponseFormatter.success(res, kpis);
    } catch (err) {
      next(err);
    }
  };

  // --- AI INTEGRATIONS ---
  analyzePortfolioHealth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const analysis = await this.aiService.analyzePortfolioHealth(req.params.id);
      return ResponseFormatter.success(res, analysis);
    } catch (err) {
      next(err);
    }
  };

  predictProjectDelay = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const prediction = await this.aiService.predictProjectDelay(req.params.id);
      return ResponseFormatter.success(res, prediction);
    } catch (err) {
      next(err);
    }
  };

  forecastBudgetOverrun = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const forecast = await this.aiService.forecastBudgetOverrun(req.params.id);
      return ResponseFormatter.success(res, forecast);
    } catch (err) {
      next(err);
    }
  };

  recommendResourceAllocation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recommendation = await this.aiService.recommendResourceAllocation(req.params.id);
      return ResponseFormatter.success(res, recommendation);
    } catch (err) {
      next(err);
    }
  };

  detectRiskTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trends = await this.aiService.detectRiskTrends(req.params.id);
      return ResponseFormatter.success(res, trends);
    } catch (err) {
      next(err);
    }
  };

  generateWeeklyPMOReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await this.aiService.generateWeeklyPMOReport();
      return ResponseFormatter.success(res, report);
    } catch (err) {
      next(err);
    }
  };

  // --- STAGE-GATE GOVERNANCE (PLGS) ENDPOINTS ---

  getTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const templates = await this.lifecycleService.getTemplates();
      return ResponseFormatter.success(res, templates, "Templates fetched successfully");
    } catch (err) {
      next(err);
    }
  };

  getTemplateById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await this.lifecycleService.getTemplateById(req.params.templateId);
      return ResponseFormatter.success(res, template, "Template fetched successfully");
    } catch (err) {
      next(err);
    }
  };

  updateTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.lifecycleService.updateTemplate(req.params.templateId, req.body);
      return ResponseFormatter.success(res, result, "Template updated successfully");
    } catch (err) {
      next(err);
    }
  };

  seedDefaultLifecycleTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.lifecycleService.seedDefaultTemplate();
      return ResponseFormatter.success(res, result, "Default governance template seeded successfully");
    } catch (err) {
      next(err);
    }
  };

  createLifecycleInstance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const { projectId, templateId } = req.body;
      const instance = await this.lifecycleService.createInstance(actorId, projectId, templateId);
      return ResponseFormatter.success(res, instance, "Project lifecycle governance instance created successfully", StatusCode.CREATED);
    } catch (err) {
      next(err);
    }
  };

  getLifecycleInstance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const instance = await this.lifecycleService.getInstance(req.params.projectId);
      return ResponseFormatter.success(res, instance);
    } catch (err) {
      next(err);
    }
  };

  uploadLifecycleDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const { instanceId, stageDocumentId } = req.params;
      
      if (!req.file) {
        throw new Error("No file uploaded");
      }

      const fileData = {
        fileName: req.file.originalname,
        tempPath: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size
      };
      
      const doc = await this.lifecycleService.processUploadedDocument(actorId, instanceId, stageDocumentId, fileData);
      return ResponseFormatter.success(res, doc, "Document uploaded and processed successfully", StatusCode.CREATED);
    } catch (err) {
      next(err);
    }
  };

  verifyLifecycleDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const { documentVersionId } = req.params;
      const { status, notes } = req.body;
      const updated = await this.lifecycleService.verifyDocument(actorId, documentVersionId, status, notes);
      return ResponseFormatter.success(res, updated, `Document verification recorded as ${status.toLowerCase()}`);
    } catch (err) {
      next(err);
    }
  };

  completeLifecycleChecklist = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const { instanceId, checklistId } = req.params;
      const { isCompleted, notes } = req.body;
      const updated = await this.lifecycleService.completeChecklistItem(actorId, instanceId, checklistId, isCompleted, notes);
      return ResponseFormatter.success(res, updated, "Checklist item progress saved successfully");
    } catch (err) {
      next(err);
    }
  };

  submitStageApprovalRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const { instanceId, stageId } = req.params;
      const { role, status, comments, digitalSignature } = req.body;
      const updated = await this.lifecycleService.submitStageApproval(actorId, instanceId, stageId, role, status, comments, digitalSignature);
      return ResponseFormatter.success(res, updated, "Role-based approval response saved successfully");
    } catch (err) {
      next(err);
    }
  };

  submitHeadOfOperationsReviewGate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const { instanceId, stageId } = req.params;
      const { status, comments, rejectedChecklistItemsJson, rejectedDocumentsJson, resubmissionDueDate, digitalSignature } = req.body;
      const review = await this.lifecycleService.submitHeadOfOperationsReview(actorId, instanceId, stageId, status, {
        comments,
        rejectedChecklistItemsJson,
        rejectedDocumentsJson,
        resubmissionDueDate,
        digitalSignature,
      });
      return ResponseFormatter.success(res, review, `Head of Operations Review recorded with status: ${status}`);
    } catch (err) {
      next(err);
    }
  };

  submitLifecycleForReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const { instanceId } = req.params;
      const instance = await this.lifecycleService.submitStageForReview(actorId, instanceId);
      return ResponseFormatter.success(res, instance, "Stage submitted for review");
    } catch (err) {
      next(err);
    }
  };

  reviewLifecycleStageGate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const { instanceId } = req.params;
      const { decision, comments } = req.body;
      const instance = await this.lifecycleService.reviewStageGate(actorId, instanceId, decision, comments);
      return ResponseFormatter.success(res, instance, `Stage gate review completed: ${decision}`);
    } catch (err) {
      next(err);
    }
  };

  getLifecycleReadinessStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { instanceId, stageId } = req.params;
      const readiness = await this.lifecycleService.validateStageReadiness(instanceId, stageId);
      return ResponseFormatter.success(res, readiness);
    } catch (err) {
      next(err);
    }
  };

  getStageSLAPerformance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { instanceId, stageId } = req.params;
      const details = await this.lifecycleService.getStageSLADetails(instanceId, stageId);
      return ResponseFormatter.success(res, details);
    } catch (err) {
      next(err);
    }
  };

  getGovernanceDashboardMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await this.lifecycleService.getGovernanceDashboard();
      return ResponseFormatter.success(res, metrics);
    } catch (err) {
      next(err);
    }
  };

  runSLACronJobsSimulation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.lifecycleService.runSLAChronChecks();
      return ResponseFormatter.success(res, result, "Governance SLA and schedule background cron execution completed successfully");
    } catch (err) {
      next(err);
    }
  };

  addLifecycleCommentMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = (req as any).user?.uid || "system-admin-uid";
      const { instanceId, stageId } = req.params;
      const { content, parentCommentId } = req.body;
      const comment = await this.lifecycleService.addComment(actorId, instanceId, stageId, content, parentCommentId);
      return ResponseFormatter.success(res, comment, "Comment added successfully", StatusCode.CREATED);
    } catch (err) {
      next(err);
    }
  };
}
