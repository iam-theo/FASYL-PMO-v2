import React, { useState, useEffect, useRef } from "react";
import { Sparkles, X, Send, Bot, User, CheckCircle2, Calendar, Video, Loader2, LogOut } from "lucide-react";
import { api } from "../lib/api.ts";
import { initAuth, googleSignIn, logout, getAccessToken } from "../lib/firebase.ts";
import { User as FirebaseUser } from "firebase/auth";
import { useTheme } from "../contexts/ThemeContext";

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  actions?: any[];
  timestamp: Date;
}

interface AICopilotProps {
  projectId: string;
  onActionExecuted?: () => void;
}

export function AICopilot({ projectId, onActionExecuted }: AICopilotProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "agent",
      text: "Hello! I am the FASYL Execution Agent, your intelligent co-pilot. I can help you manage tasks, schedule team briefings, set milestones, and sync them with Google Calendar & Google Meet. Try asking me: 'Give me a summary of current project status' or 'Schedule a Meet briefing for tomorrow at 10 AM regarding finance review'.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Auth States
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen to Firebase Auth state on mount
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleGoogleConnect = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        setMessages((prev) => [
          ...prev,
          {
            id: `google-${Date.now()}`,
            sender: "agent",
            text: `Successfully connected Google Account: **${res.user.displayName}**. Google Calendar and Meet integrations are now ready and active!`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err: any) {
      console.error("Google login failed:", err);
      alert("Authentication failed: " + err.message);
    }
  };

  const handleGoogleDisconnect = async () => {
    const confirmed = window.confirm("Are you sure you want to disconnect your Google Account?");
    if (!confirmed) return;
    try {
      await logout();
      setGoogleUser(null);
      setGoogleToken(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `google-logout-${Date.now()}`,
          sender: "agent",
          text: "Google Account has been disconnected successfully.",
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error("Google sign out error:", err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsgText = input.trim();
    setInput("");
    setLoading(true);

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: userMsgText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      // Map prior messages into Gemini structure if needed
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: m.sender === "user" ? "user" : "model",
          parts: [{ text: m.text }],
        }));

      // Call our server-side API Route
      const response = await api.chatWithAgent({
        message: userMsgText,
        projectId,
        googleAccessToken: googleToken || undefined,
        history,
      });

      const agentMsg: Message = {
        id: `agent-msg-${Date.now()}`,
        sender: "agent",
        text: response.text,
        actions: response.executedActions,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, agentMsg]);

      // If any action was executed, refresh components
      if (response.executedActions && response.executedActions.length > 0) {
        if (onActionExecuted) {
          onActionExecuted();
        }
        // Also fire global event
        window.dispatchEvent(new CustomEvent("project-data-changed"));
      }
    } catch (err: any) {
      console.error("Agent interaction failure:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "agent",
          text: "My apologies. I encountered a pipeline error processing your request. Please ensure the Gemini key is configured correctly.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-full shadow-2xl flex items-center space-x-2 transition-all duration-300 hover:scale-105 active:scale-95 border border-indigo-500/30 group"
      >
        <Sparkles className="h-5 w-5 animate-pulse text-yellow-300 group-hover:rotate-12 transition-transform" />
        <span className="text-xs font-semibold tracking-wide pr-1">FASYL AI</span>
      </button>

      {/* Slide-out Chat Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white dark:bg-[#0c0c0e] border-l border-slate-200 dark:border-zinc-800 z-50 shadow-2xl flex flex-col transition-all duration-300 transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-950/40">
          <div className="flex items-center space-x-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center">
              <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center space-x-1.5">
                <span>FASYL AI</span>
                <span className="text-[9px] font-mono bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 px-1 py-0.2 rounded border border-yellow-500/20">
                  AI Agent
                </span>
              </h3>
              <p className="text-[9px] text-slate-500 dark:text-zinc-500 font-mono">Quick Smart Assistance</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Google Connection Header Panel */}
        <div className="p-3 border-b border-slate-200 dark:border-zinc-850 bg-slate-50 dark:bg-zinc-900/20 text-[11px] space-y-2">
          {googleUser ? (
            <div className="flex items-center justify-between bg-white dark:bg-zinc-900/40 border border-emerald-500/20 p-2.5 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <div className="leading-tight">
                  <p className="font-semibold text-slate-900 dark:text-zinc-200 truncate max-w-[180px]">{googleUser.displayName}</p>
                  <p className="text-[9px] text-slate-500 dark:text-zinc-500">Google Calendar & Meet Active</p>
                </div>
              </div>
              <button
                onClick={handleGoogleDisconnect}
                title="Disconnect Google Account"
                className="text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded transition"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800/60 p-3 rounded-lg space-y-2 text-center">
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-normal">
                Authorize Google Calendar & Google Meet to schedule briefings directly through your AI co-pilot.
              </p>
              
              {/* Official Google GSI Button */}
              <button
                onClick={handleGoogleConnect}
                className="w-full flex items-center justify-center bg-white hover:bg-slate-50 text-slate-900 font-semibold text-[11px] py-1.5 px-3 rounded border border-slate-300 transition-colors cursor-pointer shadow-sm"
              >
                <div className="mr-2 h-4 w-4">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-full w-full">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                </div>
                <span>Sign in with Google</span>
              </button>
            </div>
          )}
        </div>

        {/* Message Panel Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className="flex items-start space-x-2 max-w-[85%]">
                {m.sender === "agent" && (
                  <div className="h-6 w-6 rounded bg-indigo-50 border border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-xl border text-[11px] leading-relaxed font-sans ${
                    m.sender === "user"
                      ? "bg-indigo-600 text-white border-indigo-500"
                      : "bg-slate-100 dark:bg-[#141417] text-slate-800 dark:text-zinc-300 border-slate-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="whitespace-pre-line">
                    {/* Render basic bold/italics markers beautifully */}
                    {m.text.split("\n").map((line, lIdx) => {
                      let formatted = line;
                      // Replace markdown bold tags **text** with standard jsx strong tags
                      const boldRegex = /\*\*(.*?)\*\*/g;
                      const parts = [];
                      let lastIndex = 0;
                      let match;
                      while ((match = boldRegex.exec(line)) !== null) {
                        parts.push(line.substring(lastIndex, match.index));
                        parts.push(<strong key={match.index} className="font-semibold text-slate-900 dark:text-zinc-100">{match[1]}</strong>);
                        lastIndex = boldRegex.lastIndex;
                      }
                      parts.push(line.substring(lastIndex));
                      return (
                        <p key={lIdx} className={lIdx > 0 ? "mt-1.5" : ""}>
                          {parts.length > 1 ? parts : formatted}
                        </p>
                      );
                    })}
                  </div>

                  {/* Render Visual executed action outcomes */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-2">
                      {m.actions.map((act, aIdx) => (
                        <div
                          key={aIdx}
                          className="bg-white dark:bg-zinc-950/40 border border-indigo-200 dark:border-indigo-500/15 p-2 rounded-lg flex items-start space-x-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <div className="leading-snug">
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold block uppercase tracking-wider font-mono">
                              Executed Action
                            </span>
                            <span className="text-[10px] text-slate-800 dark:text-zinc-300 font-medium block">
                              {act.description}
                            </span>
                            {act.data?.meetLink && (
                              <div className="mt-1.5 flex space-x-1.5">
                                <a
                                  href={act.data.meetLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/40 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 font-semibold text-[9px] px-2 py-0.5 rounded flex items-center space-x-1 transition"
                                >
                                  <Video className="h-2.5 w-2.5" />
                                  <span>Join Google Meet</span>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {m.sender === "user" && (
                  <div className="h-6 w-6 rounded bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-slate-600 dark:text-zinc-300" />
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2 max-w-[85%]">
                <div className="h-6 w-6 rounded bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="bg-slate-100 dark:bg-[#141417] text-slate-700 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 p-3 rounded-xl text-[11px] flex items-center space-x-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <span>Thinking & acting...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form Footer */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e]">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Ask co-pilot / execute actions..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-zinc-200"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-500 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
