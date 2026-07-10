import fs from 'fs';

function modifyFile(filePath: string, searchStr: string, replacement: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes(searchStr)) {
    fs.writeFileSync(filePath, content.replace(searchStr, replacement));
    console.log(`Updated ${filePath}`);
  } else {
    console.log(`Could not find search string in ${filePath}`);
  }
}

// 1. authorization.service.ts
const authServicePath = 'src/modules/authorization/application/authorization.service.ts';
let authServiceContent = fs.readFileSync(authServicePath, 'utf-8');

if (!authServiceContent.includes('import bcrypt')) {
  authServiceContent = `import bcrypt from "bcrypt";\nimport { passwords, departmentCapacities } from "../../../db/schema.ts";\n` + authServiceContent;
}

if (!authServiceContent.includes('async createUser(')) {
  const insertUsers = `
  async createUser(userData: any, roleCode: string, directPermissions: string[] = []): Promise<any> {
    return db.transaction(async (tx) => {
      // 1. Insert user
      const [user] = await tx.insert(users).values({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        username: userData.username || userData.email.split('@')[0],
        department: userData.department,
        jobTitle: userData.jobTitle || "Employee"
      }).returning();

      // 2. Hash password (default: Password123!)
      const hash = await bcrypt.hash(userData.password || "Password123!", 10);
      await tx.insert(passwords).values({
        userId: user.id,
        hash,
        mustChange: true,
      });

      // 3. Assign role
      if (roleCode) {
        const [role] = await tx.select().from(roles).where(eq(roles.code, roleCode));
        if (role) {
          await tx.insert(userRoles).values({
            userId: user.id,
            roleId: role.id,
            assignedBy: "system",
          });
        }
      }

      // 4. Assign permissions
      for (const p of directPermissions) {
        await tx.insert(userDirectPermissions).values({
          userId: user.id,
          permissionName: p,
          isDeny: false,
          grantedBy: "system"
        });
      }

      return user;
    });
  }

  async listDepartments(): Promise<string[]> {
    const deptCaps = await db.select({ dept: departmentCapacities.department }).from(departmentCapacities);
    const userDepts = await db.select({ dept: users.department }).from(users).where(isNotNull(users.department));
    const all = new Set([...deptCaps.map(d => d.dept), ...userDepts.map(u => u.dept)]);
    return Array.from(all).filter(Boolean) as string[];
  }
`;
  authServiceContent = authServiceContent.replace(
    'async listAllUsers(): Promise<any[]> {',
    insertUsers + '\n  async listAllUsers(): Promise<any[]> {'
  );
  if(!authServiceContent.includes('isNotNull')) {
      authServiceContent = authServiceContent.replace('import { eq, inArray, and, or, sql } from "drizzle-orm";', 'import { eq, inArray, and, or, sql, isNotNull } from "drizzle-orm";');
  }
  fs.writeFileSync(authServicePath, authServiceContent);
  console.log('Updated authorization.service.ts');
}

// 2. authorization.controller.ts
const authControllerPath = 'src/modules/authorization/interface/authorization.controller.ts';
let authControllerContent = fs.readFileSync(authControllerPath, 'utf-8');

if (!authControllerContent.includes('async createUser(')) {
  const insertController = `
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { firstName, lastName, email, department, roleCode, permissions, password } = req.body;
      const data = await authService.createUser(
        { firstName, lastName, email, department, password },
        roleCode,
        permissions || []
      );
      return ResponseFormatter.success(res, data, "User created successfully", StatusCode.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async listDepartments(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.listDepartments();
      return ResponseFormatter.success(res, data, "Departments retrieved successfully", StatusCode.OK);
    } catch (error) {
      next(error);
    }
  }
`;
  authControllerContent = authControllerContent.replace(
    'async listUsers(req: Request, res: Response, next: NextFunction) {',
    insertController + '\n  async listUsers(req: Request, res: Response, next: NextFunction) {'
  );
  fs.writeFileSync(authControllerPath, authControllerContent);
  console.log('Updated authorization.controller.ts');
}

// 3. authorization.router.ts
modifyFile(
  'src/modules/authorization/interface/authorization.router.ts',
  'router.get("/users", authMiddleware, requirePermissions("admin.users"), controller.listUsers);',
  'router.post("/users", authMiddleware, requirePermissions("admin.users"), controller.createUser);\nrouter.get("/users", authMiddleware, requirePermissions("admin.users"), controller.listUsers);\nrouter.get("/departments", authMiddleware, controller.listDepartments);'
);

// 4. api.ts
modifyFile(
  'src/lib/api.ts',
  '  getUsers: () => v1Fetch("/api/v1/auth/users"),',
  '  getUsers: () => v1Fetch("/api/v1/auth/users"),\n  createUser: (data: any) => v1Fetch("/api/v1/auth/users", { method: "POST", body: JSON.stringify(data) }),\n  getDepartments: () => v1Fetch("/api/v1/auth/departments"),'
);

// 5. DashboardLayout.tsx
modifyFile(
  'src/layouts/DashboardLayout.tsx',
  '{ id: "admin", label: "Administration", icon: Shield, permission: "admin.roles" },',
  '{ id: "users", label: "Users", icon: Users, permission: "admin.users" },\n        { id: "admin", label: "Administration", icon: Shield, permission: "admin.roles" },'
);

// 6. App.tsx
modifyFile(
  'src/App.tsx',
  'import { AdminConsole } from "./components/AdminConsole.tsx";',
  'import { AdminConsole } from "./components/AdminConsole.tsx";\nimport { UsersView } from "./components/UsersView.tsx";'
);
modifyFile(
  'src/App.tsx',
  '{activePage === "admin" && <AdminConsole />}',
  '{activePage === "admin" && <AdminConsole />}\n        {activePage === "users" && <UsersView />}'
);

