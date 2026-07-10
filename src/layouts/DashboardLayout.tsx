import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { api } from "../lib/api.ts";

// Import Modular Feature Components
import { DashboardView } from "../components/DashboardView.tsx";
import { LifecycleView } from "../components/LifecycleView.tsx";
import { LifecycleTemplateBuilderView } from "../components/LifecycleTemplateBuilderView.tsx";
import { TeamView } from "../components/TeamView.tsx";
import { TasksView } from "../components/TasksView.tsx";
import { GanttView } from "../components/GanttView.tsx";
import { CalendarView } from "../components/CalendarView.tsx";
import { GoogleCalendarView } from "../components/GoogleCalendarView.tsx";
import { GoogleMeetStreamView } from "../components/GoogleMeetStreamView.tsx";
import { TimeTrackingView } from "../components/TimeTrackingView.tsx";
import { IssuesRisksView } from "../components/IssuesRisksView.tsx";
import { DeliverablesDocsView } from "../components/DeliverablesDocsView.tsx";
import { MeetingsCommentsView } from "../components/MeetingsCommentsView.tsx";
import { ChatView } from "../components/ChatView.tsx";
import { SettingsView } from "../components/SettingsView.tsx";
import { AuditReportsView } from "../components/AuditReportsView.tsx";
import { FinanceView } from "../components/FinanceView.tsx";
import { AICopilot } from "../components/AICopilot.tsx";
import { OrchestrationView } from "../components/OrchestrationView.tsx";
import { AdminConsole } from "../components/AdminConsole.tsx";
import { UsersView } from "../components/UsersView.tsx";
import { NotificationCenterView } from "../components/NotificationCenterView.tsx";

// Lucide Icons
import {
  Briefcase,
  LayoutDashboard,
  Users,
  CheckSquare,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  Video,
  Shield,
  History,
  Compass,
  BellRing,
  Radio,
  Globe,
  MessageSquare,
  Layers,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Search,
  Grid,
  ChevronDown,
  Bell
} from "lucide-react";

type Tab =
  | "dashboard"
  | "lifecycle"
  | "templateBuilder"
  | "orchestration"
  | "team"
  | "resources"
  | "tasks"
  | "kanban"
  | "scrum"
  | "gantt"
  | "calendar"
  | "google-calendar"
  | "meet-stream"
  | "time"
  | "issues"
  | "docs"
  | "meetings"
  | "chat"
  | "reports"
  | "analytics"
  | "finance"
  | "notifications"
  | "admin"
  | "users"
  | "settings";

export default function DashboardLayout() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);

  const { theme, toggleTheme } = useTheme();

  // DB aggregated counts for badges
  const [taskCount, setTaskCount] = useState<number>(24);
  const [riskCount, setRiskCount] = useState<number>(3);

  const { user, logout, hasPermission, securityProfile } = useAuth();
  
  // Notification bell counter
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    async function fetchUnreadCount() {
      try {
        const res = await api.getUnreadCount();
        if (res && typeof res.unreadCount === "number") {
          setUnreadCount(res.unreadCount);
        }
      } catch (err) {
        console.error("Failed to load notifications count:", err);
      }
    }
    fetchUnreadCount();
  }, [refreshKey, activeTab]);

  useEffect(() => {
    async function loadProjectsAndStats() {
      try {
        setLoading(true);
        const data = await api.getProjectsList();
        setProjects(data || []);
        if (data && data.length > 0) {
          setSelectedProjectId(data[0].id);
        }

        // Fetch tasks and risks to compute badges dynamically
        const summary = await api.getDashboard();
        if (summary) {
          const activeTasksCount = summary.kpis?.activeTasksCount ?? 24;
          const activeRisksCount = summary.kpis?.activeRisksCount ?? 3;
          setTaskCount(activeTasksCount);
          setRiskCount(activeRisksCount);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard metrics on init:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProjectsAndStats();
  }, [refreshKey]);

  const getActiveProjectName = () => {
    const proj = projects.find(p => p.id === selectedProjectId);
    return proj ? proj.name : "Portfolio Tracker";
  };

  const getActiveProjectCode = () => {
    const proj = projects.find(p => p.id === selectedProjectId);
    return proj ? proj.code : "PROJ";
  };

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const AccessDeniedView = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-xl mx-auto my-12">
      <div className="h-14 w-14 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400 mb-5 border border-red-100 dark:border-red-900/50">
        <Shield className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-sans tracking-tight">403 Forbidden</h2>
      <p className="text-slate-500 dark:text-slate-400 text-xs mt-3 leading-relaxed max-w-md">
        Access Denied. You do not possess the required enterprise permission profile or role assignment to view this content. Please contact your PMO administrator if you believe this is an error.
      </p>
      <div className="mt-6">
        <button
          onClick={() => {
            setActiveTab("dashboard");
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm transition-colors"
        >
          Return to Projects
        </button>
      </div>
    </div>
  );

  const sidebarSections: {
    title: string;
    items: { id: Tab; label: string; icon: React.ComponentType<any>; badge?: number; permission?: string }[];
  }[] = [
    {
      title: "Projects",
      items: [
        { id: "dashboard", label: "Projects", icon: LayoutDashboard, permission: "projects.view" },
        { id: "lifecycle", label: "PMO Workflow", icon: Shield, permission: "projects.approve" }
      ]
    },
    {
      title: "DELIVERY",
      items: [
        { id: "tasks", label: "Tasks", icon: CheckSquare, badge: taskCount, permission: "tasks.view" },
        { id: "kanban", label: "Kanban", icon: Layers, permission: "tasks.view" },
        { id: "scrum", label: "Scrum", icon: Layers, permission: "tasks.view" },
        { id: "calendar", label: "Calendar", icon: Calendar, permission: "milestones.view" },
        { id: "gantt", label: "Timeline", icon: Compass, permission: "milestones.view" }
      ]
    },
    {
      title: "INSIGHTS",
      items: [
        { id: "reports", label: "Reports", icon: History, permission: "reports.view" },
        { id: "analytics", label: "Analytics", icon: LayoutDashboard, permission: "reports.view" }
      ]
    },
    {
      title: "ORGANIZATION",
      items: [
        { id: "team", label: "Teams", icon: Users, permission: "projects.manage_team" },
        { id: "resources", label: "Resources", icon: Users, permission: "projects.view" },
        { id: "issues", label: "Risks", icon: AlertTriangle, badge: riskCount, permission: "issues.view" },
        { id: "finance", label: "Finance", icon: Briefcase, permission: "projects.view_budget" },
        { id: "docs", label: "Documents", icon: FileText, permission: "projects.view_documents" }
      ]
    },
    {
      title: "SYSTEM",
      items: [
        { id: "notifications", label: "Notifications", icon: BellRing, permission: "projects.view" },
        { id: "users", label: "Users", icon: Users, permission: "admin.users" },
        { id: "admin", label: "Access Control", icon: Shield, permission: "admin.roles" },
        { id: "settings", label: "Settings", icon: SettingsIcon, permission: "settings.system" }
      ]
    }
  ];

  const renderActiveView = () => {
    if (!selectedProjectId) {
      return (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-400 italic">
          Please select or register a project to begin execution tracking.
        </div>
      );
    }

    // Find the current tab item to check permission
    let requiredPermission: string | undefined = undefined;
    for (const section of sidebarSections) {
      const item = section.items.find((i) => i.id === activeTab);
      if (item) {
        requiredPermission = item.permission;
        break;
      }
    }

    if (requiredPermission && securityProfile && !hasPermission(requiredPermission)) {
      return <AccessDeniedView />;
    }

    const renderViewContent = () => {
      switch (activeTab) {
        case "dashboard":
        case "analytics":
          return <DashboardView projectId={selectedProjectId} />;
        case "lifecycle":
          return <LifecycleView projectId={selectedProjectId} />;
        case "templateBuilder":
          return <LifecycleTemplateBuilderView />;
        case "orchestration":
          return <OrchestrationView projectId={selectedProjectId} />;
        case "team":
        case "resources":
          return <TeamView projectId={selectedProjectId} />;
        case "tasks":
          return <TasksView projectId={selectedProjectId} defaultLayout="list" />;
        case "kanban":
          return <TasksView projectId={selectedProjectId} defaultLayout="kanban" />;
        case "scrum":
          return <TasksView projectId={selectedProjectId} defaultLayout="kanban" />;
        case "gantt":
          return <GanttView projectId={selectedProjectId} />;
        case "calendar":
          return <CalendarView projectId={selectedProjectId} />;
        case "google-calendar":
          return <GoogleCalendarView projectId={selectedProjectId} />;
        case "meet-stream":
          return <GoogleMeetStreamView projectId={selectedProjectId} />;
        case "time":
          return <TimeTrackingView projectId={selectedProjectId} />;
        case "issues":
          return <IssuesRisksView projectId={selectedProjectId} />;
        case "docs":
          return <DeliverablesDocsView projectId={selectedProjectId} />;
        case "meetings":
          return <MeetingsCommentsView projectId={selectedProjectId} />;
        case "chat":
          return <ChatView projectId={selectedProjectId} />;
        case "reports":
          return <AuditReportsView projectId={selectedProjectId} defaultTab="logs" />;
        case "notifications":
          return <NotificationCenterView />;
        case "finance":
          return <FinanceView projectId={selectedProjectId} />;
        case "admin":
          return <AdminConsole />;
        case "users":
          return <UsersView />;
        case "settings":
          return <SettingsView />;
        default:
          return <DashboardView projectId={selectedProjectId} />;
      }
    };

    return <div key={refreshKey} className="h-full">{renderViewContent()}</div>;
  };

  const isForcedLightTab = ["tasks", "kanban", "scrum", "lifecycle", "settings", "docs"].includes(activeTab);

  return (
    <div className={`min-h-screen bg-slate-50 ${isForcedLightTab ? "" : "dark:bg-slate-950"} text-slate-800 ${isForcedLightTab ? "" : "dark:text-slate-200"} flex flex-col font-sans select-none antialiased selection:bg-indigo-500/30`}>
      
      {/* Top Header Bar formatted exactly like the mockup */}
      <header className={`bg-white ${isForcedLightTab ? "" : "dark:bg-slate-900"} text-slate-800 ${isForcedLightTab ? "" : "dark:text-slate-200"} h-14 px-6 flex items-center justify-between border-b border-slate-200 ${isForcedLightTab ? "" : "dark:border-slate-800"} shrink-0 sticky top-0 z-50 shadow-sm`}>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold tracking-wider text-slate-400 font-mono">AURA STRATEGIC</span>
          <span className="text-slate-300 text-xs font-bold">/</span>
          <span className="text-[11px] font-bold tracking-wider text-indigo-600 font-mono uppercase">
            {activeTab === "dashboard" ? "Dashboard" : activeTab}
          </span>
        </div>

        {/* Global Selectors */}
        <div className="flex items-center space-x-6">
          {/* Active Project Selector */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-medium hidden md:inline">Project Focus:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg py-1.5 px-2.5 font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm hover:bg-slate-100"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code || p.name.substring(0, 3).toUpperCase()}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-64 hidden lg:block">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search projects, tasks, people..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
            <span className="absolute inset-y-0 right-0 flex items-center pr-2.5">
              <kbd className="text-[9px] font-semibold text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </span>
          </div>

          {/* Icon Actions */}
          <div className="flex items-center space-x-3.5">
            <button onClick={toggleTheme} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Toggle dark mode">
              {theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
            </button>

            {/* Notification Indicator Counter */}
            <button
              onClick={() => {
                setActiveTab("notifications");
              }}
              className="relative p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
              title="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white animate-pulse" />
              )}
            </button>

            <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors" title="Switch workspace">
              <Grid className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* User Profile Info formatted exactly like the mockup */}
          <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200">
            <div className="h-7 w-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-slate-100">
              {(user?.firstName || (user as any)?.name)?.[0]?.toUpperCase() || 'AK'}
            </div>
            <div className="flex flex-col hidden sm:flex">
              <span className="text-xs text-slate-800 font-semibold leading-none">{user?.firstName || (user as any)?.name || 'Alex'} {user?.lastName || 'K.'}</span>
              <span className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">{user?.department || 'FASYL Strategist'}</span>
            </div>
            <button 
              onClick={logout}
              className="text-[10px] text-slate-400 hover:text-red-500 font-semibold transition-colors bg-slate-50 hover:bg-red-50 px-2 py-1 rounded border border-slate-200/60"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
 
      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Navigation Sidebar exact replica from the mockup */}
        <aside className={`bg-white ${isForcedLightTab ? "" : "dark:bg-slate-900"} border-r border-slate-200 ${isForcedLightTab ? "" : "dark:border-slate-800"} text-slate-600 ${isForcedLightTab ? "" : "dark:text-slate-400"} flex flex-col shrink-0 transition-all duration-300 ${isSidebarCollapsed ? "w-16" : "w-60"}`}>
          {/* Workspace Switcher Header */}
          <div className={`p-4 border-b border-slate-100 ${isForcedLightTab ? "" : "dark:border-slate-800/80"} bg-slate-50 ${isForcedLightTab ? "" : "dark:bg-slate-800/50"} flex items-center justify-between`}>
            {!isSidebarCollapsed ? (
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 font-bold block leading-none">WORKSPACE</span>
                  <span className="font-bold text-slate-800 text-xs mt-1 truncate block">FASYL Strategic</span>
                </div>
              </div>
            ) : (
              <div className="mx-auto h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                <Briefcase className="h-4 w-4" />
              </div>
            )}
            {!isSidebarCollapsed && (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            )}
          </div>

          {/* Collapsible Section Lists */}
          <nav className="flex-1 p-3 space-y-4 overflow-y-auto scrollbar-thin">
            {sidebarSections.map((section, sIdx) => {
              // Check if any item in this section is allowed/visible
              const visibleItems = section.items.filter(
                (item) => !item.permission || !securityProfile || hasPermission(item.permission)
              );

              if (visibleItems.length === 0) return null;

              return (
                <div key={sIdx} className="space-y-1">
                  {/* Section Title */}
                  {!isSidebarCollapsed ? (
                    <span className="text-[9px] font-bold text-slate-400 tracking-wider block px-3 uppercase py-1">
                      {section.title}
                    </span>
                  ) : (
                    <div className="h-1 border-b border-slate-100 my-2 mx-2" />
                  )}

                  {/* Section Items */}
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <div 
                        key={item.id} 
                        className="relative"
                        onMouseEnter={() => setHoveredTabId(`${sIdx}-${item.id}`)}
                        onMouseLeave={() => setHoveredTabId(null)}
                      >
                        <button
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                            isActive
                              ? "bg-indigo-50/70 text-indigo-600 shadow-sm border border-indigo-100/50"
                              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                          }`}
                        >
                          <div className={`flex items-center ${isSidebarCollapsed ? "mx-auto" : "space-x-2.5"}`}>
                            <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                            {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                          </div>

                          {/* Badge indicator on Sidebar */}
                          {!isSidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                            <span className="bg-indigo-50 text-indigo-600 text-[9px] font-bold px-1.5 py-0.5 rounded-md min-w-[18px] text-center border border-indigo-100/40">
                              {item.badge}
                            </span>
                          )}
                        </button>

                        {/* Collapsed floating tooltip */}
                        {isSidebarCollapsed && hoveredTabId === `${sIdx}-${item.id}` && (
                          <div className="absolute left-14 top-1/2 -translate-y-1/2 z-50 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-md shadow-lg whitespace-nowrap">
                            {item.label}
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className="ml-1.5 bg-indigo-500 text-white text-[9px] font-bold px-1 rounded">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          {/* Bottom Footer & Collapse Toggle Button */}
          <div className="p-3 border-t border-slate-100 mt-auto bg-slate-50/30">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-full flex items-center px-3 py-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-all"
            >
              <div className={`flex items-center ${isSidebarCollapsed ? "mx-auto" : "space-x-2.5"}`}>
                {isSidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4 text-slate-500" />
                    <span>Collapse</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </aside>

        {/* Dynamic Content Pane Area */}
        <main className={`flex-1 bg-slate-50 ${isForcedLightTab ? "" : "dark:bg-slate-950"} p-6 overflow-y-auto min-w-0`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Syncing Database State...</p>
            </div>
          ) : (
            renderActiveView()
          )}
        </main>
      </div>
      {selectedProjectId && (
        <AICopilot projectId={selectedProjectId} onActionExecuted={triggerRefresh} />
      )}
    </div>
  );
}
