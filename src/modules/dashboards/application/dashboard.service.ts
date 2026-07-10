import { eq, and, inArray, sql, or } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import { 
  dashboardTemplates, 
  dashboardWidgets, 
  dashboardLayouts, 
  userDashboardPreferences,
  roles,
  userRoles
} from "../../../db/schema.ts";
import { users } from "../../../db/iam.schema.ts";
import logger from "../../../shared/infrastructure/logger.ts";

export interface DashboardWidgetConfig {
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isPinned?: boolean;
  isCollapsed?: boolean;
}

export class DashboardService {

  /**
   * Resolves the effective dashboard for a user based on their roles, department, and preferences.
   * Priority: User Preferences > Direct Assigned Template > Role Template > Department Template > Global Default
   */
  async getEffectiveDashboard(userId: string): Promise<any> {
    try {
      // 1. Fetch user context
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) throw new Error("User not found");

      // 2. Fetch user's roles
      const userRolesList = await db
        .select({ roleId: roles.id, code: roles.code })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, userId));

      const roleIds = userRolesList.map(r => r.roleId);

      // 3. Find candidate templates
      const templates = await db
        .select()
        .from(dashboardTemplates)
        .where(
          or(
            eq(dashboardTemplates.isDefault, true),
            user.department ? eq(dashboardTemplates.department, user.department) : undefined,
            roleIds.length > 0 ? inArray(dashboardTemplates.roleId, roleIds) : undefined
          )
        );

      // 4. Check user preferences
      const [preferences] = await db
        .select()
        .from(userDashboardPreferences)
        .where(eq(userDashboardPreferences.userId, userId))
        .limit(1);

      let targetTemplateId: string | null = null;

      if (preferences?.templateId) {
        targetTemplateId = preferences.templateId;
      } else if (templates.length > 0) {
        // Simple priority: Role > Department > Global Default
        const roleTemplate = templates.find(t => t.roleId);
        const deptTemplate = templates.find(t => t.department === user.department);
        const globalDefault = templates.find(t => t.isDefault);
        
        targetTemplateId = roleTemplate?.id || deptTemplate?.id || globalDefault?.id || null;
      }

      if (!targetTemplateId) {
        // Fallback to empty if no templates configured
        return { widgets: [] };
      }

      // 5. Fetch Template Layout
      const layoutItems = await db
        .select({
          id: dashboardLayouts.id,
          widgetId: dashboardLayouts.widgetId,
          x: dashboardLayouts.gridPosX,
          y: dashboardLayouts.gridPosY,
          w: dashboardLayouts.gridWidth,
          h: dashboardLayouts.gridHeight,
          isPinned: dashboardLayouts.isPinned,
          isCollapsed: dashboardLayouts.isCollapsed,
          widget: {
            name: dashboardWidgets.name,
            code: dashboardWidgets.code,
            componentType: dashboardWidgets.componentType,
            apiEndpoint: dashboardWidgets.apiEndpoint,
            refreshInterval: dashboardWidgets.refreshInterval,
            permissionRequired: dashboardWidgets.permissionRequired,
          }
        })
        .from(dashboardLayouts)
        .innerJoin(dashboardWidgets, eq(dashboardLayouts.widgetId, dashboardWidgets.id))
        .where(eq(dashboardLayouts.templateId, targetTemplateId));

      // 6. Apply User Overrides
      const finalWidgets = layoutItems;
      // Merge logic could be added here for fine-grained layout overrides

      return {
        templateId: targetTemplateId,
        widgets: finalWidgets
      };
    } catch (error) {
      logger.error({ error, userId }, "Error resolving effective dashboard");
      throw error;
    }
  }

  async listAllWidgets(): Promise<any[]> {
    return db.select().from(dashboardWidgets);
  }

  async createWidget(data: any): Promise<any> {
    const [widget] = await db.insert(dashboardWidgets).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return widget;
  }

  async createDashboardTemplate(data: any, layout: DashboardWidgetConfig[]): Promise<any> {
    return await db.transaction(async (tx) => {
      const [template] = await tx.insert(dashboardTemplates).values({
        name: data.name,
        description: data.description,
        roleId: data.roleId,
        department: data.department,
        businessUnit: data.businessUnit,
        visibility: data.visibility || "GLOBAL",
        isDefault: data.isDefault || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      if (layout.length > 0) {
        const layoutEntries = layout.map(item => ({
          templateId: template.id,
          widgetId: item.widgetId,
          gridPosX: item.x,
          gridPosY: item.y,
          gridWidth: item.w,
          gridHeight: item.h,
          isPinned: item.isPinned || false,
          isCollapsed: item.isCollapsed || false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        await tx.insert(dashboardLayouts).values(layoutEntries);
      }

      return template;
    });
  }

  async saveUserPreferences(userId: string, data: { templateId?: string, overrides?: any, hidden?: string[] }): Promise<any> {
    const [existing] = await db
      .select()
      .from(userDashboardPreferences)
      .where(eq(userDashboardPreferences.userId, userId))
      .limit(1);

    const values: any = {
      userId,
      templateId: data.templateId,
      layoutOverridesJson: data.overrides ? JSON.stringify(data.overrides) : undefined,
      hiddenWidgetsJson: data.hidden ? JSON.stringify(data.hidden) : undefined,
      updatedAt: new Date(),
    };

    if (existing) {
      const [updated] = await db
        .update(userDashboardPreferences)
        .set(values)
        .where(eq(userDashboardPreferences.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userDashboardPreferences)
        .values({ ...values, createdAt: new Date() })
        .returning();
      return created;
    }
  }

  async listAllTemplates(): Promise<any[]> {
    const templates = await db.select().from(dashboardTemplates);
    const layouts = await db.select().from(dashboardLayouts);
    const widgets = await db.select().from(dashboardWidgets);
    
    return templates.map(t => {
      const templateLayouts = layouts.filter(l => l.templateId === t.id);
      const mappedWidgets = templateLayouts.map(l => {
        const w = widgets.find(widget => widget.id === l.widgetId);
        return {
          id: l.id,
          widgetId: l.widgetId,
          x: l.gridPosX,
          y: l.gridPosY,
          w: l.gridWidth,
          h: l.gridHeight,
          isPinned: l.isPinned,
          isCollapsed: l.isCollapsed,
          widget: w
        };
      });
      return {
        ...t,
        widgets: mappedWidgets
      };
    });
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(dashboardLayouts).where(eq(dashboardLayouts.templateId, templateId));
      await tx.delete(dashboardTemplates).where(eq(dashboardTemplates.id, templateId));
    });
  }

  async updateWidget(widgetId: string, data: any): Promise<any> {
    const [updated] = await db
      .update(dashboardWidgets)
      .set({
        name: data.name,
        code: data.code,
        moduleId: data.moduleId || null,
        featureId: data.featureId || null,
        permissionRequired: data.permissionRequired || null,
        apiEndpoint: data.apiEndpoint || null,
        refreshInterval: data.refreshInterval !== undefined ? Number(data.refreshInterval) : 300,
        componentType: data.componentType || "KPI",
        defaultConfigJson: data.defaultConfigJson || null,
        visibilityRulesJson: data.visibilityRulesJson || null,
        updatedAt: new Date()
      })
      .where(eq(dashboardWidgets.id, widgetId))
      .returning();
    return updated;
  }

  async deleteWidget(widgetId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(dashboardLayouts).where(eq(dashboardLayouts.widgetId, widgetId));
      await tx.delete(dashboardWidgets).where(eq(dashboardWidgets.id, widgetId));
    });
  }
}
