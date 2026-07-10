import { eq, and, or, inArray, sql, desc } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import {
  workflowDefinitions,
  workflowVersions,
  workflowStates,
  workflowTransitions,
  workflowRoles,
  workflowPermissions,
  workflowConditions,
  workflowActions,
  workflowInstances,
  workflowInstanceHistory,
  workflowApprovals,
  workflowComments,
  workflowNotifications,
  workflowEvents,
  workflowVariables,
  workflowTemplates,
  workflowLogs,
  auditLogs
} from "../../../db/schema.ts";
import { AuthorizationService } from "../../authorization/application/authorization.service.ts";
import { ConditionsEngine } from "./conditions.engine.ts";
import { ActionsEngine } from "./actions.engine.ts";
import { AuditLogger } from "../../../shared/infrastructure/audit-logger.ts";
import { eventBus } from "../../../shared/domain/event-bus.ts";
import logger from "../../../shared/infrastructure/logger.ts";
import { NotFoundError, ValidationError } from "../../../shared/infrastructure/errors.ts";

export class WorkflowService {
  private readonly authService: AuthorizationService;

  constructor() {
    this.authService = new AuthorizationService();
  }

  /**
   * Registers a new Workflow Definition and compiles its initial version.
   */
  async createWorkflowDefinition(
    actorId: string,
    input: {
      name: string;
      code: string;
      description?: string;
      definitionJson: {
        states: Array<{
          code: string;
          name: string;
          description?: string;
          isInitial?: boolean;
          isFinal?: boolean;
          slaHours?: number;
          actions?: Array<{
            triggerType: "ON_ENTRY" | "ON_EXIT";
            actionType: string;
            parameters: Record<string, any>;
          }>;
        }>;
        transitions: Array<{
          code: string;
          name: string;
          fromStateCode: string | null;
          toStateCode: string;
          triggerType?: "MANUAL" | "AUTO" | "TIME_OUT";
          slaHours?: number;
          roles?: string[];
          permissions?: string[];
          conditions?: Array<{
            logicalOperator?: "AND" | "OR" | "NOT";
            field?: string;
            operator?: string;
            value?: string;
            customExpression?: string;
          }>;
          actions?: Array<{
            actionType: string;
            parameters: Record<string, any>;
          }>;
        }>;
      };
    }
  ): Promise<any> {
    try {
      // Validate unique code
      const [existing] = await db
        .select()
        .from(workflowDefinitions)
        .where(eq(workflowDefinitions.code, input.code))
        .limit(1);

      if (existing) {
        throw new ValidationError(`Workflow definition with code '${input.code}' already exists`);
      }

      const result = await db.transaction(async (tx) => {
        // 1. Create Workflow Definition
        const [definition] = await tx
          .insert(workflowDefinitions)
          .values({
            code: input.code,
            name: input.name,
            description: input.description,
            latestVersion: 1,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        // 2. Create Workflow Version
        const [version] = await tx
          .insert(workflowVersions)
          .values({
            workflowId: definition.id,
            version: 1,
            definition: JSON.stringify(input.definitionJson),
            isActive: true,
            createdBy: actorId,
            createdAt: new Date(),
          })
          .returning();

        // Map state codes to generated IDs
        const stateIdMap: Record<string, string> = {};

        // 3. Create States and ON_ENTRY/ON_EXIT actions
        for (const s of input.definitionJson.states) {
          const [state] = await tx
            .insert(workflowStates)
            .values({
              workflowId: definition.id,
              versionId: version.id,
              code: s.code,
              name: s.name,
              description: s.description,
              isInitial: s.isInitial || false,
              isFinal: s.isFinal || false,
              slaHours: s.slaHours,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();

          stateIdMap[s.code] = state.id;

          // Actions on state
          if (s.actions) {
            for (let i = 0; i < s.actions.length; i++) {
              const act = s.actions[i];
              await tx.insert(workflowActions).values({
                stateId: state.id,
                triggerType: act.triggerType,
                actionType: act.actionType,
                parameters: JSON.stringify(act.parameters),
                executionOrder: i + 1,
                createdAt: new Date(),
              });
            }
          }
        }

        // 4. Create Transitions, Roles, Permissions, Conditions, Actions
        for (const t of input.definitionJson.transitions) {
          const fromStateId = t.fromStateCode ? stateIdMap[t.fromStateCode] : null;
          const toStateId = stateIdMap[t.toStateCode];

          if (!toStateId) {
            throw new ValidationError(`Invalid target state code '${t.toStateCode}' inside transition '${t.code}'`);
          }

          const [transition] = await tx
            .insert(workflowTransitions)
            .values({
              workflowId: definition.id,
              versionId: version.id,
              fromStateId,
              toStateId,
              name: t.name,
              code: t.code,
              triggerType: t.triggerType || "MANUAL",
              slaHours: t.slaHours,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();

          // Map Roles
          if (t.roles) {
            for (const r of t.roles) {
              await tx.insert(workflowRoles).values({
                transitionId: transition.id,
                roleCode: r,
                createdAt: new Date(),
              });
            }
          }

          // Map Permissions
          if (t.permissions) {
            for (const p of t.permissions) {
              await tx.insert(workflowPermissions).values({
                transitionId: transition.id,
                permissionCode: p,
                createdAt: new Date(),
              });
            }
          }

          // Map Conditions
          if (t.conditions) {
            for (const cond of t.conditions) {
              await tx.insert(workflowConditions).values({
                transitionId: transition.id,
                logicalOperator: cond.logicalOperator || "AND",
                field: cond.field,
                operator: cond.operator,
                value: cond.value,
                customExpression: cond.customExpression,
                createdAt: new Date(),
              });
            }
          }

          // Map Actions on Transition
          if (t.actions) {
            for (let i = 0; i < t.actions.length; i++) {
              const act = t.actions[i];
              await tx.insert(workflowActions).values({
                transitionId: transition.id,
                triggerType: "ON_TRANSITION",
                actionType: act.actionType,
                parameters: JSON.stringify(act.parameters),
                executionOrder: i + 1,
                createdAt: new Date(),
              });
            }
          }
        }

        return { definition, version };
      });

      await AuditLogger.log(
        null,
        actorId,
        "WORKFLOW_DEFINITION_CREATE",
        "WORKFLOW_DEFINITION",
        result.definition.id,
        { code: input.code, name: input.name }
      );

      return result;
    } catch (error) {
      logger.error({ error, code: input.code }, "Error creating workflow definition");
      throw error;
    }
  }

  /**
   * Starts a new workflow instance for an entity.
   */
  async startWorkflowInstance(
    actorId: string,
    workflowCode: string,
    entityType: string,
    entityId: string,
    initialVariables: Record<string, any> = {}
  ): Promise<any> {
    try {
      // 1. Fetch active workflow definition & version
      const [definition] = await db
        .select()
        .from(workflowDefinitions)
        .where(and(eq(workflowDefinitions.code, workflowCode), eq(workflowDefinitions.isActive, true)))
        .limit(1);

      if (!definition) {
        throw new NotFoundError(`Active workflow definition with code '${workflowCode}'`);
      }

      const [version] = await db
        .select()
        .from(workflowVersions)
        .where(and(eq(workflowVersions.workflowId, definition.id), eq(workflowVersions.isActive, true)))
        .orderBy(desc(workflowVersions.version))
        .limit(1);

      if (!version) {
        throw new NotFoundError(`Active workflow version for definition '${workflowCode}'`);
      }

      // 2. Fetch initial state
      const [initialState] = await db
        .select()
        .from(workflowStates)
        .where(
          and(
            eq(workflowStates.versionId, version.id),
            eq(workflowStates.isInitial, true)
          )
        )
        .limit(1);

      if (!initialState) {
        throw new ValidationError(`Workflow version has no marked initial state`);
      }

      const slaDueDate = initialState.slaHours
        ? new Date(Date.now() + initialState.slaHours * 60 * 60 * 1000)
        : null;

      const instance = await db.transaction(async (tx) => {
        // Create Instance record
        const [inst] = await tx
          .insert(workflowInstances)
          .values({
            workflowId: definition.id,
            versionId: version.id,
            entityType,
            entityId,
            currentStateId: initialState.id,
            status: "RUNNING",
            startedBy: actorId,
            startedAt: new Date(),
            slaDueDate,
            optimisticLock: 1,
            updatedAt: new Date(),
          })
          .returning();

        // Save starting variables
        for (const [key, val] of Object.entries(initialVariables)) {
          await tx.insert(workflowVariables).values({
            instanceId: inst.id,
            name: key,
            value: typeof val === "object" ? JSON.stringify(val) : String(val),
            updatedAt: new Date(),
          });
        }

        // Log entry message to logs
        await tx.insert(workflowLogs).values({
          instanceId: inst.id,
          level: "INFO",
          message: `Workflow started in state '${initialState.name}' (${initialState.code})`,
          createdAt: new Date(),
        });

        // Save initial history entry
        await tx.insert(workflowInstanceHistory).values({
          instanceId: inst.id,
          toStateId: initialState.id,
          actionBy: actorId,
          actionAt: new Date(),
        });

        return inst;
      });

      // 3. Trigger initial state ON_ENTRY actions
      const stateActions = await db
        .select()
        .from(workflowActions)
        .where(
          and(
            eq(workflowActions.stateId, initialState.id),
            eq(workflowActions.triggerType, "ON_ENTRY")
          )
        )
        .orderBy(workflowActions.executionOrder);

      const mergedVariables = { ...initialVariables, entityId, entityType, currentState: initialState.code };
      for (const act of stateActions) {
        await ActionsEngine.executeAction(instance.id, act, mergedVariables);
      }

      // Publish events
      eventBus.publish("workflow.started", {
        instanceId: instance.id,
        workflowCode,
        entityType,
        entityId,
        startedBy: actorId,
      });

      await AuditLogger.log(
        null,
        actorId,
        "WORKFLOW_INSTANCE_START",
        entityType,
        entityId,
        { instanceId: instance.id, workflowCode }
      );

      return instance;
    } catch (error) {
      logger.error({ error, workflowCode, entityId }, "Error starting workflow instance");
      throw error;
    }
  }

  /**
   * Transitions a workflow instance to the next state.
   */
  async transitionWorkflowInstance(
    actorId: string,
    instanceId: string,
    transitionCode: string,
    additionalVariables: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    try {
      // 1. Fetch instance
      const [instance] = await db
        .select()
        .from(workflowInstances)
        .where(and(eq(workflowInstances.id, instanceId), sql`${workflowInstances.deletedAt} IS NULL`))
        .limit(1);

      if (!instance) {
        throw new NotFoundError(`Workflow instance with ID '${instanceId}'`);
      }

      if (instance.status !== "RUNNING") {
        throw new ValidationError(`Cannot transition a workflow instance in status '${instance.status}'`);
      }

      // Compile current variables
      const storedVars = await db.select().from(workflowVariables).where(eq(workflowVariables.instanceId, instanceId));
      const variables: Record<string, any> = {
        entityId: instance.entityId,
        entityType: instance.entityType,
      };
      for (const sv of storedVars) {
        variables[sv.name] = sv.value;
      }
      Object.assign(variables, additionalVariables);

      // 2. Resolve target transition definition
      const [transition] = await db
        .select()
        .from(workflowTransitions)
        .where(
          and(
            eq(workflowTransitions.versionId, instance.versionId),
            eq(workflowTransitions.fromStateId, instance.currentStateId),
            eq(workflowTransitions.code, transitionCode)
          )
        )
        .limit(1);

      if (!transition) {
        throw new ValidationError(`Invalid transition '${transitionCode}' from current state`);
      }

      // 3. Resolve States
      const [fromState] = await db
        .select()
        .from(workflowStates)
        .where(eq(workflowStates.id, instance.currentStateId))
        .limit(1);

      const [toState] = await db
        .select()
        .from(workflowStates)
        .where(eq(workflowStates.id, transition.toStateId))
        .limit(1);

      if (!toState) {
        throw new NotFoundError(`Target state of transition '${transitionCode}'`);
      }

      // 4. Validate Conditions
      const conditions = await db
        .select()
        .from(workflowConditions)
        .where(eq(workflowConditions.transitionId, transition.id));

      if (conditions.length > 0) {
        const pass = ConditionsEngine.evaluate(conditions as any, variables);
        if (!pass) {
          await db.insert(workflowLogs).values({
            instanceId,
            level: "WARN",
            message: `Transition '${transition.name}' failed conditions assessment`,
            details: JSON.stringify({ conditions, variables }),
            createdAt: new Date(),
          });
          eventBus.publish("condition.failed", { instanceId, transitionCode, variables });
          throw new ValidationError(`Transition failed logical conditions assessment`);
        }
      }

      // 5. Check Roles and Permissions authorizations
      const requiredRoles = await db
        .select()
        .from(workflowRoles)
        .where(eq(workflowRoles.transitionId, transition.id));

      const requiredPerms = await db
        .select()
        .from(workflowPermissions)
        .where(eq(workflowPermissions.transitionId, transition.id));

      if (requiredRoles.length > 0 || requiredPerms.length > 0) {
        // Standard user effective authorization compile
        const userPermsList = await this.authService.getUserPermissions(actorId);
        const userPermSet = new Set(userPermsList);

        // Fetch User Roles
        const userAssignedRoles = await this.authService.getUserEffectivePermissionsAndRoles(actorId);
        const userRoleCodes = new Set(userAssignedRoles.roles.map((r: any) => r.code));

        let isAuthorized = false;

        // Either user matches any assigned required role OR any required permission
        if (requiredRoles.length > 0) {
          isAuthorized = requiredRoles.some((rr) => userRoleCodes.has(rr.roleCode));
        }

        if (!isAuthorized && requiredPerms.length > 0) {
          isAuthorized = requiredPerms.some((rp) => userPermSet.has(rp.permissionCode));
        }

        // If not matching any, throw unauthorized
        if (!isAuthorized && requiredRoles.length > 0 && requiredPerms.length > 0) {
          throw new ValidationError("User is unauthorized to perform this transition (fails role and permission checks)");
        }
      }

      // 6. Check Approvals: If there are pending approvals for this state, block manual transitions until resolved
      const pendingApprovals = await db
        .select()
        .from(workflowApprovals)
        .where(
          and(
            eq(workflowApprovals.instanceId, instanceId),
            eq(workflowApprovals.stateId, instance.currentStateId),
            eq(workflowApprovals.status, "PENDING")
          )
        );

      if (pendingApprovals.length > 0 && transition.triggerType === "MANUAL") {
        throw new ValidationError(`Cannot transition. There are ${pendingApprovals.length} pending approvals outstanding in current state`);
      }

      // 7. Execute Transition atomically
      const updatedInstance = await db.transaction(async (tx) => {
        const slaDueDate = toState.slaHours
          ? new Date(Date.now() + toState.slaHours * 60 * 60 * 1000)
          : null;

        const isFinalState = toState.isFinal;
        const status = isFinalState ? "COMPLETED" : "RUNNING";
        const completedAt = isFinalState ? new Date() : null;

        // Perform Optimistic lock check
        const [inst] = await tx
          .update(workflowInstances)
          .set({
            currentStateId: toState.id,
            status,
            completedAt,
            slaDueDate,
            optimisticLock: instance.optimisticLock + 1,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(workflowInstances.id, instanceId),
              eq(workflowInstances.optimisticLock, instance.optimisticLock)
            )
          )
          .returning();

        if (!inst) {
          throw new ValidationError("Transaction failed: concurrent modifications detected on workflow instance (Optimistic Lock Error)");
        }

        // Save updated variables
        for (const [key, val] of Object.entries(additionalVariables)) {
          // Check if already exists
          const [exists] = await tx
            .select()
            .from(workflowVariables)
            .where(and(eq(workflowVariables.instanceId, instanceId), eq(workflowVariables.name, key)))
            .limit(1);

          if (exists) {
            await tx
              .update(workflowVariables)
              .set({ value: String(val), updatedAt: new Date() })
              .where(eq(workflowVariables.id, exists.id));
          } else {
            await tx.insert(workflowVariables).values({
              instanceId,
              name: key,
              value: String(val),
              updatedAt: new Date(),
            });
          }
        }

        // Save transition history
        const durationSeconds = Math.round((Date.now() - instance.updatedAt.getTime()) / 1000);
        await tx.insert(workflowInstanceHistory).values({
          instanceId,
          fromStateId: instance.currentStateId,
          toStateId: toState.id,
          transitionId: transition.id,
          actionBy: actorId,
          actionAt: new Date(),
          durationSeconds,
        });

        // Log entry message
        await tx.insert(workflowLogs).values({
          instanceId,
          level: "INFO",
          message: `Transition '${transition.name}' executed. Current state: '${toState.name}'`,
          createdAt: new Date(),
        });

        return inst;
      });

      // 8. Run State Exit, Transition and State Entry actions
      const exitActions = await db
        .select()
        .from(workflowActions)
        .where(and(eq(workflowActions.stateId, instance.currentStateId), eq(workflowActions.triggerType, "ON_EXIT")))
        .orderBy(workflowActions.executionOrder);

      const transActions = await db
        .select()
        .from(workflowActions)
        .where(and(eq(workflowActions.transitionId, transition.id), eq(workflowActions.triggerType, "ON_TRANSITION")))
        .orderBy(workflowActions.executionOrder);

      const entryActions = await db
        .select()
        .from(workflowActions)
        .where(and(eq(workflowActions.stateId, toState.id), eq(workflowActions.triggerType, "ON_ENTRY")))
        .orderBy(workflowActions.executionOrder);

      const mergedVariables = { ...variables, currentState: toState.code };

      for (const act of exitActions) {
        await ActionsEngine.executeAction(instanceId, act, mergedVariables);
      }
      for (const act of transActions) {
        await ActionsEngine.executeAction(instanceId, act, mergedVariables);
      }
      for (const act of entryActions) {
        await ActionsEngine.executeAction(instanceId, act, mergedVariables);
      }

      // 9. Publish event-bus updates
      eventBus.publish("workflow.transitioned", {
        instanceId,
        fromStateCode: fromState?.code,
        toStateCode: toState.code,
        transitionCode,
        actorId,
      });

      if (toState.isFinal) {
        eventBus.publish("workflow.completed", {
          instanceId,
          completedBy: actorId,
          completedAt: new Date(),
        });
      }

      await AuditLogger.log(
        null,
        actorId,
        "WORKFLOW_INSTANCE_TRANSITION",
        instance.entityType,
        instance.entityId,
        { instanceId, transitionCode, fromState: fromState?.code, toState: toState.code }
      );

      return updatedInstance;
    } catch (error) {
      logger.error({ error, instanceId, transitionCode }, "Error executing workflow transition");
      throw error;
    }
  }

  /**
   * Generates approval request for a step in parallel or sequential.
   */
  async createApprovalRequest(
    actorId: string,
    instanceId: string,
    approverId: string,
    stateId?: string,
    transitionId?: string,
    slaHours?: number
  ): Promise<any> {
    const slaDueDate = slaHours ? new Date(Date.now() + slaHours * 60 * 60 * 1000) : null;

    const [approval] = await db
      .insert(workflowApprovals)
      .values({
        instanceId,
        stateId,
        transitionId,
        approverId,
        status: "PENDING",
        slaDueDate,
        isEscalated: false,
        createdAt: new Date(),
      })
      .returning();

    eventBus.publish("approval.requested", {
      approvalId: approval.id,
      instanceId,
      approverId,
    });

    await db.insert(workflowLogs).values({
      instanceId,
      level: "INFO",
      message: `Approval request generated for user '${approverId}'`,
      createdAt: new Date(),
    });

    return approval;
  }

  /**
   * Approves a workflow step or task approval request.
   */
  async approveStep(actorId: string, approvalId: string, commentText?: string): Promise<any> {
    try {
      const [approval] = await db
        .select()
        .from(workflowApprovals)
        .where(eq(workflowApprovals.id, approvalId))
        .limit(1);

      if (!approval) {
        throw new NotFoundError(`Approval request '${approvalId}'`);
      }

      if (approval.status !== "PENDING") {
        throw new ValidationError(`Approval request is already in status '${approval.status}'`);
      }

      // Check authorization (actor must match approver or super admin or escalated target)
      if (approval.approverId !== actorId && approval.escalatedTo !== actorId) {
        const perms = await this.authService.getUserPermissions(actorId);
        if (!perms.includes("super_admin") && !perms.includes("workflows.approve")) {
          throw new ValidationError("Unauthorized: You are not the assigned approver for this request");
        }
      }

      const result = await db.transaction(async (tx) => {
        // 1. Update approval status
        const [updatedApproval] = await tx
          .update(workflowApprovals)
          .set({
            status: "APPROVED",
            actionAt: new Date(),
          })
          .where(eq(workflowApprovals.id, approvalId))
          .returning();

        // 2. Insert comment if any
        if (commentText) {
          await tx.insert(workflowComments).values({
            instanceId: approval.instanceId,
            stateId: approval.stateId,
            userId: actorId,
            commentText,
            createdAt: new Date(),
          });
        }

        await tx.insert(workflowLogs).values({
          instanceId: approval.instanceId,
          level: "INFO",
          message: `Approval request approved by user '${actorId}'`,
          createdAt: new Date(),
        });

        return updatedApproval;
      });

      // Trigger event
      eventBus.publish("approval.completed", {
        approvalId,
        instanceId: approval.instanceId,
        approverId: actorId,
        status: "APPROVED",
      });

      return result;
    } catch (error) {
      logger.error({ error, approvalId }, "Error approving workflow step");
      throw error;
    }
  }

  /**
   * Rejects a workflow step or task approval request.
   */
  async rejectStep(actorId: string, approvalId: string, commentText?: string): Promise<any> {
    try {
      const [approval] = await db
        .select()
        .from(workflowApprovals)
        .where(eq(workflowApprovals.id, approvalId))
        .limit(1);

      if (!approval) {
        throw new NotFoundError(`Approval request '${approvalId}'`);
      }

      if (approval.status !== "PENDING") {
        throw new ValidationError(`Approval request is already in status '${approval.status}'`);
      }

      // Check authorization
      if (approval.approverId !== actorId && approval.escalatedTo !== actorId) {
        const perms = await this.authService.getUserPermissions(actorId);
        if (!perms.includes("super_admin") && !perms.includes("workflows.approve")) {
          throw new ValidationError("Unauthorized: You are not the assigned approver for this request");
        }
      }

      const result = await db.transaction(async (tx) => {
        // 1. Update status
        const [updatedApproval] = await tx
          .update(workflowApprovals)
          .set({
            status: "REJECTED",
            actionAt: new Date(),
          })
          .where(eq(workflowApprovals.id, approvalId))
          .returning();

        // 2. Insert comment
        if (commentText) {
          await tx.insert(workflowComments).values({
            instanceId: approval.instanceId,
            stateId: approval.stateId,
            userId: actorId,
            commentText,
            createdAt: new Date(),
          });
        }

        await tx.insert(workflowLogs).values({
          instanceId: approval.instanceId,
          level: "WARN",
          message: `Approval request REJECTED by user '${actorId}'`,
          createdAt: new Date(),
        });

        return updatedApproval;
      });

      eventBus.publish("approval.rejected", {
        approvalId,
        instanceId: approval.instanceId,
        rejectedBy: actorId,
      });

      return result;
    } catch (error) {
      logger.error({ error, approvalId }, "Error rejecting workflow step");
      throw error;
    }
  }

  /**
   * Escalates an active pending approval request manually or automatically.
   */
  async escalateApproval(
    actorId: string,
    approvalId: string,
    escalatedTo: string,
    reason: string
  ): Promise<any> {
    try {
      const [approval] = await db
        .select()
        .from(workflowApprovals)
        .where(eq(workflowApprovals.id, approvalId))
        .limit(1);

      if (!approval) {
        throw new NotFoundError(`Approval request '${approvalId}'`);
      }

      const [updated] = await db
        .update(workflowApprovals)
        .set({
          isEscalated: true,
          escalatedTo,
          status: "ESCALATED",
        })
        .where(eq(workflowApprovals.id, approvalId))
        .returning();

      // Comment the escalation
      await db.insert(workflowComments).values({
        instanceId: approval.instanceId,
        stateId: approval.stateId,
        userId: actorId,
        commentText: `Escalated approval to user '${escalatedTo}'. Reason: ${reason}`,
        createdAt: new Date(),
      });

      await db.insert(workflowLogs).values({
        instanceId: approval.instanceId,
        level: "WARN",
        message: `Approval request Escalated to user '${escalatedTo}'`,
        createdAt: new Date(),
      });

      eventBus.publish("escalation.created", {
        approvalId,
        instanceId: approval.instanceId,
        escalatedTo,
      });

      return updated;
    } catch (error) {
      logger.error({ error, approvalId }, "Error escalating approval");
      throw error;
    }
  }

  /**
   * SLA Engine & Escalation background processor.
   * Scans running instance deadlines and pending approval deadlines to flag breaches and run escalations.
   */
  async evaluateSlas(): Promise<void> {
    try {
      const now = new Date();

      // 1. Scan running instances that breached SLA
      const breachedInstances = await db
        .select()
        .from(workflowInstances)
        .where(
          and(
            eq(workflowInstances.status, "RUNNING"),
            sql`${workflowInstances.slaDueDate} < ${now}`,
            sql`${workflowInstances.deletedAt} IS NULL`
          )
        );

      for (const inst of breachedInstances) {
        // Emit breach event & write warning log if not already flagged
        await db.insert(workflowLogs).values({
          instanceId: inst.id,
          level: "WARN",
          message: `SLA breach detected. Deadline was ${inst.slaDueDate?.toISOString()}`,
          createdAt: new Date(),
        });

        eventBus.publish("sla.breached", {
          instanceId: inst.id,
          entityType: inst.entityType,
          entityId: inst.entityId,
          dueDate: inst.slaDueDate,
        });
      }

      // 2. Scan pending approval requests that breached SLA
      const breachedApprovals = await db
        .select()
        .from(workflowApprovals)
        .where(
          and(
            eq(workflowApprovals.status, "PENDING"),
            sql`${workflowApprovals.slaDueDate} < ${now}`
          )
        );

      for (const app of breachedApprovals) {
        // Auto-escalate to super-admin or fallback recipient if configured
        const fallbackEscalator = "super_admin_fallback";
        
        await db
          .update(workflowApprovals)
          .set({
            isEscalated: true,
            escalatedTo: fallbackEscalator,
            status: "ESCALATED",
          })
          .where(eq(workflowApprovals.id, app.id));

        await db.insert(workflowLogs).values({
          instanceId: app.instanceId,
          level: "WARN",
          message: `SLA breach on approval request ID '${app.id}'. Automatically escalating to admin fallback.`,
          createdAt: new Date(),
        });

        eventBus.publish("sla.breached", {
          approvalId: app.id,
          instanceId: app.instanceId,
          approverId: app.approverId,
        });

        eventBus.publish("escalation.created", {
          approvalId: app.id,
          instanceId: app.instanceId,
          escalatedTo: fallbackEscalator,
        });
      }
    } catch (error) {
      logger.error(error, "Error running SLA evaluation task");
    }
  }

  /**
   * Exposes high level visual workflow layout. Suitable for future UI drag-and-drop engines.
   */
  async getWorkflowDiagram(workflowId: string): Promise<any> {
    try {
      const [definition] = await db
        .select()
        .from(workflowDefinitions)
        .where(eq(workflowDefinitions.id, workflowId))
        .limit(1);

      if (!definition) {
        throw new NotFoundError(`Workflow definition with ID '${workflowId}'`);
      }

      const states = await db.select().from(workflowStates).where(eq(workflowStates.workflowId, workflowId));
      const transitions = await db.select().from(workflowTransitions).where(eq(workflowTransitions.workflowId, workflowId));

      // Build node and link diagram metadata
      const nodes = states.map((s, index) => ({
        id: s.id,
        code: s.code,
        label: s.name,
        type: s.isInitial ? "start" : s.isFinal ? "end" : "state",
        position: { x: 100 + index * 200, y: 150 + (index % 2) * 100 },
        isInitial: s.isInitial,
        isFinal: s.isFinal,
        slaHours: s.slaHours,
      }));

      const edges = transitions.map((t) => ({
        id: t.id,
        code: t.code,
        label: t.name,
        source: t.fromStateId,
        target: t.toStateId,
        triggerType: t.triggerType,
      }));

      return {
        workflowId,
        code: definition.code,
        name: definition.name,
        diagram: { nodes, edges }
      };
    } catch (error) {
      logger.error({ error, workflowId }, "Error formatting diagram graph data");
      throw error;
    }
  }

  /**
   * Retrieves high-level SLA and performance dashboard metrics.
   */
  async getWorkflowStatistics(): Promise<any> {
    try {
      const totalInstances = await db.select({ count: sql<number>`count(*)` }).from(workflowInstances);
      const activeInstances = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowInstances)
        .where(eq(workflowInstances.status, "RUNNING"));

      const completedInstances = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowInstances)
        .where(eq(workflowInstances.status, "COMPLETED"));

      // Average duration of history executions
      const avgDuration = await db
        .select({ avg: sql<number>`avg(${workflowInstanceHistory.durationSeconds})` })
        .from(workflowInstanceHistory);

      // SLA Compliance ratio check
      const totalApprovalsCount = await db.select({ count: sql<number>`count(*)` }).from(workflowApprovals);
      const escalatedApprovalsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowApprovals)
        .where(eq(workflowApprovals.isEscalated, true));

      const complianceRatio = totalApprovalsCount[0].count > 0
        ? Math.round(((totalApprovalsCount[0].count - escalatedApprovalsCount[0].count) / totalApprovalsCount[0].count) * 100)
        : 100;

      return {
        totalInstances: Number(totalInstances[0].count),
        activeInstances: Number(activeInstances[0].count),
        completedInstances: Number(completedInstances[0].count),
        averageDurationSeconds: Math.round(Number(avgDuration[0].avg || 0)),
        escalatedApprovalsCount: Number(escalatedApprovalsCount[0].count),
        slaCompliancePercentage: complianceRatio,
      };
    } catch (error) {
      logger.error(error, "Error gathering statistics metrics");
      throw error;
    }
  }

  async listAllWorkflows(limit = 50, offset = 0): Promise<any[]> {
    return db.select().from(workflowDefinitions).limit(limit).offset(offset);
  }

  async getWorkflowInstanceLogs(instanceId: string): Promise<any[]> {
    return db
      .select()
      .from(workflowLogs)
      .where(eq(workflowLogs.instanceId, instanceId))
      .orderBy(workflowLogs.createdAt);
  }

  async getWorkflowInstanceHistory(instanceId: string): Promise<any[]> {
    return db
      .select()
      .from(workflowInstanceHistory)
      .where(eq(workflowInstanceHistory.instanceId, instanceId))
      .orderBy(workflowInstanceHistory.actionAt);
  }

  async getWorkflowInstances(workflowId?: string, status?: string, limit = 50, offset = 0): Promise<any[]> {
    const filters = [];
    if (workflowId) filters.push(eq(workflowInstances.workflowId, workflowId));
    if (status) filters.push(eq(workflowInstances.status, status as any));

    const q = db.select().from(workflowInstances).limit(limit).offset(offset);
    if (filters.length > 0) {
      q.where(and(...filters));
    }
    return q;
  }
}
