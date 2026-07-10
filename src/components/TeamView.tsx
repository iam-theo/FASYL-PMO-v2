import React, { useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { Users, Plus, Trash2, Edit2, Check, X, ShieldAlert } from "lucide-react";

interface Props {
  projectId: string;
}

export function TeamView({ projectId }: Props) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create Form State
  const [isAdding, setIsAdding] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [name, setName] = useState("");
  const [roles, setRoles] = useState<any[]>([]);
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [capacity, setCapacity] = useState(40);
  const [allocation, setAllocation] = useState(100);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCapacity, setEditCapacity] = useState(40);
  const [editAllocation, setEditAllocation] = useState(100);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const [teamData, rolesData, usersData] = await Promise.all([
        api.getTeam(projectId),
        api.getRolesForSelection().catch(() => []),
        api.getUsersForSelection().catch(() => [])
      ]);
      setMembers(teamData);
      setRoles(rolesData || []);
      setUsersList(usersData || []);
      if (rolesData?.length > 0 && !role) {
        setRole(rolesData[0].name);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load team dataset");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, [projectId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    try {
      await api.assignMember({
        projectId,
        name,
        role,
        email,
        capacity,
        allocation,
        userId: selectedUserId || undefined
      });
      setIsAdding(false);
      setName("");
      setEmail("");
      setSelectedUserId("");
      loadTeam();
    } catch (err: any) {
      alert(err.message || "Failed to assign member");
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await api.updateAllocation(id, {
        capacity: editCapacity,
        allocation: editAllocation
      });
      setEditingId(null);
      loadTeam();
    } catch (err: any) {
      alert(err.message || "Failed to update allocation limits");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return;
    try {
      await api.removeMember(id);
      loadTeam();
    } catch (err: any) {
      alert(err.message || "Failed to remove member");
    }
  };

  if (loading && members.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Add Action */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Resource Assignment Planner</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Map available resources, configure utilization multipliers, and monitor team workload balances.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-indigo-700 transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Assign Member</span>
        </button>
      </div>

      {/* Add Member Form Panel */}
      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assign New Project Specialist</h3>
          
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Select Enterprise User</label>
            <select
              value={selectedUserId}
              onChange={e => {
                const val = e.target.value;
                setSelectedUserId(val);
                if (val) {
                  const u = usersList.find(x => x.id === val);
                  if (u) {
                    setName(`${u.firstName} ${u.lastName}`);
                    setEmail(u.email);
                    if (u.department) {
                      const matchingRole = roles.find(r => r.name.toLowerCase() === u.department.toLowerCase());
                      if (matchingRole) {
                        setRole(matchingRole.name);
                      }
                    }
                  }
                } else {
                  setName("");
                  setEmail("");
                }
              }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">-- Select from Active Enterprise Users (or fill manually below) --</option>
              {usersList.map(u => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.email}) {u.department ? ` - ${u.department}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Professional Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {roles?.map(r => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Weekly Capacity (Hours)</label>
              <input
                type="number"
                value={capacity}
                onChange={e => setCapacity(Number(e.target.value))}
                min={1}
                max={80}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Project Allocation multiplier (%)</label>
              <input
                type="number"
                value={allocation}
                onChange={e => setAllocation(Number(e.target.value))}
                min={10}
                max={100}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition shadow-sm"
            >
              Confirm Assignment
            </button>
          </div>
        </form>
      )}

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {members.map(m => {
          const isEditing = editingId === m.id;
          
          return (
            <div key={m.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold uppercase text-xs">
                    {m.name.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{m.name}</h4>
                    <p className="text-slate-500 dark:text-slate-400 font-mono text-[10px] mt-0.5">{m.role}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  {!isEditing ? (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(m.id);
                          setEditCapacity(m.capacity);
                          setEditAllocation(m.allocation);
                        }}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-400 rounded transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleUpdate(m.id)}
                        className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded transition"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Workload and Stats */}
              <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-3 space-y-2 border border-slate-200 dark:border-slate-800/50 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Resource Email</span>
                  <span className="font-mono text-[10px] text-slate-900 dark:text-slate-100 font-medium">{m.email}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Weekly Capacity</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editCapacity}
                      onChange={e => setEditCapacity(Number(e.target.value))}
                      className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs p-1 rounded text-slate-900 dark:text-slate-100"
                    />
                  ) : (
                    <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold">{m.capacity}h</span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Allocation Weight</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editAllocation}
                      onChange={e => setEditAllocation(Number(e.target.value))}
                      className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs p-1 rounded text-slate-900 dark:text-slate-100"
                    />
                  ) : (
                    <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold">{m.allocation}%</span>
                  )}
                </div>
              </div>

              {/* Status indicator */}
              <div className="flex justify-between items-center text-xs border-t border-slate-200 dark:border-slate-800/60 pt-3">
                <span className="text-slate-500 dark:text-slate-400">Availability</span>
                <span className={`flex items-center space-x-1.5 font-medium ${
                  m.allocation >= 100 
                    ? "text-rose-600 dark:text-rose-400" 
                    : m.allocation >= 75 
                    ? "text-amber-600 dark:text-amber-400" 
                    : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${
                    m.allocation >= 100 
                      ? "bg-rose-500" 
                      : m.allocation >= 75 
                      ? "bg-amber-500" 
                      : "bg-emerald-500"
                  }`} />
                  <span>{m.allocation >= 100 ? "Fully Allocated" : m.allocation >= 75 ? "Nearing Capacity" : "Available"}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
