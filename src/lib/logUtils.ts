import { formatLagosDateTime } from "./dateUtils";

/**
 * Known fallback user profiles for system and standard mock accounts
 */
export const KNOWN_ACTORS: Record<string, { name: string; role: string }> = {
  "usr-alex": { name: "Alex Rivers", role: "Operations Lead" },
  "usr-sarah": { name: "Sarah Jenkins", role: "Project Manager" },
  "usr-pmo-99": { name: "Peter Morris", role: "PMO Analyst" },
  "user-pmo-99": { name: "Peter Morris", role: "PMO Analyst" },
  "usr-admin": { name: "Administrator", role: "System Admin" },
  "admin": { name: "Administrator", role: "System Admin" },
  "admin-user": { name: "Administrator", role: "System Admin" },
  "system": { name: "System Engine", role: "Automated Service" },
  "System": { name: "System Engine", role: "Automated Service" },
  "tm-1": { name: "Alex Rivers", role: "Operations Lead" },
  "tm-2": { name: "Sarah Jenkins", role: "Project Manager" },
  "tm-3": { name: "Michael Chen", role: "Finance Director" },
};

/**
 * Resolves an actor identifier to "Full Name (Role)" based on a fetched users list or standard fallback mappings.
 */
export function resolveActorNameAndRole(actorId: string | null | undefined, usersList?: any[]): string {
  if (!actorId) return "System (Automated Service)";

  // Try to find in the dynamically fetched users list
  if (usersList && Array.isArray(usersList)) {
    const matched = usersList.find(
      (u: any) => u.id === actorId || u.uid === actorId || u.email === actorId
    );
    if (matched) {
      const fullName = `${matched.firstName || ""} ${matched.lastName || ""}`.trim();
      const role = matched.roleCode || matched.role || "Operator";
      return `${fullName} (${role})`;
    }
  }

  // Check known hardcoded fallback mappings
  if (KNOWN_ACTORS[actorId]) {
    const profile = KNOWN_ACTORS[actorId];
    return `${profile.name} (${profile.role})`;
  }

  // Format matching heuristics
  const lowerId = actorId.toLowerCase();
  if (lowerId.includes("admin")) {
    return "Administrator (System Admin)";
  }
  if (lowerId.includes("alex") || lowerId.includes("rivers")) {
    return "Alex Rivers (Operations Lead)";
  }
  if (lowerId.includes("sarah") || lowerId.includes("jenkins")) {
    return "Sarah Jenkins (Project Manager)";
  }
  if (lowerId.includes("pmo")) {
    return "Peter Morris (PMO Analyst)";
  }
  if (lowerId.includes("michael") || lowerId.includes("chen")) {
    return "Michael Chen (Finance Director)";
  }

  // Default fallback
  return `${actorId} (Operator)`;
}

/**
 * Formats a generic JSON payload or log description to be a clean, readable text description.
 */
export function formatLogPayloadDetails(payload: any, fallbackDescription?: string): string {
  const defaultDesc = fallbackDescription || "System activity executed successfully";
  if (!payload) return defaultDesc;

  let parsed = payload;
  if (typeof payload === "string") {
    try {
      parsed = JSON.parse(payload);
    } catch {
      return payload || defaultDesc;
    }
  }

  if (typeof parsed !== "object" || parsed === null) {
    return String(parsed) || defaultDesc;
  }

  const parts: string[] = [];

  // Key-based standard mappings
  if (parsed.projectName) parts.push(`Project: "${parsed.projectName}"`);
  if (parsed.leadId) parts.push(`Lead ID: ${parsed.leadId}`);
  if (parsed.convertedBy) parts.push(`Converted By: ${parsed.convertedBy}`);
  if (parsed.targetStage) parts.push(`Target Stage: "${parsed.targetStage}"`);
  if (parsed.budget !== undefined) {
    parts.push(`Budget: $${Number(parsed.budget).toLocaleString()}`);
  }
  if (parsed.role) parts.push(`Assigned Role: ${parsed.role}`);
  if (parsed.status) parts.push(`Status set to: "${parsed.status}"`);
  if (parsed.stageId) parts.push(`Stage ID: ${parsed.stageId}`);
  if (parsed.documentName) parts.push(`Document: "${parsed.documentName}"`);
  if (parsed.fileName) parts.push(`File: "${parsed.fileName}"`);
  if (parsed.message) parts.push(`Message: "${parsed.message}"`);
  if (parsed.userId) parts.push(`Target User ID: ${parsed.userId}`);
  if (parsed.roleCode) parts.push(`Role Code: ${parsed.roleCode}`);
  
  if (parsed.updatedFields && typeof parsed.updatedFields === "object") {
    const fields = Object.keys(parsed.updatedFields).join(", ");
    parts.push(`Modified Properties: [${fields}]`);
  }

  if (parts.length > 0) {
    return parts.join(" | ");
  }

  // Fallback map format: Key: value
  const formattedPairs = Object.entries(parsed)
    .filter(([_, v]) => typeof v !== "object" && v !== null && v !== undefined)
    .map(([k, v]) => {
      const formattedKey = k
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());
      return `${formattedKey}: ${v}`;
    });

  if (formattedPairs.length > 0) {
    return formattedPairs.join(" | ");
  }

  return defaultDesc;
}
