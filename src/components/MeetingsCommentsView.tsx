import React, { useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { Meeting } from "../modules/project-tracker/types.ts";
import { ThreadedComment } from "../modules/project-tracker/modules/deliverables-docs/service.ts";
import { initAuth, getAccessToken } from "../lib/firebase.ts";
import { User } from "firebase/auth";
import { Video, Plus, MessageSquare, Trash2, Calendar, Smile, Reply, ArrowRight, Loader2, Sparkles, ExternalLink } from "lucide-react";

interface Props {
  projectId: string;
}

export function MeetingsCommentsView({ projectId }: Props) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [comments, setComments] = useState<ThreadedComment[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab: "meetings" or "comments"
  const [activeTab, setActiveTab] = useState<"meetings" | "comments">("meetings");

  // Create Meeting States
  const [isAddingMeeting, setIsAddingMeeting] = useState(false);
  const [mTitle, setMTitle] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mSched, setMSched] = useState(new Date().toISOString().substring(0, 16));
  const [mDuration, setMDuration] = useState(30);

  // Google Sync States
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [syncWithGoogle, setSyncWithGoogle] = useState(false);
  const [schedulingOnGoogle, setSchedulingOnGoogle] = useState(false);

  // Comments Input state
  const [commentText, setCommentText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mList, cList] = await Promise.all([
        api.getMeetings(projectId),
        api.getComments("PROJECT", projectId)
      ]);
      setMeetings(mList);
      setComments(cList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Keep auth state in sync
    const unsubscribe = initAuth(
      (currentUser) => setGoogleUser(currentUser),
      () => setGoogleUser(null)
    );
    return () => unsubscribe();
  }, [projectId]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mTitle) return;

    let googleMeetLink = "";
    let googleEventId = "";

    try {
      if (syncWithGoogle) {
        setSchedulingOnGoogle(true);
        const activeToken = await getAccessToken();
        if (!activeToken) {
          throw new Error("Your Google Workspace session is expired or not connected. Please connect your Google account in the 'Realtime Google Calendar' tab first!");
        }

        const startTime = new Date(mSched);
        const endTime = new Date(startTime.getTime() + mDuration * 60000);

        const eventBody = {
          summary: mTitle,
          description: `${mDesc}\n\n[Created via Apollo Execution Briefings for Project ${projectId}]`,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          },
          conferenceData: {
            createRequest: {
              requestId: `apollo-meet-brf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              conferenceSolutionKey: {
                type: "hangoutsMeet",
              },
            },
          },
        };

        const res = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${activeToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(eventBody),
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to create Google Calendar event: ${res.statusText}`);
        }

        const createdEvent = await res.json();
        
        if (createdEvent.conferenceData?.entryPoints) {
          const videoEp = createdEvent.conferenceData.entryPoints.find(
            (ep: any) => ep.entryPointType === "video"
          );
          if (videoEp) {
            googleMeetLink = videoEp.uri;
          }
        }
        googleEventId = createdEvent.id;
      }

      await api.createMeeting({
        projectId,
        title: mTitle,
        description: mDesc,
        scheduledAt: mSched,
        durationMinutes: mDuration,
        agenda: ["Review project execution dashboard updates", "Assess risk probability ratings", "Approve timesheets"],
        googleMeetLink: googleMeetLink || undefined,
        googleEventId: googleEventId || undefined
      });

      setIsAddingMeeting(false);
      setMTitle("");
      setMDesc("");
      setSyncWithGoogle(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSchedulingOnGoogle(false);
    }
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText) return;

    try {
      await api.createComment({
        projectId,
        entityType: "PROJECT",
        entityId: projectId,
        content: commentText,
        parentId: replyToId,
        authorId: "usr-alex"
      });
      setCommentText("");
      setReplyToId(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReaction = async (commentId: string, char: string) => {
    try {
      await api.addReaction(commentId, char, "usr-alex");
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm("Remove this comment?")) return;
    try {
      await api.deleteComment(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Highlights user mentions like @Alex Rivera or @Sophia in bold
  const highlightMentions = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, idx) => 
      part.startsWith("@") 
        ? <strong key={idx} className="text-indigo-400 font-semibold bg-indigo-500/10 border border-indigo-500/10 px-1 py-0.2 rounded font-sans">{part}</strong> 
        : part
    );
  };

  // Recursive threaded comment renderer helper function
  const renderCommentNode = (node: any, depth = 0) => {
    return (
      <div 
        key={node.id}
        className="border-l border-zinc-800 pl-4 py-3 space-y-2 last:border-0"
        style={{ marginLeft: `${depth > 0 ? 12 : 0}px` }}
      >
        <div className="flex justify-between items-center text-[10px] text-zinc-500">
          <div>
            <strong className="text-zinc-200 font-semibold text-xs font-sans">{node.authorName}</strong>
            <span className="font-mono ml-2">
              {new Date(node.createdAt).toLocaleDateString()} at {new Date(node.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex space-x-1">
            <button onClick={() => setReplyToId(node.id)} className="text-zinc-500 hover:text-indigo-400 p-1 rounded transition">
              <Reply className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => handleDeleteComment(node.id)} className="text-zinc-650 hover:text-rose-400 p-1 rounded transition">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <p className="text-zinc-300 leading-relaxed text-[11px] font-sans">
          {highlightMentions(node.content)}
        </p>

        {/* Reaction Buttons */}
        <div className="flex items-center space-x-2">
          {["👍", "❤️", "🚀", "👀"].map(emoji => {
            const count = node.reactions && node.reactions[emoji] ? node.reactions[emoji].length : 0;
            const hasReacted = node.reactions && node.reactions[emoji]?.includes("usr-alex");
            return (
              <button
                key={emoji}
                onClick={() => handleReaction(node.id, emoji)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-full border text-[9px] transition ${
                  hasReacted 
                    ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" 
                    : "bg-[#09090b] border-zinc-800 text-zinc-500 hover:bg-zinc-800/40"
                }`}
              >
                <span>{emoji}</span>
                {count > 0 && <span className="font-mono font-bold">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Nested replies */}
        {node.replies && node.replies.length > 0 && (
          <div className="space-y-1 border-t border-zinc-850/40 mt-2 pt-2">
            {node.replies.map(reply => renderCommentNode(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-zinc-300">
      
      {/* Sub tab selectors */}
      <div className="flex justify-between items-center bg-[#18181b] border border-zinc-800 p-4 rounded-xl shadow-lg shadow-black/10">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab("meetings")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "meetings" ? "bg-zinc-800 text-indigo-400 border border-zinc-700 font-semibold" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
            }`}
          >
            Team Briefings schedule ({meetings.length})
          </button>
          <button
            onClick={() => setActiveTab("comments")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "comments" ? "bg-zinc-800 text-indigo-400 border border-zinc-700 font-semibold" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
            }`}
          >
            Threaded Collaboration Channel ({comments.length})
          </button>
        </div>

        {activeTab === "meetings" && (
          <button
            onClick={() => setIsAddingMeeting(!isAddingMeeting)}
            className="flex items-center space-x-1.5 bg-indigo-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/10"
          >
            <Video className="h-4 w-4" />
            <span>Schedule Briefing</span>
          </button>
        )}
      </div>

      {/* ACTIVE SCREEN RENDERS */}
      {activeTab === "meetings" ? (
        <div className="space-y-6">
          {isAddingMeeting && (
            <form onSubmit={handleCreateMeeting} className="bg-[#09090b] border border-zinc-800 p-5 rounded-xl space-y-4 shadow-lg shadow-black/10">
              <h3 className="font-semibold text-zinc-100">Schedule Briefing Session</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-500 mb-1">Meeting Title</label>
                  <input type="text" value={mTitle} onChange={e => setMTitle(e.target.value)} required className="w-full bg-[#18181b] border border-zinc-800 rounded p-2 focus:outline-none focus:border-indigo-500 text-zinc-100" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-500 mb-1">Duration (Minutes)</label>
                    <input type="number" value={mDuration} onChange={e => setMDuration(Number(e.target.value))} required className="w-full bg-[#18181b] border border-zinc-800 rounded p-2 focus:outline-none focus:border-indigo-500 text-zinc-100" />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">Schedule date/time</label>
                    <input type="datetime-local" value={mSched} onChange={e => setMSched(e.target.value)} required className="w-full bg-[#18181b] border border-zinc-800 rounded p-2 focus:outline-none focus:border-indigo-500 text-zinc-100" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Session Scope / Objectives</label>
                <input type="text" value={mDesc} onChange={e => setMDesc(e.target.value)} className="w-full bg-[#18181b] border border-zinc-800 rounded p-2 focus:outline-none focus:border-indigo-500 text-zinc-100" />
              </div>
              <div className="flex flex-col gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="syncGoogle"
                    checked={syncWithGoogle}
                    onChange={(e) => setSyncWithGoogle(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                  />
                  <label htmlFor="syncGoogle" className="text-zinc-200 font-medium select-none cursor-pointer text-[10px]">
                    Sync with Google Calendar and Create a Google Meet Video Room
                  </label>
                </div>
                {syncWithGoogle && !googleUser && (
                  <p className="text-amber-500 text-[9px] font-mono leading-relaxed pl-5">
                    ⚠️ You are not signed into Google. Please authenticate in the <strong>Realtime Google Calendar</strong> tab first to enable live sync and auto-creation of Meet rooms.
                  </p>
                )}
                {syncWithGoogle && googleUser && (
                  <p className="text-indigo-400 text-[9px] font-mono leading-relaxed pl-5">
                    ✨ Signed in as <strong className="font-semibold text-zinc-300">{googleUser.email}</strong>. This session will be added to your real-time calendar with virtual Google Meet hardware.
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setIsAddingMeeting(false)} className="px-3.5 py-1.5 border border-zinc-750 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded transition" disabled={schedulingOnGoogle}>Cancel</button>
                <button type="submit" className="px-3.5 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition flex items-center space-x-1.5" disabled={schedulingOnGoogle}>
                  {schedulingOnGoogle && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{schedulingOnGoogle ? "Synchronizing with Google..." : "Save Briefing"}</span>
                </button>
              </div>
            </form>
          )}

          {/* Meetings display list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meetings.map(m => (
              <div key={m.id} className="bg-[#18181b] border border-zinc-800 rounded-xl p-5 shadow-lg shadow-black/10 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-zinc-100 text-xs block leading-snug">{m.title}</span>
                  {m.googleMeetLink ? (
                    <span className="bg-indigo-500/10 text-indigo-400 font-mono text-[9px] font-semibold border border-indigo-500/20 px-1.5 py-0.5 rounded flex items-center space-x-1 shrink-0">
                      <Video className="h-3 w-3" />
                      <span>Google Meet Ready</span>
                    </span>
                  ) : (
                    <span className="bg-zinc-805 text-zinc-500 font-mono text-[9px] px-1.5 py-0.5 rounded shrink-0">
                      Local Offline Room
                    </span>
                  )}
                </div>
                <p className="text-zinc-500 text-[10px]">{m.description || "Project execution synchronisation review session."}</p>

                {/* Agenda */}
                <div className="bg-[#09090b] border border-zinc-850 p-3 rounded-lg space-y-1.5">
                  <span className="font-semibold text-zinc-300 block text-[10px]">Briefing Agenda Priorities</span>
                  <ul className="space-y-1 pl-2.5 list-disc text-zinc-500 text-[9px]">
                    {m.agenda.map((a, aIdx) => (
                      <li key={aIdx}>{a}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap justify-between items-center text-[10px] pt-3 border-t border-zinc-850/60 font-mono text-zinc-500 gap-2">
                  <div className="space-y-0.5">
                    <div>Start: {m.scheduledAt.substring(0, 16).replace("T", " ")}</div>
                    <div>Duration: {m.durationMinutes} Minutes</div>
                  </div>
                  {m.googleMeetLink && (
                    <a
                      href={m.googleMeetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white px-2.5 py-1.5 rounded-lg transition text-[9px] font-bold"
                    >
                      <span>Join Room</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-6 shadow-lg shadow-black/10 space-y-6">
          <h3 className="font-semibold text-zinc-100 text-xs flex items-center space-x-1.5">
            <MessageSquare className="h-4 w-4 text-indigo-400" />
            <span>Project Synchronous Collaboration Stream</span>
          </h3>

          {/* Comment Thread listing container */}
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 divide-y divide-zinc-850/60">
            {comments.map(c => renderCommentNode(c, 0))}
            {comments.length === 0 && (
              <p className="text-center italic text-zinc-500 py-6">No discussion points started on this project yet.</p>
            )}
          </div>

          {/* Reply alert badge */}
          {replyToId && (
            <div className="bg-zinc-900 border border-zinc-800 text-zinc-400 p-2 rounded-lg flex justify-between items-center text-[10px]">
              <span className="flex items-center space-x-1">
                <Reply className="h-3.5 w-3.5 text-indigo-400" />
                <span>You are replying to a specific comment thread node.</span>
              </span>
              <button onClick={() => setReplyToId(null)} className="font-semibold hover:underline text-zinc-500">
                Cancel Reply
              </button>
            </div>
          )}

          {/* Comment input form */}
          <form onSubmit={handleCreateComment} className="flex space-x-2 border-t border-zinc-850/60 pt-4">
            <input
              type="text"
              placeholder={replyToId ? "Write your threaded reply... (use @Alex Rivera to mention team)" : "Start a conversation thread... (use @Alex Rivera to mention team)"}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              required
              className="flex-1 bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-zinc-150 font-sans"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition flex items-center space-x-1"
            >
              <span>Send</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
