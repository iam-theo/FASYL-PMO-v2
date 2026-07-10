import React, { useState, useEffect } from "react";
import { 
  Users, UserPlus, Search, Shield, Building, Filter, X, Check, Save, 
  Briefcase, ListTodo, User, ExternalLink, AlertTriangle, Activity, 
  Lock, MessageSquare, FileText, History, Edit, Trash2, Unlock, 
  RefreshCw, Power, ArrowUpDown, ChevronLeft, ChevronRight, CheckSquare,
  LockKeyhole, Mail, Phone, BadgeInfo, KeyRound, UserMinus
} from "lucide-react";
import { api } from "../lib/api.ts";
import { motion, AnimatePresence } from "motion/react";

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modals & workflows state
  const [isCreating, setIsCreating] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "projects" | "tasks" | "risks" | "activity" | "security" | "resources" | "milestones">("profile");
  
  // User details fetching states
  const [userDetails, setUserDetails] = useState<any>(null);
  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [userTasks, setUserTasks] = useState<any[]>([]);
  const [userRisks, setUserRisks] = useState<any[]>([]);
  const [userAuditLogs, setUserAuditLogs] = useState<any[]>([]);
  const [userChatMessages, setUserChatMessages] = useState<any[]>([]);
  const [userChangeRequests, setUserChangeRequests] = useState<any[]>([]);
  const [userSecurityLogs, setUserSecurityLogs] = useState<any[]>([]);
  const [userLoginHistory, setUserLoginHistory] = useState<any[]>([]);
  const [userResources, setUserResources] = useState<any[]>([]);
  const [userMilestones, setUserMilestones] = useState<any[]>([]);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  // Pagination, Sorting, and Filtering state (Server-side & Client-side Sync)
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("firstName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Create Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    phoneNumber: "",
    employeeId: "",
    department: "",
    jobTitle: "",
    organization: "AuraEPM Enterprise",
    role: "",
    password: "",
    selectedPermissions: [] as string[]
  });

  // Edit Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    phoneNumber: "",
    employeeId: "",
    department: "",
    jobTitle: "",
    organization: "",
    role: "",
    status: "",
    isActive: true,
    isLocked: false,
    permissions: [] as string[]
  });

  // Password reset popup/input state
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState("");

  useEffect(() => {
    fetchData();
  }, [page, limit, search, deptFilter, roleFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserDetails(selectedUserId);
      setIsEditing(false);
      setIsResettingPassword(false);
    } else {
      setUserDetails(null);
      setUserProjects([]);
      setUserTasks([]);
      setIsEditing(false);
      setIsResettingPassword(false);
    }
  }, [selectedUserId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const qParams = new URLSearchParams();
      if (search) qParams.append("search", search);
      if (deptFilter && deptFilter !== "ALL") qParams.append("department", deptFilter);
      if (roleFilter && roleFilter !== "ALL") qParams.append("role", roleFilter);
      if (statusFilter && statusFilter !== "ALL") qParams.append("status", statusFilter);
      qParams.append("page", page.toString());
      qParams.append("limit", limit.toString());
      qParams.append("sortBy", sortBy);
      qParams.append("sortOrder", sortOrder);

      const results = await Promise.allSettled([
        api.get(`/v1/auth/users?${qParams.toString()}`),
        api.get("/v1/auth/roles"),
        api.get("/v1/users/departments"),
        api.get("/v1/auth/permissions")
      ]);

      const [usersRes, rolesRes, deptsRes, permsRes] = results;

      if (usersRes.status === "fulfilled") {
        const uVal = usersRes.value;
        if (uVal && uVal.data) {
          setUsers(uVal.data);
          setTotalUsers(uVal.pagination?.total || uVal.data.length);
          setTotalPages(uVal.pagination?.totalPages || 1);
        } else {
          const arr = Array.isArray(uVal) ? uVal : [];
          setUsers(arr);
          setTotalUsers(arr.length);
          setTotalPages(1);
        }
      } else console.error("Failed to fetch users:", usersRes.reason);

      if (rolesRes.status === "fulfilled") setRoles(rolesRes.value || []);
      else console.error("Failed to fetch roles:", rolesRes.reason);

      if (deptsRes.status === "fulfilled") setDepartments(deptsRes.value || []);
      else console.error("Failed to fetch depts:", deptsRes.reason);

      if (permsRes.status === "fulfilled") {
        const permsData = permsRes.value || [];
        const flatPerms = Array.isArray(permsData) && permsData.length > 0 && permsData[0].groups
          ? permsData.flatMap((cat: any) => 
              cat.groups.flatMap((group: any) => group.permissions)
            )
          : permsData;
        setPermissions(flatPerms);
      } else {
        console.error("Failed to fetch perms:", permsRes.reason);
      }

    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchUserDetails = async (id: string) => {
    setIsFetchingDetails(true);
    try {
      const [
        details, projects, tasks, risks, auditLogs, 
        chats, changes, security, logins, resourcesData, milestonesData
      ] = await Promise.all([
        api.get(`/v1/users/${id}`),
        api.getUserProjects(id),
        api.getUserTasks(id),
        api.getUserRisksIssues(id),
        api.getUserAuditLogs(id),
        api.getUserChatMessages(id),
        api.getUserChangeRequests(id),
        api.getUserSecurityLogs(id),
        api.getUserLoginHistory(id),
        api.getUserResources(id),
        api.getUserMilestones(id)
      ]);
      setUserDetails(details);
      setUserProjects(projects || []);
      setUserTasks(tasks || []);
      setUserRisks(risks || []);
      setUserAuditLogs(auditLogs || []);
      setUserChatMessages(chats || []);
      setUserChangeRequests(changes || []);
      setUserSecurityLogs(security || []);
      setUserLoginHistory(logins || []);
      setUserResources(resourcesData || []);
      setUserMilestones(milestonesData || []);

      // Prepopulate edit form
      const userRoleCode = details?.roles?.[0]?.code || "";
      const userPerms = details?.permissions?.map((p: any) => p.permissionKey || p.name) || [];
      setEditFormData({
        firstName: details?.firstName || "",
        lastName: details?.lastName || "",
        email: details?.email || "",
        username: details?.username || "",
        phoneNumber: details?.phoneNumber || "",
        employeeId: details?.employeeId || "",
        department: details?.department || "",
        jobTitle: details?.jobTitle || "",
        organization: details?.organization || "",
        role: userRoleCode,
        status: details?.status || "ACTIVE",
        isActive: details?.isActive !== false,
        isLocked: details?.isLocked || false,
        permissions: userPerms
      });
    } catch (err) {
      console.error("Failed to fetch user details:", err);
    }
    setIsFetchingDetails(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/v1/auth/users", {
        ...formData,
        permissions: formData.selectedPermissions
      });
      setIsCreating(false);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        username: "",
        phoneNumber: "",
        employeeId: "",
        department: "",
        jobTitle: "",
        organization: "AuraEPM Enterprise",
        role: "",
        password: "",
        selectedPermissions: []
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/v1/users/${selectedUserId}`, editFormData);
      setIsEditing(false);
      fetchUserDetails(selectedUserId!);
      fetchData();
    } catch (err) {
      console.error("Failed to save user edit:", err);
    }
  };

  const handleStatusChange = async (status: string, isActive: boolean, isLocked?: boolean) => {
    try {
      await api.patch(`/v1/users/${selectedUserId}/status`, { status, isActive, isLocked });
      fetchUserDetails(selectedUserId!);
      fetchData();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/v1/users/${selectedUserId}/reset-password`, { password: tempPassword });
      setIsResettingPassword(false);
      setTempPassword("");
      alert("Password reset successfully!");
    } catch (err) {
      console.error("Failed to reset password:", err);
    }
  };

  const handleDeleteUser = async (permanent: boolean = false) => {
    const confirmMsg = permanent 
      ? "Are you sure you want to PERMANENTLY delete this user? This will erase all audit history, sessions, and data linked to this account. This action is irreversible."
      : "Are you sure you want to deactivate and soft-delete this user? They will no longer be able to log in, but their history will be preserved.";
    
    if (window.confirm(confirmMsg)) {
      setLoading(true);
      try {
        await api.delete(`/v1/users/${selectedUserId}?permanent=${permanent}`);
        setSelectedUserId(null);
        fetchData();
        // Success notification could be added here if a toast system exists
      } catch (err) {
        console.error("Failed to delete user:", err);
        alert("Operation failed. Ensure you have proper administrative privileges.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleActivate = async () => {
    setLoading(true);
    try {
      await api.post(`/v1/users/${selectedUserId}/activate`, {});
      await fetchUserDetails(selectedUserId!);
      await fetchData();
    } catch (err) {
      console.error("Failed to activate user:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setLoading(true);
    try {
      await api.post(`/v1/users/${selectedUserId}/deactivate`, {});
      await fetchUserDetails(selectedUserId!);
      await fetchData();
    } catch (err) {
      console.error("Failed to deactivate user:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    setLoading(true);
    try {
      await api.post(`/v1/users/${selectedUserId}/suspend`, {});
      await fetchUserDetails(selectedUserId!);
      await fetchData();
    } catch (err) {
      console.error("Failed to suspend user:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLock = async () => {
    setLoading(true);
    try {
      await api.post(`/v1/users/${selectedUserId}/lock`, {});
      await fetchUserDetails(selectedUserId!);
      await fetchData();
    } catch (err) {
      console.error("Failed to lock user:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    setLoading(true);
    try {
      await api.post(`/v1/users/${selectedUserId}/unlock`, {});
      await fetchUserDetails(selectedUserId!);
      await fetchData();
    } catch (err) {
      console.error("Failed to unlock user:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleCreateTogglePermission = (code: string) => {
    setFormData(prev => {
      const perms = prev.selectedPermissions.includes(code)
        ? prev.selectedPermissions.filter(p => p !== code)
        : [...prev.selectedPermissions, code];
      return { ...prev, selectedPermissions: perms };
    });
  };

  const handleEditTogglePermission = (code: string) => {
    setEditFormData(prev => {
      const perms = prev.permissions.includes(code)
        ? prev.permissions.filter(p => p !== code)
        : [...prev.permissions, code];
      return { ...prev, permissions: perms };
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'INACTIVE': return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'LOCKED': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'PENDING_PASSWORD_RESET': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ON_TRACK': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'AT_RISK': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CRITICAL': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'DONE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'TODO': return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'IN_PROGRESS': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  if (isCreating) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <UserPlus className="h-7 w-7 text-indigo-600" />
              Create New User
            </h1>
            <p className="text-sm text-slate-500 mt-1">Provision a new corporate account with custom RBAC mappings and security rules.</p>
          </div>
          <button 
            onClick={() => setIsCreating(false)}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Personal Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">First Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.firstName}
                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                    placeholder="Jane"
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Last Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.lastName}
                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                    placeholder="Doe"
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email Address *</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="jane.doe@aurapm.com"
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Username (Optional)</label>
                <input 
                  type="text" 
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  placeholder="janedoe"
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input 
                  type="text" 
                  value={formData.phoneNumber}
                  onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                  placeholder="+1 (555) 019-2834"
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Password *</label>
                <input 
                  type="password" 
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
                />
                <p className="text-xs text-slate-400 mt-1">Must be at least 8 characters with numbers and symbols.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Enterprise Assignment</h3>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Corporate Role *</label>
                <select 
                  required
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
                >
                  <option value="">Select corporate role...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.code}>{r.name} ({r.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
                <input 
                  type="text" 
                  value={formData.department}
                  onChange={e => setFormData({...formData, department: e.target.value})}
                  placeholder="Operations, IT, Finance"
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Job Title</label>
                <input 
                  type="text" 
                  value={formData.jobTitle}
                  onChange={e => setFormData({...formData, jobTitle: e.target.value})}
                  placeholder="VP of Products"
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Employee ID</label>
                <input 
                  type="text" 
                  value={formData.employeeId}
                  onChange={e => setFormData({...formData, employeeId: e.target.value})}
                  placeholder="EMP-492"
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Organization</label>
                <input 
                  type="text" 
                  value={formData.organization}
                  onChange={e => setFormData({...formData, organization: e.target.value})}
                  placeholder="AuraEPM Enterprise"
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Direct Override Permissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-60 overflow-y-auto p-4 border border-slate-100 rounded-xl bg-slate-50/30">
              {permissions.map((p: any) => {
                const key = p.permissionKey || p.name;
                const isChecked = formData.selectedPermissions.includes(key);
                return (
                  <label key={p.id || key} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors text-sm">
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleCreateTogglePermission(key)}
                      className="mt-1 h-4 w-4 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500 focus:ring-offset-0"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">{p.label || key}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{key}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-4 border-t border-slate-100 pt-6">
            <button 
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-6 py-3 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-8 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Provision Account
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto bg-slate-50/50 min-h-screen">
      {!selectedUserId ? (
        <>
          {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="h-7 w-7 text-indigo-600 animate-pulse" />
            Enterprise User Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure user status, active directories, security policies, and RBAC privilege maps.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="px-5 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          Create User Account
        </button>
      </div>

      {/* Filters, Sorting, Search Row */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email..."
              className="w-full pl-11 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50 transition-all"
            />
          </div>

          {/* Department Filter */}
          <div className="relative">
            <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50 transition-all appearance-none"
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="relative">
            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50 transition-all appearance-none"
            >
              <option value="ALL">All Roles</option>
              {roles.map(r => (
                <option key={r.id} value={r.code}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50 transition-all appearance-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="LOCKED">LOCKED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Grid/Table view */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-500 space-y-3">
            <div className="h-8 w-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium">Fetching directory index...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl">
            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No users found</h3>
            <p className="text-sm text-slate-500">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-100">
                  <th 
                    onClick={() => toggleSort("firstName")} 
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      User
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => toggleSort("department")} 
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Department
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => toggleSort("jobTitle")} 
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Role & Title
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => toggleSort("status")} 
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Status
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr 
                    key={u.id} 
                    onClick={() => setSelectedUserId(u.id)}
                    className="hover:bg-indigo-50/20 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm border border-indigo-100">
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{u.firstName} {u.lastName}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-slate-400" />
                        {u.department || 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                      <div className="space-y-1">
                        <div>{u.jobTitle || 'Corporate Employee'}</div>
                        <div className="flex gap-1">
                          {u.roles?.map((r: any) => (
                            <span key={r.code} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                              {r.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(u.status || 'ACTIVE')}`}>
                        {u.status || 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Row */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900">{users.length}</span> of <span className="font-bold text-slate-900">{totalUsers}</span> users
          </div>
          <div className="flex items-center gap-3">
            <button 
              disabled={page === 1}
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              className="p-2 border border-slate-200 rounded-lg hover:bg-white bg-slate-50 transition-all text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-700 font-bold">
              Page {page} of {totalPages}
            </span>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              className="p-2 border border-slate-200 rounded-lg hover:bg-white bg-slate-50 transition-all text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      </>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Full Page Header back action bar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <button 
              onClick={() => setSelectedUserId(null)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm text-slate-700 shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Users List
            </button>
            <div className="text-xs font-mono text-slate-400">USER MATRICES ID: {selectedUserId}</div>
          </div>

          {/* User Details Slide-over Modal -> NOW A FLAT FULL-PAGE BLOCK */}
          <div className="relative w-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[75vh]">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-100 border border-indigo-700">
                    {userDetails?.firstName?.[0] || users.find(u => u.id === selectedUserId)?.firstName?.[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 leading-tight">
                      {userDetails 
                        ? `${userDetails.firstName} ${userDetails.lastName}` 
                        : (() => {
                            const u = users.find(u => u.id === selectedUserId);
                            return u ? `${u.firstName} ${u.lastName}` : "User Details";
                          })()
                      }
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                      {userDetails?.email || users.find(u => u.id === selectedUserId)?.email}
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      {userDetails?.department || users.find(u => u.id === selectedUserId)?.department || "Unassigned"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Admin Toolbar Quick Actions */}
                  {userDetails && !isEditing && (
                    <div className="flex gap-1 border border-slate-100 rounded-xl bg-slate-50 p-1 mr-2">
                      <button 
                        onClick={() => setIsEditing(true)}
                        title="Edit Profile"
                        className="p-2 hover:bg-white text-indigo-600 rounded-lg transition-all"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setIsResettingPassword(true)}
                        title="Reset Password"
                        className="p-2 hover:bg-white text-amber-600 rounded-lg transition-all"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      {userDetails.status === "ACTIVE" ? (
                        <button 
                          onClick={handleDeactivate}
                          title="Deactivate Account"
                          disabled={loading}
                          className="p-2 hover:bg-white text-rose-600 rounded-lg transition-all disabled:opacity-50"
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      ) : (
                        <button 
                          onClick={handleActivate}
                          title="Activate Account"
                          disabled={loading}
                          className="p-2 hover:bg-white text-emerald-600 rounded-lg transition-all disabled:opacity-50"
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      )}
                      {userDetails.isLocked ? (
                        <button 
                          onClick={handleUnlock}
                          title="Unlock Account"
                          disabled={loading}
                          className="p-2 hover:bg-white text-emerald-600 rounded-lg transition-all disabled:opacity-50"
                        >
                          <Unlock className="h-4 w-4" />
                        </button>
                      ) : (
                        <button 
                          onClick={handleLock}
                          title="Lock Account"
                          disabled={loading}
                          className="p-2 hover:bg-white text-slate-600 rounded-lg transition-all disabled:opacity-50"
                        >
                          <Lock className="h-4 w-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteUser(false)}
                        title="Soft Delete (Deactivate)"
                        disabled={loading}
                        className="p-2 hover:bg-white text-slate-400 hover:text-rose-500 rounded-lg transition-all disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(true)}
                        title="PERMANENT Delete"
                        disabled={loading}
                        className="p-2 hover:bg-white text-slate-400 hover:text-rose-700 rounded-lg transition-all disabled:opacity-50"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={() => setSelectedUserId(null)}
                    title="Back to List"
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Password Reset Modal / Overlay */}
              <AnimatePresence>
                {isResettingPassword && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
                  >
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <KeyRound className="h-6 w-6 text-amber-500" />
                        <h3 className="font-bold text-slate-900 text-lg">Reset Password</h3>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed">Enter a temporary or permanent password for this corporate workspace account.</p>
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <input 
                          type="password"
                          required
                          value={tempPassword}
                          onChange={e => setTempPassword(e.target.value)}
                          placeholder="Type new secure password"
                          className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 bg-slate-50/50"
                        />
                        <div className="flex justify-end gap-3 pt-2">
                          <button 
                            type="button"
                            onClick={() => setIsResettingPassword(false)}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-all"
                          >
                            Reset Password
                          </button>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tabs Nav */}
              <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 overflow-x-auto no-scrollbar">
                {[
                  { id: "profile", label: "Profile Map", icon: User },
                  { id: "projects", label: "Managed Projects", icon: Briefcase },
                  { id: "tasks", label: "Task List", icon: ListTodo },
                  { id: "resources", label: "Capacity & Resources", icon: Building },
                  { id: "milestones", label: "Key Milestones", icon: Check },
                  { id: "risks", label: "PMO Risks & Issues", icon: AlertTriangle },
                  { id: "activity", label: "System Activity", icon: Activity },
                  { id: "security", label: "Audit & Access Logins", icon: Shield }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-4 px-4 text-sm font-bold transition-all relative shrink-0 ${
                      activeTab === tab.id ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                {isFetchingDetails ? (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
                    <div className="h-8 w-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-sm font-medium">Loading user detail matrices...</p>
                  </div>
                ) : (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === "profile" && (
                      <div className="space-y-6">
                        {isEditing ? (
                          <form onSubmit={handleSaveEdit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                              <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Primary Info</h3>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">First Name</label>
                                  <input 
                                    type="text" 
                                    value={editFormData.firstName}
                                    onChange={e => setEditFormData({...editFormData, firstName: e.target.value})}
                                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Last Name</label>
                                  <input 
                                    type="text" 
                                    value={editFormData.lastName}
                                    onChange={e => setEditFormData({...editFormData, lastName: e.target.value})}
                                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                                  <input 
                                    type="email" 
                                    value={editFormData.email}
                                    onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Username</label>
                                  <input 
                                    type="text" 
                                    value={editFormData.username}
                                    onChange={e => setEditFormData({...editFormData, username: e.target.value})}
                                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone</label>
                                  <input 
                                    type="text" 
                                    value={editFormData.phoneNumber}
                                    onChange={e => setEditFormData({...editFormData, phoneNumber: e.target.value})}
                                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50"
                                  />
                                </div>
                              </div>

                              <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Corporate Placement</h3>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Corporate Role</label>
                                  <select 
                                    value={editFormData.role}
                                    onChange={e => setEditFormData({...editFormData, role: e.target.value})}
                                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50"
                                  >
                                    <option value="">Select corporate role...</option>
                                    {roles.map(r => (
                                      <option key={r.id} value={r.code}>{r.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                                  <input 
                                    type="text" 
                                    value={editFormData.department}
                                    onChange={e => setEditFormData({...editFormData, department: e.target.value})}
                                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Job Title</label>
                                  <input 
                                    type="text" 
                                    value={editFormData.jobTitle}
                                    onChange={e => setEditFormData({...editFormData, jobTitle: e.target.value})}
                                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Employee ID</label>
                                  <input 
                                    type="text" 
                                    value={editFormData.employeeId}
                                    onChange={e => setEditFormData({...editFormData, employeeId: e.target.value})}
                                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Organization</label>
                                  <input 
                                    type="text" 
                                    value={editFormData.organization}
                                    onChange={e => setEditFormData({...editFormData, organization: e.target.value})}
                                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/50"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Direct Override Permissions</h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-2">
                                {permissions.map((p: any) => {
                                  const key = p.permissionKey || p.name;
                                  const isChecked = editFormData.permissions.includes(key);
                                  return (
                                    <label key={p.id || key} className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs">
                                      <input 
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleEditTogglePermission(key)}
                                        className="h-4 w-4 text-indigo-600 border-slate-200 rounded"
                                      />
                                      <div>
                                        <div className="font-semibold text-slate-800">{p.label || key}</div>
                                        <div className="text-[9px] text-slate-400 font-mono">{key}</div>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                              <button 
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-xl transition-all"
                              >
                                Cancel
                              </button>
                              <button 
                                type="submit"
                                className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
                              >
                                <Save className="h-4 w-4" />
                                Save Changes
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Contact Information Card */}
                              <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Contact Information</h3>
                                <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <User className="h-5 w-5 text-slate-400" />
                                    <div>
                                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Full Name</label>
                                      <p className="text-slate-950 font-bold mt-0.5">{userDetails?.firstName} {userDetails?.lastName}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                    <div>
                                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Email Address</label>
                                      <p className="text-slate-950 font-bold mt-0.5">{userDetails?.email}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <BadgeInfo className="h-5 w-5 text-slate-400" />
                                    <div>
                                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Username</label>
                                      <p className="text-slate-950 font-bold mt-0.5">@{userDetails?.username || 'user'}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Phone className="h-5 w-5 text-slate-400" />
                                    <div>
                                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Phone Number</label>
                                      <p className="text-slate-950 font-bold mt-0.5">{userDetails?.phoneNumber || 'Not provided'}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Employment Details Card */}
                              <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Employment Details</h3>
                                <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <Building className="h-5 w-5 text-slate-400" />
                                    <div>
                                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Department</label>
                                      <p className="text-slate-950 font-bold mt-0.5">{userDetails?.department || "Unassigned"}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Shield className="h-5 w-5 text-slate-400" />
                                    <div>
                                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Job Title</label>
                                      <p className="text-slate-950 font-bold mt-0.5">{userDetails?.jobTitle || "Corporate Associate"}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <BadgeInfo className="h-5 w-5 text-slate-400" />
                                    <div>
                                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Employee ID</label>
                                      <p className="text-slate-950 font-bold mt-0.5">{userDetails?.employeeId || "Not assigned"}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Building className="h-5 w-5 text-slate-400" />
                                    <div>
                                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Organization</label>
                                      <p className="text-slate-950 font-bold mt-0.5">{userDetails?.organization || "AuraEPM Enterprise"}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Direct Permissions Map */}
                            <div className="space-y-3">
                              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Direct Permissions Overrides</h3>
                              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                {userDetails?.permissions?.length === 0 ? (
                                  <p className="text-slate-400 text-sm italic">No direct override permissions defined for this account.</p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {userDetails?.permissions?.map((p: any) => (
                                      <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-indigo-50/30 border border-indigo-100/50">
                                        <CheckSquare className="h-4 w-4 text-indigo-600 shrink-0" />
                                        <div className="text-xs">
                                          <span className="font-bold text-slate-800">{p.label || p.name}</span>
                                          <span className="text-[9px] text-slate-400 font-mono block mt-0.5">{p.permissionKey || p.name}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "projects" && (
                      <div className="space-y-4">
                        {userProjects.length === 0 ? (
                          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 border-dashed">
                            <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-bold">No active managed projects found.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {userProjects.map(project => (
                              <div key={project.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                  <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{project.name}</h4>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(project.status)}`}>
                                    {project.status}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">{project.description || "No description provided."}</p>
                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                                  <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Building className="h-3 w-3" />
                                    {project.clientName || "Enterprise"}
                                  </div>
                                  <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "tasks" && (
                      <div className="space-y-4">
                        {userTasks.length === 0 ? (
                          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 border-dashed">
                            <ListTodo className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-bold">No tasks assigned to this account.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {userTasks.map(task => (
                              <div key={task.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-4 group">
                                <div className="flex items-center gap-4 min-w-0">
                                  <div className={`h-2 w-2 rounded-full shrink-0 ${
                                    task.priority === 'URGENT' ? 'bg-rose-500' : 
                                    task.priority === 'HIGH' ? 'bg-amber-500' : 'bg-slate-300'
                                  }`} />
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 truncate">{task.title}</div>
                                    <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                                      Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                                      <span className="h-1 w-1 rounded-full bg-slate-200" />
                                      {task.priority} Priority
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(task.status)}`}>
                                    {task.status}
                                  </span>
                                  <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-all cursor-pointer">
                                    <ExternalLink className="h-4 w-4" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "resources" && (
                      <div className="space-y-4">
                        {userResources.length === 0 ? (
                          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 border-dashed">
                            <Building className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-bold">No resource profiles linked.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {userResources.map(res => (
                              <div key={res.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                  <h4 className="font-bold text-slate-900">{res.name}</h4>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(res.status)}`}>
                                    {res.status}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Building className="h-3 w-3" />
                                    {res.department || "Corporate"}
                                  </div>
                                  <div className="text-xs text-slate-400 font-medium">
                                    Type: {res.type}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "milestones" && (
                      <div className="space-y-4">
                        {userMilestones.length === 0 ? (
                          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 border-dashed">
                            <Check className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-bold">No milestones associated with this account.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {userMilestones.map((m, idx) => (
                              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                    <Check className="h-4 w-4 text-emerald-500" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900">{m.name || m.title}</div>
                                    <div className="text-xs text-slate-400 mt-0.5">Project: {m.projectName}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "risks" && (
                      <div className="space-y-4">
                        {userRisks.length === 0 ? (
                          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 border-dashed">
                            <AlertTriangle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-bold">No owned risks or issues assigned.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {userRisks.map(risk => (
                              <div key={risk.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                  <div className={`p-2 rounded-lg ${risk.type === 'RISK' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                                    <AlertTriangle className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900">{risk.title}</div>
                                    <div className="text-xs text-slate-400 mt-0.5">{risk.type} • Priority: {risk.priority}</div>
                                  </div>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(risk.status)}`}>
                                  {risk.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "activity" && (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Activity className="h-3 w-3" /> Recent Audit Logs
                          </h4>
                          {userAuditLogs.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">No activity logs found.</p>
                          ) : (
                            <div className="space-y-2">
                              {userAuditLogs.map(log => (
                                <div key={log.id} className="bg-white p-3 rounded-xl border border-slate-100 text-sm flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                    <History className="h-4 w-4 text-slate-300" />
                                    <div>
                                      <span className="font-bold text-indigo-600">{log.action}</span>
                                      <span className="text-slate-500 mx-2">on</span>
                                      <span className="text-slate-900">{log.entityType}</span>
                                    </div>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {new Date(log.createdAt).toLocaleString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare className="h-3 w-3" /> Recent Chat Messages
                          </h4>
                          {userChatMessages.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">No recent messages.</p>
                          ) : (
                            <div className="space-y-2">
                              {userChatMessages.map(msg => (
                                <div key={msg.id} className="bg-white p-3 rounded-xl border border-slate-100 text-sm">
                                  <div className="flex justify-between mb-1">
                                    <span className="font-bold text-slate-900">Project Context</span>
                                    <span className="text-[10px] text-slate-400">{new Date(msg.createdAt).toLocaleString()}</span>
                                  </div>
                                  <p className="text-slate-600 italic">"{msg.content}"</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText className="h-3 w-3" /> Change Requests
                          </h4>
                          {userChangeRequests.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">No change requests initiated.</p>
                          ) : (
                            <div className="grid grid-cols-1 gap-2">
                              {userChangeRequests.map(cr => (
                                <div key={cr.id} className="bg-white p-3 rounded-xl border border-slate-100 text-sm flex justify-between items-center">
                                  <div className="font-bold text-slate-900">{cr.title}</div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(cr.status)}`}>
                                    {cr.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === "security" && (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Lock className="h-3 w-3" /> Security Events
                          </h4>
                          {userSecurityLogs.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">No security events recorded.</p>
                          ) : (
                            <div className="space-y-2">
                              {userSecurityLogs.map(log => (
                                <div key={log.id} className="bg-white p-3 rounded-xl border border-slate-100 text-sm flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                    <Shield className="h-4 w-4 text-rose-500" />
                                    <span className="font-semibold text-slate-900">{log.action}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {new Date(log.createdAt).toLocaleString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <History className="h-3 w-3" /> Login History
                          </h4>
                          {userLoginHistory.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">No login records.</p>
                          ) : (
                            <div className="space-y-2">
                              {userLoginHistory.map(login => (
                                <div key={login.id} className="bg-white p-3 rounded-xl border border-slate-100 text-sm flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                    <div className={`h-2 w-2 rounded-full ${login.success ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    <span className="text-slate-600 font-medium">{login.ipAddress || 'Unknown IP'}</span>
                                    {!login.success && <span className="text-rose-500 text-xs font-bold">(Failed)</span>}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {new Date(login.createdAt).toLocaleString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
          </div>
        </div>
      )}
    </div>
  );
};
