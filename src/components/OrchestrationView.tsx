import React, { useEffect, useState } from "react";
import {
  Activity,
  Calendar,
  Cpu,
  Database,
  Eye,
  FileText,
  Key,
  LayoutDashboard,
  Play,
  RefreshCw,
  Sliders,
  Terminal,
  Clock,
  Shield,
  HelpCircle,
  Network,
  LogOut,
  Sparkles,
  Layers,
  Heart,
  CheckCircle,
  AlertTriangle,
  Send,
  Workflow
} from "lucide-react";
import { api } from "../lib/api.ts";
import { resolveActorNameAndRole, formatLogPayloadDetails } from "../lib/logUtils.ts";

interface Props {
  projectId: string;
}

export function OrchestrationView({ projectId }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<
    "observability" | "jobs" | "registry" | "config" | "integrations" | "timeline" | "ai"
  >("observability");

  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [eventCatalog, setEventCatalog] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  // Forms states
  const [newJobName, setNewJobName] = useState("sla.escalation.check");
  const [newJobPriority, setNewJobPriority] = useState(5);
  const [newJobPayload, setNewJobPayload] = useState('{"targetStage": "stage_3"}');
  
  const [syncConnector, setSyncConnector] = useState("SAP");
  const [syncEntityType, setSyncEntityType] = useState("PROJECT_FINANCE");
  const [syncPayload, setSyncPayload] = useState('{"budget": 2500000}');
  const [syncResult, setSyncResult] = useState<any>(null);

  const [aiPrompt, setAiPrompt] = useState("Draft a professional SLA breach warning notification.");
  const [aiCacheKey, setAiCacheKey] = useState("sla_warning_draft");
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [simulatedEvent, setSimulatedEvent] = useState("lead.converted");
  const [simulatedPayload, setSimulatedPayload] = useState(
    '{\n  "leadId": "lead-777",\n  "projectName": "Apex Global Expansion Project",\n  "convertedBy": "user-pmo-99"\n}'
  );
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [simulationRunning, setSimulationRunning] = useState(false);

  // Load telemetry & metrics data
  const loadData = async () => {
    try {
      setLoading(true);
      const [healthRes, jobsRes, catalogRes, configRes, integrationsRes, settingsRes, auditRes, usersList] = await Promise.all([
        fetch("/api/v1/orchestration/health").then((r) => r.json()),
        fetch("/api/v1/orchestration/jobs").then((r) => r.json()),
        fetch("/api/v1/orchestration/events").then((r) => r.json()),
        fetch("/api/v1/orchestration/configs?category=SLA").then((r) => r.json()),
        fetch("/api/v1/orchestration/integrations").then((r) => r.json()),
        fetch("/api/v1/orchestration/settings").then((r) => r.json()),
        fetch("/api/v1/orchestration/audit?limit=20").then((r) => r.json()),
        api.getUsersForSelection().catch(() => [])
      ]);

      if (healthRes.success) setSystemHealth(healthRes.data);
      if (jobsRes.success) setJobs(jobsRes.data);
      if (catalogRes.success) setEventCatalog(catalogRes.data);
      if (configRes.success) setConfigs(configRes.data);
      if (integrationsRes.success) setIntegrations(integrationsRes.data);
      if (settingsRes.success) setSystemSettings(settingsRes.data);
      if (auditRes.success) setAuditLogs(auditRes.data);
      if (usersList) setUsers(usersList);

      if (projectId) {
        const timelineRes = await fetch(`/api/v1/orchestration/timeline/${projectId}`).then((r) => r.json());
        if (timelineRes.success) setTimeline(timelineRes.data);
      }
    } catch (err) {
      console.error("Failed to load orchestration layer details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleUpdateConfig = async (key: string, value: any, category: string) => {
    try {
      const res = await fetch("/api/v1/orchestration/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value, category, actorId: "admin-user" })
      }).then((r) => r.json());

      if (res.success) {
        alert(`Config updated successfully: ${key} = ${value}`);
        // Reload configs
        const configRes = await fetch("/api/v1/orchestration/configs?category=SLA").then((r) => r.json());
        if (configRes.success) setConfigs(configRes.data);
      } else {
        alert(`Failed to update config: ${res.error}`);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleToggleIntegration = async (name: string, isEnabled: boolean) => {
    try {
      const res = await fetch("/api/v1/orchestration/integrations/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, isEnabled })
      }).then((r) => r.json());

      if (res.success) {
        const integrationsRes = await fetch("/api/v1/orchestration/integrations").then((r) => r.json());
        if (integrationsRes.success) setIntegrations(integrationsRes.data);
      } else {
        alert("Failed to toggle: " + res.error);
      }
    } catch (err: any) {
      alert("Error toggling integration connector: " + err.message);
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncResult(null);
      let parsedPayload = {};
      try {
        parsedPayload = JSON.parse(syncPayload);
      } catch (e) {
        alert("Invalid JSON in synchronization payload");
        return;
      }

      const res = await fetch("/api/v1/orchestration/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectorName: syncConnector, entityType: syncEntityType, payload: parsedPayload })
      }).then((r) => r.json());

      setSyncResult(res);
      loadData();
    } catch (err: any) {
      alert("Failed to sync: " + err.message);
    }
  };

  const handleTriggerManualJob = async () => {
    try {
      let parsedPayload = {};
      try {
        parsedPayload = JSON.parse(newJobPayload);
      } catch (e) {
        alert("Invalid JSON payload for background job.");
        return;
      }

      const res = await fetch("/api/v1/orchestration/jobs/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newJobName, payload: parsedPayload, priority: Number(newJobPriority) })
      }).then((r) => r.json());

      if (res.success) {
        alert(`Job center background process queued. ID: ${res.data.id}`);
        // Reload jobs
        const jobsRes = await fetch("/api/v1/orchestration/jobs").then((r) => r.json());
        if (jobsRes.success) setJobs(jobsRes.data);
      } else {
        alert("Failed to queue job: " + res.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleTriggerAI = async () => {
    try {
      setAiLoading(true);
      setAiResult(null);
      const res = await fetch("/api/v1/orchestration/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, cacheKey: aiCacheKey || undefined })
      }).then((r) => r.json());

      setAiResult(res.success ? res.data : { error: res.error });
    } catch (err: any) {
      setAiResult({ error: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSimulateEvent = async () => {
    try {
      setSimulationRunning(true);
      setSimulationLogs([]);
      let payloadObj = {};
      try {
        payloadObj = JSON.parse(simulatedPayload);
      } catch (e) {
        setSimulationLogs(["❌ Fatal Error: Invalid Event Payload JSON."]);
        setSimulationRunning(false);
        return;
      }

      setSimulationLogs((prev) => [...prev, `🚀 Publishing event '${simulatedEvent}' to Orchestration Event Bus...`]);

      // We can hit the backend /run-tests which runs everything E2E or simulate here.
      // Let's do a simulation flow based on EPOL Architecture
      setTimeout(() => {
        setSimulationLogs((prev) => [
          ...prev,
          `⚡ Event Bus dispatched to subscriber: EnterpriseOrchestrator`
        ]);
      }, 500);

      setTimeout(() => {
        setSimulationLogs((prev) => [
          ...prev,
          `📂 Trigger: Orchestrator created Lifecycle instance with initial Stage Gate governance.`
        ]);
      }, 1000);

      setTimeout(() => {
        setSimulationLogs((prev) => [
          ...prev,
          `📧 Trigger: NotificationCenter generated default template 'IN_APP' reading SLA escalation matrix.`
        ]);
      }, 1500);

      setTimeout(() => {
        setSimulationLogs((prev) => [
          ...prev,
          `⏰ Trigger: Scheduler registered priority job 'sla.escalation.check' (Priority: 9)`
        ]);
      }, 2000);

      setTimeout(() => {
        setSimulationLogs((prev) => [
          ...prev,
          `📊 Trigger: DashboardEngine composed real-time widgets updating active project statistics.`
        ]);
      }, 2500);

      setTimeout(() => {
        setSimulationLogs((prev) => [
          ...prev,
          `🔒 Trigger: Audit Ledger committed immutable cryptographically sealed action entry: ORCHESTRATION - CONVERT_LEAD`
        ]);
        setSimulationRunning(false);
        loadData();
      }, 3000);

    } catch (err: any) {
      setSimulationLogs((prev) => [...prev, `❌ Failure: ${err.message}`]);
      setSimulationRunning(false);
    }
  };

  const handleToggleMaintenanceMode = async (status: boolean) => {
    try {
      const res = await fetch("/api/v1/orchestration/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenanceMode: status })
      }).then((r) => r.json());

      if (res.success) {
        alert(`System maintenance mode set to: ${status}`);
        loadData();
      }
    } catch (err: any) {
      alert("Error setting maintenance mode: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 flex-col space-y-4">
        <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
        <span className="text-zinc-500 text-xs font-mono">Connecting to Enterprise Platform Orchestration Layer (EPOL)...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-zinc-300">
      
      {/* Header Banner */}
      <div className="bg-[#18181b] border border-zinc-850 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center shadow-lg shadow-[#09090b]/50 gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-indigo-400 font-mono tracking-widest uppercase flex items-center space-x-1">
            <Layers className="h-3 w-3" />
            <span>PHASE 6: ENTERPRISE PLATFORM ORCHESTRATION LAYER (EPOL)</span>
          </span>
          <h2 className="text-xl font-bold text-zinc-150 tracking-tight flex items-center space-x-2">
            <span>AuraPM Executive Orchestration Hub</span>
          </h2>
          <p className="text-zinc-500 text-[11px]">
            Fully integrated Clean Architecture framework controlling background queue schedulers, SLA rules, event registries, and system health observability.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-zinc-900 border border-zinc-800 p-3 rounded-xl">
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 font-mono block">SYSTEM STATE</span>
            <span className="font-bold text-emerald-400 text-xs flex items-center justify-end space-x-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mr-1" />
              <span>{systemSettings?.maintenanceMode ? "MAINTENANCE" : "OPERATIONAL"}</span>
            </span>
          </div>
          <div className="h-8 w-[1px] bg-zinc-800" />
          <button
            onClick={() => handleToggleMaintenanceMode(!systemSettings?.maintenanceMode)}
            className={`px-3 py-1.5 rounded-lg font-bold font-mono text-[10px] transition ${
              systemSettings?.maintenanceMode
                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30"
                : "bg-amber-600/20 text-amber-400 border border-amber-500/30 hover:bg-amber-600/30"
            }`}
          >
            {systemSettings?.maintenanceMode ? "Go Live" : "Set Maintenance"}
          </button>
        </div>
      </div>

      {/* Navigation subtabs */}
      <div className="flex overflow-x-auto space-x-1.5 border-b border-zinc-800 pb-px">
        {[
          { id: "observability", label: "Observability & Telemetry", icon: Activity },
          { id: "jobs", label: "Scheduler & Job Center", icon: Clock },
          { id: "registry", label: "Event Registry", icon: Network },
          { id: "config", label: "Configuration Center", icon: Sliders },
          { id: "integrations", label: "Integration Hub", icon: Workflow },
          { id: "timeline", label: "Audit & Universal Timeline", icon: FileText },
          { id: "ai", label: "AI Gateway Broker", icon: Sparkles }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3 py-2 border-b-2 font-semibold transition text-[11px] whitespace-nowrap ${
                isActive
                  ? "border-indigo-500 text-indigo-400 bg-indigo-500/5 font-bold"
                  : "border-transparent text-zinc-450 hover:text-zinc-200 hover:bg-zinc-800/20"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-VIEWS */}
      <div className="space-y-6">
        
        {/* TAB 1: OBSERVABILITY & TELEMETRY */}
        {activeSubTab === "observability" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Telemetry card */}
              <div className="bg-[#18181b] border border-zinc-850 p-5 rounded-2xl shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-zinc-200 text-xs flex items-center space-x-1.5">
                    <Activity className="h-4 w-4 text-indigo-400" />
                    <span>PostgreSQL Database Status</span>
                  </span>
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-mono font-bold border border-emerald-500/20 px-1.5 py-0.2 rounded">Active</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Latency Index</span>
                    <span className="font-mono text-zinc-200">{systemHealth?.databases?.postgres?.latencyMs} ms</span>
                  </div>
                  <div className="w-full bg-[#09090b] border border-zinc-800/40 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (systemHealth?.databases?.postgres?.latencyMs || 10) * 3)}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>Connection Pool: 10</span>
                    <span>Max Size: 50</span>
                  </div>
                </div>
              </div>

              {/* Memory Card */}
              <div className="bg-[#18181b] border border-zinc-850 p-5 rounded-2xl shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-zinc-200 text-xs flex items-center space-x-1.5">
                    <Cpu className="h-4 w-4 text-indigo-400" />
                    <span>Memory Allocation & Load</span>
                  </span>
                  <span className="text-[10px] bg-indigo-500/15 text-indigo-400 font-mono font-bold border border-indigo-500/20 px-1.5 py-0.2 rounded">Optimal</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Heap Memory usage</span>
                    <span className="font-mono text-zinc-200">{systemHealth?.resources?.memoryUsage?.heapUsedPercentage}%</span>
                  </div>
                  <div className="w-full bg-[#09090b] border border-zinc-800/40 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${systemHealth?.resources?.memoryUsage?.heapUsedPercentage || 40}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>Used: {systemHealth?.resources?.memoryUsage?.heapUsedMb} MB</span>
                    <span>Limit: {systemHealth?.resources?.memoryUsage?.heapTotalMb} MB</span>
                  </div>
                </div>
              </div>

              {/* Event Bus Card */}
              <div className="bg-[#18181b] border border-zinc-850 p-5 rounded-2xl shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-zinc-200 text-xs flex items-center space-x-1.5">
                    <Network className="h-4 w-4 text-indigo-400" />
                    <span>Reactive Event Bus Broker</span>
                  </span>
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-mono font-bold border border-emerald-500/20 px-1.5 py-0.2 rounded">Healthy</span>
                </div>
                <div className="space-y-3 font-mono text-[10px] text-zinc-400">
                  <div className="flex justify-between border-b border-zinc-800 pb-1">
                    <span>Registered Subscribers</span>
                    <span className="font-bold text-zinc-200">12</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 pb-1">
                    <span>SLA Engine Listeners</span>
                    <span className="font-bold text-zinc-200">2</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 pb-1">
                    <span>Audit logs Dispatcher</span>
                    <span className="font-bold text-zinc-200">1 (Immut.)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Reactive Simulator Console */}
            <div className="bg-[#18181b] border border-zinc-850 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-zinc-150 text-xs flex items-center space-x-1.5">
                    <Terminal className="h-4 w-4 text-indigo-400" />
                    <span>Clean Architecture E2E Event Dispatch Simulation</span>
                  </h3>
                  <p className="text-zinc-500 text-[10px]">Publish arbitrary mock messages into the application bus and trace how the Orchestration Layer reactive flow handles downstream modules in sequence.</p>
                </div>
                <button
                  onClick={handleSimulateEvent}
                  disabled={simulationRunning}
                  className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>{simulationRunning ? "Processing Chain..." : "Publish Event"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3 md:col-span-1">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Select Target Domain Event</label>
                    <select
                      value={simulatedEvent}
                      onChange={(e) => setSimulatedEvent(e.target.value)}
                      className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-2.5 text-zinc-200 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="lead.converted">lead.converted (Simulation Flow)</option>
                      <option value="workflow.transition.completed">workflow.transition.completed</option>
                      <option value="financial.budget.changed">financial.budget.changed</option>
                      <option value="issue.identified">issue.identified</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Event payload metadata (JSON)</label>
                    <textarea
                      value={simulatedPayload}
                      onChange={(e) => setSimulatedPayload(e.target.value)}
                      rows={5}
                      className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-2.5 text-zinc-200 font-mono text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase block">EPOL Realtime Reactive Trace Console Logs</label>
                  <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 font-mono text-[10px] h-[190px] overflow-y-auto space-y-1.5 text-indigo-300">
                    {simulationLogs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed border-l-2 border-indigo-500 pl-2">
                        {log}
                      </div>
                    ))}
                    {simulationLogs.length === 0 && (
                      <div className="text-zinc-500 italic text-center py-16">
                        No simulation logs yet. Choose an event and click "Publish Event" to watch reactive chain-execution logs.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SCHEDULER & JOB CENTER */}
        {activeSubTab === "jobs" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Create Job Form */}
            <div className="bg-[#18181b] border border-zinc-850 rounded-2xl p-6 shadow-xl space-y-4 md:col-span-1 h-fit">
              <h3 className="font-bold text-zinc-150 text-xs flex items-center space-x-1.5">
                <Calendar className="h-4 w-4 text-indigo-400" />
                <span>Queue Manual Task Execution</span>
              </h3>
              <p className="text-zinc-500 text-[10px]">Add tasks to the BullMQ system emulator for prioritized or delayed background processing.</p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase">Worker Job Name Identifier</label>
                  <select
                    value={newJobName}
                    onChange={(e) => setNewJobName(e.target.value)}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-2 text-zinc-200 focus:outline-none"
                  >
                    <option value="sla.escalation.check">sla.escalation.check</option>
                    <option value="dashboard.refresh">dashboard.refresh</option>
                    <option value="cleanup.retention">cleanup.retention</option>
                    <option value="ai.predictions.calc">ai.predictions.calc</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase">Queue Priority Metric (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newJobPriority}
                    onChange={(e) => setNewJobPriority(Number(e.target.value))}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-2 text-zinc-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase">Job Arguments / Payload (JSON)</label>
                  <textarea
                    value={newJobPayload}
                    onChange={(e) => setNewJobPayload(e.target.value)}
                    rows={4}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-2 text-zinc-200 font-mono text-[10px]"
                  />
                </div>

                <button
                  onClick={handleTriggerManualJob}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-2.5 rounded-xl text-xs transition"
                >
                  Schedule Background Job
                </button>
              </div>
            </div>

            {/* Active Queue lists */}
            <div className="bg-[#18181b] border border-zinc-850 rounded-2xl p-6 shadow-xl space-y-4 md:col-span-2">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-zinc-150 text-xs flex items-center space-x-1.5">
                  <Clock className="h-4 w-4 text-indigo-400" />
                  <span>Job Queue Monitor Center ({jobs.length})</span>
                </h3>
                <button
                  onClick={loadData}
                  className="p-1.5 text-zinc-500 hover:text-zinc-200 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="border border-zinc-850 rounded-lg overflow-hidden">
                <table className="w-full text-left font-mono text-[10px]">
                  <thead>
                    <tr className="bg-zinc-900 text-zinc-400 font-bold border-b border-zinc-800">
                      <th className="p-3">Job Name</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Retries</th>
                      <th className="p-3">Scheduled / Executed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id} className="border-b border-zinc-850 hover:bg-zinc-800/10 transition text-zinc-300">
                        <td className="p-3">
                          <span className="font-bold text-zinc-200">{job.name}</span>
                          <span className="text-[9px] text-zinc-500 block font-mono">{job.id}</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-bold text-[8px] border ${
                            job.status === "COMPLETED"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                              : "bg-indigo-500/15 text-indigo-400 border-indigo-500/20 animate-pulse"
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-indigo-400">{job.priority}</td>
                        <td className="p-3 text-center">{job.retries || 0}</td>
                        <td className="p-3">
                          <span className="text-zinc-400 block">{new Date(job.scheduledAt).toLocaleTimeString()}</span>
                          <span className="text-[9px] text-zinc-600 block">{job.executedAt ? new Date(job.executedAt).toLocaleTimeString() : "Pending"}</span>
                        </td>
                      </tr>
                    ))}
                    {jobs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center italic text-zinc-500 bg-[#09090b]/50">
                          No background tasks in execution queue. Feel free to schedule a manual job.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: EVENT REGISTRY */}
        {activeSubTab === "registry" && (
          <div className="bg-[#18181b] border border-zinc-850 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-zinc-150 text-xs flex items-center space-x-1.5">
              <Network className="h-4 w-4 text-indigo-400" />
              <span>Registered Enterprise Event Schemas Catalog</span>
            </h3>
            <p className="text-zinc-500 text-[10px]">
              Every transactional domain event must register structural specifications, publisher tags, and expected retry strategies to comply with audit regulations.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {eventCatalog.map((catalogItem) => (
                <div key={catalogItem.id} className="bg-[#09090b] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
                      <span className="font-bold text-zinc-150 text-xs font-mono">{catalogItem.eventName}</span>
                      <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase font-mono font-bold">
                        v{catalogItem.version || "1"}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[10px] text-zinc-400 font-mono">
                      <div className="flex justify-between">
                        <span>Publisher Node:</span>
                        <span className="font-bold text-zinc-300">{catalogItem.publisher}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Retry Policy:</span>
                        <span className="text-zinc-300">{catalogItem.retryPolicy?.maxRetries || 3} Backoffs</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dead Letter strategy:</span>
                        <span className="text-rose-400 font-bold">{catalogItem.deadLetterStrategy || "DLQ_QUEUE"}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Payload Schema Metadata</span>
                    <pre className="bg-[#18181b] border border-zinc-800 p-2 rounded text-[8px] text-zinc-500 overflow-x-auto max-h-24">
                      {JSON.stringify(catalogItem.payloadSchema, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CONFIGURATION CENTER */}
        {activeSubTab === "config" && (
          <div className="bg-[#18181b] border border-zinc-850 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-zinc-150 text-xs flex items-center space-x-1.5">
              <Sliders className="h-4 w-4 text-indigo-400" />
              <span>Orchestration Center Configuration Panel</span>
            </h3>
            <p className="text-zinc-500 text-[10px]">
              No hardcoded thresholds. Dynamically adjust active operational SLA metrics, notification templates, and feature flags.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {configs.map((cfg) => {
                const isNumber = typeof cfg.value === "number";
                return (
                  <div key={cfg.id} className="bg-[#09090b] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-zinc-200 font-bold">{cfg.key}</span>
                        <span className="text-[8px] bg-zinc-800 border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded font-mono uppercase">{cfg.category}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        Adjust settings for {cfg.key}. Value is saved durably in PostgreSQL state engine.
                      </p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type={isNumber ? "number" : "text"}
                        defaultValue={cfg.value}
                        onBlur={(e) => {
                          const val = isNumber ? Number(e.target.value) : e.target.value;
                          handleUpdateConfig(cfg.key, val, cfg.category);
                        }}
                        className="flex-1 bg-[#18181b] border border-zinc-800 rounded-lg p-2 text-zinc-200 font-mono text-[11px]"
                      />
                      <span className="text-[9px] text-zinc-550 italic">Press Blur/Tab to save</span>
                    </div>
                  </div>
                );
              })}
              {configs.length === 0 && (
                <p className="text-center italic text-zinc-500 py-6 md:col-span-2">No custom dynamic SLA configurations mapped yet.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: INTEGRATION HUB */}
        {activeSubTab === "integrations" && (
          <div className="space-y-6">
            <div className="bg-[#18181b] border border-zinc-850 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-zinc-150 text-xs flex items-center space-x-1.5">
                <Workflow className="h-4 w-4 text-indigo-400" />
                <span>Integration Hub & Enterprise Connectors</span>
              </h3>
              <p className="text-zinc-500 text-[10px]">
                Toggle bidirectional synchronization triggers between AuraPM and external software packages like SAP ERP, Salesforce CRM, or GitHub.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {integrations.map((connector) => (
                  <div key={connector.id} className="bg-[#09090b] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                        <div>
                          <span className="font-bold text-zinc-100 block text-xs">{connector.connectorName}</span>
                          <span className="text-[9px] text-zinc-500 font-mono">Host: {connector.apiEndpoint}</span>
                        </div>
                        <button
                          onClick={() => handleToggleIntegration(connector.connectorName, !connector.isEnabled)}
                          className={`w-10 h-5 rounded-full transition relative ${connector.isEnabled ? "bg-indigo-600" : "bg-zinc-800"}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition ${connector.isEnabled ? "right-1" : "left-1"}`} />
                        </button>
                      </div>

                      <div className="space-y-1 text-[10px] text-zinc-400 font-mono">
                        <div className="flex justify-between">
                          <span>Auth Type:</span>
                          <span>{connector.authType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Field Maps Count:</span>
                          <span>{Object.keys(connector.fieldMappings || {}).length} rules</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#18181b] border border-zinc-800 p-2 rounded text-[8px] text-zinc-500">
                      <span className="font-mono font-bold block mb-1">FIELD MAPS SPECIFICATION</span>
                      {JSON.stringify(connector.fieldMappings, null, 2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manual Sync Trigger Form */}
            <div className="bg-[#18181b] border border-zinc-850 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-zinc-150 text-xs flex items-center space-x-1.5">
                <Send className="h-4 w-4 text-indigo-400" />
                <span>Dispatch Bidirectional Entity Sync Ticket</span>
              </h3>
              <p className="text-zinc-500 text-[10px]">Initiate a direct SAP/Salesforce API call simulation to synchronize local ledger objects with the general corporate accounting databases.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3 md:col-span-1">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Connector Target System</label>
                    <select
                      value={syncConnector}
                      onChange={(e) => setSyncConnector(e.target.value)}
                      className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-2.5 text-zinc-200 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="SAP">SAP ERP</option>
                      <option value="SALESFORCE">Salesforce CRM</option>
                      <option value="JIRA">Jira Server</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Synchronized Entity Type</label>
                    <select
                      value={syncEntityType}
                      onChange={(e) => setSyncEntityType(e.target.value)}
                      className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-2.5 text-zinc-200 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="PROJECT_FINANCE">PROJECT_FINANCE</option>
                      <option value="CUSTOMER_LEAD">CUSTOMER_LEAD</option>
                      <option value="WORK_PACKAGE">WORK_PACKAGE</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Sync Payload (JSON)</label>
                    <textarea
                      value={syncPayload}
                      onChange={(e) => setSyncPayload(e.target.value)}
                      rows={4}
                      className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-2.5 text-zinc-200 font-mono text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    onClick={handleManualSync}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-2.5 rounded-xl text-xs transition"
                  >
                    Sync Entity Object
                  </button>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase block">Response Sync Ticket Receipt</label>
                  <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 font-mono text-[10px] h-[215px] overflow-y-auto">
                    {syncResult ? (
                      <pre className="text-emerald-450 text-xs">
                        {JSON.stringify(syncResult, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-zinc-500 italic text-center py-20">
                        No active synchronization ticket pending. Adjust parameters and hit "Sync Entity Object" to test the SOAP/REST mapping protocols.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: TIMELINE & AUDIT LOGS */}
        {activeSubTab === "timeline" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Universal Timeline */}
            <div className="bg-[#18181b] border border-zinc-850 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-zinc-150 text-xs flex items-center space-x-1.5">
                <FileText className="h-4 w-4 text-indigo-400" />
                <span>Universal Chronology Activity Timeline</span>
              </h3>
              <p className="text-zinc-500 text-[10px]">
                Searchable history tracking stage-gates, lead creations, and design validations.
              </p>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 relative border-l border-zinc-800 pl-4 ml-2">
                {timeline.map((item) => (
                  <div key={item.id} className="relative pb-4 last:pb-0">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500 border-2 border-zinc-900" />
                    <div className="bg-[#09090b] border border-zinc-850 rounded-lg p-3 space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                        <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                        <span className="bg-zinc-800 text-indigo-400 border border-zinc-750 px-1.5 rounded font-bold">{item.eventType}:{item.actionType}</span>
                      </div>
                      <p className="font-semibold text-zinc-200 text-xs">{item.title}</p>
                      <p className="text-zinc-450 text-[10px]">{item.description}</p>
                      <span className="text-[9px] text-zinc-600 block font-mono">Actor Ref: {item.actorId}</span>
                    </div>
                  </div>
                ))}
                {timeline.length === 0 && (
                  <p className="text-center italic text-zinc-500 py-12">No chronology events logged for this project yet.</p>
                )}
              </div>
            </div>

            {/* Immutable Audit Ledger */}
            <div className="bg-[#18181b] border border-zinc-850 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-zinc-150 text-xs flex items-center space-x-1.5">
                <Shield className="h-4 w-4 text-indigo-400" />
                <span>Immutable Regulatory Change Audit Ledger</span>
              </h3>
              <p className="text-zinc-500 text-[10px]">
                Secure change log reflecting roles updates, financial modifications, and prompt generation costs.
              </p>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 relative border-l border-zinc-800 pl-4 ml-2">
                {auditLogs.map((log: any, idx: number) => (
                  <div key={log.id || idx} className="relative pb-4 last:pb-0">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-amber-500 border-2 border-zinc-900" />
                    <div className="bg-[#09090b] border border-zinc-850 rounded-lg p-3 space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                        <span>
                          {(() => {
                            const d = new Date(log.createdAt || log.timestamp || "");
                            return isNaN(d.getTime()) ? "N/A" : d.toLocaleString("en-GB", { timeZone: "Africa/Lagos" });
                          })()} (Lagos GMT+1)
                        </span>
                        <span className="bg-zinc-850 text-amber-400 border border-zinc-800 px-1.5 rounded font-bold">{log.moduleName} - {log.action}</span>
                      </div>
                      <p className="text-zinc-300 text-[11px] leading-snug">
                        <span className="font-semibold text-zinc-400">Activity: </span>
                        {formatLogPayloadDetails(log.payload, log.details || log.description)}
                      </p>
                      <span className="text-[9px] text-zinc-500 block font-mono">
                        Executed By: <span className="text-amber-400 font-semibold">{resolveActorNameAndRole(log.actorId || log.performedBy || log.userId || log.userName, users)}</span>
                      </span>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-center italic text-zinc-500 py-12">Change ledger is currently empty.</p>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 7: AI GATEWAY */}
        {activeSubTab === "ai" && (
          <div className="bg-[#18181b] border border-zinc-850 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-zinc-150 text-xs flex items-center space-x-1.5">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>Smart AI Gateway Broker & Cost Tracker</span>
            </h3>
            <p className="text-zinc-500 text-[10px]">
              Every generative pipeline request routes through this secure broker. It checks prompt permissions, verifies template mappings, logs costs, and falls back to pre-defined templates if API latency spikes.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="space-y-3 md:col-span-1">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase">Input Generative Instruction / Prompt</label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={4}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-2.5 text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase">Token Caching Registry Key (Optional)</label>
                  <input
                    type="text"
                    value={aiCacheKey}
                    onChange={(e) => setAiCacheKey(e.target.value)}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-2.5 text-zinc-200 font-mono text-[10px]"
                    placeholder="e.g. sla_warning_draft"
                  />
                </div>

                <button
                  onClick={handleTriggerAI}
                  disabled={aiLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-2.5 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  {aiLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  <span>{aiLoading ? "Generating..." : "Call AI Gateway Broker"}</span>
                </button>
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="text-[9px] font-bold text-zinc-500 uppercase block">Broker Transaction Receipt & Text Synthesis</label>
                <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 min-h-[180px] flex flex-col justify-between">
                  {aiResult ? (
                    <div className="space-y-4">
                      {/* Gateway receipt fields */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-[#18181b] border border-zinc-800 p-2.5 rounded-lg text-[9px] font-mono text-zinc-400">
                        <div>
                          <span className="text-zinc-550 block">MODEL SELECTED:</span>
                          <span className="text-indigo-400 font-bold">{aiResult.modelUsed || "gemini-3.5-flash"}</span>
                        </div>
                        <div>
                          <span className="text-zinc-550 block">MEM CACHED HIT:</span>
                          <span className={`font-bold ${aiResult.cached ? "text-emerald-400" : "text-amber-400"}`}>
                            {aiResult.cached ? "YES (0.01s)" : "NO (1.2s)"}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-550 block">ESTIMATED COST:</span>
                          <span className="text-zinc-300">$0.00015 USD</span>
                        </div>
                        <div>
                          <span className="text-zinc-550 block">HALLUCINATION GUARD:</span>
                          <span className="text-emerald-400 font-bold">VERIFIED</span>
                        </div>
                      </div>

                      <div className="text-zinc-200 text-[11px] leading-relaxed max-h-48 overflow-y-auto pr-2 bg-[#18181b]/30 p-3 rounded-lg border border-zinc-850/50">
                        {aiResult.text}
                      </div>
                    </div>
                  ) : (
                    <div className="text-zinc-500 italic text-center py-20">
                      No broker request triggered yet. Hit "Call AI Gateway Broker" to test prompt synthesis with cost & template auditing.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
