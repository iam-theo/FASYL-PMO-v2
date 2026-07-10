import React, { useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { Issue, Risk } from "../modules/project-tracker/types.ts";
import { ShieldAlert, AlertTriangle, Plus, Trash2, CheckCircle2, ShieldOff, HelpCircle } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface Props {
  projectId: string;
}

export function IssuesRisksView({ projectId }: Props) {
  const { theme } = useTheme();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab: "issues" or "risks"
  const [activeTab, setActiveTab] = useState<"issues" | "risks">("issues");

  // Create Issue States
  const [isAddingIssue, setIsAddingIssue] = useState(false);
  const [iTitle, setITitle] = useState("");
  const [iDesc, setIDesc] = useState("");
  const [iSeverity, setISeverity] = useState("MEDIUM");
  const [iPriority, setIPriority] = useState("MEDIUM");

  // Create Risk States
  const [isAddingRisk, setIsAddingRisk] = useState(false);
  const [rTitle, setRTitle] = useState("");
  const [rDesc, setRDesc] = useState("");
  const [rProb, setRProb] = useState("MEDIUM");
  const [rImp, setRImp] = useState("MEDIUM");
  const [rMit, setRMit] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [iList, rList, teamList] = await Promise.all([
        api.getIssues(projectId),
        api.getRisks(projectId),
        api.getTeam(projectId).catch(() => [])
      ]);
      setIssues(iList);
      setRisks(rList);
      setTeamMembers(teamList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getMemberName = (id: string | null) => {
    if (!id) return "Unassigned";
    const member = teamMembers.find(m => m.id === id || m.userId === id);
    return member ? member.name : "Unassigned";
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!iTitle) return;

    try {
      await api.createIssue({
        projectId,
        title: iTitle,
        description: iDesc,
        severity: iSeverity as any,
        priority: iPriority as any,
        reporterId: "usr-alex"
      });
      setIsAddingIssue(false);
      setITitle("");
      setIDesc("");
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResolveIssue = async (id: string) => {
    const rootCause = prompt("Please provide root cause Analysis:");
    const resolution = prompt("Please provide final resolution steps taken:");
    if (!resolution) return;

    try {
      await api.updateIssue(id, {
        status: "RESOLVED" as any,
        rootCause,
        resolution
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteIssue = async (id: string) => {
    if (!confirm("Remove this issue record?")) return;
    try {
      await api.deleteIssue(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rTitle) return;

    try {
      await api.createRisk({
        projectId,
        title: rTitle,
        description: rDesc,
        probability: rProb as any,
        impact: rImp as any,
        mitigationStrategy: rMit,
        ownerId: "usr-alex"
      });
      setIsAddingRisk(false);
      setRTitle("");
      setRDesc("");
      setRMit("");
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteRisk = async (id: string) => {
    if (!confirm("Archive this risk item?")) return;
    try {
      await api.deleteRisk(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700 dark:border-slate-500"></div>
      </div>
    );
  }

  // Risk Rating Score helpers
  const getScoreColor = (level: string) => {
    switch (level) {
      case "CRITICAL": return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "HIGH": return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "MEDIUM": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
      default: return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="space-y-6 text-xs text-slate-600 dark:text-slate-300">
      
      {/* Sub tabs switches */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab("issues")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "issues" ? "bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 font-semibold" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40"
            }`}
          >
            Issues Tracker ({issues.length})
          </button>
          <button
            onClick={() => setActiveTab("risks")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "risks" ? "bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 font-semibold" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40"
            }`}
          >
            Risk Matrix Register ({risks.length})
          </button>
        </div>

        {activeTab === "issues" ? (
          <button
            onClick={() => setIsAddingIssue(!isAddingIssue)}
            className="flex items-center space-x-1.5 bg-indigo-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Log Issue</span>
          </button>
        ) : (
          <button
            onClick={() => setIsAddingRisk(!isAddingRisk)}
            className="flex items-center space-x-1.5 bg-indigo-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Identify Risk</span>
          </button>
        )}
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === "issues" ? (
        <div className="space-y-6">
          {/* Create Issue modal */}
          {isAddingIssue && (
            <form onSubmit={handleCreateIssue} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4 shadow-sm">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Log Project Issue</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1">Issue Title</label>
                  <input type="text" value={iTitle} onChange={e => setITitle(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Severity</label>
                    <select value={iSeverity} onChange={e => setISeverity(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100">
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Priority</label>
                    <select value={iPriority} onChange={e => setIPriority(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100">
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Description / Reproduction steps</label>
                <textarea value={iDesc} onChange={e => setIDesc(e.target.value)} rows={3} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100" />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setIsAddingIssue(false)} className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded transition">Cancel</button>
                <button type="submit" className="px-3.5 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition">Save Issue</button>
              </div>
            </form>
          )}

          {/* Issues list cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {issues.map(i => (
              <div key={i.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs block truncate max-w-[80%]">{i.title}</span>
                    <div className="flex space-x-1">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold ${
                        i.severity === "CRITICAL" ? "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50" :
                        i.severity === "HIGH" ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50" :
                        "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                      }`}>
                        {i.severity}
                      </span>
                      <button onClick={() => handleDeleteIssue(i.id)} className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-1 leading-relaxed">{i.description}</p>

                  {/* Resolution line if exists */}
                  {i.resolution && (
                    <div className="mt-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 p-2.5 rounded-lg space-y-1">
                      <div className="font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Resolution Logged</span>
                      </div>
                      <p className="text-[10px] leading-relaxed"><strong className="font-mono text-slate-500 dark:text-slate-400">Root Cause:</strong> {i.rootCause || "N/A"}</p>
                      <p className="text-[10px] leading-relaxed"><strong className="font-mono text-slate-500 dark:text-slate-400">Resolution:</strong> {i.resolution}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-[10px] pt-3 border-t border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <span>Status: <strong className="font-sans text-slate-900 dark:text-slate-100">{i.status}</strong></span>
                  {i.status !== "RESOLVED" && (
                    <button
                      onClick={() => handleResolveIssue(i.id)}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition hover:underline font-semibold flex items-center space-x-1"
                    >
                      <span>Mark Resolved</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Create Risk modal */}
          {isAddingRisk && (
            <form onSubmit={handleCreateRisk} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4 shadow-sm">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Identify Project Risk</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1">Risk Description Name</label>
                  <input type="text" value={rTitle} onChange={e => setRTitle(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Probability</label>
                    <select value={rProb} onChange={e => setRProb(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100">
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Impact Level</label>
                    <select value={rImp} onChange={e => setRImp(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100">
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1">Mitigation Strategy / Workarounds</label>
                <textarea value={rMit} onChange={e => setRMit(e.target.value)} rows={3} required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100" />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setIsAddingRisk(false)} className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded transition">Cancel</button>
                <button type="submit" className="px-3.5 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition">Save Risk Matrix Node</button>
              </div>
            </form>
          )}

          {/* Interactive Probability-Impact Risk Matrix Heatmap */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center space-x-1.5">
              <ShieldAlert className="h-4 w-4 text-rose-500 dark:text-rose-400" />
              <span>Dynamic Probability-Impact Risk Matrix (P&I Grid)</span>
            </h3>

            <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
              {/* Grid Header */}
              <div className="font-bold border-b border-slate-100 dark:border-slate-800 pb-2 text-slate-500 dark:text-slate-400">Impact &rarr;</div>
              <div className="font-bold border-b border-slate-100 dark:border-slate-800 pb-2 text-slate-500 dark:text-slate-400">LOW</div>
              <div className="font-bold border-b border-slate-100 dark:border-slate-800 pb-2 text-amber-600 dark:text-amber-400">MEDIUM</div>
              <div className="font-bold border-b border-slate-100 dark:border-slate-800 pb-2 text-rose-600 dark:text-rose-400">HIGH / CRITICAL</div>

              {/* HIGH ROW */}
              <div className="font-bold border-r border-slate-100 dark:border-slate-800 flex items-center justify-center font-mono text-slate-500 dark:text-slate-400">HIGH PROB</div>
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded p-2 text-[9px] text-slate-500 dark:text-slate-400">
                {risks.filter(r => r.probability === "HIGH" && r.impact === "LOW").map(r => r.title).join(", ") || "No Risks"}
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded p-2 text-[9px] text-amber-700 dark:text-amber-400">
                {risks.filter(r => r.probability === "HIGH" && r.impact === "MEDIUM").map(r => r.title).join(", ") || "No Risks"}
              </div>
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50 rounded p-2 text-[9px] text-rose-700 dark:text-rose-400 font-semibold">
                {risks.filter(r => r.probability === "HIGH" && (r.impact === "HIGH" || r.impact === "CRITICAL")).map(r => r.title).join(", ") || "No Risks"}
              </div>

              {/* MEDIUM ROW */}
              <div className="font-bold border-r border-slate-100 dark:border-slate-800 flex items-center justify-center font-mono text-slate-500 dark:text-slate-400">MED PROB</div>
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded p-2 text-[9px] text-slate-500 dark:text-slate-400">
                {risks.filter(r => r.probability === "MEDIUM" && r.impact === "LOW").map(r => r.title).join(", ") || "No Risks"}
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded p-2 text-[9px] text-slate-500 dark:text-slate-400">
                {risks.filter(r => r.probability === "MEDIUM" && r.impact === "MEDIUM").map(r => r.title).join(", ") || "No Risks"}
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded p-2 text-[9px] text-amber-700 dark:text-amber-400">
                {risks.filter(r => r.probability === "MEDIUM" && (r.impact === "HIGH" || r.impact === "CRITICAL")).map(r => r.title).join(", ") || "No Risks"}
              </div>

              {/* LOW ROW */}
              <div className="font-bold border-r border-slate-100 dark:border-slate-800 flex items-center justify-center font-mono text-slate-500 dark:text-slate-400">LOW PROB</div>
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded p-2 text-[9px] text-slate-500 dark:text-slate-400">
                {risks.filter(r => r.probability === "LOW" && r.impact === "LOW").map(r => r.title).join(", ") || "No Risks"}
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded p-2 text-[9px] text-slate-500 dark:text-slate-400">
                {risks.filter(r => r.probability === "LOW" && r.impact === "MEDIUM").map(r => r.title).join(", ") || "No Risks"}
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2 text-[9px] text-slate-500 dark:text-slate-400">
                {risks.filter(r => r.probability === "LOW" && (r.impact === "HIGH" || r.impact === "CRITICAL")).map(r => r.title).join(", ") || "No Risks"}
              </div>
            </div>
          </div>

          {/* Risks Cards Register */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {risks.map(r => (
              <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs block truncate max-w-[80%]">{r.title}</span>
                    <div className="flex space-x-1">
                      <span className={`px-2 py-0.5 border rounded-full text-[9px] font-semibold font-mono ${getScoreColor((r as any).riskLevel)}`}>
                        {r.probability} &times; {r.impact} — {(r as any).riskLevel}
                      </span>
                      <button onClick={() => handleDeleteRisk(r.id)} className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-1 leading-relaxed">{r.description}</p>
                  
                  <div className="mt-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-slate-200 block">Mitigation Strategy:</span>
                    <p className="mt-1 leading-relaxed">{r.mitigationStrategy}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] pt-3 border-t border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <span>Risk Status: <strong className="font-sans text-slate-900 dark:text-slate-100">{r.status}</strong></span>
                  <span className="font-mono">Owner: {getMemberName(r.ownerId)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

