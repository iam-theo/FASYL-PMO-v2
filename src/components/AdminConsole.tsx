import React, { useState, useEffect } from "react";
import { 
  Shield, Layout, Settings, Users, Key, Box, ChevronRight, ChevronDown,
  Plus, Save, Trash2, Search, Filter, CheckCircle2, AlertCircle,
  ToggleLeft, ToggleRight, Eye, Edit, X, Lock, Unlock, Clock,
  Activity, Grid, Circle, Layers, Settings2, Copy, RefreshCw,
  HelpCircle, AlertTriangle, Play, Palette, Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../lib/api";
import { UsersView } from "./UsersView";
import { SettingsView } from "./SettingsView";
import { OrchestrationView } from "./OrchestrationView";
import { AuditReportsView } from "./AuditReportsView";
import { LifecycleTemplateBuilderView } from "./LifecycleTemplateBuilderView";

type AdminTab = "IAM" | "DASHBOARDS" | "POLICIES" | "MODULES" | "USERS" | "SETTINGS" | "ORCHESTRATION" | "AUDIT" | "LIFECYCLE";

export const AdminConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("IAM");
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<any>(null);
  const [widgets, setWidgets] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [modulesList, setModulesList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "IAM") {
        const [rolesData, permsData, matrixData, usersData, logsData] = await Promise.all([
          api.getRoles(),
          api.getPermissions(),
          api.getPermissionMatrix(),
          api.get("/v1/auth/users"),
          api.getSecurityLogs()
        ]);
        setRoles(rolesData || []);
        setPermissions(permsData || []);
        setPermissionMatrix(matrixData || null);
        setUsersList(usersData || []);
        setLogs(logsData || []);
        
        if (rolesData && rolesData.length > 0 && !selectedRole) {
          setSelectedRole(rolesData[0]);
        }
        if (usersData && usersData.length > 0 && !selectedUser) {
          setSelectedUser(usersData[0]);
          fetchUserProfile(usersData[0].id);
        }
      } else if (activeTab === "DASHBOARDS") {
        const [widgetsData, templatesData] = await Promise.all([
          api.getWidgets(),
          api.get("/v1/dashboards/templates")
        ]);
        setWidgets(widgetsData || []);
        setTemplates(templatesData || []);
      } else if (activeTab === "POLICIES") {
        const policiesData = await api.get("/v1/auth/policies");
        setPolicies(policiesData || []);
      } else if (activeTab === "MODULES") {
        const modulesData = await api.get("/v1/auth/modules");
        setModulesList(modulesData || []);
      }
    } catch (err) {
      console.error("Failed to fetch admin data", err);
      showToast("Error synchronizing enterprise configurations", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const profile = await api.get(`/v1/auth/users/${userId}/profile`);
      setUserProfile(profile || null);
    } catch (err) {
      console.error("Failed to fetch user security profile", err);
    }
  };

  const handleCreateRole = async (newRoleData: any) => {
    try {
      await api.createRole(newRoleData);
      await fetchData();
      showToast(`Custom Role [${newRoleData.code}] created successfully`, "success");
    } catch (err: any) {
      showToast("Failed to create role: " + err.message, "error");
    }
  };

  const handleUpdateRole = async (updatedRole: any) => {
    try {
      await api.updateRole(updatedRole.code, updatedRole);
      await fetchData();
      showToast(`Enterprise Role [${updatedRole.code}] profile updated`, "success");
    } catch (err: any) {
      showToast("Failed to update role profile: " + err.message, "error");
    }
  };

  const handleDeleteRole = async (code: string) => {
    if (!window.confirm(`Are you sure you want to delete the role '${code}'?`)) return;
    try {
      await api.deleteRole(code);
      setSelectedRole(null);
      await fetchData();
      showToast(`Role '${code}' removed successfully`, "success");
    } catch (err: any) {
      showToast("Failed to delete role: " + err.message, "error");
    }
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-96 gap-4 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent"></div>
          <p className="text-slate-500 text-xs font-mono animate-pulse">Syncing Enterprise Records...</p>
        </div>
      );
    }

    switch (activeTab) {
      case "IAM":
        return (
          <IAMManagement 
            roles={roles} 
            permissions={permissions}
            permissionMatrix={permissionMatrix}
            setPermissionMatrix={setPermissionMatrix}
            selectedRole={selectedRole} 
            setSelectedRole={setSelectedRole} 
            onUpdateRole={handleUpdateRole}
            onCreateRole={handleCreateRole}
            onDeleteRole={handleDeleteRole}
            usersList={usersList}
            selectedUser={selectedUser}
            setSelectedUser={setSelectedUser}
            userProfile={userProfile}
            fetchUserProfile={fetchUserProfile}
            logs={logs}
            fetchData={fetchData}
            showToast={showToast}
          />
        );
      case "DASHBOARDS":
        return (
          <DashboardManagement 
            widgets={widgets} 
            templates={templates} 
            roles={roles}
            refresh={fetchData} 
            showToast={showToast}
          />
        );
      case "POLICIES":
        return (
          <PolicyManagement 
            policies={policies} 
            refresh={fetchData} 
            showToast={showToast}
          />
        );
      case "MODULES":
        return (
          <ModuleManagement 
            modulesList={modulesList} 
            refresh={fetchData} 
            showToast={showToast}
          />
        );
      case "USERS":
        return (
          <UsersView />
        );
      case "SETTINGS":
        return (
          <SettingsView />
        );
      case "ORCHESTRATION":
        return (
          <OrchestrationView projectId="super_admin_global" />
        );
      case "AUDIT":
        return (
          <AuditReportsView projectId="super_admin_global" />
        );
      case "LIFECYCLE":
        return (
          <LifecycleTemplateBuilderView />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <div className="w-60 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0">
        <div className="flex flex-col">
          <div className="p-5 border-b border-slate-100">
            <h1 className="text-sm font-bold tracking-wider text-slate-900 flex items-center gap-2 uppercase">
              <Shield className="w-4 h-4 text-indigo-600" />
              Super Admin
            </h1>
            <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold font-mono">Platform Control Center</p>
          </div>

          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-12rem)]">
            <NavButton 
              active={activeTab === "IAM"} 
              onClick={() => setActiveTab("IAM")}
              icon={<Shield className="w-4 h-4" />}
              label="Identity & Access"
            />
            <NavButton 
              active={activeTab === "USERS"} 
              onClick={() => setActiveTab("USERS")}
              icon={<Users className="w-4 h-4" />}
              label="User Management"
            />
            <NavButton 
              active={activeTab === "ORCHESTRATION"} 
              onClick={() => setActiveTab("ORCHESTRATION")}
              icon={<Activity className="w-4 h-4" />}
              label="Orchestration"
            />
            <NavButton 
              active={activeTab === "DASHBOARDS"} 
              onClick={() => setActiveTab("DASHBOARDS")}
              icon={<Layout className="w-4 h-4" />}
              label="Dashboard Engine"
            />
            <NavButton 
              active={activeTab === "LIFECYCLE"} 
              onClick={() => setActiveTab("LIFECYCLE")}
              icon={<Layers className="w-4 h-4" />}
              label="Lifecycle Templates"
            />
            <NavButton 
              active={activeTab === "POLICIES"} 
              onClick={() => setActiveTab("POLICIES")}
              icon={<Key className="w-4 h-4" />}
              label="Policy Engine"
            />
            <NavButton 
              active={activeTab === "MODULES"} 
              onClick={() => setActiveTab("MODULES")}
              icon={<Box className="w-4 h-4" />}
              label="Module Control"
            />
            <NavButton 
              active={activeTab === "AUDIT"} 
              onClick={() => setActiveTab("AUDIT")}
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Audit & Reports"
            />
            <NavButton 
              active={activeTab === "SETTINGS"} 
              onClick={() => setActiveTab("SETTINGS")}
              icon={<Settings className="w-4 h-4" />}
              label="System Settings"
            />
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100 flex flex-col gap-1 bg-slate-50/50">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>PLATFORM DB:</span>
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              SYNCED
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>ENGINE STATUS:</span>
            <span className="text-indigo-600 font-semibold">STABLE</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
        <header className="h-12 border-b border-slate-200/80 bg-white flex items-center justify-between px-6 shrink-0 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Security Matrix</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-800 font-semibold uppercase tracking-wider text-[10px] font-mono">{activeTab}</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchData}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-indigo-600 transition-all flex items-center gap-1 text-[11px] font-mono border border-slate-200 bg-white shadow-sm"
            >
              <RefreshCw className="w-3 h-3" />
              Reload DB
            </button>
            <div className="h-4 w-px bg-slate-200"></div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
              <span className="font-mono text-[10px]">Context: Super Admin</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.15 }}
              className="h-full p-6"
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Elegant Realtime Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-xl border text-xs font-semibold ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 animate-bounce" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span className="font-sans">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70 text-slate-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium uppercase tracking-wider transition-all ${
      active 
        ? "bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm font-semibold" 
        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
    }`}
  >
    {icon}
    {label}
  </button>
);

/* ==========================================
   IAM MANAGEMENT PANEL
   ========================================== */
const IAMManagement = ({ 
  roles, permissions, permissionMatrix, setPermissionMatrix, selectedRole, setSelectedRole, onUpdateRole, onCreateRole, onDeleteRole,
  usersList, selectedUser, setSelectedUser, userProfile, fetchUserProfile, logs, fetchData, showToast 
}: any) => {
  const [activeSubTab, setActiveSubTab] = useState<"MATRIX" | "ROLES" | "USERS" | "AUDIT">("MATRIX");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [updatingCell, setUpdatingCell] = useState<{ roleCode: string; permName: string } | null>(null);

  // Form states for role creation
  const [newRole, setNewRole] = useState({
    name: "",
    code: "",
    description: "",
    color: "#6366f1",
    icon: "Shield",
    hierarchyLevel: 2,
    isSuperAdmin: false,
    isDefault: false,
    departmentScope: "",
    businessUnitScope: "",
    permissionNames: [] as string[]
  });

  const [localRoleForm, setLocalRoleForm] = useState<any>(null);

  useEffect(() => {
    if (selectedRole) {
      setLocalRoleForm({
        ...selectedRole,
        permissionNames: selectedRole.permissionNames || []
      });
    }
  }, [selectedRole]);

  // Expand categories by default
  useEffect(() => {
    if (permissions && permissions.length > 0) {
      const defaultState: Record<string, boolean> = {};
      permissions.forEach((cat: any) => {
        defaultState[cat.id] = true;
      });
      setExpandedCategories(defaultState);
    }
  }, [permissions]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => ({ ...prev, [catId]: prev[catId] === false ? true : false }));
  };

  const handleCellToggle = async (roleCode: string, permName: string, currentlyChecked: boolean) => {
    if (!permissionMatrix) return;
    setUpdatingCell({ roleCode, permName });

    const currentPerms = permissionMatrix.matrix[roleCode] || [];
    const updatedPerms = currentlyChecked
      ? currentPerms.filter((p: string) => p !== permName)
      : [...currentPerms, permName];

    try {
      // Direct API update on DB
      await api.updateRole(roleCode, { permissionNames: updatedPerms });
      
      // Update local state matrix for real-time reactivity
      setPermissionMatrix((prev: any) => ({
        ...prev,
        matrix: {
          ...prev.matrix,
          [roleCode]: updatedPerms
        }
      }));

      showToast(`Permission synced successfully in DB`, "success");
    } catch (err: any) {
      showToast(`Failed to save permission matrix configuration: ${err.message}`, "error");
    } finally {
      setUpdatingCell(null);
    }
  };

  const handleLocalPermissionToggle = (permName: string) => {
    if (!localRoleForm) return;
    const current = localRoleForm.permissionNames || [];
    const exists = current.includes(permName);
    const updated = exists 
      ? current.filter((p: string) => p !== permName)
      : [...current, permName];
    setLocalRoleForm({ ...localRoleForm, permissionNames: updated });
  };

  const handleBulkPermissionSelect = (permNames: string[], select: boolean) => {
    if (!localRoleForm) return;
    const current = localRoleForm.permissionNames || [];
    let updated;
    if (select) {
      updated = Array.from(new Set([...current, ...permNames]));
    } else {
      updated = current.filter((p: string) => !permNames.includes(p));
    }
    setLocalRoleForm({ ...localRoleForm, permissionNames: updated });
  };

  const handleAssignRoleToUser = async (roleCode: string) => {
    if (!selectedUser) return;
    try {
      await api.post(`/v1/auth/users/${selectedUser.id}/roles`, { roleCode });
      await fetchUserProfile(selectedUser.id);
      showToast(`Role ${roleCode} assigned to user`, "success");
    } catch (err: any) {
      showToast("Failed to assign role: " + err.message, "error");
    }
  };

  const handleRemoveRoleFromUser = async (roleCode: string) => {
    if (!selectedUser) return;
    try {
      await api.delete(`/v1/auth/users/${selectedUser.id}/roles/${roleCode}`);
      await fetchUserProfile(selectedUser.id);
      showToast(`Role ${roleCode} removed from user`, "success");
    } catch (err: any) {
      showToast("Failed to remove role: " + err.message, "error");
    }
  };

  const handleDirectOverride = async (permissionName: string, type: "ALLOW" | "DENY") => {
    if (!selectedUser) return;
    try {
      await api.post(`/v1/auth/users/${selectedUser.id}/permissions`, { permissionName, type });
      await fetchUserProfile(selectedUser.id);
      showToast(`Direct override of ${type} set for user`, "success");
    } catch (err: any) {
      showToast("Failed to set override: " + err.message, "error");
    }
  };

  const handleRemoveOverride = async (permissionName: string) => {
    if (!selectedUser) return;
    try {
      await api.delete(`/v1/auth/users/${selectedUser.id}/permissions/${permissionName}`);
      await fetchUserProfile(selectedUser.id);
      showToast(`Direct override removed`, "success");
    } catch (err: any) {
      showToast("Failed to remove override: " + err.message, "error");
    }
  };

  const filteredRoles = roles.filter((r: any) => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Sub Tabs formatted elegantly */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <SubTabButton active={activeSubTab === "MATRIX"} onClick={() => setActiveSubTab("MATRIX")} label="Access Matrix" />
          <SubTabButton active={activeSubTab === "ROLES"} onClick={() => setActiveSubTab("ROLES")} label="Role Profiles" />
          <SubTabButton active={activeSubTab === "USERS"} onClick={() => setActiveSubTab("USERS")} label="User Overrides" />
          <SubTabButton active={activeSubTab === "AUDIT"} onClick={() => setActiveSubTab("AUDIT")} label="IAM Audit Logs" />
        </div>
        {activeSubTab === "ROLES" && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New Custom Role
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeSubTab === "MATRIX" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-[74vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Enterprise Matrix Source of Truth</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Click cells to immediately toggle and insert configurations directly into PostgreSQL db</p>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter permissions..." 
                  className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/30 text-[10px] font-mono text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                    <th className="p-3 pl-5 bg-slate-50/60 font-semibold w-1/3">Permissions (Actions / Description)</th>
                    {roles.map((role: any) => (
                      <th key={role.code} className="p-3 text-center bg-slate-50/60 font-semibold">
                        <div className="flex flex-col items-center">
                          <span className="text-slate-900 font-bold font-sans text-xs lowercase first-letter:uppercase">{role.name}</span>
                          <span className="text-[8px] text-slate-400 mt-0.5 uppercase tracking-widest">{role.code}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {permissions.map((category: any) => {
                    // Filter groups by query
                    const filteredGroups = category.groups.map((group: any) => {
                      const filteredPerms = group.permissions.filter((p: any) => 
                        p.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.name.toLowerCase().includes(searchQuery.toLowerCase())
                      );
                      return { ...group, permissions: filteredPerms };
                    }).filter((g: any) => g.permissions.length > 0);

                    if (filteredGroups.length === 0) return null;

                    return (
                      <React.Fragment key={category.id}>
                        {/* Category Row Header */}
                        <tr className="bg-slate-50/70">
                          <td colSpan={roles.length + 1} className="p-2.5 pl-5 border-y border-slate-200">
                            <div className="flex items-center gap-2">
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-slate-700">{category.name}</span>
                              <span className="text-[9px] text-slate-400 font-mono">/{category.code}</span>
                            </div>
                          </td>
                        </tr>

                        {filteredGroups.map((group: any) => (
                          <React.Fragment key={group.id}>
                            {group.permissions.map((perm: any) => (
                              <tr key={perm.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="p-3 pl-8 max-w-sm">
                                  <div>
                                    <span className="text-xs font-semibold text-slate-800">{perm.label}</span>
                                    <span className="text-[8px] font-mono bg-slate-100 text-slate-500 rounded px-1 ml-2 uppercase tracking-wide">
                                      {perm.name}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 group-hover:line-clamp-none transition-all">{perm.description || "No description configured."}</p>
                                </td>
                                {roles.map((role: any) => {
                                  const isChecked = permissionMatrix?.matrix[role.code]?.includes(perm.name) || false;
                                  const isCellUpdating = updatingCell?.roleCode === role.code && updatingCell?.permName === perm.name;

                                  return (
                                    <td key={role.code} className="p-3 text-center align-middle">
                                      <div className="flex items-center justify-center">
                                        {isCellUpdating ? (
                                          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                          <button
                                            onClick={() => handleCellToggle(role.code, perm.name, isChecked)}
                                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all focus:outline-none focus:ring-1 focus:ring-indigo-400/30 ${
                                              isChecked 
                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                                                : "border-slate-300 hover:border-slate-400 bg-white"
                                            }`}
                                          >
                                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === "ROLES" && (
          <div className="grid grid-cols-12 gap-6 h-full">
            {/* Roles List */}
            <div className="col-span-4 bg-white rounded-xl border border-slate-200 flex flex-col h-[74vh] shadow-sm overflow-hidden">
              <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Role List</h3>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 font-mono px-2 py-0.5 rounded border border-indigo-100 font-semibold">
                  {filteredRoles.length} Active
                </span>
              </div>
              <div className="p-2.5 border-b border-slate-200 bg-slate-50/20">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search roles..." 
                    className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-auto p-2 space-y-1.5">
                {filteredRoles.map((role: any) => {
                  const isSelected = selectedRole?.id === role.id;
                  return (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role)}
                      className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group ${
                        isSelected 
                          ? "bg-indigo-50/50 border-indigo-200 text-indigo-700 shadow-sm" 
                          : "hover:bg-slate-50/60 bg-white border-slate-200 text-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-7 h-7 rounded flex items-center justify-center font-mono text-xs font-bold border"
                          style={{ 
                            backgroundColor: `${role.color || '#6366f1'}15`, 
                            borderColor: `${role.color || '#6366f1'}40`,
                            color: role.color || '#6366f1'
                          }}
                        >
                          {role.name.charAt(0)}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isSelected ? "text-indigo-900" : "text-slate-800"}`}>{role.name}</p>
                          <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider mt-0.5">{role.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {role.isSystem && (
                          <span className="text-[8px] border border-slate-200 font-mono text-slate-400 px-1 py-0.5 rounded bg-slate-50 font-bold">SYSTEM</span>
                        )}
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? "translate-x-0 text-indigo-500" : "-translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Role Builder Panel */}
            <div className="col-span-8 overflow-auto h-[74vh] pr-1 space-y-4">
              {localRoleForm ? (
                <>
                  {/* Header / Summary Card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold border shrink-0"
                        style={{ 
                          backgroundColor: `${localRoleForm.color || '#6366f1'}15`, 
                          borderColor: `${localRoleForm.color || '#6366f1'}40`,
                          color: localRoleForm.color || '#6366f1'
                        }}
                      >
                        {localRoleForm.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-slate-850">{localRoleForm.name}</h2>
                          {localRoleForm.isSystem && (
                            <span className="text-[8px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider font-semibold">ReadOnly System</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{localRoleForm.description || "Enterprise authorization role container."}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {!localRoleForm.isSystem && (
                        <button 
                          onClick={() => onDeleteRole(localRoleForm.code)}
                          className="p-1.5 hover:bg-rose-50 hover:text-rose-600 text-slate-400 border border-slate-200 rounded-lg transition-all"
                          title="Delete custom role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
                        onClick={() => onUpdateRole(localRoleForm)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save Profile
                      </button>
                    </div>
                  </div>

                  {/* Settings Tabs Container */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
                    <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <Settings2 className="w-4 h-4 text-indigo-500" />
                      Role Settings & Metadata
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-semibold">Role Name</label>
                          <input 
                            type="text" 
                            disabled={localRoleForm.isSystem}
                            value={localRoleForm.name}
                            onChange={(e) => setLocalRoleForm({ ...localRoleForm, name: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-semibold">Description</label>
                          <textarea 
                            rows={3}
                            value={localRoleForm.description || ""}
                            onChange={(e) => setLocalRoleForm({ ...localRoleForm, description: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-semibold">Badge Color</label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="color" 
                                value={localRoleForm.color || "#6366f1"}
                                onChange={(e) => setLocalRoleForm({ ...localRoleForm, color: e.target.value })}
                                className="w-7 h-7 rounded border border-slate-200 bg-transparent cursor-pointer shrink-0"
                              />
                              <input 
                                type="text"
                                value={localRoleForm.color || "#6366f1"}
                                onChange={(e) => setLocalRoleForm({ ...localRoleForm, color: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-semibold">Hierarchy Priority</label>
                            <input 
                              type="number" 
                              min="0"
                              max="10"
                              value={localRoleForm.hierarchyLevel || 0}
                              onChange={(e) => setLocalRoleForm({ ...localRoleForm, hierarchyLevel: Number(e.target.value) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-semibold">Department Scope</label>
                            <select 
                              value={localRoleForm.departmentScope || ""}
                              onChange={(e) => setLocalRoleForm({ ...localRoleForm, departmentScope: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs focus:outline-none"
                            >
                              <option value="">Global/Unified</option>
                              <option value="Engineering">Engineering</option>
                              <option value="Operations">Operations</option>
                              <option value="Finance">Finance</option>
                              <option value="Executive">Executive</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-semibold">Business Unit Scope</label>
                            <select 
                              value={localRoleForm.businessUnitScope || ""}
                              onChange={(e) => setLocalRoleForm({ ...localRoleForm, businessUnitScope: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs focus:outline-none"
                            >
                              <option value="">Global/Unified</option>
                              <option value="North America">North America</option>
                              <option value="EMEA">EMEA</option>
                              <option value="APAC">APAC</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-4 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={!!localRoleForm.isSuperAdmin}
                              onChange={(e) => setNewRole({ ...newRole, isSuperAdmin: e.target.checked })}
                              className="w-3.5 h-3.5 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] text-slate-600 font-medium">Grant Super Admin Privileges</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={!!localRoleForm.isDefault}
                              onChange={(e) => setLocalRoleForm({ ...localRoleForm, isDefault: e.target.checked })}
                              className="w-3.5 h-3.5 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[11px] text-slate-600 font-medium">Default Onboard Role</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Individual Role Permission Checkboxes */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                      <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-indigo-500" />
                        Configure Mapped Permissions
                      </h3>
                      <div className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
                        {localRoleForm.permissionNames?.length || 0} Assigned
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      {permissions.map((category: any) => {
                        const catPermissions = category.groups.flatMap((g: any) => g.permissions.map((p: any) => p.name));
                        const isCatAllChecked = catPermissions.every((pName: string) => localRoleForm.permissionNames?.includes(pName));
                        const isCatSomeChecked = catPermissions.some((pName: string) => localRoleForm.permissionNames?.includes(pName)) && !isCatAllChecked;

                        return (
                          <div key={category.id} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/20">
                            <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => toggleCategory(category.id)}
                                  className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedCategories[category.id] !== false ? "rotate-0" : "-rotate-90"}`} />
                                </button>
                                <input 
                                  type="checkbox"
                                  ref={(el) => {
                                    if (el) el.indeterminate = isCatSomeChecked;
                                  }}
                                  checked={isCatAllChecked}
                                  onChange={(e) => handleBulkPermissionSelect(catPermissions, e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                <div>
                                  <span className="text-xs font-bold text-slate-800">{category.name}</span>
                                  <span className="text-[9px] text-slate-400 font-mono ml-1 uppercase">/{category.code}</span>
                                </div>
                              </div>
                            </div>

                            {expandedCategories[category.id] !== false && (
                              <div className="p-3 space-y-3">
                                {category.groups.map((group: any) => (
                                  <div key={group.id} className="space-y-1.5 pl-3 border-l border-slate-200">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] font-bold text-slate-700">{group.name}</span>
                                      <span className="text-[8px] font-mono text-slate-400">({group.code})</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                      {group.permissions.map((perm: any) => {
                                        const isChecked = localRoleForm.permissionNames?.includes(perm.name);
                                        return (
                                          <div 
                                            key={perm.id} 
                                            onClick={() => handleLocalPermissionToggle(perm.name)}
                                            className={`p-2 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 ${
                                              isChecked 
                                                ? "bg-indigo-50/40 border-indigo-200 text-indigo-700" 
                                                : "bg-white border-slate-200 hover:border-slate-300 text-slate-500"
                                            }`}
                                          >
                                            <input 
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => {}} // Handled by container div click
                                              className="w-3.5 h-3.5 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500 mt-0.5"
                                            />
                                            <div className="flex-1">
                                              <p className={`text-[11px] font-bold ${isChecked ? "text-indigo-900" : "text-slate-800"}`}>{perm.label}</p>
                                              <p className="text-[8px] text-slate-400 font-mono mt-0.5">{perm.name}</p>
                                              {perm.description && <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">{perm.description}</p>}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-[74vh] flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200/80 shadow-sm">
                  <Shield className="w-10 h-10 mb-2 opacity-25 text-slate-300" />
                  <p className="font-semibold text-slate-500 text-xs uppercase tracking-wider">No Role Selected</p>
                  <p className="text-slate-400 text-[10px] mt-1 max-w-sm text-center">Select an authorization role from the roster to configure its attributes and system permissions</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSubTab === "USERS" && (
          <div className="grid grid-cols-12 gap-6 h-full">
            {/* User Selection */}
            <div className="col-span-4 bg-white rounded-xl border border-slate-200 flex flex-col h-[74vh] shadow-sm overflow-hidden">
              <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Users Directory</h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-600 font-mono px-2 py-0.5 rounded border border-emerald-100 font-semibold">
                  {usersList.length} Accounts
                </span>
              </div>
              <div className="flex-1 overflow-auto p-2 space-y-1">
                {usersList.map((usr: any) => {
                  const isSelected = selectedUser?.id === usr.id;
                  return (
                    <button
                      key={usr.id}
                      onClick={() => {
                        setSelectedUser(usr);
                        fetchUserProfile(usr.id);
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group ${
                        isSelected 
                          ? "bg-indigo-50/50 border-indigo-200 text-indigo-700 shadow-sm" 
                          : "hover:bg-slate-50/60 bg-white border-slate-200 text-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs uppercase text-slate-500">
                          {usr.name ? usr.name.slice(0, 2) : "US"}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isSelected ? "text-indigo-900" : "text-slate-800"}`}>{usr.name || usr.email}</p>
                          <p className="text-[9px] text-slate-400 font-mono mt-0.5">{usr.department || "General Operations"}</p>
                        </div>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? "translate-x-0 text-indigo-500" : "-translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User overrides control panel */}
            <div className="col-span-8 overflow-auto h-[74vh] pr-1 space-y-4">
              {selectedUser && userProfile ? (
                <div className="space-y-4">
                  {/* Summary footprint */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-11 h-11 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-sm text-indigo-600 uppercase">
                      {selectedUser.name ? selectedUser.name.slice(0, 2) : "US"}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-850">{selectedUser.name}</h2>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{selectedUser.email} &bull; Dept: {selectedUser.department || "Unified Staff"}</p>
                    </div>
                  </div>

                  {/* Assigned Roles */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-sm">
                    <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-500" />
                      Assigned Security Roles
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {userProfile.roles?.map((r: any) => (
                        <div key={r.code} className="bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5 font-semibold">
                          <span>{r.name}</span>
                          <span className="text-[8px] opacity-70 font-mono">({r.code})</span>
                          <button 
                            onClick={() => handleRemoveRoleFromUser(r.code)}
                            className="text-indigo-400 hover:text-indigo-700 font-bold"
                            title="Revoke role assignment"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                      {(!userProfile.roles || userProfile.roles.length === 0) && (
                        <p className="text-slate-400 text-xs italic">No roles explicitly assigned to this account.</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-semibold">Assign Additional Enterprise Role</label>
                      <div className="flex gap-2">
                        <select 
                          id="add-role-selector"
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                        >
                          <option value="">-- Choose security role --</option>
                          {roles.map((r: any) => (
                            <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
                          ))}
                        </select>
                        <button 
                          onClick={() => {
                            const val = (document.getElementById("add-role-selector") as HTMLSelectElement)?.value;
                            if (val) handleAssignRoleToUser(val);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-semibold rounded-lg text-white"
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Direct Permission Overrides */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-sm">
                    <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-indigo-500" />
                      Direct User Level Overrides
                    </h3>

                    {userProfile.directOverrides && userProfile.directOverrides.length > 0 ? (
                      <div className="space-y-1.5 max-h-48 overflow-auto">
                        {userProfile.directOverrides.map((override: any) => (
                          <div key={override.name} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs">
                            <div>
                              <p className="font-bold text-slate-800 text-[11px]">{override.label || override.name}</p>
                              <p className="text-[9px] text-slate-400 font-mono">{override.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                override.type === "ALLOW" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                              }`}>
                                {override.type}
                              </span>
                              <button 
                                onClick={() => handleRemoveOverride(override.name)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-xs italic">No direct overrides assigned. Permissions are computed from roles and active policies.</p>
                    )}

                    <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-semibold">Permission Override</label>
                        <select 
                          id="override-perm-selector"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                        >
                          <option value="">-- Choose permission --</option>
                          {permissions.flatMap((c: any) => c.groups.flatMap((g: any) => g.permissions)).map((p: any) => (
                            <option key={p.name} value={p.name}>{p.label} ({p.name})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-semibold">Override Mode & Save</label>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              const perm = (document.getElementById("override-perm-selector") as HTMLSelectElement)?.value;
                              if (perm) handleDirectOverride(perm, "ALLOW");
                            }}
                            className="flex-1 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100/50 py-2 text-xs font-bold rounded-lg uppercase tracking-wider"
                          >
                            Grant Allow
                          </button>
                          <button 
                            onClick={() => {
                              const perm = (document.getElementById("override-perm-selector") as HTMLSelectElement)?.value;
                              if (perm) handleDirectOverride(perm, "DENY");
                            }}
                            className="flex-1 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100/50 py-2 text-xs font-bold rounded-lg uppercase tracking-wider"
                          >
                            Grant Deny
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[74vh] flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 shadow-sm">
                  <Users className="w-10 h-10 mb-2 opacity-25 text-slate-300" />
                  <p className="font-semibold text-slate-500 text-xs uppercase tracking-wider">No User Selected</p>
                  <p className="text-slate-400 text-[10px] mt-1">Select an account from the directory tree to inspect and configure user overrides</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSubTab === "AUDIT" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-[74vh] flex flex-col shadow-sm">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-850 text-xs uppercase tracking-wider">Platform Security Audit Log</h3>
              <span className="text-[10px] bg-indigo-50 text-indigo-600 font-mono px-2 py-0.5 rounded border border-indigo-100 font-semibold">
                Authorized Audits
              </span>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-2 font-mono text-[10px] text-slate-600">
              {logs.map((log: any) => (
                <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-4 hover:border-indigo-100 hover:bg-indigo-50/10 transition-colors">
                  <span className="text-indigo-600 font-bold uppercase tracking-wider">[{log.action}]</span>
                  <div className="flex-1">
                    <p className="text-slate-700 font-sans text-xs leading-relaxed">{log.details ? JSON.stringify(JSON.parse(log.details)) : "No audit payload registered"}</p>
                    <p className="text-slate-400 text-[9px] mt-1">Actor: {log.actorId} &bull; Resource: {log.targetType}/{log.targetId}</p>
                  </div>
                  <span className="text-slate-400 text-[9px] whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
              {(!logs || logs.length === 0) && (
                <div className="flex items-center justify-center h-full text-slate-400 italic font-sans text-xs">
                  No security audits logged.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Role Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-600" />
                Build Custom IAM Role
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-semibold">Role Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Lead Project Manager"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-semibold">Role Code (Unique)</label>
                <input 
                  type="text"
                  placeholder="e.g. lead_pm"
                  value={newRole.code}
                  onChange={(e) => setNewRole({ ...newRole, code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-semibold">Role Description</label>
              <textarea 
                rows={2}
                placeholder="Briefly summarize permission levels for this role..."
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-semibold">Badge Color</label>
                <div className="flex gap-2">
                  <input 
                    type="color"
                    value={newRole.color}
                    onChange={(e) => setNewRole({ ...newRole, color: e.target.value })}
                    className="w-7 h-7 rounded border border-slate-200 bg-transparent cursor-pointer shrink-0"
                  />
                  <input 
                    type="text"
                    value={newRole.color}
                    onChange={(e) => setNewRole({ ...newRole, color: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-semibold">Clone permissions from</label>
                <select 
                  onChange={(e) => {
                    const clonedCode = e.target.value;
                    const match = roles.find((r: any) => r.code === clonedCode);
                    if (match) {
                      const clonedPerms = permissionMatrix?.matrix[clonedCode] || [];
                      setNewRole({ ...newRole, permissionNames: clonedPerms });
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none text-slate-700"
                >
                  <option value="">-- Start Fresh --</option>
                  {roles.map((r: any) => (
                    <option key={r.code} value={r.code}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-600 font-mono uppercase font-semibold"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onCreateRole(newRole);
                  setShowCreateModal(false);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm"
              >
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SubTabButton = ({ active, onClick, label }: any) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
      active 
        ? "bg-indigo-50 border border-indigo-150 text-indigo-700 font-bold shadow-xs" 
        : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
    }`}
  >
    {label}
  </button>
);

/* ==========================================
   DASHBOARD & WIDGET MANAGEMENT
   ========================================== */
const DashboardManagement = ({ widgets, templates, roles, refresh, showToast }: any) => {
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showWidgetEditor, setShowWidgetEditor] = useState(false);
  
  // Custom states
  const [newTemplate, setNewTemplate] = useState({
    name: "New View Template",
    description: "Standard executive gateway analytics",
    roleId: "",
    department: "",
    businessUnit: "",
    isDefault: false,
    layout: [] as any[]
  });

  const [newWidget, setNewWidget] = useState({
    name: "",
    code: "",
    moduleId: "",
    componentType: "KPI",
    apiEndpoint: "/api/v1/metrics",
    refreshInterval: 300,
    permissionRequired: "projects.view"
  });

  const handleCreateTemplate = async () => {
    try {
      await api.createDashboardTemplate(newTemplate);
      showToast("Template deployed successfully", "success");
      setShowTemplateEditor(false);
      refresh();
    } catch (err: any) {
      showToast("Failed to deploy template: " + err.message, "error");
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      await api.delete(`/v1/dashboards/templates/${templateId}`);
      showToast("Template deleted successfully", "success");
      refresh();
    } catch (err: any) {
      showToast("Failed to delete template: " + err.message, "error");
    }
  };

  const handleCreateWidget = async () => {
    try {
      await api.createWidget(newWidget);
      showToast("Custom Widget registered", "success");
      setShowWidgetEditor(false);
      refresh();
    } catch (err: any) {
      showToast("Failed to register widget: " + err.message, "error");
    }
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!window.confirm("Are you sure you want to delete this widget definition?")) return;
    try {
      await api.delete(`/v1/dashboards/widgets/${widgetId}`);
      showToast("Widget deleted", "success");
      refresh();
    } catch (err: any) {
      showToast("Failed to delete widget: " + err.message, "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<Layout className="text-indigo-600" />} label="Deployed Templates" value={templates?.length || 0} />
        <StatCard icon={<Box className="text-emerald-600" />} label="Registered Widgets" value={widgets?.length || 0} />
        <StatCard icon={<Users className="text-rose-600" />} label="Active Layouts" value={templates?.length ? templates.length * 2 : 5} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Templates Panel */}
        <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Dashboard Templates Store</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Role based default views launched at login</p>
            </div>
            {!showTemplateEditor && (
              <button 
                onClick={() => setShowTemplateEditor(true)}
                className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:text-indigo-700 hover:bg-indigo-50/50 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 shadow-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Build Template
              </button>
            )}
          </div>

          <div className="p-5">
            {showTemplateEditor ? (
              <div className="space-y-4 animate-in fade-in">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1 font-semibold">Template Name</label>
                      <input 
                        type="text" 
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        placeholder="e.g. Executive Summary"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1 font-semibold">Target Role Container</label>
                      <select 
                        value={newTemplate.roleId}
                        onChange={(e) => setNewTemplate({ ...newTemplate, roleId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:outline-none"
                      >
                        <option value="">All Roles (Global Default)</option>
                        {roles.map((r: any) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1 font-semibold">Target Department</label>
                      <input 
                        type="text" 
                        value={newTemplate.department}
                        onChange={(e) => setNewTemplate({ ...newTemplate, department: e.target.value })}
                        placeholder="e.g. Operations"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1 font-semibold">Description Summary</label>
                      <input 
                        type="text" 
                        value={newTemplate.description}
                        onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Grid layouts configuration */}
                <div className="space-y-2">
                  <label className="block text-[9px] font-mono text-slate-400 uppercase font-semibold">Map grid layouts</label>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Select widgets to add</p>
                      <div className="space-y-1.5 max-h-40 overflow-auto pr-1">
                        {widgets.map((w: any) => {
                          const isAdded = newTemplate.layout.some(l => l.widgetId === w.id);
                          return (
                            <div key={w.id} className="flex items-center justify-between p-2 rounded bg-white text-xs border border-slate-200">
                              <div>
                                <p className="font-semibold text-slate-800">{w.name}</p>
                                <p className="text-[9px] text-slate-400 font-mono">{w.code}</p>
                              </div>
                              <button 
                                onClick={() => {
                                  if (isAdded) {
                                    setNewTemplate({ ...newTemplate, layout: newTemplate.layout.filter(l => l.widgetId !== w.id) });
                                  } else {
                                    setNewTemplate({ 
                                      ...newTemplate, 
                                      layout: [...newTemplate.layout, { widgetId: w.id, gridPosX: 0, gridPosY: 0, gridWidth: 6, gridHeight: 4, isPinned: false, isCollapsed: false }] 
                                    });
                                  }
                                }}
                                className={`text-[9px] font-mono uppercase px-2.5 py-1 rounded font-bold ${
                                  isAdded ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}
                              >
                                {isAdded ? "Added" : "Add"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded-lg bg-white p-3 flex flex-col justify-between">
                      <div className="text-xs text-slate-500">
                        <p className="font-bold text-slate-700">Grid Assembly Blueprint</p>
                        <p className="mt-1 font-mono text-[10px]">{newTemplate.layout.length} Widgets added to view canvas.</p>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => setShowTemplateEditor(false)}
                          className="px-3 py-1.5 text-xs text-slate-400 font-semibold"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleCreateTemplate}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                        >
                          Deploy Template
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((tpl: any) => (
                  <div key={tpl.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Layout className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">{tpl.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{tpl.description || "Executive analytical workspace layout"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-semibold">
                        RoleID: {tpl.roleId ? "Custom R" : "Global"}
                      </span>
                      <button 
                        onClick={() => handleDeleteTemplate(tpl.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100"
                        title="Delete template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!templates || templates.length === 0) && (
                  <div className="text-center p-8 text-slate-400 italic text-xs border border-dashed border-slate-200 rounded-xl">
                    No dashboard templates compiled yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Widgets Panel */}
        <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Custom Widgets</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Register custom KPI tiles</p>
            </div>
            {!showWidgetEditor && (
              <button 
                onClick={() => setShowWidgetEditor(true)}
                className="text-slate-400 hover:text-indigo-600 p-1"
              >
                <Plus className="w-4.5 h-4.5" />
              </button>
            )}
          </div>

          <div className="p-4 flex-1">
            {showWidgetEditor ? (
              <div className="space-y-3 animate-in fade-in">
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 uppercase font-semibold mb-1">Widget Name</label>
                  <input 
                    type="text" 
                    value={newWidget.name}
                    onChange={(e) => setNewWidget({ ...newWidget, name: e.target.value })}
                    placeholder="e.g. Finance Burn Rate"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 uppercase font-semibold mb-1">Widget Code</label>
                  <input 
                    type="text" 
                    value={newWidget.code}
                    onChange={(e) => setNewWidget({ ...newWidget, code: e.target.value })}
                    placeholder="e.g. widget.burn_rate"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 uppercase font-semibold mb-1">API Endpoint</label>
                  <input 
                    type="text" 
                    value={newWidget.apiEndpoint}
                    onChange={(e) => setNewWidget({ ...newWidget, apiEndpoint: e.target.value })}
                    placeholder="/api/v1/finance/burn"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button 
                    onClick={() => setShowWidgetEditor(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 font-semibold"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreateWidget}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    Register
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-auto">
                {widgets.map((w: any) => (
                  <div key={w.id} className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs bg-white hover:border-slate-300">
                    <div>
                      <p className="font-semibold text-slate-800">{w.name}</p>
                      <p className="text-[9px] font-mono text-slate-400">{w.code}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteWidget(w.id)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==========================================
   ORGANIZATIONAL POLICY ENGINE
   ========================================== */
const PolicyManagement = ({ policies, refresh, showToast }: any) => {
  const [showEditor, setShowEditor] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    id: "",
    name: "",
    code: "",
    type: "ORGANIZATION",
    level: "ORGANIZATION",
    targetId: "",
    valueJson: "{\n  \"timeoutMinutes\": 60,\n  \"enforcedMfa\": true\n}",
    isActive: true
  });

  const handleSavePolicy = async () => {
    try {
      // Validate JSON
      try {
        JSON.parse(policyForm.valueJson);
      } catch (err) {
        showToast("Invalid JSON value configured. Please check formatting.", "error");
        return;
      }

      await api.post("/v1/auth/policies", policyForm);
      showToast("Organizational Policy deployed", "success");
      setShowEditor(false);
      refresh();
    } catch (err: any) {
      showToast("Failed to save policy: " + err.message, "error");
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this organizational security policy?")) return;
    try {
      await api.delete(`/v1/auth/policies/${id}`);
      showToast("Policy removed", "success");
      refresh();
    } catch (err: any) {
      showToast("Failed to delete policy: " + err.message, "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Enterprise Policy Orchestrator</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Enforce secure system limitations globally or by departments</p>
        </div>
        {!showEditor && (
          <button 
            onClick={() => {
              setPolicyForm({ id: "", name: "", code: "", type: "ORGANIZATION", level: "ORGANIZATION", targetId: "", valueJson: "{}", isActive: true });
              setShowEditor(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Establish Policy
          </button>
        )}
      </div>

      {showEditor ? (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm animate-in fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1 font-semibold">Policy Title</label>
                <input 
                  type="text" 
                  value={policyForm.name}
                  onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                  placeholder="e.g. Finance Vault High Compliance"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1 font-semibold">Scope Target Level</label>
                <select 
                  value={policyForm.level}
                  onChange={(e) => setPolicyForm({ ...policyForm, level: e.target.value, type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-750 focus:outline-none"
                >
                  <option value="ORGANIZATION">Organization Wide</option>
                  <option value="DEPARTMENT">Departmental Boundary</option>
                  <option value="BUSINESS_UNIT">Business Unit Boundary</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1 font-semibold">Unique Policy Code</label>
                <input 
                  type="text" 
                  value={policyForm.code}
                  placeholder="e.g. policy.finance_compliance"
                  onChange={(e) => setPolicyForm({ ...policyForm, code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1 font-semibold">Target Boundary Value ID</label>
                <input 
                  type="text" 
                  value={policyForm.targetId}
                  onChange={(e) => setPolicyForm({ ...policyForm, targetId: e.target.value })}
                  placeholder="e.g. Operations (Leave empty for Organization level)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1 font-semibold">Policy Parameters Config (JSON)</label>
            <textarea 
              rows={4}
              value={policyForm.valueJson}
              onChange={(e) => setPolicyForm({ ...policyForm, valueJson: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none font-mono"
            />
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox"
                checked={!!policyForm.isActive}
                onChange={(e) => setPolicyForm({ ...policyForm, isActive: e.target.checked })}
                className="w-3.5 h-3.5 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-400 font-mono font-semibold uppercase">Activate policy on deploy</span>
            </label>

            <div className="flex gap-2">
              <button 
                onClick={() => setShowEditor(false)}
                className="px-3.5 py-1.5 text-xs font-mono font-semibold uppercase text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePolicy}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm"
              >
                Deploy Policy
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {policies.map((pol: any) => (
            <div key={pol.id} className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col justify-between hover:border-slate-300 transition-all relative group shadow-sm">
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    setPolicyForm({
                      id: pol.id,
                      name: pol.name,
                      code: pol.code,
                      type: pol.type,
                      level: pol.level,
                      targetId: pol.targetId || "",
                      valueJson: pol.valueJson,
                      isActive: pol.isActive
                    });
                    setShowEditor(true);
                  }}
                  className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded border border-slate-100"
                  title="Modify parameters"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleDeletePolicy(pol.id)}
                  className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded border border-slate-100"
                  title="Abolish policy"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${pol.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></div>
                  <span className="text-[8px] font-mono font-bold uppercase text-slate-400">{pol.level} SCOPE</span>
                </div>
                <h4 className="font-bold text-slate-800 text-xs">{pol.name}</h4>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider">{pol.code}</p>
                {pol.targetId && (
                  <p className="text-[9px] bg-slate-100 border border-slate-200 text-slate-500 font-mono px-1.5 py-0.5 rounded mt-1.5 inline-block">Boundary: {pol.targetId}</p>
                )}
                
                <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider mb-1">Parameters configuration</span>
                  <pre className="text-[9px] font-mono text-indigo-600 max-h-24 overflow-auto">{JSON.stringify(JSON.parse(pol.valueJson), null, 2)}</pre>
                </div>
              </div>
            </div>
          ))}
          {(!policies || policies.length === 0) && (
            <div className="col-span-3 text-center p-8 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white shadow-sm italic text-xs">
              No organizational policies deployed. Click Establish Policy to seed secure limits!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ==========================================
   ENTERPRISE MODULE CONTROL
   ========================================== */
const ModuleManagement = ({ modulesList, refresh, showToast }: any) => {

  const handleToggleModule = async (moduleId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.put(`/v1/auth/modules/${moduleId}`, { status: nextStatus });
      showToast(`Module status updated`, "success");
      refresh();
    } catch (err: any) {
      showToast("Failed to toggle module status: " + err.message, "error");
    }
  };

  const handleToggleFeature = async (featureId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.put(`/v1/auth/features/${featureId}`, { status: nextStatus });
      showToast(`Feature status synced`, "success");
      refresh();
    } catch (err: any) {
      showToast("Failed to toggle feature flag: " + err.message, "error");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Enterprise Module Control</h3>
        <p className="text-[11px] text-slate-400 mt-0.5">Toggle fine-grained module access layers and feature flags globally in real-time</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modulesList.map((m: any) => (
          <div key={m.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
            {/* Module title card */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Box className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">{m.name}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[8px] text-slate-400">
                    <span className="uppercase tracking-wider">VERSION: {m.version}</span>
                    <span>&bull;</span>
                    <span className="uppercase tracking-wider">SCOPED: {m.visibility}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleToggleModule(m.id, m.status)}
                className="transition-transform duration-200 hover:scale-105"
              >
                {m.status === "ACTIVE" ? (
                  <ToggleRight className="w-8 h-8 text-indigo-600 cursor-pointer" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-400 cursor-pointer" />
                )}
              </button>
            </div>

            {/* Nested fine-grained feature flags */}
            <div className="p-4 bg-slate-50/20 flex-1 space-y-2.5">
              <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 mb-0.5 font-semibold">Fine-Grained Feature Flags</span>
              {m.features && m.features.length > 0 ? (
                m.features.map((feat: any) => (
                  <div key={feat.id} className="flex items-center justify-between text-xs p-2 rounded bg-white border border-slate-200">
                    <div className="flex-1 pr-3">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-800 text-[11px]">{feat.name}</p>
                        <span className="text-[8px] text-slate-400 font-mono">({feat.code})</span>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-0.5">{feat.description}</p>
                    </div>
                    <button 
                      onClick={() => handleToggleFeature(feat.id, feat.status)}
                      className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                    >
                      {feat.status === "ACTIVE" ? (
                        <span className="text-[8px] bg-emerald-50 border border-emerald-100 text-emerald-600 font-mono font-bold px-2 py-0.5 rounded">ENABLED</span>
                      ) : (
                        <span className="text-[8px] bg-slate-100 border border-slate-200 text-slate-400 font-mono font-bold px-2 py-0.5 rounded">DISABLED</span>
                      )}
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-[9px] italic">No fine-grained gateways registered in this segment.</p>
              )}
            </div>
          </div>
        ))}
        {(!modulesList || modulesList.length === 0) && (
          <div className="col-span-2 text-center p-8 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white shadow-sm italic text-xs">
            No enterprise modules registered in context.
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: any) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
      {icon}
    </div>
    <div>
      <p className="text-[9px] text-slate-400 uppercase tracking-wider font-mono font-semibold">{label}</p>
      <p className="text-lg font-bold text-slate-800 mt-0.5 font-mono">{value}</p>
    </div>
  </div>
);
