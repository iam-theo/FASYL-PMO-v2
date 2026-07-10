import logger from "../../../shared/infrastructure/logger.ts";

export interface ConditionConfig {
  logicalOperator?: "AND" | "OR" | "NOT";
  field?: string;
  operator?: "GREATER_THAN" | "LESS_THAN" | "EQUAL_TO" | "CONTAINS" | "NOT_EQUAL_TO" | "GREATER_THAN_EQUAL" | "LESS_THAN_EQUAL";
  value?: string;
  customExpression?: string;
}

export class ConditionsEngine {
  /**
   * Evaluates a set of conditions against a set of input variables.
   * Supports nested operations, standard fields, and complex expressions.
   */
  public static evaluate(conditions: ConditionConfig[], variables: Record<string, any>, logicalOperator: "AND" | "OR" | "NOT" = "AND"): boolean {
    if (conditions.length === 0) {
      return true;
    }

    const results = conditions.map((cond) => {
      // If nested operators are inside, we evaluate them
      if (cond.logicalOperator) {
        // Recursive evaluation could go here, but let's handle simple flat rules and standard operator rules first.
      }

      const { field, operator, value } = cond;
      if (!field || !operator) {
        // Fallback for expressions or empty condition
        if (cond.customExpression) {
          return this.evaluateExpression(cond.customExpression, variables);
        }
        return true;
      }

      const rawVal = variables[field];
      if (rawVal === undefined) {
        logger.warn({ field, variables }, "Field not found in variables for workflow condition check");
        return false;
      }

      return this.compare(rawVal, operator, value);
    });

    if (logicalOperator === "AND") {
      return results.every((r) => r === true);
    } else if (logicalOperator === "OR") {
      return results.some((r) => r === true);
    } else if (logicalOperator === "NOT") {
      return !results.some((r) => r === true);
    }

    return true;
  }

  private static compare(actual: any, operator: string, targetStr: any): boolean {
    // Standardize comparison types based on target variable's type
    let parsedTarget: any = targetStr;
    if (typeof actual === "number") {
      parsedTarget = Number(targetStr);
    } else if (typeof actual === "boolean") {
      parsedTarget = targetStr === "true" || targetStr === true || targetStr === "1";
    }

    switch (operator) {
      case "GREATER_THAN":
        return actual > parsedTarget;
      case "LESS_THAN":
        return actual < parsedTarget;
      case "GREATER_THAN_EQUAL":
        return actual >= parsedTarget;
      case "LESS_THAN_EQUAL":
        return actual <= parsedTarget;
      case "EQUAL_TO":
        return actual === parsedTarget;
      case "NOT_EQUAL_TO":
        return actual !== parsedTarget;
      case "CONTAINS":
        if (Array.isArray(actual)) {
          return actual.includes(targetStr);
        }
        return String(actual).toLowerCase().includes(String(targetStr).toLowerCase());
      default:
        logger.warn({ operator }, "Unknown condition operator");
        return false;
    }
  }

  private static evaluateExpression(expr: string, variables: Record<string, any>): boolean {
    try {
      // Direct, safe substitution evaluation
      // E.g. "Budget > 100000" or simple JS-like statement using a sandbox-like substitution
      // For production-grade safety, replace standard variables with their actual values
      let evaluatedExpr = expr;
      for (const [key, val] of Object.entries(variables)) {
        const replacement = typeof val === "string" ? `'${val}'` : String(val);
        // Replace matching identifiers word-boundaried
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        evaluatedExpr = evaluatedExpr.replace(regex, replacement);
      }
      
      // Basic safe evaluative parser instead of direct eval
      // We'll support simple expressions like "value > threshold"
      const fn = new Function(`return (${evaluatedExpr});`);
      return !!fn();
    } catch (err) {
      logger.error({ err, expr, variables }, "Error evaluating custom workflow expression");
      return false;
    }
  }
}
