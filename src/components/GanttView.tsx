import React, { useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { Task, Milestone, Dependency } from "../modules/project-tracker/types.ts";
import { Plus, Trash2, Calendar, Target, TrendingUp, Compass, Shuffle } from "lucide-react";

interface Props {
  projectId: string;
}

export function GanttView({ projectId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [criticalTaskIds, setCriticalTaskIds] = useState<string[]>([]);
  const [showCritical, setShowCritical] = useState(false);
  const [loading, setLoading] = useState(true);

  // Milestone create form states
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [mTitle, setMTitle] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mTargetDate, setMTargetDate] = useState(new Date().toISOString().substring(0, 10));

  // Dependency create form states
  const [isAddingDependency, setIsAddingDependency] = useState(false);
  const [predId, setPredId] = useState("");
  const [succId, setSuccId] = useState("");
  const [depType, setDepType] = useState("FS");

  const loadAll = async () => {
    try {
      setLoading(true);
      const [tList, mList, dList, critList] = await Promise.all([
        api.getTasks(projectId),
        api.getMilestones(projectId),
        api.getDependencies(projectId),
        api.getCriticalPath(projectId)
      ]);
      setTasks(tList);
      setMilestones(mList);
      setDependencies(dList);
      setCriticalTaskIds(critList.map((t: any) => t.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [projectId]);

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mTitle) return;

    try {
      await api.createMilestone({
        projectId,
        title: mTitle,
        description: mDesc,
        targetDate: mTargetDate
      });
      setIsAddingMilestone(false);
      setMTitle("");
      setMDesc("");
      loadAll();
    } catch (err: any) {
      alert(err.message || "Failed to add milestone");
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm("Delete this milestone record? This won't delete tasks associated with it.")) return;
    try {
      await api.deleteMilestone(id);
      loadAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!predId || !succId) return;

    try {
      await api.createDependency({
        projectId,
        predecessorId: predId,
        successorId: succId,
        type: depType as any,
        predecessorType: "TASK",
        successorType: "TASK"
      });
      setIsAddingDependency(false);
      setPredId("");
      setSuccId("");
      loadAll();
    } catch (err: any) {
      alert(err.message || "Circular validation failure or circular loop detected.");
    }
  };

  const handleDeleteDependency = async (id: string) => {
    try {
      await api.deleteDependency(id);
      loadAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getTaskTitle = (id: string) => {
    const t = tasks.find(x => x.id === id);
    return t ? t.title : "Unknown Task Node";
  };

  // Calculations for Gantt timeline grid blocks (rendered via dynamic layout offsets)
  const getTimelineDates = () => {
    if (tasks.length === 0) return { start: new Date(), end: new Date(Date.now() + 86400000 * 30) };
    
    // Sort and calculate min-max project dates
    const startMs = Math.min(...tasks.map(t => new Date(t.startDate).getTime()));
    const endMs = Math.max(...tasks.map(t => new Date(t.dueDate).getTime()));

    // Buffer by 3 days
    const minDate = new Date(startMs - 86400000 * 3);
    const maxDate = new Date(endMs + 86400000 * 5);

    return { start: minDate, end: maxDate };
  };

  const { start: minDate, end: maxDate } = getTimelineDates();
  const projectDurationMs = maxDate.getTime() - minDate.getTime();

  const getPercentageOffsets = (startDateStr: string, dueDateStr: string) => {
    const taskStart = new Date(startDateStr).getTime();
    const taskEnd = new Date(dueDateStr).getTime();

    const left = ((taskStart - minDate.getTime()) / projectDurationMs) * 100;
    const width = ((taskEnd - taskStart) / projectDurationMs) * 100;

    return {
      left: `${Math.max(0, Math.min(100, left))}%`,
      width: `${Math.max(2, Math.min(100, width))}%`
    };
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
      {/* Dynamic Milestones Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
              <Target className="h-4 w-4 text-slate-400" />
              <span>Project Milestone Targets</span>
            </h3>
            <p className="text-slate-500 text-[10px] mt-0.5">Define core critical dates and automatic completion indexes.</p>
          </div>
          <button
            onClick={() => setIsAddingMilestone(!isAddingMilestone)}
            className="flex items-center space-x-1 border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Milestone</span>
          </button>
        </div>

        {isAddingMilestone && (
          <form onSubmit={handleCreateMilestone} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <h4 className="font-semibold text-slate-900">Add Milestone Gateway</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 mb-1">Milestone Name</label>
                <input type="text" value={mTitle} onChange={e => setMTitle(e.target.value)} required className="w-full bg-white border border-slate-200 rounded p-2 focus:outline-none focus:border-indigo-500 text-slate-900" />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Target Date</label>
                <input type="date" value={mTargetDate} onChange={e => setMTargetDate(e.target.value)} required className="w-full bg-white border border-slate-200 rounded p-2 focus:outline-none focus:border-indigo-500 text-slate-900" />
              </div>
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Milestone Description</label>
              <input type="text" value={mDesc} onChange={e => setMDesc(e.target.value)} className="w-full bg-white border border-slate-200 rounded p-2 focus:outline-none focus:border-indigo-500 text-slate-900" />
            </div>
            <div className="flex justify-end space-x-2">
              <button type="button" onClick={() => setIsAddingMilestone(false)} className="px-3 py-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded transition">Cancel</button>
              <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium shadow-sm transition">Save Milestone</button>
            </div>
          </form>
        )}

        {/* Milestone Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {milestones.map(m => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 relative">
              <button onClick={() => handleDeleteMilestone(m.id)} className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 transition">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <span className="font-semibold text-slate-900 block text-xs truncate max-w-[85%]">{m.title}</span>
              <p className="text-slate-500 text-[10px] truncate">{m.description || "No description provided."}</p>
              
              <div className="flex justify-between items-center text-[10px] pt-2 font-mono text-slate-500">
                <span>Target: {m.targetDate}</span>
                {m.isCompleted ? (
                  <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded">Reached</span>
                ) : (
                  <span className="text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">Pending</span>
                )}
              </div>

              {/* Progress bar */}
              <div className="pt-2">
                <div className="flex justify-between text-[9px] text-slate-500 mb-1">
                  <span>Task Coverage</span>
                  <span>{m.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-1 rounded-full" style={{ width: `${m.progress}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Gantt Chart Timeline */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>Gantt Work Package Scheduler</span>
            </h3>
            <p className="text-slate-500 text-[10px] mt-0.5">Visualize project timelines, duration overlaps, and critical paths.</p>
          </div>
          <button
            onClick={() => setShowCritical(!showCritical)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 transition ${
              showCritical 
                ? "bg-rose-50 text-rose-700 border-rose-200" 
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{showCritical ? "Hide Critical Path" : "Highlight Critical Path"}</span>
          </button>
        </div>

        {/* Timeline Table */}
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <div className="min-w-[700px] divide-y divide-slate-100">
            {/* Calendar header row */}
            <div className="bg-slate-50 flex py-2 border-b border-slate-100 font-mono text-[10px] text-slate-500">
              <div className="w-1/3 px-4 font-semibold text-slate-600">Work Package Node</div>
              <div className="w-2/3 relative flex justify-between px-2">
                <span>{minDate.toISOString().substring(0, 10)}</span>
                <span>Midpoint</span>
                <span>{maxDate.toISOString().substring(0, 10)}</span>
              </div>
            </div>

            {/* Task Row Blocks */}
            {tasks.map(t => {
              const offsets = getPercentageOffsets(t.startDate, t.dueDate);
              const isCrit = showCritical && criticalTaskIds.includes(t.id);
              return (
                <div key={t.id} className="flex py-3 items-center hover:bg-slate-50 text-slate-700 transition-colors">
                  <div className="w-1/3 px-4 truncate font-medium text-slate-900">
                    {t.title}
                  </div>
                  <div className="w-2/3 relative h-6 px-2">
                    {/* SVG/HTML visual progress segment */}
                    <div
                      className={`absolute top-0.5 h-5 rounded-md flex items-center px-2 text-[9px] font-mono text-white select-none transition-all duration-300 ${
                        isCrit 
                          ? "bg-rose-600 shadow-sm ring-1 ring-rose-500" 
                          : t.status === "DONE" 
                          ? "bg-slate-400 opacity-60" 
                          : "bg-indigo-600 hover:bg-indigo-500 shadow-sm"
                      }`}
                      style={{ left: offsets.left, width: offsets.width }}
                      title={`${t.title}: ${t.startDate} to ${t.dueDate}`}
                    >
                      <span className="truncate pr-1 font-semibold">{t.status === "DONE" ? "Completed" : t.priority}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task Dependency Manager Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
              <Shuffle className="h-4 w-4 text-slate-400" />
              <span>Interactive Dependency Linker</span>
            </h3>
            <p className="text-slate-500 text-[10px] mt-0.5">Configure predecessor dependencies (Finish-to-Start) with full cycle protection validation.</p>
          </div>
          <button
            onClick={() => setIsAddingDependency(!isAddingDependency)}
            className="flex items-center space-x-1 border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Map Dependency</span>
          </button>
        </div>

        {isAddingDependency && (
          <form onSubmit={handleCreateDependency} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <h4 className="font-semibold text-slate-900">Map Work Dependency</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 mb-1">Predecessor Task (Blocks...)</label>
                <select value={predId} onChange={e => setPredId(e.target.value)} required className="w-full bg-white border border-slate-200 rounded p-2 focus:outline-none focus:border-indigo-500 text-slate-900">
                  <option value="">Select Predecessor...</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Successor Task (...Blocked By)</label>
                <select value={succId} onChange={e => setSuccId(e.target.value)} required className="w-full bg-white border border-slate-200 rounded p-2 focus:outline-none focus:border-indigo-500 text-slate-900">
                  <option value="">Select Successor...</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button type="button" onClick={() => setIsAddingDependency(false)} className="px-3 py-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded transition">Cancel</button>
              <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold shadow-sm transition">Establish Link</button>
            </div>
          </form>
        )}

        {/* Existing links table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-medium text-slate-500">
                <th className="p-2.5">Predecessor Task</th>
                <th className="p-2.5">&rarr; Link Type &rarr;</th>
                <th className="p-2.5">Successor Task</th>
                <th className="p-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {dependencies.map(d => (
                <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 text-slate-700 transition-colors">
                  <td className="p-2.5 font-medium text-slate-900">{getTaskTitle(d.predecessorId)}</td>
                  <td className="p-2.5 font-mono text-[10px] text-slate-500">{d.type === "FS" ? "Finish-to-Start (FS)" : d.type}</td>
                  <td className="p-2.5 font-medium text-slate-900">{getTaskTitle(d.successorId)}</td>
                  <td className="p-2.5 text-right">
                    <button onClick={() => handleDeleteDependency(d.id)} className="text-slate-400 hover:text-rose-600 p-1 rounded transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {dependencies.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center italic text-slate-500 bg-slate-50">No active work package linkages mapped.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
