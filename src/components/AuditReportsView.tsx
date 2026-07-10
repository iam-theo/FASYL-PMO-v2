import React, { useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { AuditLog } from "../modules/project-tracker/types.ts";
import { FileText, DownloadCloud, FileSpreadsheet, ShieldAlert, CheckCircle, TrendingUp, History, Bell, Mail, MailOpen, Check } from "lucide-react";
import { formatLagosDateTime, formatLagosSimple } from "../lib/dateUtils.ts";
import { resolveActorNameAndRole, formatLogPayloadDetails } from "../lib/logUtils.ts";
import { useAuth } from "../contexts/AuthContext.tsx";

interface Props {
  projectId: string;
  defaultTab?: "logs" | "executive" | "notifications";
}

export function AuditReportsView({ projectId, defaultTab = "logs" }: Props) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [report, setReport] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);

  // Tab: "logs" | "notifications" | "executive"
  const [activeTab, setActiveTab] = useState<"logs" | "executive" | "notifications">(defaultTab);

  const loadData = async () => {
    try {
      setLoading(true);
      const [lList, rData, usersList, nList] = await Promise.all([
        api.getAuditLogs(projectId),
        api.getExecutiveReport(projectId),
        api.getUsersForSelection().catch(() => []),
        api.getNotifications().catch(() => [])
      ]);
      setLogs(lList || []);
      setReport(rData);
      if (usersList) setUsers(usersList);
      setNotifications(nList || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleExportCSV = async () => {
    try {
      const csvContent = await api.downloadTasksCSV(projectId);
      
      // Construct native browser file download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `tasks-project-tracker-${projectId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert("Failed to compile CSV file export: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-slate-700">
      
      {/* Tab Switch Headers */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-200 p-4 rounded-xl gap-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 rounded-lg font-medium transition text-xs ${
              activeTab === "logs" 
                ? "bg-slate-100 text-indigo-600 border border-slate-200 font-semibold" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            System Change Audit Logs ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-4 py-2 rounded-lg font-medium transition text-xs flex items-center gap-1.5 ${
              activeTab === "notifications" 
                ? "bg-slate-100 text-indigo-600 border border-slate-200 font-semibold" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span>User Notifications</span>
            <span className="bg-indigo-100 text-indigo-700 rounded-full px-1.5 py-0.5 text-[9px] font-bold font-mono">
              {notifications.filter(n => !n.isRead).length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("executive")}
            className={`px-4 py-2 rounded-lg font-medium transition text-xs ${
              activeTab === "executive" 
                ? "bg-slate-100 text-indigo-600 border border-slate-200 font-semibold" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Executive Portfolio Status Report
          </button>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-1.5 bg-indigo-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-indigo-700 transition shadow-sm self-end sm:self-auto text-xs"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Export Tasks CSV</span>
        </button>
      </div>

      {/* RENDER SELECTED WINDOW */}
      {activeTab === "logs" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-900 text-xs flex items-center space-x-1.5">
            <History className="h-4 w-4 text-indigo-600" />
            <span>Project Historical Change Ledger Timeline</span>
          </h3>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 relative border-l border-slate-200 pl-4 ml-2">
            {logs.map((l: any, idx) => (
              <div key={l.id || idx} className="relative pb-4 last:pb-0">
                {/* Node marker point */}
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-600 border-2 border-white ring-2 ring-slate-100" />

                <div className="space-y-1 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span className="font-mono text-slate-500">
                      {formatLagosDateTime(l.timestamp || l.createdAt)}
                    </span>
                    <span className="bg-slate-100 text-indigo-600 border border-slate-200 px-1.5 py-0.2 rounded font-mono font-bold text-[8px]">{l.action}</span>
                  </div>
                  <p className="font-semibold text-slate-900 text-[11px] leading-snug">{l.details || l.description || "System action processed successfully"}</p>
                  
                  {/* Detailed state properties */}
                  {l.payload && (
                    <div className="bg-white border border-slate-200/60 p-2 rounded text-[10px] text-slate-700">
                      <span className="font-semibold text-slate-500">Activity: </span>
                      {formatLogPayloadDetails(l.payload)}
                    </div>
                  )}

                  <span className="text-[10px] text-slate-500 block font-mono">
                    Executed By: <span className="text-indigo-600 font-semibold">{resolveActorNameAndRole(l.performedBy || l.userName || l.userId || l.actorId, users)}</span>
                  </span>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-center italic text-slate-500">No change history tracked in execution timeline.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-semibold text-slate-900 text-xs flex items-center space-x-1.5">
              <Bell className="h-4 w-4 text-indigo-600" />
              <span>Personal Inbox & Event Notifications</span>
            </h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-2.5 py-0.5 rounded font-mono font-semibold">
              {notifications.filter(n => !n.isRead).length} Unread
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {notifications.map((n: any) => (
              <div 
                key={n.id} 
                className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                  n.isRead 
                    ? "bg-slate-50/50 border-slate-200 text-slate-500" 
                    : "bg-white border-indigo-100 shadow-sm text-slate-850 ring-1 ring-indigo-50/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    n.isRead ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-600"
                  }`}>
                    {n.isRead ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-bold ${n.isRead ? "text-slate-600" : "text-slate-900"}`}>{n.title}</p>
                      <span className="text-[8px] font-mono bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.2 rounded uppercase">
                        {n.type}
                      </span>
                    </div>
                    <p className="text-[11px] mt-1 text-slate-600 leading-relaxed">{n.message}</p>
                    <p className="text-[9px] text-slate-400 font-mono mt-1.5">
                      {formatLagosDateTime(n.createdAt)}
                    </p>
                  </div>
                </div>

                {!n.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="p-1.5 hover:bg-emerald-50 hover:text-emerald-600 text-slate-400 border border-slate-250 rounded-lg transition-all"
                    title="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                )}
              </div>
            ))}

            {notifications.length === 0 && (
              <div className="py-12 text-center text-slate-400 italic">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No notifications logged. Your inbox is empty!
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "executive" && report && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm space-y-6 max-w-4xl mx-auto print:border-0 print:shadow-none">
          
          {/* Report Header */}
          <div className="border-b-2 border-slate-100 pb-4 flex justify-between items-end">
            <div>
              <span className="text-[10px] text-slate-500 font-mono block">EXECUTIVE PORTFOLIO BOARD SYSTEM</span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">PROJECT STATUS REPORT</h1>
              <p className="text-[10px] text-slate-500 mt-1 font-mono">Report Compiled: {formatLagosSimple(report.reportDate)} (Lagos GMT+1)</p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-slate-100 text-indigo-600 border border-slate-200 font-mono font-bold text-xs rounded uppercase">
                {report.projectCode}
              </span>
              <span className="text-[9px] text-slate-500 font-mono block mt-1">Project Identifier</span>
            </div>
          </div>

          {/* Project Overview summary boxes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[9px] text-slate-500 font-mono block">STATUS FLAG</span>
              <span className="font-bold text-slate-900 block text-xs mt-1 uppercase">{report.overallStatus}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[9px] text-slate-500 font-mono block">HEALTH EVALUATION</span>
              <span className="font-bold text-emerald-600 block text-xs mt-1 uppercase">{report.overallHealth}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[9px] text-slate-500 font-mono block">PROGRESS METRIC</span>
              <span className="font-bold text-indigo-600 block text-xs mt-1 font-mono">{report.progressPercent}%</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[9px] text-slate-500 font-mono block">EFFORT LOGGER</span>
              <span className="font-bold text-slate-900 block text-xs mt-1 font-mono">{report.metrics.totalHoursLogged} Hours</span>
            </div>
          </div>

          {/* Main Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Task Breakdown stats */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center space-x-1.5">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
                <span>Work Breakdown structure statistics</span>
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Total Work Packages (Tasks)</span>
                  <span className="font-mono font-bold text-slate-900">{report.metrics.totalTasks}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Milestone gates defined</span>
                  <span className="font-mono font-bold text-slate-900">{report.metrics.totalMilestones}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-rose-600 font-medium">Critical Risk matrix indicators</span>
                  <span className="font-mono font-bold text-rose-600">{report.metrics.criticalRisksCount}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-amber-600 font-medium">Unresolved defect register issues</span>
                  <span className="font-mono font-bold text-amber-600">{report.metrics.unresolvedIssuesCount}</span>
                </div>
              </div>
            </div>

            {/* Status charts */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center space-x-1.5">
                <CheckCircle className="h-4 w-4 text-indigo-600" />
                <span>Task Status Distribution</span>
              </h3>

              <div className="space-y-2 text-[10px]">
                <div>
                  <div className="flex justify-between text-slate-500 mb-0.5">
                    <span>Completed / Done</span>
                    <span className="font-mono font-bold">{report.taskStatusBreakdown.DONE}</span>
                  </div>
                  <div className="w-full bg-slate-50 border border-slate-200/40 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${(report.taskStatusBreakdown.DONE / Math.max(1, report.metrics.totalTasks)) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-500 mb-0.5">
                    <span>In Progress / In Review</span>
                    <span className="font-mono font-bold">{report.taskStatusBreakdown.IN_PROGRESS + report.taskStatusBreakdown.IN_REVIEW}</span>
                  </div>
                  <div className="w-full bg-slate-50 border border-slate-200/40 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${((report.taskStatusBreakdown.IN_PROGRESS + report.taskStatusBreakdown.IN_REVIEW) / Math.max(1, report.metrics.totalTasks)) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Release milestones list */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center space-x-1.5">
              <FileText className="h-4 w-4 text-indigo-600" />
              <span>Project Core Release Milestones Tracker</span>
            </h3>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-medium text-[10px] border-b border-slate-200">
                    <th className="p-2.5">Milestone Title</th>
                    <th className="p-2.5">Target Completion Date</th>
                    <th className="p-2.5">Progress Index</th>
                    <th className="p-2.5 text-right">Status Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {report.milestoneTimeline.map((m: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0 text-[10px] hover:bg-slate-50 text-slate-700 transition-colors">
                      <td className="p-2.5 font-semibold text-slate-900">{m.title}</td>
                      <td className="p-2.5 font-mono text-slate-500">{m.dueDate}</td>
                      <td className="p-2.5 font-mono font-bold text-indigo-600">{m.progress}%</td>
                      <td className="p-2.5 text-right">
                        {m.isCompleted ? (
                          <span className="text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Completed</span>
                        ) : (
                          <span className="text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">In-flight</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Print Disclaimer */}
          <div className="text-center pt-6 border-t border-slate-100 text-[10px] text-slate-500 italic">
            * This is a dynamic, computer-compiled executive snapshot representing actual project metrics logged in the database snapshot.
          </div>
        </div>
      )}
    </div>
  );
}
