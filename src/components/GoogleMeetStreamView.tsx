import React, { useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { Meeting } from "../modules/project-tracker/types.ts";
import { initAuth, getAccessToken } from "../lib/firebase.ts";
import { User } from "firebase/auth";
import { 
  Video, 
  ExternalLink, 
  Play, 
  Settings, 
  Users, 
  Mic, 
  MicOff, 
  VideoOff, 
  FileText, 
  CheckSquare, 
  Plus, 
  Save, 
  Send, 
  HelpCircle, 
  Loader2, 
  Sparkles, 
  Radio,
  CheckCircle2,
  Lock,
  ArrowRight
} from "lucide-react";

interface Props {
  projectId: string;
}

export function GoogleMeetStreamView({ projectId }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [customMeetUrl, setCustomMeetUrl] = useState("");

  // New Action Item Input
  const [actionText, setActionText] = useState("");
  const [actionAssignee, setActionAssignee] = useState("");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Simulation Controls
  const [activeSpeaker, setActiveSpeaker] = useState("Alex Rivera");
  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);
  const [isSimulatingStream, setIsSimulatingStream] = useState(false);

  // Comments for Meeting
  const [meetingComments, setMeetingComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const activeMeeting = meetings.find(m => m.id === selectedMeetingId);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mList, teamList] = await Promise.all([
        api.getMeetings(projectId),
        api.getTeam(projectId)
      ]);
      setMeetings(mList || []);
      setTeamMembers(teamList || []);
      
      if (mList && mList.length > 0) {
        // Find meeting that has a googleMeetLink first
        const hasMeet = mList.find(m => m.googleMeetLink);
        const selected = hasMeet || mList[0];
        setSelectedMeetingId(selected.id);
        setNotes(selected.minutes || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = initAuth(
      (currentUser) => setUser(currentUser),
      () => setUser(null)
    );
    return () => unsubscribe();
  }, [projectId]);

  useEffect(() => {
    if (teamMembers && teamMembers.length > 0) {
      setActiveSpeaker(teamMembers[0].name);
    } else {
      setActiveSpeaker("Project Host");
    }
  }, [teamMembers]);

  useEffect(() => {
    if (activeMeeting) {
      setNotes(activeMeeting.minutes || "");
      loadComments(activeMeeting.id);
    } else {
      setMeetingComments([]);
    }
  }, [selectedMeetingId, meetings]);

  const loadComments = async (meetingId: string) => {
    try {
      const cms = await api.getComments("MEETING", meetingId);
      setMeetingComments(cms || []);
    } catch (err) {
      console.error("Failed to load meeting comments:", err);
    }
  };

  // Save Notes to Backend
  const handleSaveNotes = async () => {
    if (!selectedMeetingId) return;
    try {
      setSavingNotes(true);
      await api.updateMeeting(selectedMeetingId, { minutes: notes });
      
      // Update local state
      setMeetings(prev => prev.map(m => m.id === selectedMeetingId ? { ...m, minutes: notes } : m));
      alert("Meeting minutes & notes updated successfully.");
    } catch (err: any) {
      alert("Failed to save minutes: " + err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  // Add Action Item to Briefing
  const handleAddActionItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionText || !selectedMeetingId || !activeMeeting) return;

    try {
      const updatedActionItems = [
        ...(activeMeeting.actionItems || []),
        { text: actionText, assigneeId: actionAssignee || null, isCompleted: false }
      ];

      await api.updateMeeting(selectedMeetingId, { actionItems: updatedActionItems });
      
      // Update local state
      setMeetings(prev => prev.map(m => m.id === selectedMeetingId ? { ...m, actionItems: updatedActionItems } : m));
      setActionText("");
      setActionAssignee("");
    } catch (err: any) {
      alert("Failed to add action item: " + err.message);
    }
  };

  // Toggle Action Item Checkbox
  const handleToggleActionItem = async (idx: number) => {
    if (!selectedMeetingId || !activeMeeting) return;

    try {
      const updatedActionItems = (activeMeeting.actionItems || []).map((item, i) => 
        i === idx ? { ...item, isCompleted: !item.isCompleted } : item
      );

      await api.updateMeeting(selectedMeetingId, { actionItems: updatedActionItems });

      // Update local state
      setMeetings(prev => prev.map(m => m.id === selectedMeetingId ? { ...m, actionItems: updatedActionItems } : m));
    } catch (err: any) {
      alert("Failed to update action item status: " + err.message);
    }
  };

  // Create Chat/Comment on active meeting
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText || !selectedMeetingId) return;

    try {
      setPostingComment(true);
      await api.createComment({
        projectId,
        entityType: "MEETING",
        entityId: selectedMeetingId,
        content: newCommentText,
        parentId: null,
        authorId: "usr-alex" // Default mock teammate identity
      });
      setNewCommentText("");
      loadComments(selectedMeetingId);
    } catch (err: any) {
      alert("Failed to post comment: " + err.message);
    } finally {
      setPostingComment(false);
    }
  };

  // Find URL to Stream
  const getMeetUrl = () => {
    if (customMeetUrl) return customMeetUrl;
    if (activeMeeting?.googleMeetLink) return activeMeeting.googleMeetLink;
    return "";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
        <span className="text-zinc-500 text-xs font-mono">Connecting conference systems...</span>
      </div>
    );
  }

  const meetUrl = getMeetUrl();

  return (
    <div className="space-y-6 text-xs text-zinc-300">
      
      {/* Selection row */}
      <div className="bg-[#18181b] border border-zinc-800 p-4 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Radio className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-100 text-xs">Live Google Meet Integration</h3>
            <p className="text-zinc-500 text-[10px]">Select scheduled briefings or stream active custom Google Meet rooms.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {meetings.length > 0 ? (
            <select
              value={selectedMeetingId}
              onChange={(e) => setSelectedMeetingId(e.target.value)}
              className="bg-[#09090b] border border-zinc-800 text-zinc-200 rounded-lg p-2 font-semibold text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {meetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} {m.googleMeetLink ? " (Google Meet Ready)" : ""}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-zinc-500 italic text-[10px]">No active meetings found.</span>
          )}

          <input
            type="text"
            placeholder="Or enter custom Google Meet URL..."
            value={customMeetUrl}
            onChange={(e) => setCustomMeetUrl(e.target.value)}
            className="bg-[#09090b] border border-zinc-800 text-zinc-300 rounded-lg p-2 font-mono text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Column - Video Streaming Engine */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Main Video Frame Viewport */}
          <div className="relative bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden aspect-video shadow-2xl flex flex-col justify-between p-4 group">
            
            {/* Stream Frame or Simulated Virtual Space */}
            {meetUrl && !isSimulatingStream ? (
              <iframe
                src={meetUrl.replace("meet.google.com", "meet.google.com")}
                allow="camera; microphone; display-capture; autoplay; encrypted-media; picture-in-picture"
                className="absolute inset-0 w-full h-full border-0 z-0 bg-zinc-950"
                title="Google Meet Live Embed"
              />
            ) : null}

            {/* Simulated Live Broadcast Deck */}
            {(!meetUrl || isSimulatingStream) && (
              <div className="absolute inset-0 bg-[#0c0c0e] flex flex-col justify-between p-5 z-10 font-sans">
                
                {/* Active Speaker Title Card */}
                <div className="flex justify-between items-center z-10">
                  <span className="bg-red-500/10 text-red-500 text-[9px] font-mono font-semibold border border-red-500/20 px-2 py-0.5 rounded flex items-center space-x-1">
                    <Radio className="h-3 w-3 animate-pulse" />
                    <span>LIVE BROADCAST</span>
                  </span>
                  
                  <span className="text-zinc-500 font-mono text-[9px] bg-zinc-900/60 px-2 py-1 rounded">
                    Room: {activeMeeting?.googleMeetLink ? activeMeeting.googleMeetLink.split("/").pop() : "Virtual Space"}
                  </span>
                </div>

                {/* Virtual Avatar Centerpiece */}
                <div className="flex flex-col items-center justify-center space-y-4 py-8">
                  <div className="relative">
                    <div className="absolute -inset-4 rounded-full bg-indigo-500/20 animate-ping opacity-60" />
                    <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 border-2 border-zinc-800 shadow-xl flex items-center justify-center font-bold text-lg text-white">
                      {activeSpeaker.charAt(0)}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-zinc-200 font-bold text-xs tracking-wide">{activeSpeaker}</p>
                    <p className="text-zinc-500 text-[10px] font-mono mt-0.5">Teammate speaking...</p>
                  </div>

                  {/* Audio Waveform simulation bars */}
                  <div className="flex items-center space-x-1 pt-2 h-6">
                    {[1, 2, 3, 4, 5, 4, 3, 2, 4, 6, 8, 5, 3, 1, 3, 4, 6, 4, 2, 1].map((val, idx) => (
                      <span 
                        key={idx} 
                        style={{ height: `${micActive ? Math.sin(Date.now() / 200 + idx) * 10 + 12 : 2}px` }}
                        className={`w-[2.5px] rounded-full transition-all duration-150 ${micActive ? "bg-indigo-500" : "bg-zinc-700"}`} 
                      />
                    ))}
                  </div>
                </div>

                {/* Simulated Bottom HUD controls */}
                <div className="flex items-center justify-between border-t border-zinc-900/60 pt-3 z-10">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setMicActive(!micActive)}
                      className={`p-2 rounded-lg border transition ${micActive ? "bg-[#18181b] border-zinc-800 hover:bg-zinc-800 text-zinc-300" : "bg-red-500/10 border-red-500/20 text-red-400"}`}
                    >
                      {micActive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    </button>
                    <button 
                      onClick={() => setVideoActive(!videoActive)}
                      className={`p-2 rounded-lg border transition ${videoActive ? "bg-[#18181b] border-zinc-800 hover:bg-zinc-800 text-zinc-300" : "bg-red-500/10 border-red-500/20 text-red-400"}`}
                    >
                      {videoActive ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="text-[10px] font-mono text-zinc-500 flex items-center space-x-1">
                    <Users className="h-3.5 w-3.5 text-zinc-600 mr-1" />
                    <span>Teammates assignees active (6)</span>
                  </div>
                </div>

              </div>
            )}

            {/* Security Notice / Action Row - Always visible on Hover or as Overlay */}
            {meetUrl && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent p-4 z-20 flex justify-between items-center opacity-90 transition-opacity">
                <div className="flex items-center space-x-2">
                  <Lock className="h-3.5 w-3.5 text-indigo-400" />
                  <p className="text-[10px] text-zinc-400 font-sans">
                    Secure Sandbox: Access Meet directly or simulate virtual stream.
                  </p>
                </div>
                <div className="flex space-x-1.5">
                  <button
                    onClick={() => setIsSimulatingStream(!isSimulatingStream)}
                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-indigo-400 px-2.5 py-1.5 rounded text-[10px] font-semibold transition"
                  >
                    {isSimulatingStream ? "Show Frame Embed" : "Show Simulator Mode"}
                  </button>
                  <a
                    href={meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded text-[10px] font-bold flex items-center space-x-1 transition"
                  >
                    <span>Launch Meet in New Tab</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Empty state notice if there is no meet link */}
            {!meetUrl && (
              <div className="absolute inset-0 bg-[#0c0c0e] flex flex-col items-center justify-center p-8 z-30 space-y-4">
                <div className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-500/15 text-rose-400 flex items-center justify-center">
                  <VideoOff className="h-6 w-6" />
                </div>
                <div className="text-center max-w-sm">
                  <p className="font-bold text-zinc-200">No Google Meet Active</p>
                  <p className="text-zinc-500 text-[10px] font-sans mt-1">
                    The selected project briefing does not have an attached Google Meet conference URL. Use the Quick Creator in the Google Calendar tab to schedule one, or paste a custom meet link.
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Quick Help Tip */}
          <div className="bg-[#18181b] border border-zinc-800 p-4 rounded-xl flex items-start space-x-2.5 text-[10px] leading-relaxed text-zinc-500">
            <HelpCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-zinc-400">Google Meet Frame Embed Policies</p>
              <p>Google Workspace security policy dictates that some company domains or browser settings reject standard iframe requests from outer containers to protect cameras and microphones. If your stream shows a blank, click **Launch Meet in New Tab** to connect instantly while logging deliverables here!</p>
            </div>
          </div>

        </div>

        {/* Right Columns - Meeting Minutes, Action Items & Chat */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Meeting Agenda Card */}
          {activeMeeting && (
            <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
              <h4 className="font-bold text-zinc-100 text-xs flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span>Synchronized Agenda Details</span>
              </h4>
              <div>
                <p className="font-semibold text-zinc-200">{activeMeeting.title}</p>
                <p className="text-zinc-500 mt-1 leading-normal text-[10px]">{activeMeeting.description || "Project sync sync session."}</p>
              </div>
              <div className="bg-[#09090b] p-3 rounded-lg border border-zinc-850 space-y-1.5">
                <span className="text-[9px] font-bold text-zinc-400 block font-mono">AGENDA SCOPE</span>
                <ul className="list-disc pl-3 text-zinc-500 space-y-1 text-[9px]">
                  {activeMeeting.agenda?.map((a, idx) => (
                    <li key={idx}>{a}</li>
                  ))}
                  {(!activeMeeting.agenda || activeMeeting.agenda.length === 0) && (
                    <li>Synchronize sprint scope, track deliverables, log defects and risk matrix.</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Real-time Notes / Minutes */}
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3.5">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-zinc-100 text-xs flex items-center space-x-2">
                <FileText className="h-4 w-4 text-indigo-400" />
                <span>Interactive Session Minutes</span>
              </h4>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes || !selectedMeetingId}
                className="flex items-center space-x-1 bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white px-2 py-1 rounded-lg font-semibold transition text-[10px] disabled:opacity-40"
              >
                {savingNotes ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                <span>Save Minutes</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={notes}
              disabled={!selectedMeetingId}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record decision parameters, notes, details, and client approvals in real-time here..."
              className="w-full bg-[#09090b] border border-zinc-800 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 text-zinc-200 text-xs font-sans placeholder-zinc-650"
            />
          </div>

          {/* Action Items Panel */}
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
            <h4 className="font-bold text-zinc-100 text-xs flex items-center space-x-2">
              <CheckSquare className="h-4 w-4 text-indigo-400" />
              <span>Real-time Action Deliverables</span>
            </h4>

            {/* List Action Items */}
            {activeMeeting ? (
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {(activeMeeting.actionItems || []).map((item, idx) => {
                  const assignee = teamMembers.find(t => t.id === item.assigneeId);
                  
                  return (
                    <div 
                      key={idx} 
                      onClick={() => handleToggleActionItem(idx)}
                      className={`flex items-center justify-between p-2 rounded-lg border transition cursor-pointer select-none ${
                        item.isCompleted 
                          ? "bg-emerald-500/5 border-emerald-500/10 text-zinc-550 line-through" 
                          : "bg-[#09090b] border-zinc-850 text-zinc-300 hover:border-zinc-750"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <CheckCircle2 className={`h-4 w-4 shrink-0 ${item.isCompleted ? "text-emerald-400" : "text-zinc-600"}`} />
                        <span className="truncate text-xs font-sans font-medium">{item.text}</span>
                      </div>
                      {assignee && (
                        <span className="shrink-0 text-[8px] font-mono font-semibold text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                          {assignee.name.split(" ")[0]}
                        </span>
                      )}
                    </div>
                  );
                })}

                {(!activeMeeting.actionItems || activeMeeting.actionItems.length === 0) && (
                  <p className="text-center italic text-zinc-550 py-3 text-[10px]">No deliverables added to this session yet.</p>
                )}
              </div>
            ) : (
              <p className="text-center text-zinc-500 italic py-2">Select a briefing to manage actions.</p>
            )}

            {/* Quick Add Action Form */}
            {activeMeeting && (
              <form onSubmit={handleAddActionItem} className="flex gap-1.5 border-t border-zinc-850/60 pt-3">
                <input
                  type="text"
                  required
                  placeholder="New action item text..."
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                  className="flex-1 bg-[#09090b] border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-150 focus:outline-none"
                />
                
                <select
                  value={actionAssignee}
                  onChange={(e) => setActionAssignee(e.target.value)}
                  className="bg-[#09090b] border border-zinc-800 rounded text-zinc-450 p-1 text-[10px] font-medium max-w-[100px]"
                >
                  <option value="">Assignee</option>
                  {teamMembers.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </form>
            )}

          </div>

          {/* Meeting Chat Comments Feed */}
          {activeMeeting && (
            <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
              <h4 className="font-bold text-zinc-100 text-xs flex items-center space-x-2">
                <Users className="h-4 w-4 text-indigo-400" />
                <span>Briefing Interactive Chat Feed</span>
              </h4>

              {/* Comments list */}
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                {meetingComments.map((cm) => (
                  <div key={cm.id} className="bg-[#09090b] border border-zinc-850/50 rounded-lg p-2.5 space-y-1">
                    <div className="flex justify-between text-[8px] font-mono text-zinc-500">
                      <strong className="text-zinc-300 font-semibold">{cm.authorName}</strong>
                      <span>{new Date(cm.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-zinc-400 font-sans leading-normal text-[10px]">{cm.content}</p>
                  </div>
                ))}

                {meetingComments.length === 0 && (
                  <p className="text-center italic text-zinc-550 py-3 text-[10px]">No chat postings. Post a synchronization update below!</p>
                )}
              </div>

              {/* Comment submission form */}
              <form onSubmit={handlePostComment} className="flex space-x-1.5 border-t border-zinc-850/60 pt-3">
                <input
                  type="text"
                  placeholder="Send live session briefing message..."
                  required
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 bg-[#09090b] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:border-indigo-500 text-zinc-200"
                />
                <button
                  type="submit"
                  disabled={postingComment}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
