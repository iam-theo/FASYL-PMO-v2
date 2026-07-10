import { eq, and, asc, desc, sql } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import fs from "fs";
import path from "path";
import {
  projects,
  lifecycleTemplates,
  lifecycleVersions,
  lifecycleStages,
  lifecycleInstances,
  stageDocuments,
  documentVersions,
  documentVerifications,
  stageChecklists,
  checklistResponses,
  stageApprovals,
  headOfOperationsReviews,
  lifecycleHistory,
  lifecycleNotifications,
  lifecycleEscalations,
  lifecycleSLAs,
  lifecycleComments,
  lifecycleDecisions,
  lifecycleAuditLogs,
  reminderQueue,
  escalationQueue,
  schedulerJobs
} from "../../../db/schema.ts";
import { NotFoundError, ValidationError } from "../../../shared/infrastructure/errors.ts";
import { AuditLogger } from "../../../shared/infrastructure/audit-logger.ts";
import { eventBus } from "../../../shared/domain/event-bus.ts";

export class LifecycleService {

  async getTemplates(): Promise<any[]> {
    const templates = await db.select().from(lifecycleTemplates);
    return templates;
  }

  async getTemplateById(templateId: string): Promise<any> {
    const [template] = await db.select().from(lifecycleTemplates).where(eq(lifecycleTemplates.id, templateId)).limit(1);
    if (!template) throw new NotFoundError("Template");
    const stages = await db.select().from(lifecycleStages).where(eq(lifecycleStages.templateId, templateId)).orderBy(asc(lifecycleStages.stageNumber));
    for (let stage of stages) {
      const checklists = await db.select().from(stageChecklists).where(eq(stageChecklists.stageId, stage.id)).orderBy(asc(stageChecklists.displayOrder));
      const documents = await db.select().from(stageDocuments).where(eq(stageDocuments.stageId, stage.id));
      
      try {
        (stage as any).approverRoles = stage.approverRoles ? JSON.parse(stage.approverRoles) : [];
      } catch (e) {
        (stage as any).approverRoles = [];
      }

      try {
        (stage as any).requiredPermissions = stage.requiredPermissions ? JSON.parse(stage.requiredPermissions) : [];
      } catch (e) {
        (stage as any).requiredPermissions = [];
      }

      (stage as any).checklists = checklists;
      (stage as any).documents = documents;
    }
    return { ...template, stages };
  }

  async updateTemplate(templateId: string, payload: any): Promise<any> {
    const { name, description, stages } = payload;
    await db.update(lifecycleTemplates).set({ name, description, updatedAt: new Date() }).where(eq(lifecycleTemplates.id, templateId));
    
    // For simplicity, if stages are passed, we just update them. We will handle updates.
    // However, it's easier to implement this in a transaction or individual endpoints.
    // I will add a method that updates stage details.
    if (stages && Array.isArray(stages)) {
       for (const stage of stages) {
         if (stage.id) {
           await db.update(lifecycleStages).set({
             name: stage.name,
             description: stage.description,
             businessObjective: stage.businessObjective,
             ownerRole: stage.ownerRole,
             approverRoles: JSON.stringify(stage.approverRoles || []),
           }).where(eq(lifecycleStages.id, stage.id));
           
           // Update checklists
           if (stage.checklists) {
              for (const cl of stage.checklists) {
                if (cl.id && cl.id !== 'new') {
                  await db.update(stageChecklists).set({ itemText: cl.itemText, isMandatory: cl.isMandatory }).where(eq(stageChecklists.id, cl.id));
                } else {
                  await db.insert(stageChecklists).values({ stageId: stage.id, itemText: cl.itemText, isMandatory: cl.isMandatory });
                }
              }
           }
           
           // Update documents
           if (stage.documents) {
              for (const doc of stage.documents) {
                if (doc.id && doc.id !== 'new') {
                   await db.update(stageDocuments).set({ name: doc.name, category: doc.category, isMandatory: doc.isMandatory, description: doc.description }).where(eq(stageDocuments.id, doc.id));
                } else {
                   await db.insert(stageDocuments).values({ stageId: stage.id, name: doc.name, category: doc.category, isMandatory: doc.isMandatory, description: doc.description });
                }
              }
           }
         }
       }
    }
    
    return this.getTemplateById(templateId);
  }

  // 1. SEED DEFAULT GOVERNANCE LIFECYCLE TEMPLATE
  async seedDefaultTemplate(): Promise<any> {
    const [existing] = await db
      .select()
      .from(lifecycleTemplates)
      .where(eq(lifecycleTemplates.name, "AuraPM Standard Governance Lifecycle"))
      .limit(1);

    if (existing) {
      return { message: "Default lifecycle template already seeded", templateId: existing.id };
    }

    // A. Create Template
    const [template] = await db
      .insert(lifecycleTemplates)
      .values({
        name: "AuraPM Standard Governance Lifecycle",
        description: "Official 8-Stage Corporate Governance, Verification, and Delivery Framework",
        isDefault: true,
      })
      .returning();

    // B. Create Version 1
    const [version] = await db
      .insert(lifecycleVersions)
      .values({
        templateId: template.id,
        version: 1,
        status: "ACTIVE",
      })
      .returning();

    // C. Define Stages Configuration
    const stagesDef = [
      {
        stageNumber: 1,
        name: "Client Identification",
        description: "Identify potential client and alignment with enterprise capability",
        businessObjective: "Establish initial commercial viability",
        estimatedDurationDays: 15,
        maxSlaDurationDays: 30,
        warningThresholdDays: 20,
        escalationThresholdDays: 25,
        ownerRole: "Account Executive",
        approverRoles: JSON.stringify(["PMO", "Operations Manager"]),
        stageWeight: 5,
        displayOrder: 1,
        documents: [
          { name: "Lead Qualification Document", category: "CHARTER", isMandatory: true },
          { name: "Opportunity Assessment Report", category: "ANALYSIS", isMandatory: true }
        ],
        checklists: [
          "Verify client strategic alignment with enterprise services",
          "Perform preliminary conflict of interest check",
          "Log client profile in CRM / enterprise ledger"
        ]
      },
      {
        stageNumber: 2,
        name: "Client Engagement",
        description: "scoping workshops and drafting requirements",
        businessObjective: "Formulate communication and scoping boundaries",
        estimatedDurationDays: 20,
        maxSlaDurationDays: 45,
        warningThresholdDays: 35,
        escalationThresholdDays: 40,
        ownerRole: "Solution Architect",
        approverRoles: JSON.stringify(["Head of Legal", "Sales Director"]),
        stageWeight: 5,
        displayOrder: 2,
        documents: [
          { name: "Non-Disclosure Agreement (NDA)", category: "LEGAL", isMandatory: true },
          { name: "Preliminary Scope Document", category: "CHARTER", isMandatory: true }
        ],
        checklists: [
          "Sign bilateral NDA",
          "Hold technical discovery workshop",
          "Define high-level project boundaries"
        ]
      },
      {
        stageNumber: 3,
        name: "Project Initiation",
        description: "Establish project charter, budget, and stakeholders",
        businessObjective: "Sponsor backing and operational start approval",
        estimatedDurationDays: 15,
        maxSlaDurationDays: 30,
        warningThresholdDays: 20,
        escalationThresholdDays: 25,
        ownerRole: "Account Director",
        approverRoles: JSON.stringify(["Finance Director", "Sponsor"]),
        stageWeight: 10,
        displayOrder: 3,
        documents: [
          { name: "Project Charter", category: "CHARTER", isMandatory: true },
          { name: "Formal Business Case & CBA", category: "FINANCE", isMandatory: true }
        ],
        checklists: [
          "Secure sponsor sign-off on the Business Case",
          "Formally request the project budget",
          "Establish initial project steering committee"
        ]
      },
      {
        stageNumber: 4,
        name: "Project Planning",
        description: "Develop schedule baseline, resource pool, and risk registers",
        businessObjective: "Formal baselining and planning review",
        estimatedDurationDays: 25,
        maxSlaDurationDays: 50,
        warningThresholdDays: 35,
        escalationThresholdDays: 45,
        ownerRole: "Project Manager",
        approverRoles: JSON.stringify(["PMO Director", "Resource Manager"]),
        stageWeight: 10,
        displayOrder: 4,
        documents: [
          { name: "Project Management Plan (PMP)", category: "PLANNING", isMandatory: true },
          { name: "Detailed Schedule Baseline", category: "SCHEDULE", isMandatory: true },
          { name: "Risk Register", category: "RISK", isMandatory: true }
        ],
        checklists: [
          "Complete work breakdown structure (WBS)",
          "Allocate resources and resolve capacity overloads",
          "Capture and register project baseline"
        ]
      },
      {
        stageNumber: 5,
        name: "Execution & Delivery",
        description: "Carry out the project scope with dynamic EVM monitoring",
        businessObjective: "Implement project deliverables on budget and timeline",
        estimatedDurationDays: 60,
        maxSlaDurationDays: 120,
        warningThresholdDays: 100,
        escalationThresholdDays: 110,
        ownerRole: "Project Manager",
        approverRoles: JSON.stringify(["Steering Committee", "Account Director"]),
        stageWeight: 40,
        displayOrder: 5,
        documents: [
          { name: "Weekly Status Report", category: "STATUS", isMandatory: true },
          { name: "Earned Value Metrics Log", category: "FINANCE", isMandatory: true }
        ],
        checklists: [
          "Complete core system engineering deliverables",
          "Hold monthly steering committee progress review",
          "Log actual expenditures against Cost Center"
        ]
      },
      {
        stageNumber: 6,
        name: "User Acceptance Testing (UAT)",
        description: "Execute QA test scripts and confirm user satisfaction",
        businessObjective: "Secure formal system quality sign-off",
        estimatedDurationDays: 15,
        maxSlaDurationDays: 30,
        warningThresholdDays: 20,
        escalationThresholdDays: 25,
        ownerRole: "Project Manager",
        approverRoles: JSON.stringify(["Quality Assurance Lead", "Client Champion"]),
        stageWeight: 10,
        displayOrder: 6,
        documents: [
          { name: "UAT Test Plan & Script", category: "QUALITY", isMandatory: true },
          { name: "Signed UAT Completion Certificate", category: "COMPLIANCE", isMandatory: true }
        ],
        checklists: [
          "Complete execution of all test scripts",
          "Resolve all severity-1 blocker defects",
          "Obtain client sign-off on UAT results"
        ]
      },
      {
        stageNumber: 7,
        name: "Go-Live & Cut-Over",
        description: "Deploy to production environment and setup operations support",
        businessObjective: "Execute deployment playbook and transition to active operations",
        estimatedDurationDays: 10,
        maxSlaDurationDays: 20,
        warningThresholdDays: 12,
        escalationThresholdDays: 16,
        ownerRole: "Project Manager",
        approverRoles: JSON.stringify(["DevOps Lead", "Operations Director"]),
        stageWeight: 10,
        displayOrder: 7,
        documents: [
          { name: "Cut-Over Playbook", category: "OPERATIONS", isMandatory: true },
          { name: "Go-Live Approval Form", category: "OPERATIONS", isMandatory: true }
        ],
        checklists: [
          "Complete production readiness checklist",
          "Execute database and data state migration",
          "Enable production ingress routes"
        ]
      },
      {
        stageNumber: 8,
        name: "Project Closure",
        description: "Final client billing, resource releases, and lessons learned post-mortem",
        businessObjective: "Formal contractual and operational release",
        estimatedDurationDays: 10,
        maxSlaDurationDays: 20,
        warningThresholdDays: 12,
        escalationThresholdDays: 16,
        ownerRole: "Project Manager",
        approverRoles: JSON.stringify(["PMO Director", "Chief Financial Officer"]),
        stageWeight: 5,
        displayOrder: 8,
        documents: [
          { name: "Post-Project Evaluation Report", category: "PMO", isMandatory: true },
          { name: "Final Financial Reconciliation", category: "FINANCE", isMandatory: true }
        ],
        checklists: [
          "Release resources from project allocations",
          "Archive all project documents securely",
          "Compile and log lessons learned in PMO repository"
        ]
      }
    ];

    for (const s of stagesDef) {
      const [stage] = await db
        .insert(lifecycleStages)
        .values({
          templateId: template.id,
          versionId: version.id,
          name: s.name,
          stageNumber: s.stageNumber,
          description: s.description,
          businessObjective: s.businessObjective,
          estimatedDurationDays: s.estimatedDurationDays,
          maxSlaDurationDays: s.maxSlaDurationDays,
          warningThresholdDays: s.warningThresholdDays,
          escalationThresholdDays: s.escalationThresholdDays,
          ownerRole: s.ownerRole,
          approverRoles: s.approverRoles,
          stageWeight: s.stageWeight,
          displayOrder: s.displayOrder,
        })
        .returning();

      // Insert Documents Config
      for (const d of s.documents) {
        await db
          .insert(stageDocuments)
          .values({
            stageId: stage.id,
            name: d.name,
            category: d.category,
            isMandatory: d.isMandatory,
            allowedFormatsJson: JSON.stringify(["pdf", "docx", "xlsx", "mpp"]),
          });
      }

      // Insert Checklists
      for (let index = 0; index < s.checklists.length; index++) {
        await db
          .insert(stageChecklists)
          .values({
            stageId: stage.id,
            itemText: s.checklists[index],
            isMandatory: true,
            displayOrder: index,
          });
      }
    }

    return { message: "Standard 8-stage governance template successfully seeded", templateId: template.id };
  }

  // 2. CREATE LIFECYCLE INSTANCE (Only Entry Point for Projects)
  async createInstance(actorId: string, projectId: string, templateId?: string): Promise<any> {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) throw new NotFoundError("Project");

    // Check if instance already exists
    const [existing] = await db
      .select()
      .from(lifecycleInstances)
      .where(eq(lifecycleInstances.projectId, projectId))
      .limit(1);

    if (existing) {
      return this.getInstance(projectId);
    }

    let actualTemplateId = templateId;
    if (!actualTemplateId) {
      const [defTemplate] = await db
        .select()
        .from(lifecycleTemplates)
        .where(eq(lifecycleTemplates.isDefault, true))
        .limit(1);

      if (!defTemplate) {
        // Run seed automatically if not exists
        const seedResult = await this.seedDefaultTemplate();
        actualTemplateId = seedResult.templateId;
      } else {
        actualTemplateId = defTemplate.id;
      }
    }

    const [version] = await db
      .select()
      .from(lifecycleVersions)
      .where(and(eq(lifecycleVersions.templateId, actualTemplateId!), eq(lifecycleVersions.status, "ACTIVE")))
      .limit(1);

    const activeVersionId = version ? version.id : null;

    // Get stage 1
    const [stage1] = await db
      .select()
      .from(lifecycleStages)
      .where(and(eq(lifecycleStages.templateId, actualTemplateId!), eq(lifecycleStages.stageNumber, 1)))
      .limit(1);

    if (!stage1) {
      throw new ValidationError("No Stage 1 found for the selected governance lifecycle template");
    }

    // Insert active instance
    const [instance] = await db
      .insert(lifecycleInstances)
      .values({
        projectId,
        templateId: actualTemplateId!,
        versionId: activeVersionId,
        currentStageId: stage1.id,
        status: "IN_PROGRESS",
        startedAt: new Date(),
      })
      .returning();

    // Lock project status in database as PLANNING (part of gateway lock mechanism)
    await db
      .update(projects)
      .set({ status: "PLANNING", updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    // Initialize checklist responses for stage 1
    const stage1Checklists = await db
      .select()
      .from(stageChecklists)
      .where(eq(stageChecklists.stageId, stage1.id));

    for (const item of stage1Checklists) {
      await db
        .insert(checklistResponses)
        .values({
          instanceId: instance.id,
          checklistId: item.id,
          isCompleted: false,
        });
    }

    // Initialize Approvals for Stage 1
    const approverRoles: string[] = stage1.approverRoles ? JSON.parse(stage1.approverRoles) : [];
    for (const role of approverRoles) {
      await db
        .insert(stageApprovals)
        .values({
          instanceId: instance.id,
          stageId: stage1.id,
          role,
          status: "PENDING",
        });
    }

    // Initialize SLA Tracker
    const now = new Date();
    const targetFinish = new Date(now.getTime() + stage1.estimatedDurationDays * 24 * 60 * 60 * 1000);
    await db
      .insert(lifecycleSLAs)
      .values({
        instanceId: instance.id,
        stageId: stage1.id,
        actualStart: now,
        targetFinish,
        slaStatus: "NORMAL",
      });

    // Write audit log and publish domain event
    await AuditLogger.log(projectId, actorId, "LIFECYCLE_STARTED", "PLGS", instance.id, { stageName: stage1.name });
    eventBus.publish("stage.started", { instanceId: instance.id, stageId: stage1.id, stageNumber: 1, projectId });

    return this.getInstance(projectId);
  }

  // 3. GET FULL LIFECYCLE INSTANCE DETAILS
  async getInstance(projectId: string): Promise<any> {
    const [instance] = await db
      .select()
      .from(lifecycleInstances)
      .where(eq(lifecycleInstances.projectId, projectId))
      .limit(1);

    if (!instance) {
      return { hasLifecycle: false };
    }

    // Fetch template details
    const [tmpl] = await db.select().from(lifecycleTemplates).where(eq(lifecycleTemplates.id, instance.templateId)).limit(1);

    // Fetch active stages definition
    const allStages = await db
      .select()
      .from(lifecycleStages)
      .where(eq(lifecycleStages.templateId, instance.templateId))
      .orderBy(asc(lifecycleStages.stageNumber));

    const currentStage = allStages.find((s) => s.id === instance.currentStageId);

    if (!currentStage) {
      return { hasLifecycle: true, instance, template: tmpl, stages: [] };
    }

    // Fetch required documents config for current stage
    const docsConfig = await db
      .select()
      .from(stageDocuments)
      .where(eq(stageDocuments.stageId, currentStage.id));

    // Fetch uploaded document versions
    const uploads = await db
      .select()
      .from(documentVersions)
      .where(and(eq(documentVersions.instanceId, instance.id), eq(documentVersions.status, "PENDING")));

    // Fetch current stage checklists config + responses
    const checklistsConfig = await db
      .select()
      .from(stageChecklists)
      .where(eq(stageChecklists.stageId, currentStage.id))
      .orderBy(asc(stageChecklists.displayOrder));

    const responses = await db
      .select()
      .from(checklistResponses)
      .where(eq(checklistResponses.instanceId, instance.id));

    const checklists = checklistsConfig.map((item) => {
      const resp = responses.find((r) => r.checklistId === item.id);
      return {
        id: item.id,
        itemText: item.itemText,
        isMandatory: item.isMandatory,
        isCompleted: resp ? resp.isCompleted : false,
        completedBy: resp ? resp.completedBy : null,
        completedAt: resp ? resp.completedAt : null,
        notes: resp ? resp.notes : null,
      };
    });

    // Fetch approvals
    const approvals = await db
      .select()
      .from(stageApprovals)
      .where(and(eq(stageApprovals.instanceId, instance.id), eq(stageApprovals.stageId, currentStage.id)));

    // Fetch Head of Ops Review
    const [opsReview] = await db
      .select()
      .from(headOfOperationsReviews)
      .where(and(eq(headOfOperationsReviews.instanceId, instance.id), eq(headOfOperationsReviews.stageId, currentStage.id)))
      .orderBy(desc(headOfOperationsReviews.createdAt))
      .limit(1);

    // Fetch SLA details
    const [sla] = await db
      .select()
      .from(lifecycleSLAs)
      .where(and(eq(lifecycleSLAs.instanceId, instance.id), eq(lifecycleSLAs.stageId, currentStage.id)))
      .limit(1);

    // Fetch recent comments
    const comments = await db
      .select()
      .from(lifecycleComments)
      .where(and(eq(lifecycleComments.instanceId, instance.id), eq(lifecycleComments.stageId, currentStage.id)))
      .orderBy(desc(lifecycleComments.createdAt));

    const documents = docsConfig.map((doc) => {
      const file = uploads.find((u) => u.stageDocumentId === doc.id);
      return {
        id: doc.id,
        name: doc.name,
        category: doc.category,
        isMandatory: doc.isMandatory,
        allowedFormats: doc.allowedFormatsJson ? JSON.parse(doc.allowedFormatsJson) : [],
        maxFileSizeMb: doc.maxFileSizeMb,
        status: file ? file.status : "PENDING",
        uploadedFile: file ? {
          id: file.id,
          fileName: file.fileName,
          filePath: file.filePath,
          version: file.version,
          status: file.status,
          uploadedBy: file.uploadedBy,
          verificationStatus: file.verificationStatus,
          reviewerNotes: file.reviewerNotes,
          uploadedAt: file.uploadedAt,
        } : null,
      };
    });

    return {
      hasLifecycle: true,
      id: instance.id,
      instanceId: instance.id,
      projectId: instance.projectId,
      templateId: instance.templateId,
      status: instance.status,
      startedAt: instance.startedAt,
      completedAt: instance.completedAt,
      template: {
        id: tmpl.id,
        name: tmpl.name,
        description: tmpl.description,
      },
      currentStageId: instance.currentStageId,
      stages: allStages.map((s) => {
        const isCurrent = s.id === instance.currentStageId;
        // Determine status based on stageNumber relative to currentStage
        let status = "LOCKED";
        if (s.stageNumber < currentStage.stageNumber) status = "COMPLETED";
        else if (s.id === instance.currentStageId) status = instance.status === "IN_REVIEW" ? "IN_REVIEW" : "ACTIVE";
        
        return {
          id: s.id,
          stageNumber: s.stageNumber,
          name: s.name,
          status: status,
          isCurrent,
          // We only return checklists/docs for current stage in this detail view, 
          // or we could fetch them all. For now, let's at least provide the arrays.
          checklists: isCurrent ? checklists : [],
          documents: isCurrent ? documents : [],
          roles: isCurrent ? approvals : [],
          slaConfig: isCurrent ? sla : null,
        };
      }),
      checklists,
      documents,
      approvals,
      headOfOperationsReview: opsReview || null,
      sla: sla ? {
        actualStart: sla.actualStart,
        targetFinish: sla.targetFinish,
        slaStatus: sla.slaStatus,
        daysRemaining: Math.ceil((new Date(sla.targetFinish).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      } : null,
      comments,
    };
  }

  // 4. DOCUMENT UPLOAD WITH REVISION CONTROL & EXPIRY
  async processUploadedDocument(
    actorId: string,
    instanceId: string,
    stageDocumentId: string,
    fileData: { fileName: string; tempPath: string; mimeType: string; size: number }
  ): Promise<any> {
    const [instance] = await db.select().from(lifecycleInstances).where(eq(lifecycleInstances.id, instanceId)).limit(1);
    if (!instance) throw new NotFoundError("Lifecycle Instance");

    const [docConfig] = await db.select().from(stageDocuments).where(eq(stageDocuments.id, stageDocumentId)).limit(1);
    if (!docConfig) throw new NotFoundError("Document Configuration");

    const projectId = instance.projectId;
    const stageId = instance.currentStageId!;

    // Create final path: uploads/projects/:projectId/stages/:stageId/:filename
    const targetDir = path.join(process.cwd(), "uploads", "projects", projectId, "stages", stageId);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const finalFileName = `${Date.now()}-${fileData.fileName}`;
    const finalPath = path.join(targetDir, finalFileName);

    // Move file from temp to project-specific stage folder (safely handling cross-device mounts)
    try {
      fs.copyFileSync(fileData.tempPath, finalPath);
      fs.unlinkSync(fileData.tempPath);
    } catch (renameErr) {
      console.warn("Fallback file copy/move due to cross-device limit:", renameErr);
      // Fallback if copy/unlink also failed
      fs.renameSync(fileData.tempPath, finalPath);
    }

    // Relative path for client access (will be served as static)
    const relativePath = `/uploads/projects/${projectId}/stages/${stageId}/${finalFileName}`;
    
    return this.uploadDocument(actorId, instanceId, stageDocumentId, {
      fileName: fileData.fileName,
      filePath: relativePath,
      checksum: `SIZE-${fileData.size}`
    });
  }

  async uploadDocument(
    actorId: string,
    instanceId: string,
    stageDocumentId: string,
    fileData: { fileName: string; filePath: string; checksum?: string; digitalSignature?: string }
  ): Promise<any> {
    const [instance] = await db.select().from(lifecycleInstances).where(eq(lifecycleInstances.id, instanceId)).limit(1);
    if (!instance) throw new NotFoundError("Lifecycle Instance");

    const [docConfig] = await db.select().from(stageDocuments).where(eq(stageDocuments.id, stageDocumentId)).limit(1);
    if (!docConfig) throw new NotFoundError("Document Configuration");

    // Get previous upload versions to calculate version increment
    const previous = await db
      .select()
      .from(documentVersions)
      .where(and(eq(documentVersions.instanceId, instanceId), eq(documentVersions.stageDocumentId, stageDocumentId)))
      .orderBy(desc(documentVersions.version));

    let nextVersionNum = 1;
    if (previous.length > 0) {
      nextVersionNum = previous[0].version + 1;
      // Supersede past non-rejected uploads
      await db
        .update(documentVersions)
        .set({ status: "SUPERSEDED" })
        .where(and(eq(documentVersions.instanceId, instanceId), eq(documentVersions.stageDocumentId, stageDocumentId)));
    }

    // Insert new Document version
    const [docVersion] = await db
      .insert(documentVersions)
      .values({
        instanceId,
        stageDocumentId,
        filePath: fileData.filePath,
        fileName: fileData.fileName,
        version: nextVersionNum,
        status: "PENDING",
        verificationStatus: "PENDING",
        uploadedBy: actorId,
        checksum: fileData.checksum || "MD5-SUM-DUMMY-HASH",
        digitalSignature: fileData.digitalSignature || null,
        virusScanPassed: true,
        isOcrReady: true,
        retentionDate: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000), // 7 years operational retention
      })
      .returning();

    // Log History & Publish event
    await db
      .insert(lifecycleHistory)
      .values({
        instanceId,
        stageId: docConfig.stageId,
        action: "DOCUMENT_UPLOADED",
        performedBy: actorId,
        notes: `Uploaded version ${nextVersionNum} of document '${docConfig.name}'`,
      });

    eventBus.publish("document.uploaded", {
      instanceId,
      stageId: docConfig.stageId,
      documentId: stageDocumentId,
      versionId: docVersion.id,
      uploadedBy: actorId,
    });

    await AuditLogger.log(instance.projectId, actorId, "DOCUMENT_UPLOADED", "PLGS", docVersion.id, { fileName: fileData.fileName });
    return docVersion;
  }

  // 5. DOCUMENT VERIFICATION & SECURITY CONTROLS
  async verifyDocument(
    actorId: string,
    documentVersionId: string,
    status: "VERIFIED" | "REJECTED",
    notes?: string
  ): Promise<any> {
    const [docVer] = await db.select().from(documentVersions).where(eq(documentVersions.id, documentVersionId)).limit(1);
    if (!docVer) throw new NotFoundError("Document Version");

    const [docConfig] = await db.select().from(stageDocuments).where(eq(stageDocuments.id, docVer.stageDocumentId)).limit(1);

    // Update the version record
    const [updated] = await db
      .update(documentVersions)
      .set({
        verificationStatus: status,
        status: status === "VERIFIED" ? "VERIFIED" : "REJECTED",
        reviewerNotes: notes || null,
      })
      .where(eq(documentVersions.id, documentVersionId))
      .returning();

    // Insert verification log
    await db
      .insert(documentVerifications)
      .values({
        documentVersionId,
        reviewerId: actorId,
        status,
        notes: notes || null,
      });

    await db
      .insert(lifecycleHistory)
      .values({
        instanceId: docVer.instanceId,
        stageId: docConfig.stageId,
        action: status === "VERIFIED" ? "DOCUMENT_VERIFIED" : "DOCUMENT_REJECTED",
        performedBy: actorId,
        notes: `Document '${docConfig.name}' was ${status.toLowerCase()} by Operations Reviewer`,
      });

    // Notify originator or log audit
    eventBus.publish(status === "VERIFIED" ? "document.verified" : "document.rejected", {
      instanceId: docVer.instanceId,
      documentId: docVer.stageDocumentId,
      versionId: documentVersionId,
      reviewerId: actorId,
    });

    const [inst] = await db.select().from(lifecycleInstances).where(eq(lifecycleInstances.id, docVer.instanceId)).limit(1);
    await AuditLogger.log(inst ? inst.projectId : null, actorId, `DOCUMENT_${status}`, "PLGS", documentVersionId, { notes });

    return updated;
  }

  // 6. COMPLETE CHECKLIST ITEM
  async completeChecklistItem(
    actorId: string,
    instanceId: string,
    checklistId: string,
    isCompleted: boolean,
    notes?: string
  ): Promise<any> {
    const [resp] = await db
      .select()
      .from(checklistResponses)
      .where(and(eq(checklistResponses.instanceId, instanceId), eq(checklistResponses.checklistId, checklistId)))
      .limit(1);

    let updated;
    if (resp) {
      [updated] = await db
        .update(checklistResponses)
        .set({
          isCompleted,
          completedBy: isCompleted ? actorId : null,
          completedAt: isCompleted ? new Date() : null,
          notes: notes || null,
          updatedAt: new Date(),
        })
        .where(eq(checklistResponses.id, resp.id))
        .returning();
    } else {
      [updated] = await db
        .insert(checklistResponses)
        .values({
          instanceId,
          checklistId,
          isCompleted,
          completedBy: isCompleted ? actorId : null,
          completedAt: isCompleted ? new Date() : null,
          notes: notes || null,
        })
        .returning();
    }

    // Publish event if checklist is completed
    const [item] = await db.select().from(stageChecklists).where(eq(stageChecklists.id, checklistId)).limit(1);
    if (isCompleted) {
      eventBus.publish("checklist.completed", { instanceId, checklistId, completedBy: actorId });
    }

    return updated;
  }

  // 7. STAGE GATE SUBMISSION & VALIDATION
  async validateStageReadiness(instanceId: string, stageId: string): Promise<any> {
    const [instance] = await db.select().from(lifecycleInstances).where(eq(lifecycleInstances.id, instanceId)).limit(1);
    if (!instance) throw new NotFoundError("Lifecycle Instance");

    const [stage] = await db.select().from(lifecycleStages).where(eq(lifecycleStages.id, stageId)).limit(1);
    if (!stage) throw new NotFoundError("Stage");

    // 1. Validate Checklist
    const checklists = await db.select().from(stageChecklists).where(eq(stageChecklists.stageId, stageId));
    const responses = await db.select().from(checklistResponses).where(eq(checklistResponses.instanceId, instanceId));
    
    const missingChecklist = checklists
      .filter(c => c.isMandatory)
      .filter(c => !responses.find(r => r.checklistId === c.id && r.isCompleted));

    // 2. Validate Documents
    const docsConfig = await db.select().from(stageDocuments).where(eq(stageDocuments.stageId, stageId));
    const uploads = await db.select().from(documentVersions).where(and(eq(documentVersions.instanceId, instanceId), eq(documentVersions.status, "PENDING")));
    
    const missingDocs = docsConfig
      .filter(d => d.isMandatory)
      .filter(d => !uploads.find(u => u.stageDocumentId === d.id));

    const isReady = missingChecklist.length === 0 && missingDocs.length === 0;

    return {
      isReady,
      missingChecklist: missingChecklist.map(c => c.itemText),
      missingDocuments: missingDocs.map(d => d.name),
      summary: isReady ? "Stage is ready for governance review" : "Submission blocked: requirements incomplete"
    };
  }

  async submitStageForReview(actorId: string, instanceId: string): Promise<any> {
    const [instance] = await db.select().from(lifecycleInstances).where(eq(lifecycleInstances.id, instanceId)).limit(1);
    if (!instance) throw new NotFoundError("Instance");
    
    if (instance.status === "AWAITING_REVIEW") {
      throw new ValidationError("Stage is already awaiting review");
    }

    const readiness = await this.validateStageReadiness(instanceId, instance.currentStageId!);
    if (!readiness.isReady) {
      throw new ValidationError(`Cannot submit stage. Missing items: ${[...readiness.missingChecklist, ...readiness.missingDocuments].join(", ")}`);
    }

    // Lock the instance
    const [updated] = await db
      .update(lifecycleInstances)
      .set({ 
        status: "AWAITING_REVIEW",
        updatedAt: new Date()
      })
      .where(eq(lifecycleInstances.id, instanceId))
      .returning();

    // Create Audit Log
    await db.insert(lifecycleComments).values({
      instanceId,
      stageId: instance.currentStageId!,
      authorId: actorId,
      content: "STAGE GATE SUBMISSION: PM has submitted the stage for Head of Operations review.",
    });

    return updated;
  }

  // 8. GOVERNANCE REVIEW (APPROVE/REJECT)
  async reviewStageGate(actorId: string, instanceId: string, decision: "APPROVE" | "REJECT", comments: string): Promise<any> {
    const [instance] = await db.select().from(lifecycleInstances).where(eq(lifecycleInstances.id, instanceId)).limit(1);
    if (!instance) throw new NotFoundError("Instance");

    const currentStageId = instance.currentStageId!;
    const [currentStage] = await db.select().from(lifecycleStages).where(eq(lifecycleStages.id, currentStageId)).limit(1);

    if (decision === "APPROVE") {
      // Find next stage
      const [nextStage] = await db
        .select()
        .from(lifecycleStages)
        .where(and(eq(lifecycleStages.templateId, instance.templateId), eq(lifecycleStages.stageNumber, currentStage.stageNumber + 1)))
        .limit(1);

      const status = nextStage ? "IN_PROGRESS" : "COMPLETED";
      
      const [updated] = await db
        .update(lifecycleInstances)
        .set({
          currentStageId: nextStage ? nextStage.id : currentStageId,
          status: status,
          completedAt: nextStage ? null : new Date(),
          updatedAt: new Date()
        })
        .where(eq(lifecycleInstances.id, instanceId))
        .returning();

      await db.insert(headOfOperationsReviews).values({
        instanceId,
        stageId: currentStageId,
        reviewerId: actorId,
        status: "APPROVED",
        comments: comments || "Stage approved by Head of Operations.",
        reviewedAt: new Date(),
      });

      // Update project status if lifecycle completed
      if (!nextStage) {
        await db.update(projects).set({ status: "ACTIVE" }).where(eq(projects.id, instance.projectId));
      }

      return updated;
    } else {
      // REJECT / REQUEST CHANGES
      const [updated] = await db
        .update(lifecycleInstances)
        .set({
          status: "CHANGES_REQUESTED",
          updatedAt: new Date()
        })
        .where(eq(lifecycleInstances.id, instanceId))
        .returning();

      await db.insert(headOfOperationsReviews).values({
        instanceId,
        stageId: currentStageId,
        reviewerId: actorId,
        status: "REJECTED",
        comments: comments || "Changes requested by reviewer.",
        reviewedAt: new Date(),
      });

      return updated;
    }
  }

  // 9. ROLE-BASED APPROVAL SUBMISSION
  async submitStageApproval(
    actorId: string,
    instanceId: string,
    stageId: string,
    role: string,
    status: "APPROVED" | "REJECTED" | "REWORK",
    comments?: string,
    digitalSignature?: string
  ): Promise<any> {
    const [existing] = await db
      .select()
      .from(stageApprovals)
      .where(and(eq(stageApprovals.instanceId, instanceId), eq(stageApprovals.stageId, stageId), eq(stageApprovals.role, role)))
      .limit(1);

    let updated;
    if (existing) {
      [updated] = await db
        .update(stageApprovals)
        .set({
          status,
          assignedApproverId: actorId,
          comments: comments || null,
          digitalSignature: digitalSignature || null,
          signedAt: new Date(),
        })
        .where(eq(stageApprovals.id, existing.id))
        .returning();
    } else {
      [updated] = await db
        .insert(stageApprovals)
        .values({
          instanceId,
          stageId,
          role,
          assignedApproverId: actorId,
          status,
          comments: comments || null,
          digitalSignature: digitalSignature || null,
          signedAt: new Date(),
        })
        .returning();
    }

    // Log in History
    await db
      .insert(lifecycleHistory)
      .values({
        instanceId,
        stageId,
        action: status === "APPROVED" ? "APPROVAL_COMPLETED" : "APPROVAL_REJECTED",
        performedBy: actorId,
        notes: `Role-based approval [${role}] marked as ${status.toLowerCase()}`,
      });

    eventBus.publish(status === "APPROVED" ? "approval.completed" : "approval.rejected", {
      instanceId,
      stageId,
      role,
      status,
      approverId: actorId,
    });

    return updated;
  }

  // 8. ADD DISCUSSION COMMENTS
  async addComment(actorId: string, instanceId: string, stageId: string, content: string, parentId?: string): Promise<any> {
    const [comment] = await db
      .insert(lifecycleComments)
      .values({
        instanceId,
        stageId,
        authorId: actorId,
        content,
        parentCommentId: parentId || null,
      })
      .returning();

    return comment;
  }

  // 9. SUBMIT HEAD OF OPERATIONS REVIEW (THE MAIN GATE)
  async submitHeadOfOperationsReview(
    actorId: string,
    instanceId: string,
    stageId: string,
    status: "APPROVED" | "REJECTED" | "REWORK_REQUESTED" | "CLARIFICATION_REQUESTED",
    data: {
      comments?: string;
      rejectedChecklistItemsJson?: string;
      rejectedDocumentsJson?: string;
      resubmissionDueDate?: string;
      digitalSignature?: string;
    }
  ): Promise<any> {
    const [instance] = await db.select().from(lifecycleInstances).where(eq(lifecycleInstances.id, instanceId)).limit(1);
    if (!instance) throw new NotFoundError("Lifecycle Instance");

    const [stage] = await db.select().from(lifecycleStages).where(eq(lifecycleStages.id, stageId)).limit(1);
    if (!stage) throw new NotFoundError("Lifecycle Stage");

    // Insert or update operations review record
    const [review] = await db
      .insert(headOfOperationsReviews)
      .values({
        instanceId,
        stageId,
        reviewerId: actorId,
        status,
        comments: data.comments || null,
        rejectedChecklistItemsJson: data.rejectedChecklistItemsJson || null,
        rejectedDocumentsJson: data.rejectedDocumentsJson || null,
        resubmissionDueDate: data.resubmissionDueDate ? new Date(data.resubmissionDueDate) : null,
        digitalSignature: data.digitalSignature || null,
        reviewedAt: new Date(),
      })
      .returning();

    // Log history
    await db
      .insert(lifecycleHistory)
      .values({
        instanceId,
        stageId,
        action: status === "APPROVED" ? "OPERATIONS_APPROVED" : "OPERATIONS_REJECTED",
        performedBy: actorId,
        notes: `Head of Operations review submitted with status: ${status}`,
      });

    // Write a Decision Log
    await db
      .insert(lifecycleDecisions)
      .values({
        instanceId,
        stageId,
        decision: status,
        madeBy: actorId,
        comments: data.comments || null,
      });

    // Publish event
    eventBus.publish(status === "APPROVED" ? "operations.review.completed" : "operations.review.rejected", {
      instanceId,
      stageId,
      reviewerId: actorId,
      status,
    });

    const [project] = await db.select().from(projects).where(eq(projects.id, instance.projectId)).limit(1);

    if (status === "APPROVED") {
      // 10. VERIFY ALL CONDITIONS TO PROGRESS
      // Check if all other requirements are met
      // A. Check that 100% of required documents are VERIFIED
      const requiredDocs = await db.select().from(stageDocuments).where(eq(stageDocuments.stageId, stageId));
      const uploads = await db
        .select()
        .from(documentVersions)
        .where(and(eq(documentVersions.instanceId, instanceId), eq(documentVersions.status, "PENDING")));

      const missingDocs = requiredDocs.filter((doc) => {
        if (!doc.isMandatory) return false;
        const upload = uploads.find((u) => u.stageDocumentId === doc.id);
        return !upload || upload.verificationStatus !== "VERIFIED";
      });

      if (missingDocs.length > 0) {
        throw new ValidationError(`Cannot approve stage. The following mandatory documents are pending verification: ${missingDocs.map(d => d.name).join(", ")}`);
      }

      // B. Check that 100% of mandatory checklist items are completed
      const reqChecklists = await db.select().from(stageChecklists).where(eq(stageChecklists.stageId, stageId));
      const responses = await db.select().from(checklistResponses).where(eq(checklistResponses.instanceId, instanceId));

      const uncompletedItems = reqChecklists.filter((item) => {
        if (!item.isMandatory) return false;
        const resp = responses.find((r) => r.checklistId === item.id);
        return !resp || !resp.isCompleted;
      });

      if (uncompletedItems.length > 0) {
        throw new ValidationError(`Cannot approve stage. There are uncompleted mandatory checklist items.`);
      }

      // C. Check that all required stage approvals are approved
      const approvals = await db.select().from(stageApprovals).where(and(eq(stageApprovals.instanceId, instanceId), eq(stageApprovals.stageId, stageId)));
      const pendingApprovals = approvals.filter((a) => a.status !== "APPROVED");
      if (pendingApprovals.length > 0) {
        throw new ValidationError(`Cannot approve stage. Pending role-based approvals exist: ${pendingApprovals.map(a => a.role).join(", ")}`);
      }

      // ALL CONDITIONS MET -> MOVE TO NEXT STAGE
      const nextStageNumber = stage.stageNumber + 1;
      const [nextStage] = await db
        .select()
        .from(lifecycleStages)
        .where(and(eq(lifecycleStages.templateId, instance.templateId), eq(lifecycleStages.stageNumber, nextStageNumber)))
        .limit(1);

      // Save SLA actualFinish
      await db
        .update(lifecycleSLAs)
        .set({ actualFinish: new Date() })
        .where(and(eq(lifecycleSLAs.instanceId, instanceId), eq(lifecycleSLAs.stageId, stageId)));

      if (nextStage) {
        // A. Update current stage of lifecycle instance
        await db
          .update(lifecycleInstances)
          .set({
            currentStageId: nextStage.id,
            updatedAt: new Date(),
          })
          .where(eq(lifecycleInstances.id, instanceId));

        // B. Setup checklists for the new stage
        const nextChecklists = await db.select().from(stageChecklists).where(eq(stageChecklists.stageId, nextStage.id));
        for (const item of nextChecklists) {
          await db
            .insert(checklistResponses)
            .values({
              instanceId,
              checklistId: item.id,
              isCompleted: false,
            });
        }

        // C. Setup approvals for the new stage
        const nextApprovers: string[] = nextStage.approverRoles ? JSON.parse(nextStage.approverRoles) : [];
        for (const role of nextApprovers) {
          await db
            .insert(stageApprovals)
            .values({
              instanceId,
              stageId: nextStage.id,
              role,
              status: "PENDING",
            });
        }

        // D. Setup SLA for the new stage
        const now = new Date();
        const nextTargetFinish = new Date(now.getTime() + nextStage.estimatedDurationDays * 24 * 60 * 60 * 1000);
        await db
          .insert(lifecycleSLAs)
          .values({
            instanceId,
            stageId: nextStage.id,
            actualStart: now,
            targetFinish: nextTargetFinish,
            slaStatus: "NORMAL",
          });

        // E. HANDOVER / GATEWAY ACTIONS
        // Project remain locked inside the Lifecycle Gateway until Stage 3 approval,
        // after which ownership transfers automatically to the assigned Project Manager (PM)
        if (stage.stageNumber === 3) {
          if (project && project.managerId) {
            // Log PM Handover
            await db
              .insert(lifecycleHistory)
              .values({
                instanceId,
                stageId: nextStage.id,
                action: "PROJECT_HANDED_TO_PM",
                performedBy: actorId,
                notes: `Stage 3 Gate Approved. Handing project control over to Assigned Project Manager: ${project.managerId}`,
              });

            eventBus.publish("project.ready.for.pm", { projectId: project.id, managerId: project.managerId });
          }
        }

        // Publish transition event
        eventBus.publish("stage.completed", { instanceId, completedStageId: stageId, stageNumber: stage.stageNumber });
        eventBus.publish("stage.unlocked", { instanceId, unlockedStageId: nextStage.id, stageNumber: nextStageNumber });
        await AuditLogger.log(project ? project.id : null, actorId, "STAGE_GATE_PASSED", "PLGS", stageId, { nextStage: nextStage.name });
      } else {
        // No next stage -> Lifecycle is fully COMPLETED!
        await db
          .update(lifecycleInstances)
          .set({
            status: "COMPLETED",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(lifecycleInstances.id, instanceId));

        // When ALL governance stages are completed, the project is officially unlocked and activated
        await db
          .update(projects)
          .set({
            status: "ACTIVE", // Transfer from PLANNING lock to ACTIVE corporate project
            updatedAt: new Date(),
          })
          .where(eq(projects.id, instance.projectId));

        await db
          .insert(lifecycleHistory)
          .values({
            instanceId,
            stageId,
            action: "LIFECYCLE_COMPLETED",
            performedBy: actorId,
            notes: "Final stage approved! Project is now fully unlocked and marked ACTIVE.",
          });

        eventBus.publish("project.ready.for.pm", { projectId: instance.projectId, managerId: project?.managerId });
        await AuditLogger.log(project ? project.id : null, actorId, "LIFECYCLE_COMPLETED", "PLGS", instanceId);
      }
    } else {
      // REWORK or REJECTION
      // Register rework notifications or similar
      await AuditLogger.log(project ? project.id : null, actorId, "STAGE_GATE_REJECTED", "PLGS", stageId, { status, data });
    }

    return review;
  }

  // 11. GET SLA PERFORMANCE & WORKING METRICS
  async getStageSLADetails(instanceId: string, stageId: string): Promise<any> {
    const [sla] = await db
      .select()
      .from(lifecycleSLAs)
      .where(and(eq(lifecycleSLAs.instanceId, instanceId), eq(lifecycleSLAs.stageId, stageId)))
      .limit(1);

    if (!sla) {
      return { message: "No SLA details recorded for this stage" };
    }

    const start = new Date(sla.actualStart).getTime();
    const end = sla.actualFinish ? new Date(sla.actualFinish).getTime() : Date.now();
    const elapsedDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    const target = new Date(sla.targetFinish).getTime();
    const varianceDays = Math.ceil((end - target) / (1000 * 60 * 60 * 24));

    return {
      actualStart: sla.actualStart,
      targetFinish: sla.targetFinish,
      actualFinish: sla.actualFinish,
      slaStatus: sla.slaStatus,
      elapsedCalendarDays: elapsedDays,
      elapsedWorkingDays: Math.round(elapsedDays * 5 / 7), // corporate working days proxy
      varianceDays: varianceDays > 0 ? varianceDays : 0,
      isDelayed: end > target,
    };
  }

  // 12. PMO & EXECUTIVE ANALYTICS DASHBOARD
  async getGovernanceDashboard(): Promise<any> {
    const allInstances = await db.select().from(lifecycleInstances);
    const activeInstances = allInstances.filter((i) => i.status === "IN_PROGRESS");

    const totalCount = allInstances.length;
    const completedCount = allInstances.filter((i) => i.status === "COMPLETED").length;
    const activeCount = activeInstances.length;

    // Fetch active stages to compile count by stage
    const stages = await db.select().from(lifecycleStages);
    const stageCounts: Record<string, number> = {};
    stages.forEach((s) => {
      stageCounts[s.name] = 0;
    });

    activeInstances.forEach((inst) => {
      const activeStage = stages.find((s) => s.id === inst.currentStageId);
      if (activeStage) {
        stageCounts[activeStage.name] = (stageCounts[activeStage.name] || 0) + 1;
      }
    });

    // Fetch overdue document verifications
    const pendingDocs = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.verificationStatus, "PENDING"));

    // Fetch active escalations
    const escalations = await db
      .select()
      .from(lifecycleEscalations)
      .where(eq(lifecycleEscalations.status, "ACTIVE"));

    // Compile executive roll-up
    return {
      metrics: {
        totalInstances: totalCount,
        activeInstances: activeCount,
        completedInstances: completedCount,
        pendingDocumentVerifications: pendingDocs.length,
        activeEscalationsCount: escalations.length,
      },
      stageDistribution: stageCounts,
      recentEscalations: escalations.slice(0, 5),
    };
  }

  // 13. SLA SCHEDULER MONITORING (RUN EVERY 15 MINUTES CRON SIMULATION)
  async runSLAChronChecks(): Promise<any> {
    const activeSlas = await db
      .select()
      .from(lifecycleSLAs)
      .where(sql`${lifecycleSLAs.actualFinish} IS NULL`);

    let warningCount = 0;
    let breachCount = 0;

    for (const sla of activeSlas) {
      const [instance] = await db.select().from(lifecycleInstances).where(eq(lifecycleInstances.id, sla.instanceId)).limit(1);
      if (!instance) continue;

      const [stage] = await db.select().from(lifecycleStages).where(eq(lifecycleStages.id, sla.stageId)).limit(1);
      if (!stage) continue;

      const targetTime = new Date(sla.targetFinish).getTime();
      const warningTime = targetTime - (stage.maxSlaDurationDays - stage.warningThresholdDays) * 24 * 60 * 60 * 1000;
      const escalationTime = targetTime + (stage.escalationThresholdDays - stage.maxSlaDurationDays) * 24 * 60 * 60 * 1000;
      const now = Date.now();

      if (now > escalationTime) {
        // Trigger Critical Breach and Escalation
        await db
          .update(lifecycleSLAs)
          .set({ slaStatus: "BREACHED", lastCheckedAt: new Date() })
          .where(eq(lifecycleSLAs.id, sla.id));

        // Create Escalation Entry
        const [existingEscalation] = await db
          .select()
          .from(lifecycleEscalations)
          .where(and(eq(lifecycleEscalations.instanceId, sla.instanceId), eq(lifecycleEscalations.stageId, sla.stageId), eq(lifecycleEscalations.status, "ACTIVE")))
          .limit(1);

        if (!existingEscalation) {
          await db
            .insert(lifecycleEscalations)
            .values({
              instanceId: sla.instanceId,
              stageId: sla.stageId,
              level: 2,
              status: "ACTIVE",
              escalatedTo: "Corporate PMO Director",
              reason: `Stage '${stage.name}' SLA Escalation Threshold Breached. Delay reason critical.`,
            });

          eventBus.publish("escalation.created", { instanceId: sla.instanceId, stageId: sla.stageId, level: 2 });
        }

        breachCount++;
      } else if (now > targetTime) {
        // Normal breach
        await db
          .update(lifecycleSLAs)
          .set({ slaStatus: "BREACHED", lastCheckedAt: new Date() })
          .where(eq(lifecycleSLAs.id, sla.id));

        eventBus.publish("sla.breached", { instanceId: sla.instanceId, stageId: sla.stageId });
        breachCount++;
      } else if (now > warningTime) {
        // Warning threshold
        await db
          .update(lifecycleSLAs)
          .set({ slaStatus: "WARNING", lastCheckedAt: new Date() })
          .where(eq(lifecycleSLAs.id, sla.id));

        eventBus.publish("sla.warning", { instanceId: sla.instanceId, stageId: sla.stageId });
        warningCount++;
      }
    }

    // Register Scheduler Run
    await db
      .insert(schedulerJobs)
      .values({
        jobName: "SLA_MONITOR_JOB",
        lastRunAt: new Date(),
        status: "SUCCESS",
      });

    return { processedSlas: activeSlas.length, warningsTriggered: warningCount, breachesTriggered: breachCount };
  }
}
