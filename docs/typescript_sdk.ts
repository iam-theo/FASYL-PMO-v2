/**
 * AuraPM Enterprise Platform - Frontend TypeScript SDK Definitions
 * Generated: July 3, 2026
 * 
 * Provides type-safe wrappers and model definitions for easy consumption by
 * React SPA, Mobile Apps, or third-party TS integration consumers.
 */

export interface StandardSuccessResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  meta?: Record<string, any>;
}

export interface StandardErrorResponse {
  success: boolean;
  error: {
    code: string;
    message: string;
    details?: string[];
  };
  traceId?: string;
}

export interface ProjectEntity {
  id: string;
  name: string;
  code: string;
  status: "PLANNING" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD" | "ABORTED";
  budget: number;
  progress: number;
  description?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

export interface AuditLogEntity {
  id: string;
  actorId: string;
  action: string;
  moduleName: string;
  details?: string;
  createdAt: string;
}

export interface SystemConfigEntity {
  key: string;
  value: any;
  category: "SLA" | "FEATURE_FLAGS" | "AI" | "CALENDAR" | "NOTIFICATION" | "FINANCE";
}

export class AuraPMClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = "/api/v1") {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async fetchRaw<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }
    if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json");
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      const errPayload: StandardErrorResponse = await res.json().catch(() => ({
        success: false,
        error: { code: "HTTP_ERROR", message: `HTTP status ${res.status}` }
      }));
      throw new Error(`[${errPayload.error.code}] ${errPayload.error.message}`);
    }

    return res.json() as Promise<T>;
  }

  // --- Projects domain API Methods ---
  async getProjects(filters?: { search?: string }): Promise<StandardSuccessResponse<ProjectEntity[]>> {
    const query = filters?.search ? `?search=${encodeURIComponent(filters.search)}` : "";
    return this.fetchRaw<StandardSuccessResponse<ProjectEntity[]>>(`/projects${query}`);
  }

  async getProjectById(id: string): Promise<StandardSuccessResponse<ProjectEntity>> {
    return this.fetchRaw<StandardSuccessResponse<ProjectEntity>>(`/projects/${id}`);
  }

  async createProject(project: Partial<ProjectEntity>): Promise<StandardSuccessResponse<ProjectEntity>> {
    return this.fetchRaw<StandardSuccessResponse<ProjectEntity>>("/projects", {
      method: "POST",
      body: JSON.stringify(project)
    });
  }

  // --- EPOL Management API Methods ---
  async getAuditLogs(filters?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<StandardSuccessResponse<AuditLogEntity[]>> {
    const queryParts: string[] = [];
    if (filters?.search) queryParts.push(`search=${encodeURIComponent(filters.search)}`);
    if (filters?.limit) queryParts.push(`limit=${filters.limit}`);
    if (filters?.offset) queryParts.push(`offset=${filters.offset}`);
    const query = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    return this.fetchRaw<StandardSuccessResponse<AuditLogEntity[]>>(`/orchestration/audit${query}`);
  }

  async bulkUpdateConfigs(
    actorId: string,
    configs: SystemConfigEntity[]
  ): Promise<StandardSuccessResponse<void>> {
    return this.fetchRaw<StandardSuccessResponse<void>>("/orchestration/configs/bulk", {
      method: "POST",
      body: JSON.stringify({ actorId, configs })
    });
  }
}
