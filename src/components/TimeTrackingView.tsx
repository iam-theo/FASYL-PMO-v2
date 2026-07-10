import React, { useEffect, useState, useRef } from "react";
import { api } from "../lib/api.ts";
import { Task, TimeLog } from "../modules/project-tracker/types.ts";
import { Play, Square, Check, Clock, ShieldCheck, DollarSign, Plus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.tsx";

interface Props {
  projectId: string;
}

export function TimeTrackingView({ projectId }: Props) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Live Timer States
  const [isTracking, setIsTracking] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  // Log Form State
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [manualHours, setManualHours] = useState(1);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [isBillable, setIsBillable] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tList, logList, sumData, teamList] = await Promise.all([
        api.getTasks(projectId),
        api.getTimeLogs(projectId),
        api.getTimeSummary(projectId),
        api.getTeam(projectId).catch(() => [])
      ]);
      setTasks(tList);
      setLogs(logList);
      setSummary(sumData);
      setTeamMembers(teamList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [projectId]);

  // Stopwatch controls
  const handleStartTimer = () => {
    setIsTracking(true);
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
  };

  const handleStopTimer = async () => {
    if (!confirm("Stop timer and record hours?")) return;
    clearInterval(timerRef.current);
    setIsTracking(false);

    // Convert seconds to decimal hours (minimum 0.1 hour for short trials)
    const computedHours = parseFloat(Math.max(0.1, seconds / 3600).toFixed(2));
    
    // Auto populate modal/form parameters
    setManualHours(computedHours);
    setSeconds(0);
    alert(`Stopwatch stopped. Logged ${computedHours} hours! Please finalize the description and task allocation below.`);
  };

  const formatStopwatch = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;

    // Find matching team member in active project team or fallback
    const activeMember = teamMembers.find(
      (tm) => tm.email === user?.email || tm.userId === user?.id
    );
    const resolvedMemberId = activeMember?.id || teamMembers[0]?.id || "tm-1";

    try {
      await api.createTimeLog({
        projectId,
        taskId: selectedTaskId || null,
        teamMemberId: resolvedMemberId,
        hours: manualHours,
        date,
        description,
        isBillable
      });
      
      setDescription("");
      setManualHours(1);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to log hours.");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.approveTimeLog(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getTaskTitle = (id: string | null) => {
    if (!id) return "General Administration";
    const t = tasks.find(x => x.id === id);
    return t ? t.title : "General Administration";
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-zinc-300">
      
      {/* Live Stopwatch & Manual logger panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Stopwatch Card */}
        <div className="bg-[#18181b] text-zinc-100 rounded-xl p-5 flex flex-col justify-between shadow-lg border border-zinc-800">
          <div>
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider block">ENTERPRISE STOPWATCH TIMER</span>
            <h3 className="font-semibold text-sm mt-1 text-zinc-100">Live Activity Clock</h3>
          </div>

          <div className="py-6 text-center">
            <span className="text-4xl font-mono font-bold tracking-tight text-indigo-400 block">
              {formatStopwatch(seconds)}
            </span>
            <span className="text-[10px] text-zinc-500 block mt-1">
              {isTracking ? "Digital stream active..." : "Clock stopped."}
            </span>
          </div>

          <div className="flex space-x-2">
            {!isTracking ? (
              <button
                onClick={handleStartTimer}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-600/10"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Start Clock</span>
              </button>
            ) : (
              <button
                onClick={handleStopTimer}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-lg font-medium transition flex items-center justify-center space-x-1.5 shadow-lg shadow-rose-600/10"
              >
                <Square className="h-3.5 w-3.5" />
                <span>Stop Timer</span>
              </button>
            )}
          </div>
        </div>

        {/* Manual Hours Form Card */}
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5 shadow-lg shadow-black/10 md:col-span-2 space-y-4">
          <h3 className="font-semibold text-zinc-100 text-sm">Log Work Hours Ledger</h3>
          <form onSubmit={handleSubmitLog} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-500 mb-1">Target Task allocation</label>
              <select value={selectedTaskId} onChange={e => setSelectedTaskId(e.target.value)} className="w-full bg-[#09090b] border border-zinc-800 text-zinc-100 rounded p-2 focus:outline-none focus:border-indigo-500">
                <option value="">General Project Administration</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-zinc-500 mb-1">Hours Logged</label>
                <input type="number" step="0.1" min="0.1" max="24" value={manualHours} onChange={e => setManualHours(Number(e.target.value))} required className="w-full bg-[#09090b] border border-zinc-800 text-zinc-100 rounded p-2 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full bg-[#09090b] border border-zinc-800 text-zinc-100 rounded p-2 focus:outline-none focus:border-indigo-500" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-zinc-500 mb-1">Activity Description</label>
              <input type="text" placeholder="Detail what work task milestone actions were taken..." value={description} onChange={e => setDescription(e.target.value)} required className="w-full bg-[#09090b] border border-zinc-800 text-zinc-100 rounded p-2 focus:outline-none focus:border-indigo-500" />
            </div>

            <div className="md:col-span-2 flex items-center justify-between border-t border-zinc-850/60 pt-3">
              <label className="flex items-center space-x-2 text-zinc-400 cursor-pointer">
                <input type="checkbox" checked={isBillable} onChange={e => setIsBillable(e.target.checked)} className="rounded border-zinc-800 bg-[#09090b] text-indigo-600 focus:ring-0" />
                <span>Mark this work hour allocation as Billable to client</span>
              </label>
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded font-medium hover:bg-indigo-700 transition flex items-center space-x-1.5 shadow-lg shadow-indigo-600/10">
                <Plus className="h-3.5 w-3.5" />
                <span>Log Hours</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Billable & Workload Summary Gauges */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#18181b] border border-zinc-800 rounded-xl p-5 shadow-lg shadow-black/10">
          <div className="flex items-center space-x-3 p-2">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block font-mono">TOTAL LOGGED CLIENT HOURS</span>
              <span className="text-base font-bold font-mono text-zinc-100">{summary.totals.hoursLogged} Hours</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-2 border-t md:border-t-0 md:border-l border-zinc-850/60 md:pl-4">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block font-mono">BILLABLE HOURS PROPORTION</span>
              <span className="text-base font-bold font-mono text-zinc-100">{summary.totals.billableHours}h ({summary.totals.billablePercentage}%)</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-2 border-t md:border-t-0 md:border-l border-zinc-850/60 md:pl-4">
            <div className="p-2.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block font-mono">NON-BILLABLE COMPLIANCE HOURS</span>
              <span className="text-base font-bold font-mono text-zinc-100">{summary.totals.nonBillableHours} Hours</span>
            </div>
          </div>
        </div>
      )}

      {/* Timesheet Logs Table with Approval Gates */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-xl shadow-lg shadow-black/10 overflow-hidden">
        <div className="p-4 border-b border-zinc-850/60">
          <h3 className="font-semibold text-zinc-100 text-xs">Project Weekly Hours Register</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-900/50 text-zinc-400 font-medium border-b border-zinc-800">
                <th className="p-3">Resource</th>
                <th className="p-3">Work Package Context</th>
                <th className="p-3">Description</th>
                <th className="p-3">Hours</th>
                <th className="p-3">Billable</th>
                <th className="p-3">Gate Status</th>
                <th className="p-3 text-right">Approve</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => {
                const member = teamMembers.find(tm => tm.id === l.teamMemberId || tm.userId === l.teamMemberId);
                const memberName = member ? member.name : "System Teammate";
                return (
                  <tr key={l.id} className="border-b border-zinc-850/40 hover:bg-zinc-800/20 text-zinc-300 transition-colors">
                    <td className="p-3 font-semibold text-zinc-200">{memberName}</td>
                    <td className="p-3 text-zinc-400 font-medium">{getTaskTitle(l.taskId)}</td>
                    <td className="p-3 text-zinc-400 truncate max-w-[200px]">{l.description}</td>
                    <td className="p-3 font-mono font-semibold text-indigo-400">{l.hours}h</td>
                    <td className="p-3">
                      {l.isBillable ? (
                        <span className="text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Billable</span>
                      ) : (
                        <span className="text-zinc-400 font-medium bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">Standard</span>
                      )}
                    </td>
                    <td className="p-3">
                      {l.isApproved ? (
                        <span className="text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center w-fit space-x-1">
                          <Check className="h-3 w-3" />
                          <span>Approved</span>
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded w-fit inline-block">Pending</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {!l.isApproved && (
                        <button
                          onClick={() => handleApprove(l.id)}
                          className="px-2.5 py-1 bg-indigo-600 text-white text-[11px] font-medium rounded hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/10"
                        >
                          Approve Log
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center italic text-zinc-500 bg-[#09090b]">No time allocation lines logged yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
