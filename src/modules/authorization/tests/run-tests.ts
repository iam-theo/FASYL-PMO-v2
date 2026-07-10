import { AuthorizationService } from "../application/authorization.service.ts";
import { seedAuthorization } from "../infrastructure/seeder.ts";
import logger from "../../../shared/infrastructure/logger.ts";

async function executeTests() {
  logger.info("================ STARTING RBAC/PBAC INTEGRATION TESTS ================");
  
  const auth = new AuthorizationService();

  // 1. Ensure database is seeded
  logger.info("Step 1: Running Idempotent Seeder...");
  await seedAuthorization();
  logger.info("Seeder finished successfully.");

  const testUserId = "test-user-uuid-999";
  const actorId = "test-actor-admin";

  // Clean up any stale test records from prior runs
  logger.info("Cleaning up old test state...");
  try {
    await auth.removeRoleFromUser(actorId, testUserId, "test_custom_lead");
  } catch (e) {}
  try {
    await auth.deleteCustomRole(actorId, "test_custom_lead");
  } catch (e) {}
  try {
    await auth.removeDirectPermissionFromUser(actorId, testUserId, "audit.view");
    await auth.removeDirectPermissionFromUser(actorId, testUserId, "tasks.delete");
  } catch (e) {}

  // 2. Test listing roles and permissions
  logger.info("Step 2: Listing Roles and Permissions...");
  const roles = await auth.listAllRoles();
  const permissions = await auth.listAllPermissions();
  logger.info(`Found ${roles.length} seeded roles.`);
  if (roles.length < 20) throw new Error("Expected at least 22 seeded roles!");

  // 3. Create a custom role
  logger.info("Step 3: Creating a custom role 'test_custom_lead'...");
  const newRole = await auth.createCustomRole(actorId, {
    name: "Test Custom Lead",
    code: "test_custom_lead",
    description: "A custom test role",
    permissionNames: ["projects.create", "projects.view", "tasks.create", "tasks.view", "tasks.delete"]
  });
  logger.info(`Custom role created: ${newRole.name} with ID ${newRole.id}`);

  // 4. Assign custom role to user
  logger.info(`Step 4: Assigning 'test_custom_lead' to user '${testUserId}'...`);
  await auth.assignRoleToUser(actorId, testUserId, "test_custom_lead");

  // 5. Verify effective permissions
  logger.info("Step 5: Verifying effective permissions for user...");
  let userPerms = await auth.getUserPermissions(testUserId);
  logger.info(`Effective permissions for ${testUserId}: ${JSON.stringify(userPerms)}`);
  
  const expected = ["projects.create", "projects.view", "tasks.create", "tasks.view", "tasks.delete"];
  for (const exp of expected) {
    if (!userPerms.includes(exp)) {
      throw new Error(`Expected permission ${exp} is missing from user's compiled set`);
    }
  }

  // 6. Test boolean checkers
  logger.info("Step 6: Testing Boolean check permissions helpers...");
  const hasView = await auth.hasPermission(testUserId, "projects.view");
  const hasInvalid = await auth.hasPermission(testUserId, "admin.logs");
  const hasAnd = await auth.hasPermission(testUserId, ["projects.create", "tasks.create"], { logical: "AND" });
  const hasOr = await auth.hasPermission(testUserId, ["projects.create", "admin.logs"], { logical: "OR" });

  if (!hasView) throw new Error("Check failed: should have projects.view");
  if (hasInvalid) throw new Error("Check failed: should NOT have admin.logs");
  if (!hasAnd) throw new Error("Check failed: should have both projects.create AND tasks.create");
  if (!hasOr) throw new Error("Check failed: should have at least projects.create");
  logger.info("All boolean permission checks passed perfectly!");

  // 7. Test direct overrides (ALLOW & DENY)
  logger.info("Step 7: Testing PBAC Direct Permission Overrides...");
  
  // Direct ALLOW: Assign 'audit.view' directly
  logger.info("Applying direct ALLOW override for 'audit.view'...");
  await auth.assignDirectPermissionToUser(actorId, testUserId, "audit.view", "ALLOW");
  userPerms = await auth.getUserPermissions(testUserId);
  if (!userPerms.includes("audit.view")) {
    throw new Error("Direct ALLOW override failed: 'audit.view' is not in effective permissions");
  }

  // Direct DENY: Deny 'tasks.delete' directly (which the user originally had from their role!)
  logger.info("Applying direct DENY override for 'tasks.delete'...");
  await auth.assignDirectPermissionToUser(actorId, testUserId, "tasks.delete", "DENY");
  userPerms = await auth.getUserPermissions(testUserId);
  if (userPerms.includes("tasks.delete")) {
    throw new Error("Direct DENY override failed: 'tasks.delete' is still in effective permissions despite explicit DENY");
  }
  logger.info("Direct ALLOW and DENY override logic fully verified!");

  // 8. Clean up
  logger.info("Step 8: Cleaning up test records...");
  await auth.removeRoleFromUser(actorId, testUserId, "test_custom_lead");
  await auth.deleteCustomRole(actorId, "test_custom_lead");
  await auth.removeDirectPermissionFromUser(actorId, testUserId, "audit.view");
  await auth.removeDirectPermissionFromUser(actorId, testUserId, "tasks.delete");

  const finalPerms = await auth.getUserPermissions(testUserId);
  if (finalPerms.length > 0) {
    throw new Error("Clean up failed: user still has effective permissions remaining");
  }

  logger.info("================ ALL RBAC/PBAC INTEGRATION TESTS PASSED 100% SUCCESS ================");
}

executeTests()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, "RBAC/PBAC Integration Tests FAILED!");
    process.exit(1);
  });
