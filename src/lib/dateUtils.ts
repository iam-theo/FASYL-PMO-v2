/**
 * Date utility helpers for standardizing timezone format to Lagos GMT+1 (Africa/Lagos).
 */

export function parseSafeDate(dateInput: any): Date | null {
  if (!dateInput) return null;
  // Handle numeric strings (e.g., "1783501563146") that new Date() fails on
  if (typeof dateInput === "string" && /^\d+$/.test(dateInput)) {
    dateInput = Number(dateInput);
  }
  const parsed = new Date(dateInput);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatLagosDateTime(dateInput: any): string {
  const d = parseSafeDate(dateInput);
  if (!d) return "N/A";

  const dateStr = d.toLocaleDateString("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeStr = d.toLocaleTimeString("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${dateStr} at ${timeStr}`;
}

export function formatLagosDashboardDateTime(dateInput: any): string {
  const d = parseSafeDate(dateInput);
  if (!d) return "N/A";

  const dateStr = d.toLocaleDateString("en-GB", {
    timeZone: "Africa/Lagos",
    month: "short",
    day: "numeric",
  });
  const timeStr = d.toLocaleTimeString("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateStr} @ ${timeStr}`;
}

export function formatLagosSimple(dateInput: any): string {
  const d = parseSafeDate(dateInput);
  if (!d) return "N/A";

  return d.toLocaleString("en-GB", {
    timeZone: "Africa/Lagos",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
