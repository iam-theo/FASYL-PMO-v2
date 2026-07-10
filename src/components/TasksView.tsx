import React, { useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { Task, TaskStatus, TaskPriority } from "../modules/project-tracker/types.ts";
import { List, Kanban, Plus, SlidersHorizontal, Trash2, ArrowUpRight, CheckSquare, Clock } from "lucide-react";

interface Props {
  projectId: string;
  defaultLayout?: "list" | "kanban";
}

export function TasksView({ projectId, defaultLayout = "list" }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Layout Style: "list" or "kanban"
  const [layout, setLayout] = useState<"list" | "kanban">(defaultLayout);

  useEffect(() => {
    setLayout(defaultLayout);
  }, [defaultLayout]);

  // Filters & Sorting state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [sortBy, setSortBy] = useState("dueDate");
  const [sortOrder, setSortOrder] = useState("asc");

  // Selection states (for Bulk Operations)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkPriority, setBulkPriority] = useState("");

  // Create Task Form State
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 86400000 * 7).toISOString().substring(0, 10));
  const [priority, setPriority] = useState("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [selectedEnterpriseUserId, setSelectedEnterpriseUserId] = useState("");
  const [usersList, setUsersList] = useState<any[]>([]);
  const [milestoneId, setMilestoneId] = useState("");
  const [estimatedHours, setEstimatedHours] = useState(8);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tList, members, mList, usersData] = await Promise.all([
        api.getTasks(projectId, {
          search,
          status: statusFilter,
          priority: priorityFilter,
          assigneeId: assigneeFilter,
          sortBy,
          sortOrder
        }),
        api.getTeam(projectId),
        api.getMilestones(projectId),
        api.getUsersForSelection().catch(() => [])
      ]);
      setTasks(tList);
      setTeam(members);
      setMilestones(mList);
      setUsersList(usersData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, search, statusFilter, priorityFilter, assigneeFilter, sortBy, sortOrder]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    try {
      let finalAssigneeId: string | null = null;

      if (selectedEnterpriseUserId) {
        // Find if this user is already in the project's team
        const selectedUser = usersList.find(u => u.id === selectedEnterpriseUserId);
        if (selectedUser) {
          const existingMember = team.find(m => m.userId === selectedUser.id || m.email === selectedUser.email);
          if (existingMember) {
            finalAssigneeId = existingMember.id;
          } else {
            // Automatically bind this user to the project as a team member resource!
            const newMember = await api.assignMember({
              projectId,
              name: `${selectedUser.firstName} ${selectedUser.lastName}`,
              role: selectedUser.department || "Team Member",
              email: selectedUser.email,
              capacity: 40,
              allocation: 100,
              userId: selectedUser.id
            });
            finalAssigneeId = newMember.id;
          }
        }
      }

      await api.createTask({
        projectId,
        title,
        description,
        startDate,
        dueDate,
        priority: priority as any,
        assigneeId: finalAssigneeId,
        milestoneId: milestoneId || null,
        estimatedHours
      });
      setIsAdding(false);
      setTitle("");
      setDescription("");
      setSelectedEnterpriseUserId("");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create task");
    }
  };

  const handleUpdateStatus = async (id: string, status: TaskStatus) => {
    try {
      await api.updateTask(id, { status });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdatePriority = async (id: string, priority: TaskPriority) => {
    try {
      await api.updateTask(id, { priority });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.deleteTask(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Bulk Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedTaskIds.length === tasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(tasks.map(t => t.id));
    }
  };

  const handleApplyBulkUpdate = async () => {
    if (selectedTaskIds.length === 0) return;
    try {
      const payload: any = { taskIds: selectedTaskIds };
      if (bulkStatus) payload.status = bulkStatus;
      if (bulkPriority) payload.priority = bulkPriority;

      await api.bulkUpdateTasks(payload);
      setSelectedTaskIds([]);
      setBulkStatus("");
      setBulkPriority("");
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete all ${selectedTaskIds.length} selected tasks?`)) return;
    try {
      await api.bulkDeleteTasks({ taskIds: selectedTaskIds });
      setSelectedTaskIds([]);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getAssigneeName = (id: string | null) => {
    if (!id) return "Unassigned";
    const member = team.find(m => m.id === id);
    return member ? member.name : "Unassigned";
  };

  const getMilestoneTitle = (id: string | null) => {
    if (!id) return null;
    const m = milestones.find(x => x.id === id);
    return m ? m.title : null;
  };

  const columns: { label: string; key: TaskStatus }[] = [
    { label: "To Do", key: TaskStatus.TODO },
    { label: "In Progress", key: TaskStatus.IN_PROGRESS },
    { label: "In Review", key: TaskStatus.IN_REVIEW },
    { label: "Done", key: TaskStatus.DONE }
  ];

  return (
    <div className="space-y-6">
      {/* Search and Layout Filter Panel */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 flex-1">
          <input
            type="text"
            placeholder="Search active project task lists..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 placeholder-slate-500 transition-colors"
          />
          <SlidersHorizontal className="h-4 w-4 text-slate-400" />
        </div>

        <div className="flex items-center space-x-3 text-xs">
          {/* Layout switches */}
          <div className="bg-slate-50 p-1 rounded-lg flex space-x-1 border border-slate-200">
            <button
              onClick={() => setLayout("list")}
              className={`p-1.5 rounded-md transition flex items-center space-x-1 ${
                layout === "list" ? "bg-white text-indigo-600 border border-slate-200 font-semibold shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setLayout("kanban")}
              className={`p-1.5 rounded-md transition flex items-center space-x-1 ${
                layout === "kanban" ? "bg-white text-indigo-600 border border-slate-200 font-semibold shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-indigo-600 text-white px-3.5 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Row */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-slate-700">
        <div>
          <label className="block text-slate-500 mb-1 font-medium">Filter by Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500 text-slate-800">
            <option value="">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-500 mb-1 font-medium">Filter by Priority</label>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500 text-slate-800">
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-500 mb-1 font-medium">Filter by Assignee</label>
          <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500 text-slate-800">
            <option value="">All Team Members</option>
            {team.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-slate-500 mb-1 font-medium">Sort Registry By</label>
          <div className="flex space-x-1">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500 text-slate-800">
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority Rating</option>
              <option value="estimatedHours">Estimated Effort</option>
              <option value="createdAt">Created Time</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
              className="bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 rounded-lg px-2"
            >
              {sortOrder.toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Operations Toolbar */}
      {selectedTaskIds.length > 0 && (
        <div className="bg-indigo-50 text-indigo-700 border border-indigo-100 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-medium">
          <span>{selectedTaskIds.length} tasks selected</span>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1.5">
              <span>Set Status:</span>
              <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="bg-white border border-slate-200 text-slate-800 rounded p-1 focus:outline-none">
                <option value="">Select...</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div className="flex items-center space-x-1.5">
              <span>Set Priority:</span>
              <select value={bulkPriority} onChange={e => setBulkPriority(e.target.value)} className="bg-white border border-slate-200 text-slate-800 rounded p-1 focus:outline-none">
                <option value="">Select...</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <button onClick={handleApplyBulkUpdate} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-2.5 py-1 rounded transition shadow-sm">
              Apply Changes
            </button>
            <button onClick={handleBulkDelete} className="bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 font-medium px-2.5 py-1 rounded transition flex items-center space-x-1">
              <Trash2 className="h-3 w-3" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Task Modal-form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 p-6 rounded-xl space-y-4 text-xs text-slate-700 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Add New Work Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Task Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500" />
            </div>
             <div>
              <label className="block text-slate-500 mb-1 font-medium">Target Assignee (Enterprise User)</label>
              <select
                value={selectedEnterpriseUserId}
                onChange={e => setSelectedEnterpriseUserId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Unassigned</option>
                {usersList.map(u => {
                  const isMember = team.some(m => m.userId === u.id || m.email === u.email);
                  return (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.email}) {isMember ? "[Project Team]" : "[Bind on Assign]"}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-slate-500 mb-1 font-medium">Task Description / Deliverables Guidelines</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Milestone Anchor</label>
              <select value={milestoneId} onChange={e => setMilestoneId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500">
                <option value="">No Milestone Anchor</option>
                {milestones.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Priority Rating</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Estimated Effort (Hours)</label>
              <input type="number" value={estimatedHours} onChange={e => setEstimatedHours(Number(e.target.value))} min={1} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 rounded-lg transition">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/10">Save Task Node</button>
          </div>
        </form>
      )}

      {/* Main Layout Rendering */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white border border-slate-200 text-center py-12 rounded-xl text-slate-400 italic text-xs shadow-sm">
          No tasks match the active selection criteria.
        </div>
      ) : layout === "list" ? (
        /* LIST REGISTRY TABLE */
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <th className="p-3 w-10 text-center">
                  <input type="checkbox" checked={selectedTaskIds.length === tasks.length} onChange={handleSelectAll} />
                </th>
                <th className="p-3">Task Title</th>
                <th className="p-3">Assignee</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Status</th>
                <th className="p-3">Due Date</th>
                <th className="p-3">Effort</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => {
                const isSelected = selectedTaskIds.includes(t.id);
                return (
                  <tr key={t.id} className={`border-b border-slate-100 hover:bg-slate-50/50 text-slate-700 transition ${isSelected ? "bg-indigo-50/40" : ""}`}>
                    <td className="p-3 text-center">
                      <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(t.id)} />
                    </td>
                    <td className="p-3">
                      <div>
                        <span className="font-semibold text-slate-900 block">{t.title}</span>
                        {getMilestoneTitle(t.milestoneId) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 mt-1 bg-slate-100 text-slate-600 font-mono text-[9px] rounded border border-slate-200">
                            Milestone: {getMilestoneTitle(t.milestoneId)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-medium text-slate-800">{getAssigneeName(t.assigneeId)}</td>
                    <td className="p-3">
                      <select
                        value={t.priority}
                        onChange={e => handleUpdatePriority(t.id, e.target.value as any)}
                        className={`font-mono text-[10px] p-1 border rounded focus:outline-none ${
                          t.priority === "URGENT" ? "bg-rose-50 text-rose-700 border-rose-200 font-semibold" :
                          t.priority === "HIGH" ? "bg-amber-50 text-amber-700 border border-amber-200 font-semibold" :
                          t.priority === "MEDIUM" ? "bg-slate-100 text-slate-700 border-slate-200" :
                          "bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <select
                        value={t.status}
                        onChange={e => handleUpdateStatus(t.id, e.target.value as any)}
                        className="bg-white text-slate-700 p-1 border border-slate-250 rounded focus:outline-none"
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="DONE">Done</option>
                      </select>
                    </td>
                    <td className="p-3 text-slate-500 font-mono">{t.dueDate}</td>
                    <td className="p-3 text-slate-500 font-mono">{t.actualHours}/{t.estimatedHours}h</td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleDeleteTask(t.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* KANBAN BOARD */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {columns.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);
            return (
              <div key={col.key} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col min-h-[400px]">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-slate-800 text-xs">{col.label}</span>
                  <span className="bg-slate-200/80 border border-slate-300 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">{colTasks.length}</span>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.map(t => (
                    <div key={t.id} className="bg-white border border-slate-200/80 p-3.5 rounded-lg shadow-sm space-y-3 hover:border-indigo-400 transition duration-200">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-slate-900 text-xs block leading-snug">{t.title}</span>
                        <button onClick={() => handleDeleteTask(t.id)} className="text-slate-400 hover:text-rose-600 transition">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Info lines */}
                      <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 p-2 rounded border border-slate-150">
                        <div className="flex justify-between">
                          <span>Owner</span>
                          <span className="font-medium text-slate-800">{getAssigneeName(t.assigneeId)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Due</span>
                          <span className="font-mono text-slate-600">{t.dueDate}</span>
                        </div>
                      </div>

                      {/* Quick transition triggers */}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                        {/* Status Shift Buttons */}
                        <div className="flex space-x-1">
                          {col.key !== TaskStatus.TODO && (
                            <button
                              onClick={() => {
                                const prevIdx = columns.findIndex(c => c.key === col.key) - 1;
                                handleUpdateStatus(t.id, columns[prevIdx].key);
                              }}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded font-mono text-[9px] text-slate-700 transition"
                            >
                              &larr; Back
                            </button>
                          )}
                          {col.key !== TaskStatus.DONE && (
                            <button
                              onClick={() => {
                                const nextIdx = columns.findIndex(c => c.key === col.key) + 1;
                                handleUpdateStatus(t.id, columns[nextIdx].key);
                              }}
                              className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 rounded font-mono text-[9px] text-white transition shadow-sm"
                            >
                              Next &rarr;
                            </button>
                          )}
                        </div>

                        {/* Priority Bubble */}
                        <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded border ${
                          t.priority === "URGENT" ? "bg-rose-50 border-rose-200 text-rose-700 font-semibold" :
                          t.priority === "HIGH" ? "bg-amber-50 border-amber-200 text-amber-700 font-semibold" :
                          "bg-slate-100 border-slate-200 text-slate-600"
                        }`}>
                          {t.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
