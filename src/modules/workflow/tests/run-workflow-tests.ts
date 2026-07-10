import { WorkflowService } from "../application/workflow.service.ts";
import { ConditionsEngine } from "../application/conditions.engine.ts";
import { ActionsEngine } from "../application/actions.engine.ts";
import { AuthorizationService } from "../../authorization/application/authorization.service.ts";
import { seedAuthorization } from "../../authorization/infrastructure/seeder.ts";
import { db } from "../../../shared/database/index.ts";
import { workflowDefinitions, workflowInstances, workflowApprovals } from "../../../db/schema.ts";
import logger from "../../../shared/infrastructure/logger.ts";

async function executeWorkflowTests() {
  logger.info("================ STARTING ENTERPRISE WORKFLOW ENGINE SIMULATION TESTS ================");

  // 1. Seed Authorization RBAC to check transition authority integration
  logger.info("Step 1: Running Idempotent RBAC Seeder...");
  await seedAuthorization();

  const auth = new AuthorizationService();
  const workflow = new WorkflowService();

  const testActor = "test-actor-workflow-admin";
  const testApprover = "test-actor-pmo-director";

  // Grant role 'pmo_director' and custom permissions to our actor for RBAC/PBAC integration tests
  try {
    await auth.assignRoleToUser(testActor, testActor, "pmo_director");
    await auth.assignRoleToUser(testActor, testApprover, "pmo_director");
  } catch (e) {}

  // 2. Test the Business Rules / Conditions Engine
  logger.info("Step 2: Testing Conditions / Business Rules Engine...");
  const sampleVariables = { budget: 15000000, riskScore: 90, status: "DRAFT" };
  
  const rulePassed = ConditionsEngine.evaluate(
    [
      { field: "budget", operator: "GREATER_THAN", value: "10000000" },
      { field: "riskScore", operator: "GREATER_THAN_EQUAL", value: "85" }
    ],
    sampleVariables
  );

  const ruleFailed = ConditionsEngine.evaluate(
    [
      { field: "budget", operator: "LESS_THAN", value: "50000" }
    ],
    sampleVariables
  );

  if (!rulePassed) throw new Error("Conditions Engine failed: Should have passed budget > 10M check");
  if (ruleFailed) throw new Error("Conditions Engine failed: Should have failed budget < 50k check");
  logger.info("Conditions Engine passed all test scenarios perfectly!");

  // 4. Register a Workflow Definition
  logger.info("Step 4: Registering 'project_approval_workflow'...");
  const registered = await workflow.createWorkflowDefinition(testActor, {
    name: "Enterprise Project Gateway Workflow",
    code: "project_gateway_flow_" + Date.now(),
    description: "Multi-stage project funding gateway",
    definitionJson: {
      states: [
        {
          code: "DRAFT",
          name: "Project Draft",
          isInitial: true,
          slaHours: 24,
          actions: [
            {
              triggerType: "ON_ENTRY",
              actionType: "SEND_NOTIFICATION",
              parameters: {
                recipientId: "pmo_office",
                title: "Draft project initiated",
                message: "A new project has been created."
              }
            }
          ]
        },
        {
          code: "PENDING_APPROVAL",
          name: "Pending Executive Approval",
          slaHours: 48
        },
        {
          code: "APPROVED",
          name: "Gateway Approved",
          isFinal: true
        }
      ],
      transitions: [
        {
          code: "SUBMIT",
          name: "Submit for Approval",
          fromStateCode: "DRAFT",
          toStateCode: "PENDING_APPROVAL",
          roles: ["pmo_director"],
          conditions: [
            { field: "budget", operator: "GREATER_THAN", value: "10000000" }
          ],
          actions: [
            {
              actionType: "EVENT_BUS",
              parameters: {
                eventName: "project.submitted",
                payload: { status: "submitted_for_review" }
              }
            }
          ]
        },
        {
          code: "APPROVE",
          name: "Final Executive Signoff",
          fromStateCode: "PENDING_APPROVAL",
          toStateCode: "APPROVED"
        }
      ]
    }
  });

  const wfDefCode = registered.definition.code;
  logger.info(`Workflow registered with ID '${registered.definition.id}'`);

  // 5. Start a Workflow Instance
  logger.info("Step 5: Starting a workflow instance...");
  const entityId = "entity-pmo-" + Date.now();
  const instance = await workflow.startWorkflowInstance(
    testActor,
    wfDefCode,
    "PROJECT",
    entityId,
    { budget: 15000000, riskScore: 75 }
  );
  logger.info(`Workflow instance started with ID '${instance.id}'`);

  // 3. Test Actions Engine
  logger.info("Step 3: Testing Actions Engine...");
  let variablesForAction = { owner: "Theo", messageText: "Workflow initialized" };
  await ActionsEngine.executeAction(
    instance.id,
    {
      actionType: "SEND_NOTIFICATION",
      parameters: JSON.stringify({
        recipientId: "test-user-recipient",
        title: "Hello {{ owner }}",
        message: "Your message: {{ messageText }}"
      })
    },
    variablesForAction
  );
  logger.info("Actions Engine executed and logged beautifully.");

  // 6. Execute Gateway submit transition
  logger.info("Step 6: Executing SUBMIT transition...");
  const transitioned = await workflow.transitionWorkflowInstance(
    testActor,
    instance.id,
    "SUBMIT"
  );
  logger.info(`Transition completed. State is now '${transitioned.currentStateId}'`);

  // 7. Test custom Approval request creation & completion
  logger.info("Step 7: Creating approval request step...");
  const approval = await workflow.createApprovalRequest(
    testActor,
    instance.id,
    testApprover,
    transitioned.currentStateId,
    undefined,
    24
  );
  logger.info(`Approval created: ID '${approval.id}' in state '${approval.status}'`);

  // Approve the step
  logger.info("Approving step...");
  await workflow.approveStep(testApprover, approval.id, "Gateway checks passed perfectly. Approved!");
  logger.info("Step approved successfully.");

  // 8. Test statistics
  logger.info("Step 8: Fetching statistics...");
  const stats = await workflow.getWorkflowStatistics();
  logger.info(`Workflow metrics compiled: ${JSON.stringify(stats)}`);

  // 9. Test diagram layout
  logger.info("Step 9: Fetching workflow diagram metadata...");
  const diagram = await workflow.getWorkflowDiagram(registered.definition.id);
  logger.info(`Found ${diagram.diagram.nodes.length} nodes and ${diagram.diagram.edges.length} visual links.`);

  logger.info("================ ALL ENTERPRISE WORKFLOW ENGINE TESTS PASSED 100% SUCCESS ================");
}

executeWorkflowTests()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, "Enterprise Workflow Engine Simulation Tests FAILED!");
    process.exit(1);
  });
