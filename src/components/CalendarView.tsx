import React, { useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { Task, Milestone, Meeting } from "../modules/project-tracker/types.ts";
import { Calendar, ChevronLeft, ChevronRight, Video, Target, ClipboardList } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface Props {
  projectId: string;
}

export function CalendarView({ projectId }: Props) {
  const { theme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  // Month select parameters
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // Default July 2026

  const loadAll = async () => {
    try {
      setLoading(true);
      const [tList, mList, mtList] = await Promise.all([
        api.getTasks(projectId),
        api.getMilestones(projectId),
        api.getMeetings(projectId)
      ]);
      setTasks(tList);
      setMilestones(mList);
      setMeetings(mtList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [projectId]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Helper arrays for calendar generation
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday=0, Monday=1 etc.

  const daysArray: number[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(0); // empty slot padding
  }
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push(i);
  }

  // Find occurrences on a specific date formatted as YYYY-MM-DD
  const getEventsForDate = (day: number) => {
    if (day === 0) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const list: { type: "task" | "milestone" | "meeting"; title: string; color: string }[] = [];

    tasks.forEach(t => {
      if (t.dueDate === dateStr) {
        list.push({ type: "task", title: `Due: ${t.title}`, color: "bg-slate-700 text-slate-100 dark:bg-zinc-700 dark:text-zinc-100" });
      } else if (t.startDate === dateStr) {
        list.push({ type: "task", title: `Start: ${t.title}`, color: "bg-slate-800 border border-slate-700 text-slate-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300" });
      }
    });

    milestones.forEach(m => {
      if (m.targetDate === dateStr) {
        list.push({ type: "milestone", title: `Milestone: ${m.title}`, color: "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/20" });
      }
    });

    meetings.forEach(mt => {
      if (mt.scheduledAt.substring(0, 10) === dateStr) {
        list.push({ type: "meeting", title: `Meeting: ${mt.title}`, color: "bg-indigo-600 text-zinc-100" });
      }
    });

    return list;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700 dark:border-zinc-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-slate-600 dark:text-zinc-300">
      <div className="bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm">
        
        {/* Navigation Selector Row */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Project Team Calendar</span>
            </h2>
            <p className="text-slate-500 dark:text-zinc-500 text-[10px] mt-0.5">Track cross-project releases, schedules, and client sprints.</p>
          </div>

          <div className="flex items-center space-x-4">
            <span className="font-semibold text-slate-900 dark:text-zinc-200 font-mono text-sm">{monthNames[month]} {year}</span>
            <div className="flex space-x-1">
              <button onClick={handlePrevMonth} className="p-1 border border-slate-200 dark:border-zinc-750 bg-slate-50 dark:bg-zinc-850 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-indigo-600 dark:hover:text-indigo-400 rounded text-slate-600 dark:text-zinc-300 transition">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={handleNextMonth} className="p-1 border border-slate-200 dark:border-zinc-750 bg-slate-50 dark:bg-zinc-850 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-indigo-600 dark:hover:text-indigo-400 rounded text-slate-600 dark:text-zinc-300 transition">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex space-x-6 text-[10px] font-mono border-b border-slate-100 dark:border-zinc-850/60 pb-3 mb-6">
          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-zinc-400">
            <span className="h-2 w-2 rounded bg-slate-400 dark:bg-zinc-700 inline-block" />
            <span>Task Deliverables</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-zinc-400">
            <span className="h-2 w-2 rounded bg-amber-500/80 inline-block" />
            <span>Project Milestones</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-zinc-400">
            <span className="h-2 w-2 rounded bg-indigo-600 inline-block" />
            <span>Team Briefings</span>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div className="grid grid-cols-7 gap-1 border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-800">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="bg-slate-50 dark:bg-zinc-900/50 text-center py-2 font-semibold text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800">
              {day}
            </div>
          ))}

          {daysArray.map((day, idx) => {
            const evs = getEventsForDate(day);
            const isEmpty = day === 0;

            return (
              <div
                key={idx}
                className={`min-h-[90px] p-2 bg-white dark:bg-[#18181b] flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-zinc-800/10 transition-colors duration-150 ${
                  isEmpty ? "bg-slate-50/50 dark:bg-zinc-950/40" : ""
                }`}
              >
                {!isEmpty ? (
                  <>
                    <span className="font-mono text-slate-500 dark:text-zinc-400 block text-right font-semibold">{day}</span>
                    <div className="space-y-1 mt-1.5 flex-1 overflow-y-auto max-h-[60px]">
                      {evs.map((e, eIdx) => (
                        <div
                          key={eIdx}
                          className={`px-1 py-0.5 rounded text-[8px] truncate leading-tight font-sans ${e.color}`}
                          title={e.title}
                        >
                          {e.title}
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
