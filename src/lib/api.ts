/**
 * Client-Side API Utility Layer
 * Syncs directly with Express REST API endpoints under /api/project-tracker
 */

import { ChatMessage } from "../modules/project-tracker/types.ts";

const BASE_URL = "/api/project-tracker";

const getValidToken = () => {
  const token = localStorage.getItem("accessToken");
  if (!token || token === "null" || token === "undefined" || token.trim() === "") {
    return null;
  }
  return token;
};

export async function request(endpoint: string, options: RequestInit = {}) {
  try {
    const token = getValidToken();
    const headers: any = {
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...options.headers,
    };
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers,
      ...options,
    });

    if (res.headers.get("content-type")?.includes("text/csv")) {
      return await res.text();
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text();
      throw new Error(text || `HTTP Error ${res.status}`);
    }

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || json.message || "API request failed");
    }
    return json.data;
  } catch (err: any) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

const getAuthHeaders = () => {
  const token = getValidToken();
  return token ? { "Authorization": `Bearer ${token}` } : {};
};

const v1Fetch = (url: string, options: RequestInit = {}) => {
  const headers: any = {
    ...getAuthHeaders(),
    ...options.headers,
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(url, {
    ...options,
    headers,
  }).then(async res => {
    const contentType = res.headers.get("content-type");
    let data: any;
    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      throw new Error(text || `HTTP Error ${res.status}`);
    }

    if (!res.ok) {
      throw new Error(data?.error || data?.message || `HTTP Error ${res.status}`);
    }

    if (data.success === false) {
      throw new Error(data.error || data.message || "Request failed");
    }

    return data.data !== undefined ? data.data : data;
  });
};

export const api = {
  // Dashboard
  getDashboard: (projectId?: string) => 
    request(`/dashboard/summary${projectId ? `?projectId=${projectId}` : ""}`),

  // Projects Integration
  getProjectsList: () => v1Fetch("/api/v1/projects"),
  createProject: (data: any) => v1Fetch("/api/v1/projects", { method: "POST", body: JSON.stringify(data) }),

  // Enterprise Lifecycle
  getLifecycleTemplates: () => v1Fetch("/api/v1/lifecycle/templates"),
  getLifecycleTemplateById: (templateId: string) => v1Fetch(`/api/v1/lifecycle/templates/${templateId}`),
  updateLifecycleTemplate: (templateId: string, data: any) => v1Fetch(`/api/v1/lifecycle/templates/${templateId}`, { method: "PUT", body: JSON.stringify(data) }),
  getLifecycleDashboard: () => v1Fetch("/api/v1/lifecycle/dashboard"),
  getLifecycleInstance: (projectId: string) => v1Fetch(`/api/v1/lifecycle/instances/${projectId}`),
  seedLifecycleTemplate: () => v1Fetch("/api/v1/lifecycle/seed", { method: "POST" }),
  runSLACronJobs: () => v1Fetch("/api/v1/lifecycle/sla/cron", { method: "POST" }),
  createLifecycleInstance: (data: { projectId: string, templateId: string }) => v1Fetch("/api/v1/lifecycle/instances", { method: "POST", body: JSON.stringify(data) }),
  uploadLifecycleDocument: (instanceId: string, stageDocumentId: string, formData: FormData) =>
    v1Fetch(`/api/v1/lifecycle/instances/${instanceId}/documents/${stageDocumentId}/upload`, { 
      method: "POST", 
      body: formData,
      headers: {} // FormData should not have Content-Type header manually set
    }),
  verifyLifecycleDocument: (documentVersionId: string, data: { status: string, notes?: string }) =>
    v1Fetch(`/api/v1/lifecycle/documents/${documentVersionId}/verify`, { method: "POST", body: JSON.stringify(data) }),
  completeLifecycleChecklist: (instanceId: string, checklistId: string, data: { isCompleted: boolean, notes?: string }) =>
    v1Fetch(`/api/v1/lifecycle/instances/${instanceId}/checklists/${checklistId}/complete`, { method: "POST", body: JSON.stringify(data) }),
  submitStageApprovalRole: (instanceId: string, stageId: string, data: { role: string, status: string, comments?: string, digitalSignature?: string }) =>
    v1Fetch(`/api/v1/lifecycle/instances/${instanceId}/stages/${stageId}/approve`, { method: "POST", body: JSON.stringify(data) }),
  addLifecycleCommentMessage: (instanceId: string, stageId: string, data: { content: string, parentCommentId?: string }) =>
    v1Fetch(`/api/v1/lifecycle/instances/${instanceId}/stages/${stageId}/comments`, { method: "POST", body: JSON.stringify(data) }),
  submitHeadOfOperationsReviewGate: (instanceId: string, stageId: string, data: any) =>
    v1Fetch(`/api/v1/lifecycle/instances/${instanceId}/stages/${stageId}/operations-review`, { method: "POST", body: JSON.stringify(data) }),
  getStageSLAPerformance: (instanceId: string, stageId: string) =>
    v1Fetch(`/api/v1/lifecycle/instances/${instanceId}/stages/${stageId}/sla`),
  submitLifecycleForReview: (instanceId: string) =>
    v1Fetch(`/api/v1/lifecycle/instances/${instanceId}/submit`, { method: "POST" }),
  reviewLifecycleStageGate: (instanceId: string, data: { decision: string, comments: string }) =>
    v1Fetch(`/api/v1/lifecycle/instances/${instanceId}/review`, { method: "POST", body: JSON.stringify(data) }),
  getLifecycleReadinessStatus: (instanceId: string, stageId: string) =>
    v1Fetch(`/api/v1/lifecycle/instances/${instanceId}/stages/${stageId}/readiness`),

  // Team
  getTeam: (projectId: string) => 
    request(`/team/project/${projectId}`),
  assignMember: (data: any) => 
    request("/team", { method: "POST", body: JSON.stringify(data) }),
  updateAllocation: (id: string, data: any) => 
    request(`/team/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  removeMember: (id: string) => 
    request(`/team/${id}`, { method: "DELETE" }),

  // Tasks
  getTasks: (projectId: string, filters: any = {}) => {
    const q = new URLSearchParams(filters).toString();
    return request(`/tasks/project/${projectId}${q ? `?${q}` : ""}`);
  },
  getCriticalPath: (projectId: string) => 
    request(`/tasks/project/${projectId}/critical-path`),
  createTask: (data: any) => 
    request("/tasks", { method: "POST", body: JSON.stringify(data) }),
  updateTask: (id: string, data: any) => 
    request(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTask: (id: string) => 
    request(`/tasks/${id}`, { method: "DELETE" }),
  bulkUpdateTasks: (data: any) => 
    request("/tasks/bulk-update", { method: "PATCH", body: JSON.stringify(data) }),
  bulkDeleteTasks: (data: any) => 
    request("/tasks/bulk-delete", { method: "DELETE", body: JSON.stringify(data) }),

  // Subtasks
  getSubtasks: (taskId: string) => 
    request(`/tasks/task/${taskId}/subtasks`),
  createSubtask: (data: any) => 
    request("/tasks/subtask", { method: "POST", body: JSON.stringify(data) }),
  updateSubtask: (id: string, data: any) => 
    request(`/tasks/subtask/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteSubtask: (id: string) => 
    request(`/tasks/subtask/${id}`, { method: "DELETE" }),

  // Milestones
  getMilestones: (projectId: string) => 
    request(`/tasks/project/${projectId}/milestones`),
  createMilestone: (data: any) => 
    request("/tasks/milestone", { method: "POST", body: JSON.stringify(data) }),
  updateMilestone: (id: string, data: any) => 
    request(`/tasks/milestone/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteMilestone: (id: string) => 
    request(`/tasks/milestone/${id}`, { method: "DELETE" }),

  // Dependencies
  getDependencies: (projectId: string) => 
    request(`/tasks/project/${projectId}/dependencies`),
  createDependency: (data: any) => 
    request("/tasks/dependency", { method: "POST", body: JSON.stringify(data) }),
  deleteDependency: (id: string) => 
    request(`/tasks/dependency/${id}`, { method: "DELETE" }),

  // Time logs
  getTimeLogs: (projectId: string) => 
    request(`/tir/project/${projectId}`),
  getTimeSummary: (projectId: string) => 
    request(`/tir/project/${projectId}/summary`),
  createTimeLog: (data: any) => 
    request("/tir", { method: "POST", body: JSON.stringify(data) }),
  approveTimeLog: (id: string) => 
    request(`/tir/${id}/approve`, { method: "PATCH" }),

  // Issues
  getIssues: (projectId: string) => 
    request(`/tir/project/${projectId}/issues`),
  createIssue: (data: any) => 
    request("/tir/issue", { method: "POST", body: JSON.stringify(data) }),
  updateIssue: (id: string, data: any) => 
    request(`/tir/issue/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteIssue: (id: string) => 
    request(`/tir/issue/${id}`, { method: "DELETE" }),

  // Risks
  getRisks: (projectId: string) => 
    request(`/tir/project/${projectId}/risks`),
  createRisk: (data: any) => 
    request("/tir/risk", { method: "POST", body: JSON.stringify(data) }),
  updateRisk: (id: string, data: any) => 
    request(`/tir/risk/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteRisk: (id: string) => 
    request(`/tir/risk/${id}`, { method: "DELETE" }),

  // Deliverables
  getDeliverables: (projectId: string) => 
    request(`/ddc/project/${projectId}`),
  createDeliverable: (data: any) => 
    request("/ddc", { method: "POST", body: JSON.stringify(data) }),
  updateDeliverable: (id: string, data: any) => 
    request(`/ddc/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteDeliverable: (id: string) => 
    request(`/ddc/${id}`, { method: "DELETE" }),

  // Documents
  getDocuments: (projectId: string, folderPath?: string) => 
    request(`/ddc/project/${projectId}/documents${folderPath ? `?folderPath=${encodeURIComponent(folderPath)}` : ""}`),
  getFolders: (projectId: string) => 
    request(`/ddc/project/${projectId}/folders`),
  uploadDocument: (data: any) => 
    request("/ddc/document", { method: "POST", body: JSON.stringify(data) }),

  // Threaded Comments
  getComments: (entityType: string, entityId: string) => 
    request(`/ddc/comments/${entityType}/${entityId}`),
  createComment: (data: any) => 
    request("/ddc/comment", { method: "POST", body: JSON.stringify(data) }),
  addReaction: (commentId: string, reaction: string, teamMemberId: string) => 
    request(`/ddc/comment/${commentId}/reaction`, { method: "POST", body: JSON.stringify({ reaction, teamMemberId }) }),
  deleteComment: (id: string) => 
    request(`/ddc/comment/${id}`, { method: "DELETE" }),

  // Meetings
  getMeetings: (projectId: string) => 
    request(`/meetings-resources/project/${projectId}`),
  createMeeting: (data: any) => 
    request("/meetings-resources", { method: "POST", body: JSON.stringify(data) }),
  updateMeeting: (id: string, data: any) => 
    request(`/meetings-resources/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  getCapacityPlanning: (projectId: string) => 
    request(`/meetings-resources/project/${projectId}/capacity-planning`),
  getProgressEVM: (projectId: string) => 
    request(`/meetings-resources/project/${projectId}/evm-progress`),

  // Notifications Enterprise Engine
  getNotifications: (limit = 50, offset = 0) => v1Fetch(`/api/v1/notifications?limit=${limit}&offset=${offset}`),
  getUnreadCount: () => v1Fetch("/api/v1/notifications/unread-count"),
  markAsRead: (id: string) => v1Fetch(`/api/v1/notifications/${id}/read`, { method: "PATCH" }),
  markAllAsRead: () => v1Fetch("/api/v1/notifications/read-all", { method: "PATCH" }),
  getNotificationPreferences: () => v1Fetch("/api/v1/notifications/preferences"),
  updateNotificationPreference: (data: any) => v1Fetch("/api/v1/notifications/preferences", { method: "PUT", body: JSON.stringify(data) }),
  
  // Admin Notifications
  getNotificationSettings: () => v1Fetch("/api/v1/notifications/settings"),
  updateNotificationSetting: (data: any) => v1Fetch("/api/v1/notifications/settings", { method: "PUT", body: JSON.stringify(data) }),
  getNotificationTemplates: () => v1Fetch("/api/v1/notifications/templates"),
  updateNotificationTemplate: (code: string, data: any) => v1Fetch(`/api/v1/notifications/templates/${code}`, { method: "PUT", body: JSON.stringify(data) }),
  getNotificationLogs: () => v1Fetch("/api/v1/notifications/logs"),
  testEmailConfig: (data: any) => v1Fetch("/api/v1/notifications/test/email", { method: "POST", body: JSON.stringify(data) }),
  testSmsConfig: (data: any) => v1Fetch("/api/v1/notifications/test/sms", { method: "POST", body: JSON.stringify(data) }),

  // Audit Logs
  getAuditLogs: (projectId: string) => 
    request(`/nar/audit-logs/project/${projectId}`),
  getExecutiveReport: (projectId: string) => 
    request(`/nar/reports/executive-status/${projectId}`),
  downloadTasksCSV: (projectId: string) => 
    request(`/nar/reports/export-csv/${projectId}`),

  // Gemini Agent
  chatWithAgent: (data: { message: string; projectId: string; googleAccessToken?: string; history?: any[] }) =>
    request("/gemini-agent/chat", { method: "POST", body: JSON.stringify(data) }),
  getExecutiveInsights: (projectId: string) =>
    request("/gemini-agent/executive-insights", { method: "POST", body: JSON.stringify({ projectId }) }),

  // IAM Administration
  getOwnProfile: () => v1Fetch("/api/v1/auth/users/me/profile"),
  getUsersForSelection: () => v1Fetch("/api/v1/auth/users/selection"),
  getRolesForSelection: () => v1Fetch("/api/v1/auth/roles/selection"),
  getRoles: () => v1Fetch("/api/v1/auth/roles"),
  getPermissions: () => v1Fetch("/api/v1/auth/permissions"),
  getPermissionMatrix: () => v1Fetch("/api/v1/auth/matrix"),
  createRole: (data: any) => v1Fetch("/api/v1/auth/roles", { method: "POST", body: JSON.stringify(data) }),
  updateRole: (code: string, data: any) => v1Fetch(`/api/v1/auth/roles/${code}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteRole: (code: string) => v1Fetch(`/api/v1/auth/roles/${code}`, { method: "DELETE" }),
  getSecurityLogs: () => v1Fetch("/api/v1/auth/logs"),
  getUserProjects: (id: string) => v1Fetch(`/api/v1/users/${id}/projects`),
  getUserTasks: (id: string) => v1Fetch(`/api/v1/users/${id}/tasks`),
  getUserRisksIssues: (id: string) => v1Fetch(`/api/v1/users/${id}/risks-issues`),
  getUserAuditLogs: (id: string) => v1Fetch(`/api/v1/users/${id}/audit-logs`),
  getUserChatMessages: (id: string) => v1Fetch(`/api/v1/users/${id}/chat-messages`),
  getUserChangeRequests: (id: string) => v1Fetch(`/api/v1/users/${id}/change-requests`),
  getUserSecurityLogs: (id: string) => v1Fetch(`/api/v1/users/${id}/security-logs`),
  getUserLoginHistory: (id: string) => v1Fetch(`/api/v1/users/${id}/login-history`),
  getUserResources: (id: string) => v1Fetch(`/api/v1/users/${id}/resources`),
  getUserMilestones: (id: string) => v1Fetch(`/api/v1/users/${id}/milestones`),
  getUserRolesById: (id: string) => v1Fetch(`/api/v1/users/${id}/roles`),
  getUserPermissionsById: (id: string) => v1Fetch(`/api/v1/users/${id}/permissions`),

  // Dashboard Engine
  getMyDashboard: () => v1Fetch("/api/v1/dashboards/me"),
  saveDashboardPreferences: (data: any) => v1Fetch("/api/v1/dashboards/preferences", { method: "POST", body: JSON.stringify(data) }),
  getWidgets: () => v1Fetch("/api/v1/dashboards/widgets"),
  createWidget: (data: any) => v1Fetch("/api/v1/dashboards/widgets", { method: "POST", body: JSON.stringify(data) }),
  createDashboardTemplate: (data: any) => v1Fetch("/api/v1/dashboards/templates", { method: "POST", body: JSON.stringify(data) }),

  // Generic Helpers for new modules
  get: (url: string) => v1Fetch(`/api${url}`),
  post: (url: string, data: any) => v1Fetch(`/api${url}`, { 
    method: "POST", 
    body: JSON.stringify(data) 
  }),
  put: (url: string, data: any) => v1Fetch(`/api${url}`, { 
    method: "PUT", 
    body: JSON.stringify(data) 
  }),
  patch: (url: string, data: any) => v1Fetch(`/api${url}`, { 
    method: "PATCH", 
    body: JSON.stringify(data) 
  }),
  delete: (url: string) => v1Fetch(`/api${url}`, { 
    method: "DELETE" 
  }),

  // ==========================================
  // CHAT MODULE
  // ==========================================
  getChatMessages: async (projectId: string): Promise<ChatMessage[]> => {
    return request(`/chat/${projectId}`);
  },

  sendChatMessage: async (data: Partial<ChatMessage>): Promise<ChatMessage> => {
    return request("/chat", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
