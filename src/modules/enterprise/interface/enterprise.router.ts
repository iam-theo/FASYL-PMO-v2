import { Router } from "express";
import { EnterpriseController } from "./enterprise.controller.ts";

const router = Router();
const controller = new EnterpriseController();

// --- SIMULATION TESTS ---
/**
 * @swagger
 * /enterprise/run-tests:
 *   post:
 *     summary: Run simulation tests
 *     tags: [Enterprise]
 *     responses:
 *       200:
 *         description: Simulation completed
 */
router.post("/run-tests", controller.runSimulationTests);

// --- PROGRAMS ---
/**
 * @swagger
 * /enterprise/programs:
 *   post:
 *     summary: Create program
 *     tags: [Enterprise]
 *     responses:
 *       201:
 *         description: Created program
 */
router.post("/programs", controller.createProgram);

/**
 * @swagger
 * /enterprise/programs/{id}:
 *   patch:
 *     summary: Update program
 *     tags: [Enterprise]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated program
 */
router.patch("/programs/:id", controller.updateProgram);

/**
 * @swagger
 * /enterprise/programs/{id}:
 *   delete:
 *     summary: Archive program
 *     tags: [Enterprise]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Archived program
 */
router.delete("/programs/:id", controller.archiveProgram);

/**
 * @swagger
 * /enterprise/programs/{id}:
 *   get:
 *     summary: Get program
 *     tags: [Enterprise]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Program details
 */
router.get("/programs/:id", controller.getProgram);

/**
 * @swagger
 * /enterprise/programs:
 *   get:
 *     summary: List programs
 *     tags: [Enterprise]
 *     responses:
 *       200:
 *         description: List of programs
 */
router.get("/programs", controller.listPrograms);

/**
 * @swagger
 * /enterprise/programs/{id}/dashboard:
 *   get:
 *     summary: Get program dashboard
 *     tags: [Enterprise]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Program dashboard
 */
router.get("/programs/:id/dashboard", controller.getProgramDashboard);

// --- RESOURCES & ALLOCATION ---
/**
 * @swagger
 * /enterprise/resources:
 *   post:
 *     summary: Create resource
 *     tags: [Enterprise Resources]
 *     responses:
 *       201:
 *         description: Created resource
 */
router.post("/resources", controller.createResource);

/**
 * @swagger
 * /enterprise/resources/{id}:
 *   get:
 *     summary: Get resource
 *     tags: [Enterprise Resources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resource details
 */
router.get("/resources/:id", controller.getResource);

/**
 * @swagger
 * /enterprise/resources:
 *   get:
 *     summary: List resources
 *     tags: [Enterprise Resources]
 *     responses:
 *       200:
 *         description: List of resources
 */
router.get("/resources", controller.listResources);

/**
 * @swagger
 * /enterprise/resources/{id}/skills:
 *   post:
 *     summary: Add resource skill
 *     tags: [Enterprise Resources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Skill added
 */
router.post("/resources/:id/skills", controller.addResourceSkill);

/**
 * @swagger
 * /enterprise/resources/{id}/certifications:
 *   post:
 *     summary: Add resource certification
 *     tags: [Enterprise Resources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Certification added
 */
router.post("/resources/:id/certifications", controller.addResourceCertification);

/**
 * @swagger
 * /enterprise/resources/{id}/calendar:
 *   post:
 *     summary: Add calendar event
 *     tags: [Enterprise Resources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Event added
 */
router.post("/resources/:id/calendar", controller.addCalendarEvent);

/**
 * @swagger
 * /enterprise/resources/allocations:
 *   post:
 *     summary: Allocate resource
 *     tags: [Enterprise Resources]
 *     responses:
 *       201:
 *         description: Resource allocated
 */
router.post("/resources/allocations", controller.allocateResource);

/**
 * @swagger
 * /enterprise/resources/allocations/{id}:
 *   delete:
 *     summary: Release resource
 *     tags: [Enterprise Resources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resource released
 */
router.delete("/resources/allocations/:id", controller.releaseResource);

// --- CAPACITY PLANNING ---
/**
 * @swagger
 * /enterprise/resources/capacities:
 *   post:
 *     summary: Set department capacity
 *     tags: [Enterprise Capacity]
 *     responses:
 *       201:
 *         description: Capacity set
 */
router.post("/resources/capacities", controller.setDepartmentCapacity);

/**
 * @swagger
 * /enterprise/resources/capacities/dashboard:
 *   get:
 *     summary: Get capacity dashboard
 *     tags: [Enterprise Capacity]
 *     responses:
 *       200:
 *         description: Capacity dashboard
 */
router.get("/resources/capacities/dashboard", controller.getCapacityDashboard);

// --- FINANCIAL MANAGEMENT & EVM ---
/**
 * @swagger
 * /enterprise/finances/cost-centers:
 *   post:
 *     summary: Create cost center
 *     tags: [Enterprise Finances]
 *     responses:
 *       201:
 *         description: Cost center created
 */
router.post("/finances/cost-centers", controller.createCostCenter);

/**
 * @swagger
 * /enterprise/finances/cost-centers:
 *   get:
 *     summary: List cost centers
 *     tags: [Enterprise Finances]
 *     responses:
 *       200:
 *         description: List of cost centers
 */
router.get("/finances/cost-centers", controller.listCostCenters);

/**
 * @swagger
 * /enterprise/finances/expenses:
 *   post:
 *     summary: Create expense
 *     tags: [Enterprise Finances]
 *     responses:
 *       201:
 *         description: Expense created
 */
router.post("/finances/expenses", controller.createExpense);

/**
 * @swagger
 * /enterprise/finances/expenses/{id}/approve:
 *   patch:
 *     summary: Approve expense
 *     tags: [Enterprise Finances]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense approved
 */
router.patch("/finances/expenses/:id/approve", controller.approveExpense);

/**
 * @swagger
 * /enterprise/finances/projects/{id}/expenses:
 *   get:
 *     summary: Get project expenses
 *     tags: [Enterprise Finances]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project expenses
 */
router.get("/finances/projects/:id/expenses", controller.getProjectExpenses);

/**
 * @swagger
 * /enterprise/finances/projects/{id}/evm:
 *   post:
 *     summary: Calculate project EVM
 *     tags: [Enterprise Finances]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: EVM calculated
 */
router.post("/finances/projects/:id/evm", controller.calculateProjectEVM);

/**
 * @swagger
 * /enterprise/finances/projects/{id}/evm/snapshots:
 *   get:
 *     summary: Get EVM snapshots
 *     tags: [Enterprise Finances]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: EVM snapshots
 */
router.get("/finances/projects/:id/evm/snapshots", controller.getEVMSnapshots);

// --- BASELINES ---
/**
 * @swagger
 * /enterprise/baselines/projects/{id}:
 *   post:
 *     summary: Create baseline
 *     tags: [Enterprise Baselines]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Baseline created
 */
router.post("/baselines/projects/:id", controller.createBaseline);

/**
 * @swagger
 * /enterprise/baselines/projects/{id}:
 *   get:
 *     summary: Get baselines
 *     tags: [Enterprise Baselines]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Baselines
 */
router.get("/baselines/projects/:id", controller.getBaselines);

/**
 * @swagger
 * /enterprise/baselines/projects/{projectId}/compare/{baselineId}:
 *   get:
 *     summary: Compare baseline
 *     tags: [Enterprise Baselines]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: baselineId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Baseline comparison
 */
router.get("/baselines/projects/:projectId/compare/:baselineId", controller.compareBaseline);

// --- CHANGE MANAGEMENT ---
/**
 * @swagger
 * /enterprise/changes:
 *   post:
 *     summary: Create change request
 *     tags: [Enterprise Changes]
 *     responses:
 *       201:
 *         description: Change request created
 */
router.post("/changes", controller.createChangeRequest);

/**
 * @swagger
 * /enterprise/changes/{id}/review:
 *   patch:
 *     summary: Review change request
 *     tags: [Enterprise Changes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Change request reviewed
 */
router.patch("/changes/:id/review", controller.reviewChangeRequest);

/**
 * @swagger
 * /enterprise/changes:
 *   get:
 *     summary: List change requests
 *     tags: [Enterprise Changes]
 *     responses:
 *       200:
 *         description: Change requests
 */
router.get("/changes", controller.listChangeRequests);

// --- PROJECT TEMPLATES ---
/**
 * @swagger
 * /enterprise/templates:
 *   post:
 *     summary: Create template
 *     tags: [Enterprise Templates]
 *     responses:
 *       201:
 *         description: Template created
 */
router.post("/templates", controller.createTemplate);

/**
 * @swagger
 * /enterprise/templates:
 *   get:
 *     summary: List templates
 *     tags: [Enterprise Templates]
 *     responses:
 *       200:
 *         description: Templates
 */
router.get("/templates", controller.listTemplates);

/**
 * @swagger
 * /enterprise/templates/{id}/instantiate:
 *   post:
 *     summary: Instantiate project
 *     tags: [Enterprise Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Project instantiated
 */
router.post("/templates/:id/instantiate", controller.instantiateProject);

// --- HEALTH & KPI ENGINE ---
/**
 * @swagger
 * /enterprise/health/projects/{id}/recalculate:
 *   post:
 *     summary: Recalculate project health
 *     tags: [Enterprise Health]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project health recalculated
 */
router.post("/health/projects/:id/recalculate", controller.recalculateProjectHealth);

/**
 * @swagger
 * /enterprise/kpis/enterprise:
 *   get:
 *     summary: Get enterprise KPIs
 *     tags: [Enterprise Health]
 *     responses:
 *       200:
 *         description: Enterprise KPIs
 */
router.get("/kpis/enterprise", controller.getEnterpriseKPIs);

// --- AI COPILOT EXTENSIONS ---
/**
 * @swagger
 * /enterprise/ai/portfolios/{id}/health:
 *   get:
 *     summary: Analyze portfolio health
 *     tags: [Enterprise AI Copilot]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Portfolio health analysis
 */
router.get("/ai/portfolios/:id/health", controller.analyzePortfolioHealth);

/**
 * @swagger
 * /enterprise/ai/projects/{id}/delay-prediction:
 *   get:
 *     summary: Predict project delay
 *     tags: [Enterprise AI Copilot]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Delay prediction
 */
router.get("/ai/projects/:id/delay-prediction", controller.predictProjectDelay);

/**
 * @swagger
 * /enterprise/ai/projects/{id}/budget-forecast:
 *   get:
 *     summary: Forecast budget overrun
 *     tags: [Enterprise AI Copilot]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Budget forecast
 */
router.get("/ai/projects/:id/budget-forecast", controller.forecastBudgetOverrun);

/**
 * @swagger
 * /enterprise/ai/projects/{id}/resource-recommendation:
 *   get:
 *     summary: Recommend resource allocation
 *     tags: [Enterprise AI Copilot]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resource recommendation
 */
router.get("/ai/projects/:id/resource-recommendation", controller.recommendResourceAllocation);

/**
 * @swagger
 * /enterprise/ai/projects/{id}/risk-trends:
 *   get:
 *     summary: Detect risk trends
 *     tags: [Enterprise AI Copilot]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Risk trends
 */
router.get("/ai/projects/:id/risk-trends", controller.detectRiskTrends);

/**
 * @swagger
 * /enterprise/ai/pmo/weekly-report:
 *   get:
 *     summary: Generate weekly PMO report
 *     tags: [Enterprise AI Copilot]
 *     responses:
 *       200:
 *         description: Weekly PMO report
 */
router.get("/ai/pmo/weekly-report", controller.generateWeeklyPMOReport);

export default router;
