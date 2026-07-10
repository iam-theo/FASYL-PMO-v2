import { db } from "../../../shared/database/index.ts";
import { workflowNotifications, workflowLogs } from "../../../db/schema.ts";
import { eventBus } from "../../../shared/domain/event-bus.ts";
import logger from "../../../shared/infrastructure/logger.ts";

export interface ActionConfig {
  actionType: "SEND_NOTIFICATION" | "ASSIGN_USER" | "CREATE_TASK" | "EVENT_BUS" | "WEBHOOK" | "UPDATE_STATUS";
  parameters: string; // JSON string parameters
}

export class ActionsEngine {
  /**
   * Executes automatic actions for a workflow transition or state entry/exit.
   */
  public static async executeAction(
    instanceId: string,
    action: { actionType: string; parameters: string | null },
    variables: Record<string, any>
  ): Promise<void> {
    const actionType = action.actionType;
    const params = action.parameters ? JSON.parse(action.parameters) : {};

    logger.info({ instanceId, actionType, params }, "Executing workflow automatic action...");

    try {
      // 1. Log the execution
      await db.insert(workflowLogs).values({
        instanceId,
        level: "INFO",
        message: `Executing automatic action of type '${actionType}'`,
        details: JSON.stringify({ actionType, params }),
        createdAt: new Date(),
      });

      switch (actionType) {
        case "SEND_NOTIFICATION": {
          const { recipientId, title, message } = params;
          if (recipientId && title && message) {
            // Support variable placeholder interpolation
            const interpolatedTitle = this.interpolate(title, variables);
            const interpolatedMsg = this.interpolate(message, variables);

            await db.insert(workflowNotifications).values({
              instanceId,
              recipientId,
              title: interpolatedTitle,
              message: interpolatedMsg,
              isSent: true,
              sentAt: new Date(),
              createdAt: new Date(),
            });

            // Trigger event bus notification
            eventBus.publish("notification.sent", {
              instanceId,
              recipientId,
              title: interpolatedTitle,
              message: interpolatedMsg,
            });
          }
          break;
        }

        case "ASSIGN_USER": {
          const { assignField, value } = params;
          if (assignField && value) {
            variables[assignField] = value;
            logger.info({ instanceId, assignField, value }, "Workflow updated variable for user assignment");
          }
          break;
        }

        case "EVENT_BUS": {
          const { eventName, payload } = params;
          if (eventName) {
            const interpolatedPayload = typeof payload === "object" 
              ? JSON.parse(this.interpolate(JSON.stringify(payload), variables))
              : payload;
            
            eventBus.publish(eventName, {
              instanceId,
              payload: interpolatedPayload,
              executedAt: new Date(),
            });

            eventBus.publish("action.executed", {
              instanceId,
              actionType,
              details: { eventName, payload: interpolatedPayload }
            });
          }
          break;
        }

        case "UPDATE_STATUS": {
          const { statusField, newStatus } = params;
          if (statusField && newStatus) {
            // This is handled upstream or updates variables
            variables[statusField] = newStatus;
          }
          break;
        }

        case "WEBHOOK": {
          const { url, method, headers, body } = params;
          if (url) {
            const interpolatedBody = body ? this.interpolate(JSON.stringify(body), variables) : "{}";
            logger.info({ url, method: method || "POST", body: interpolatedBody }, "Simulating external webhook call for workflow engine");
            // In a real environment we would use fetch() or axios, let's log and trigger action.executed
            eventBus.publish("action.executed", {
              instanceId,
              actionType: "WEBHOOK",
              details: { url, method, body: interpolatedBody }
            });
          }
          break;
        }

        default:
          logger.warn({ actionType }, "Unsupported automatic action type in Workflow Actions Engine");
          break;
      }
    } catch (err: any) {
      logger.error({ err, instanceId, actionType }, "Failed to execute workflow automatic action");
      
      await db.insert(workflowLogs).values({
        instanceId,
        level: "ERROR",
        message: `Failed executing action '${actionType}': ${err.message}`,
        details: err.stack,
        createdAt: new Date(),
      });

      eventBus.publish("workflow.failed", { instanceId, error: err.message });
    }
  }

  private static interpolate(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }
}
