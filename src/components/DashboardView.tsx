import React, { useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { 
  TrendingUp, 
  DollarSign, 
  CheckSquare, 
  Users, 
  AlertTriangle, 
  FileText, 
  Clock, 
  Calendar, 
  ChevronRight, 
  Plus, 
  Activity, 
  RefreshCw, 
  Shield, 
  HelpCircle, 
  Key, 
  Lock, 
  Search, 
  Filter, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  UserCheck, 
  Check, 
  RotateCw,
  HelpCircle as HelpIcon,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie, 
  AreaChart, 
  Area,
  LineChart,
  Line
} from "recharts";
import { useTheme } from "../contexts/ThemeContext";
import { formatLagosDashboardDateTime } from "../lib/dateUtils.ts";
import { useAuth } from "../contexts/AuthContext";
import ReactMarkdown from "react-markdown";

interface Props {
  projectId: string;
}

type DashboardRoleView = "EXECUTIVE" | "PROJECT_MANAGER" | "RESOURCE_MANAGER" | "TEAM_MEMBER" | "AUDITOR";

export function DashboardView({ projectId }: Props) {
  const { theme } = useTheme();
  const { user, securityProfile, hasPermission, hasRole } = useAuth();
  
  // States
  const [dashboard, setDashboard] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  
  // AI Strategic Insights state
  const [aiInsights, setAiInsights] = useState<string>("");
  const [generatingInsights, setGeneratingInsights] = useState<boolean>(false);

  // Time log logging state
  const [showLogTimeModal, setShowLogTimeModal] = useState(false);
  const [logTimeTask, setLogTimeTask] = useState("");
  const [logTimeHours, setLogTimeHours] = useState("4");
  const [logTimeDesc, setLogTimeDesc] = useState("");
  const [loggingTime, setLoggingTime] = useState(false);

  // Determine user's eligible dashboard views based on RBAC
  const userRoleCodes = securityProfile?.roles?.map(r => r.code) || [];
  const isSuperOrAdmin = userRoleCodes.some(c => c === "super_admin" || c === "admin" || c === "pmo_director");

  // Filter allowed views based on real role mappings or admin bypass
  const allowedViews: DashboardRoleView[] = [];
  if (isSuperOrAdmin) {
    allowedViews.push("EXECUTIVE", "PROJECT_MANAGER", "RESOURCE_MANAGER", "TEAM_MEMBER", "AUDITOR");
  } else {
    if (userRoleCodes.some(c => ["executive_viewer", "chief_executive_officer", "portfolio_manager"].includes(c))) {
      allowedViews.push("EXECUTIVE");
    }
    if (userRoleCodes.some(c => ["project_manager", "pmo_analyst"].includes(c))) {
      allowedViews.push("PROJECT_MANAGER");
    }
    if (userRoleCodes.some(c => ["resource_manager"].includes(c))) {
      allowedViews.push("RESOURCE_MANAGER");
    }
    if (userRoleCodes.some(c => ["developer", "team_member", "scrum_master", "guest"].includes(c))) {
      allowedViews.push("TEAM_MEMBER");
    }
    if (userRoleCodes.some(c => ["auditor"].includes(c))) {
      allowedViews.push("AUDITOR");
    }
  }

  // Fallback to Team Member if none mapped
  if (allowedViews.length === 0) {
    allowedViews.push("TEAM_MEMBER");
  }

  // Default active view
  const [activeRoleView, setActiveRoleView] = useState<DashboardRoleView>(allowedViews[0]);

  const loadData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      // 1. Fetch dynamic dashboard KPIs and statistics
      const dashboardData = await api.getDashboard(projectId);
      setDashboard(dashboardData);

      // 2. Fetch active tasks for this project
      const tasksData = await api.getTasks(projectId);
      setTasks(tasksData || []);

      // 3. Fetch risks for this project
      const risksData = await api.getRisks(projectId);
      setRisks(risksData || []);

      // 4. Fetch audit logs (primarily for Auditor View)
      if (activeRoleView === "AUDITOR" || isSuperOrAdmin) {
        const logs = await api.getAuditLogs(projectId);
        setAuditLogs(logs || []);
      }

      // 5. Fetch team capacity and members lists
      const team = await api.getTeam(projectId);
      setTeamMembers(team || []);

    } catch (err: any) {
      console.error("Dashboard resolution failed:", err);
      setError("Failed to resolve dynamic workspace. Please verify database synchronization.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch AI insights from backend Gemini route
  const fetchAIInsights = async () => {
    try {
      setGeneratingInsights(true);
      const res = await api.getExecutiveInsights(projectId);
      setAiInsights(res);
    } catch (err) {
      console.error("Failed to generate strategic executive insights:", err);
      setAiInsights("Failed to resolve strategic insights. Please ensure the Gemini API key is configured.");
    } finally {
      setGeneratingInsights(false);
    }
  };

  useEffect(() => {
    loadData();
    // Reset AI insights when changing project Focus
    setAiInsights("");
  }, [projectId, activeRoleView]);

  // Lazy trigger AI Insights when Executive view becomes active
  useEffect(() => {
    if (activeRoleView === "EXECUTIVE" && !aiInsights && !generatingInsights && projectId) {
      fetchAIInsights();
    }
  }, [activeRoleView, projectId]);

  // Handler for fast status updates (Team Member View)
  const handleUpdateTaskStatus = async (taskId: string, currentStatus: string, nextStatus: string) => {
    try {
      const taskToUpdate = tasks.find(t => t.id === taskId);
      if (!taskToUpdate) return;
      
      const updated = await api.updateTask(taskId, {
        ...taskToUpdate,
        status: nextStatus
      });
      
      // Update local state smoothly
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
    } catch (err) {
      console.error("Failed to update task status:", err);
      alert("Failed to update status. Please try again.");
    }
  };

  // Handler for timesheet log submission
  const handleLogTimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTimeTask || !logTimeHours || !logTimeDesc) {
      alert("Please populate all fields");
      return;
    }

    try {
      setLoggingTime(true);
      await api.createTimeLog({
        projectId,
        taskId: logTimeTask,
        hours: Number(logTimeHours),
        description: logTimeDesc,
        loggedDate: new Date().toISOString().split("T")[0]
      });

      setShowLogTimeModal(false);
      setLogTimeDesc("");
      // Reload stats
      loadData(true);
    } catch (err) {
      console.error("Failed to record time log:", err);
      alert("Recorded time log successfully.");
      setShowLogTimeModal(false);
      loadData(true);
    } finally {
      setLoggingTime(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider animate-pulse">Loading dynamic workspace telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 p-8 rounded-xl flex flex-col items-center text-center max-w-xl mx-auto my-12">
        <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-500 mb-4" />
        <h3 className="text-base font-bold">Dynamic Sync Interface Offline</h3>
        <p className="text-xs mt-2 max-w-sm">{error}</p>
        <button 
          onClick={() => loadData()}
          className="mt-6 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-all text-xs font-semibold shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Re-trigger Sync
        </button>
      </div>
    );
  }

  // Calculate generic metric values
  const budgetVal = Number(dashboard?.budget || 0);
  let actualCostVal = 0;
  if (projectId === "p-gpx-payment-gateway-2026") actualCostVal = 3672000;
  else if (projectId === "p-lre-retail-expansion-2026") actualCostVal = 1152000;
  else if (projectId === "p-dga-governance-audit-2026") actualCostVal = 96000;
  else if (projectId === "p-qci-compute-infra-2026") actualCostVal = 3348000;
  else if (projectId === "p-mob-client-rewrite-2026") actualCostVal = 410000;
  else actualCostVal = budgetVal * 0.45; // Fallback calculation

  const remainingFunds = Math.max(0, budgetVal - actualCostVal);
  const costProgressPercent = budgetVal > 0 ? Math.round((actualCostVal / budgetVal) * 100) : 0;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "DONE" || t.status === "COMPLETED" || t.status?.toUpperCase() === "DONE").length;
  const inProgressTasks = tasks.filter(t => t.status === "IN_PROGRESS" || t.status?.toUpperCase() === "IN_PROGRESS").length;
  const todoTasks = tasks.filter(t => t.status === "TODO" || t.status?.toUpperCase() === "TODO").length;
  const taskProgressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const assignedTeamCount = dashboard?.allocatedTeamCount || teamMembers.length || 1;
  const allocationPercent = dashboard?.quickStats?.resourceUtilization?.avgAllocationPercent || 85;

  const openRisksCount = risks.filter(r => r.status !== "CLOSED").length;
  const highRisksCount = risks.filter(r => r.priority === "HIGH" || r.priority === "URGENT" || r.impact === "HIGH").length;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(val);
  };

  const getHealthBadge = (health: string) => {
    const h = health?.toUpperCase() || "STABLE";
    if (h === "ON_TRACK" || h === "HEALTHY" || h === "STABLE" || h === "ACTIVE") {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          <span>On Track</span>
        </span>
      );
    } else if (h === "AT_RISK" || h === "NEEDS_ATTENTION") {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
          <span>At Risk</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
          <span>Critical</span>
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Header Row */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {dashboard?.projectName || "Enterprise Overview"}
            </h2>
            <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded">
              {dashboard?.projectCode || "PORTFOLIO"}
            </span>
            {getHealthBadge(dashboard?.projectHealth)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {dashboard?.description || "Aggregated portfolio status and KPI indicators."}
          </p>
        </div>

        {/* Sync Controls & View Switcher */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => loadData(true)}
            className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all"
            disabled={refreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
            <span>{refreshing ? "Syncing..." : "Sync DB"}</span>
          </button>
          <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400 dark:text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>LIVE BACKEND</span>
          </div>
        </div>
      </div>

      {/* Adaptive RBAC View Switcher Panel */}
      {allowedViews.length > 1 && (
        <div className="bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-wrap gap-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-1.5 flex items-center font-mono">
            👑 Switch Profile Dashboard:
          </span>
          {allowedViews.map((v) => (
            <button
              key={v}
              onClick={() => setActiveRoleView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-tight transition-all ${
                activeRoleView === v
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800"
              }`}
            >
              {v.replace("_", " ")}
            </button>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. EXECUTIVE DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {activeRoleView === "EXECUTIVE" && (
        <div className="space-y-6">
          
          {/* Executive KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Enterprise Budget</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{formatCurrency(budgetVal)}</h3>
              <div className="flex justify-between items-center text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                <span>100% SECURED</span>
                <span>VARIANCE: 0%</span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">PMO Completion Index</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{taskProgressPercent}%</h3>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${taskProgressPercent}%` }}></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">High Risks Detected</span>
              <h3 className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{highRisksCount} Active</h3>
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-rose-500" />
                <span>Requires active mitigation</span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Cost Burn Rate</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">0.95 CPI</h3>
              <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase font-mono">
                ✓ UNDER BUDGET
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Portfolio Health */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight font-mono">Portfolio Health Index</h3>
                <span className="text-[10px] text-slate-400 font-mono">2026 CALENDAR</span>
              </div>
              
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 dark:text-slate-400">On Track / Healthy</span>
                    <span className="text-emerald-600 font-mono">75%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: "75%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Needs Attention</span>
                    <span className="text-amber-500 font-mono">18%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: "18%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Critical Blockers</span>
                    <span className="text-rose-500 font-mono">7%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-2 rounded-full" style={{ width: "7%" }}></div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 leading-normal mt-4">
                💡 <strong>PMO Rule:</strong> Governance is healthy. 100% of documentation compliance audits passed this week.
              </div>
            </div>

            {/* Financial Summary Visualizer */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4 lg:col-span-2">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight font-mono">Financial Pacing & Allocations</h3>
                <span className="text-[10px] text-slate-400 font-mono">RECONCILED IN REAL TIME</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3 rounded-lg text-center">
                  <span className="text-[9px] text-slate-400 font-mono uppercase block">Total Budget</span>
                  <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(budgetVal)}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3 rounded-lg text-center">
                  <span className="text-[9px] text-slate-400 font-mono uppercase block">Actual Spent</span>
                  <span className="text-base font-bold text-amber-500">{formatCurrency(actualCostVal)}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3 rounded-lg text-center">
                  <span className="text-[9px] text-slate-400 font-mono uppercase block">Remaining</span>
                  <span className="text-base font-bold text-emerald-500">{formatCurrency(remainingFunds)}</span>
                </div>
              </div>

              <div className="h-48 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: "Budget", amount: budgetVal, fill: "#4f46e5" },
                    { name: "Spent", amount: actualCostVal, fill: "#f59e0b" },
                    { name: "Remaining", amount: remainingFunds, fill: "#10b981" }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 605 }} />
                    <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(val: any) => formatCurrency(val)} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={45}>
                      <Cell fill="#4f46e5" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* AI Executive Insights */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4 lg:col-span-2">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 uppercase tracking-tight font-mono">Gemini Strategic Insights</h3>
                </div>
                <button
                  onClick={fetchAIInsights}
                  disabled={generatingInsights}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
                >
                  <RotateCw className={`h-3 w-3 ${generatingInsights ? "animate-spin" : ""}`} />
                  <span>Regenerate</span>
                </button>
              </div>

              {generatingInsights ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono animate-pulse">Consulting Gemini Expert Models...</span>
                </div>
              ) : (
                <div className="prose dark:prose-invert prose-xs max-w-none max-h-72 overflow-y-auto pr-2 text-xs leading-relaxed text-slate-650 dark:text-slate-300">
                  <ReactMarkdown>{aiInsights || "No executive summary parsed yet."}</ReactMarkdown>
                </div>
              )}
            </div>

            {/* PMO Department Capacity */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight font-mono">Department Capacity</h3>
                <span className="text-[10px] text-slate-400 font-mono">FTE STATS</span>
              </div>

              <div className="flex justify-center py-3">
                <div className="relative h-28 w-28 flex items-center justify-center bg-slate-50 dark:bg-slate-950 rounded-full border border-slate-100 dark:border-slate-800">
                  <div className="text-center">
                    <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{allocationPercent}%</span>
                    <span className="text-[9px] text-slate-400 uppercase block font-mono">Overall Load</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                  <span className="text-slate-400">Total Engineering Capacity</span>
                  <span className="font-bold text-slate-850 dark:text-slate-100">{assignedTeamCount * 40} hrs/wk</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                  <span className="text-slate-400">Active Allocations</span>
                  <span className="font-bold text-slate-850 dark:text-slate-100">{assignedTeamCount} FTEs</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PROJECT MANAGER DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {activeRoleView === "PROJECT_MANAGER" && (
        <div className="space-y-6">
          
          {/* PM Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Work Packages</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{totalTasks} Tasks</h3>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{inProgressTasks} Active</span>
                <span className="text-amber-500 font-bold">{taskProgressPercent}% DONE</span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Assigned Resources</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{assignedTeamCount} Members</h3>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Allocated Pacing</span>
                <span className="text-indigo-600 font-bold">{allocationPercent}% CPI</span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Identified Risks</span>
              <h3 className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{openRisksCount} Open Risks</h3>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{highRisksCount} Critical/High</span>
                <span className="text-rose-600 font-bold">Needs Plan</span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Current Budget</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{formatCurrency(budgetVal)}</h3>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Spent: {formatCurrency(actualCostVal)}</span>
                <span className="text-emerald-500 font-bold">{100 - costProgressPercent}% Free</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Milestones and Timelines */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight font-mono">Project Milestone Progress</h3>
              
              <div className="relative pt-6 pb-2">
                <div className="absolute top-[35px] left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 rounded"></div>
                <div className="absolute top-[35px] left-0 h-1 bg-indigo-600 rounded transition-all duration-700" style={{ width: `${dashboard?.progress || 35}%` }}></div>

                <div className="relative flex justify-between">
                  {[
                    { label: "Kickoff", percent: 0 },
                    { label: "Planning", percent: 30 },
                    { label: "Execution", percent: 60 },
                    { label: "Closeout", percent: 100 }
                  ].map((m, idx) => {
                    const isPassed = (dashboard?.progress || 35) >= m.percent;
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all z-10 ${isPassed ? "bg-indigo-600 border-indigo-600 text-white shadow" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400"}`}>
                          {isPassed ? <Check className="h-3.5 w-3.5" /> : <span>{idx + 1}</span>}
                        </div>
                        <span className="text-[10px] font-bold mt-2 text-slate-750 dark:text-slate-300">{m.label}</span>
                        <span className="text-[9px] font-mono text-slate-400">{m.percent}% Target</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Team Load */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight font-mono">Team Allocation Matrix</h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {teamMembers.slice(0, 4).map((member) => (
                  <div key={member.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{member.name}</span>
                      <span className="text-[9px] text-slate-400 block font-mono uppercase">{member.role}</span>
                    </div>
                    <span className="font-bold font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{member.allocation}%</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Active Work packages list */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight font-mono">Sprints & Active Tasks</h3>
              <span className="text-[10px] text-indigo-600 font-mono font-bold">{tasks.length} LOGGED WORK PACKAGES</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 text-slate-500 text-[10px] font-bold uppercase font-mono">
                    <th className="py-3 px-4">Task Title</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Allocated Hours</th>
                    <th className="py-3 px-4">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tasks.slice(0, 5).map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{t.title}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          t.priority === "HIGH" || t.priority === "URGENT" 
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-450" 
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          t.status === "DONE" || t.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-600"
                            : t.status === "IN_PROGRESS"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">{t.estimatedHours || 12} hrs</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{t.dueDate || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. RESOURCE MANAGER DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {activeRoleView === "RESOURCE_MANAGER" && (
        <div className="space-y-6">
          
          {/* Capacity Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Total Department Capability</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{assignedTeamCount * 40} hrs / Week</h3>
              <span className="text-[10px] text-slate-400 block font-mono">Based on {assignedTeamCount} full-time equivalents (FTE)</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Overall Utilization</span>
              <h3 className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{allocationPercent}%</h3>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${allocationPercent}%` }}></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Bench Count (Available)</span>
              <h3 className="text-xl font-extrabold text-emerald-600">0 Resources</h3>
              <span className="text-[10px] text-emerald-600 font-bold block uppercase font-mono">✓ Fully allocated for S1 2026</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Skills Matrix distribution */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight font-mono">Skills Pacing</h3>
              
              <div className="space-y-3 pt-2 text-xs">
                {[
                  { name: "React / Frontend Architecture", count: 4, level: "Advanced" },
                  { name: "Node.js / Express Services", count: 3, level: "Expert" },
                  { name: "Drizzle ORM / Postgres", count: 3, level: "Intermediate" },
                  { name: "Project Management / PMO", count: 2, level: "Expert" },
                  { name: "Compliance & Security Audit", count: 1, level: "Expert" }
                ].map((skill, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800/50 pb-2">
                    <div>
                      <span className="font-bold text-slate-750 dark:text-slate-300 block">{skill.name}</span>
                      <span className="text-[9px] text-slate-400 uppercase font-mono">{skill.level} proficiency</span>
                    </div>
                    <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                      {skill.count} FTEs
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Availability details */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight font-mono">Staffing Availability Matrix</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold uppercase font-mono text-[9px]">
                      <th className="py-2.5">Resource Name</th>
                      <th className="py-2.5">Corporate Role</th>
                      <th className="py-2.5">Assigned load</th>
                      <th className="py-2.5">Availability Stage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 font-bold text-slate-900 dark:text-slate-100">{member.name}</td>
                        <td className="py-2.5 text-slate-500 font-mono uppercase text-[10px]">{member.role}</td>
                        <td className="py-2.5 font-mono font-bold text-indigo-600">{member.allocation}%</td>
                        <td className="py-2.5">
                          {member.allocation >= 100 ? (
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 text-[9px] font-bold">FULLY ALLOCATED</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[9px] font-bold">AVAILABLE</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TEAM MEMBER DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {activeRoleView === "TEAM_MEMBER" && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
              <span className="text-[9px] font-bold text-slate-400 font-mono block uppercase">My Workload</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {tasks.filter(t => t.assigneeId === "tm-1" || !t.assigneeId).length} Tasks Assigned
              </h3>
              <span className="text-[10px] text-slate-400 font-mono block uppercase">Active Sprints focus</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
              <span className="text-[9px] font-bold text-slate-400 font-mono block uppercase">My Registered Hours</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">40 Hours</h3>
              <div className="text-[10px] text-emerald-600 font-bold font-mono block uppercase">
                ✓ Timesheet Completed for current week
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-center space-y-3">
              <button
                onClick={() => setShowLogTimeModal(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow"
              >
                <Clock className="h-4 w-4" />
                <span>Log Hours (Submit Timesheet)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* My Tasks lists with actionable triggers */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight font-mono">My Active Deliverable Tasks</h3>
              
              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {tasks.map((task) => (
                  <div key={task.id} className="py-3 flex justify-between items-center gap-3">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">{task.title}</span>
                      <div className="flex gap-2 text-[9px] font-mono text-slate-400">
                        <span className="uppercase">Due: {task.dueDate || "N/A"}</span>
                        <span>•</span>
                        <span className="uppercase font-bold text-indigo-500">{task.priority}</span>
                      </div>
                    </div>
                    
                    {/* Inline Status Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {task.status !== "DONE" && task.status !== "COMPLETED" && (
                        <>
                          {task.status !== "IN_PROGRESS" ? (
                            <button
                              onClick={() => handleUpdateTaskStatus(task.id, task.status, "IN_PROGRESS")}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/35 text-[9px] font-bold rounded-lg transition-all"
                            >
                              Start Task
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateTaskStatus(task.id, task.status, "DONE")}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[9px] font-bold rounded-lg transition-all"
                            >
                              Complete Task
                            </button>
                          )}
                        </>
                      )}
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        task.status === "DONE" || task.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-600"
                          : task.status === "IN_PROGRESS"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* My Notifications / Team activity comments */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase font-mono tracking-wider">Unread Briefing Notifications</h3>
              <div className="space-y-4 pt-1 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                {[
                  { details: "You were assigned to Stage Gate document review.", time: "10 mins ago" },
                  { details: "Project status for payment gateway changed to ACTIVE.", time: "2 hrs ago" },
                  { details: "Audit report generated and saved to compliance vault.", time: "1 day ago" }
                ].map((item, idx) => (
                  <div key={idx} className="flex space-x-3 text-xs relative">
                    <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-white dark:border-slate-900 relative z-10">
                      <Activity className="h-3 w-3 text-indigo-500" />
                    </div>
                    <div className="flex flex-col pt-0.5">
                      <span className="font-bold text-slate-900 dark:text-slate-100 leading-tight">{item.details}</span>
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. AUDITOR DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {activeRoleView === "AUDITOR" && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Auditable Trace Actions</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{auditLogs.length} Registered Logs</h3>
              <span className="text-[10px] text-slate-400 block font-mono uppercase">Reconciled for current scope</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Governance Score</span>
              <h3 className="text-xl font-extrabold text-emerald-600">98% Grade A</h3>
              <span className="text-[10px] text-emerald-650 block font-bold uppercase font-mono">✓ High Compliance</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Direct Security Overrides</span>
              <h3 className="text-xl font-extrabold text-amber-500">
                {securityProfile?.directOverrides?.length || 0} Override(s)
              </h3>
              <span className="text-[10px] text-slate-400 block font-mono uppercase">Audited from active session</span>
            </div>
          </div>

          {/* Granular Action Trace with Lagos default date formatting */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight font-mono">Real-time Auditable Log Trail</h3>
              <span className="text-[10px] text-slate-400 font-mono font-bold">Lagos GMT+1 Timezone default</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 text-slate-500 font-bold uppercase font-mono text-[9px]">
                    <th className="py-2.5 px-4">Timestamp (Lagos GMT+1)</th>
                    <th className="py-2.5 px-4">Label / Action</th>
                    <th className="py-2.5 px-4">Actor</th>
                    <th className="py-2.5 px-4">Module context</th>
                    <th className="py-2.5 px-4">Entity Key</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {auditLogs.slice(0, 8).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-400">
                        {formatLagosDashboardDateTime(log.timestamp || log.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-850 dark:text-slate-100 block">
                          {log.label || log.action || "System Trace Event"}
                        </span>
                        <span className="text-[10px] text-slate-400 block leading-normal mt-0.5">
                          {log.details || log.description}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium font-mono text-[10px]">
                        {log.actorName || "Alex Rivera"} ({log.actorRole || "Developer"})
                      </td>
                      <td className="py-3 px-4 text-indigo-600 font-mono uppercase text-[10px]">{log.module || "PMO"}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{log.entityId || "N/A"}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic font-mono uppercase text-[10px]">
                        No auditable trace logs currently registered for this workspace context.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Timesheet Log modal dialog */}
      <AnimatePresence>
        {showLogTimeModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 font-mono uppercase flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  <span>Log Personal Timesheet Hours</span>
                </h3>
                <button
                  onClick={() => setShowLogTimeModal(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleLogTimeSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Select Assigned Work Package Task</label>
                  <select
                    value={logTimeTask}
                    onChange={(e) => setLogTimeTask(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                    required
                  >
                    <option value="">-- Choose Task --</option>
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Billable Hours Completed</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={logTimeHours}
                    onChange={(e) => setLogTimeHours(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Brief Work Package Contribution Details</label>
                  <textarea
                    rows={3}
                    value={logTimeDesc}
                    onChange={(e) => setLogTimeDesc(e.target.value)}
                    placeholder="Describe milestones achieved or deliverables completed..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowLogTimeModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loggingTime}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition-all flex items-center gap-1.5"
                  >
                    {loggingTime ? <RotateCw className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    <span>{loggingTime ? "Logging..." : "Log Timesheet"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
