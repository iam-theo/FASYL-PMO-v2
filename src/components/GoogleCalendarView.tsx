import React, { useEffect, useState } from "react";
import { initAuth, googleSignIn, logout, getAccessToken } from "../lib/firebase.ts";
import { User } from "firebase/auth";
import { Calendar, RefreshCw, LogOut, Video, Plus, Clock, Search, HelpCircle, ExternalLink, MapPin, Loader2, Sparkles, AlertCircle } from "lucide-react";

interface Props {
  projectId: string;
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  hangoutLink?: string;
  location?: string;
  status?: string;
}

export function GoogleCalendarView({ projectId }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Create event states
  const [isScheduling, setIsScheduling] = useState(false);
  const [schedTitle, setSchedTitle] = useState("");
  const [schedDesc, setSchedDesc] = useState("");
  const [schedStart, setSchedStart] = useState(new Date().toISOString().substring(0, 16));
  const [schedDuration, setSchedDuration] = useState(30);
  const [schedCreating, setSchedCreating] = useState(false);
  const [schedSuccess, setSchedSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        setLoadingAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setLoadingAuth(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setError(null);
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      setError("Failed to authenticate with Google: " + err.message);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to disconnect from Google Workspace?")) {
      await logout();
      setUser(null);
      setToken(null);
      setEvents([]);
    }
  };

  const fetchCalendarEvents = async () => {
    const activeToken = token || (await getAccessToken());
    if (!activeToken) {
      setError("Access token is unavailable. Please re-authenticate.");
      return;
    }

    try {
      setLoadingEvents(true);
      setError(null);
      
      // Fetch upcoming 30 events starting from today
      const timeMin = new Date().toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?orderBy=startTime&singleEvents=true&timeMin=${timeMin}&maxResults=30`;
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Token expired or invalid
          setError("Your session has expired. Please sign in with Google again.");
          setUser(null);
          setToken(null);
          return;
        }
        throw new Error(`Failed to fetch events from Google Calendar: ${res.statusText}`);
      }

      const data = await res.json();
      setEvents(data.items || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while fetching your calendar.");
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCalendarEvents();
    }
  }, [token]);

  const handleScheduleEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedTitle) return;

    const activeToken = token || (await getAccessToken());
    if (!activeToken) {
      setError("Access token unavailable. Please authenticate first.");
      return;
    }

    try {
      setSchedCreating(true);
      setError(null);

      const startTime = new Date(schedStart);
      const endTime = new Date(startTime.getTime() + schedDuration * 60000);

      const eventBody = {
        summary: schedTitle,
        description: `${schedDesc}\n\n[Created via Apollo Execution Tracker Module for Project ${projectId}]`,
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
            requestId: `apollo-meet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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
        throw new Error(`Failed to schedule event on Google Calendar: ${res.statusText}`);
      }

      const createdEvent = await res.json();
      
      // Also register this meeting in the local backend database so it appears in Briefings
      let googleMeetLink = "";
      if (createdEvent.conferenceData?.entryPoints) {
        const videoEp = createdEvent.conferenceData.entryPoints.find(
          (ep: any) => ep.entryPointType === "video"
        );
        if (videoEp) {
          googleMeetLink = videoEp.uri;
        }
      }

      // Import to backend
      await fetch("/api/project-tracker/meetings-resources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "SimulatedUser" // Matches standard client request auth headers
        },
        body: JSON.stringify({
          projectId,
          title: schedTitle,
          description: schedDesc || "Project sync briefing session",
          scheduledAt: startTime.toISOString(),
          durationMinutes: schedDuration,
          agenda: ["Review Google Calendar import", "Align on cross-sprint task items"],
          googleMeetLink: googleMeetLink || undefined,
          googleEventId: createdEvent.id || undefined
        }),
      });

      setSchedSuccess(true);
      setSchedTitle("");
      setSchedDesc("");
      setIsScheduling(false);
      
      // Refresh list
      fetchCalendarEvents();

      // Clear success banner after 4 seconds
      setTimeout(() => setSchedSuccess(false), 4000);
    } catch (err: any) {
      console.error(err);
      setError("Scheduling failed: " + err.message);
    } finally {
      setSchedCreating(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    const summary = e.summary || "";
    const description = e.description || "";
    const lower = searchTerm.toLowerCase();
    return summary.toLowerCase().includes(lower) || description.toLowerCase().includes(lower);
  });

  if (loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
        <span className="text-zinc-500 text-xs font-mono">Verifying credentials...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 bg-[#18181b] border border-zinc-800 p-8 rounded-xl shadow-xl shadow-black/20 text-center space-y-6">
        <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
          <Calendar className="h-6 w-6" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-zinc-100 font-sans tracking-tight">Connect Google Calendar</h2>
          <p className="text-zinc-500 text-xs leading-relaxed font-sans">
            Sync your real-time Google Calendar events directly into Apollo Execution. Create instant Google Meet links when scheduling new project briefings.
          </p>
        </div>

        <div className="p-3 bg-indigo-950/20 rounded-lg border border-indigo-500/15 text-left flex items-start space-x-2.5">
          <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-zinc-400 leading-normal font-mono">
            <strong>Security Guarantee:</strong> Authentication is handled securely through Google Workspace OAuth. Your personal credentials are never stored.
          </p>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-lg text-rose-400 text-[10px] font-mono flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleLogin}
          className="gsi-material-button w-full cursor-pointer hover:opacity-95 transition active:scale-[0.98]"
        >
          <div className="gsi-material-button-state"></div>
          <div className="gsi-material-button-content-wrapper flex items-center justify-center space-x-3 bg-white text-zinc-900 font-semibold text-xs py-2.5 px-4 rounded-lg">
            <div className="gsi-material-button-icon h-4 w-4">
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
            </div>
            <span className="gsi-material-button-contents">Sign in with Google</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-zinc-300">
      
      {/* Top action/info bar */}
      <div className="bg-[#18181b] border border-zinc-800 p-5 rounded-xl shadow-lg shadow-black/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName || ""} referrerPolicy="no-referrer" className="h-10 w-10 rounded-full border border-zinc-700 shadow" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
              {user.displayName?.charAt(0) || "G"}
            </div>
          )}
          <div>
            <h2 className="text-sm font-bold text-zinc-100 font-sans flex items-center space-x-1.5">
              <span>Google Calendar Hub</span>
              <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-mono font-semibold border border-emerald-500/20 px-1.5 py-0.2 rounded">
                Connected
              </span>
            </h2>
            <p className="text-zinc-500 text-[10px] mt-0.5">Signed in as <strong className="text-zinc-400 font-semibold">{user.email}</strong></p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScheduling(!isScheduling)}
            className="flex items-center space-x-1.5 bg-indigo-600 text-white px-3.5 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/10"
          >
            <Plus className="h-4 w-4" />
            <span>Schedule with Meet Link</span>
          </button>
          
          <button
            onClick={fetchCalendarEvents}
            disabled={loadingEvents}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg transition disabled:opacity-50"
            title="Force refresh events"
          >
            <RefreshCw className={`h-4 w-4 ${loadingEvents ? "animate-spin text-indigo-400" : ""}`} />
          </button>

          <button
            onClick={handleLogout}
            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg transition"
            title="Disconnect Google Account"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {schedSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-sans flex items-start space-x-2.5 animate-fadeIn">
          <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-xs text-zinc-200">Event Scheduled Successfully!</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">The briefing has been synchronized to your Google Calendar, a Google Meet URL has been generated, and it was imported into your project Team Briefings.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-[10px] font-mono flex items-start space-x-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Execution Error</p>
            <p className="text-zinc-400 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Grid layouts for Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Event Streams */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-850/60">
              <h3 className="font-bold text-zinc-100 text-xs flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-indigo-400" />
                <span>Upcoming Calendar Events</span>
              </h3>
              <span className="font-mono text-[10px] text-zinc-500">{filteredEvents.length} active entries</span>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search real-time Google Calendar events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#09090b] border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Events stream list */}
            {loadingEvents ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-2">
                <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
                <span className="text-zinc-500 text-[10px] font-mono">Syncing with Google servers...</span>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 italic">
                {searchTerm ? "No events matching your search term." : "No upcoming events found on your Google Calendar."}
              </div>
            ) : (
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {filteredEvents.map((ev) => {
                  const sTime = ev.start?.dateTime ? new Date(ev.start.dateTime) : ev.start?.date ? new Date(ev.start.date) : null;
                  const eTime = ev.end?.dateTime ? new Date(ev.end.dateTime) : ev.end?.date ? new Date(ev.end.date) : null;
                  
                  return (
                    <div key={ev.id} className="bg-[#09090b] border border-zinc-850 rounded-lg p-4 hover:border-zinc-750 transition-colors space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="font-semibold text-zinc-200 text-xs leading-snug">{ev.summary}</h4>
                          <div className="flex items-center space-x-2.5 mt-1.5 text-zinc-500 font-mono text-[9px]">
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {sTime ? sTime.toLocaleDateString() : ""} 
                                {sTime && ev.start?.dateTime ? ` at ${sTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : " (All day)"}
                              </span>
                            </span>
                            {sTime && eTime && ev.start?.dateTime && (
                              <span>• {Math.round((eTime.getTime() - sTime.getTime()) / 60000)} mins</span>
                            )}
                          </div>
                        </div>

                        {ev.hangoutLink && (
                          <span className="shrink-0 bg-indigo-500/10 text-indigo-400 font-mono text-[9px] font-semibold border border-indigo-500/20 px-2 py-0.5 rounded flex items-center space-x-1.5">
                            <Video className="h-3 w-3" />
                            <span>Meet Ready</span>
                          </span>
                        )}
                      </div>

                      {ev.description && (
                        <p className="text-zinc-400 font-sans text-[10px] leading-relaxed border-t border-zinc-900 pt-2 whitespace-pre-line truncate max-h-[80px]">
                          {ev.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-900 justify-between items-center">
                        <div className="text-[9px] text-zinc-500 font-sans flex items-center space-x-1">
                          {ev.location && (
                            <>
                              <MapPin className="h-3 w-3 text-zinc-600" />
                              <span className="truncate max-w-[150px]">{ev.location}</span>
                            </>
                          )}
                        </div>

                        <div className="flex space-x-1.5">
                          {ev.hangoutLink && (
                            <a
                              href={ev.hangoutLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white px-2 py-1 rounded transition text-[9px] font-semibold"
                            >
                              <span>Launch Meet</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Left column scheduling card */}
        <div className="space-y-4">
          
          {/* Calendar explanation help card */}
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
            <h3 className="font-bold text-zinc-100 text-xs flex items-center space-x-1.5">
              <HelpCircle className="h-4 w-4 text-indigo-400" />
              <span>Realtime Integration Features</span>
            </h3>
            <ul className="space-y-2 text-zinc-500 font-sans text-[10px] list-disc pl-4 leading-relaxed">
              <li><strong>Direct Fetch:</strong> Upcoming entries are retrieved directly from your personal Google Calendar.</li>
              <li><strong>Google Meet Spaces:</strong> The Google Calendar API creates virtual videoconferencing hardware with custom codes automatically.</li>
              <li><strong>Cross-sync:</strong> Any briefing scheduled from this screen is stored in the local team meetings database automatically.</li>
            </ul>
          </div>

          {/* Quick Schedule Form Card */}
          {isScheduling && (
            <form onSubmit={handleScheduleEvent} className="bg-[#18181b] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4 animate-fadeIn">
              <h3 className="font-bold text-zinc-100 text-xs">Quick Event Creator</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-zinc-500 mb-1">Event Title</label>
                  <input
                    type="text"
                    required
                    value={schedTitle}
                    onChange={(e) => setSchedTitle(e.target.value)}
                    placeholder="e.g., Apollo Sprint Sync"
                    className="w-full bg-[#09090b] border border-zinc-800 rounded p-2 focus:outline-none focus:border-indigo-500 text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-zinc-500 mb-1">Scope / Objectives</label>
                  <textarea
                    rows={2}
                    value={schedDesc}
                    onChange={(e) => setSchedDesc(e.target.value)}
                    placeholder="Review sprint tasks and release metrics."
                    className="w-full bg-[#09090b] border border-zinc-800 rounded p-2 focus:outline-none focus:border-indigo-500 text-zinc-100 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-500 mb-1">Start date/time</label>
                    <input
                      type="datetime-local"
                      required
                      value={schedStart}
                      onChange={(e) => setSchedStart(e.target.value)}
                      className="w-full bg-[#09090b] border border-zinc-800 rounded p-2 focus:outline-none focus:border-indigo-500 text-zinc-150 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">Duration (Mins)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={480}
                      value={schedDuration}
                      onChange={(e) => setSchedDuration(Number(e.target.value))}
                      className="w-full bg-[#09090b] border border-zinc-800 rounded p-2 focus:outline-none focus:border-indigo-500 text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsScheduling(false)}
                  className="px-3 py-1.5 border border-zinc-750 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={schedCreating}
                  className="px-3 py-1.5 bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 transition disabled:opacity-50 flex items-center space-x-1"
                >
                  {schedCreating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{schedCreating ? "Creating..." : "Save & Sync"}</span>
                </button>
              </div>
            </form>
          )}

        </div>

      </div>

    </div>
  );
}
