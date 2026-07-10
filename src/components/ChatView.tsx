import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { api } from "../lib/api.ts";
import { ChatMessage } from "../modules/project-tracker/types.ts";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { auth } from "../lib/firebase.ts";

interface Props {
  projectId: string;
}

export function ChatView({ projectId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Fetch initial history
    async function loadHistory() {
      try {
        setIsLoading(true);
        const history = await api.getChatMessages(projectId);
        setMessages(history);
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();

    // 2. Setup Socket
    // In this environment, we connect to the root URL
    socketRef.current = io();
    socketRef.current.emit("join-project", projectId);

    socketRef.current.on("receive-chat-message", (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [projectId]);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socketRef.current) return;

    const currentUser = auth.currentUser;
    const messageData = {
      projectId,
      authorId: currentUser?.uid || "guest-id",
      authorName: currentUser?.displayName || currentUser?.email || "Anonymous Guest",
      content: inputText.trim(),
    };

    socketRef.current.emit("send-chat-message", messageData);
    setInputText("");
  };

  return (
    <div className="flex flex-col h-[600px] bg-[#09090b] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 bg-[#18181b]/50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100 text-sm">Project Sync Chat</h3>
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold">Real-time collaboration</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
           <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
           <span className="text-[10px] font-mono text-zinc-500">Live</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide"
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2 opacity-50">
             <MessageSquare className="h-12 w-12 stroke-1" />
             <p className="text-sm italic text-center">No messages yet in this project channel.<br/>Start the conversation!</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = auth.currentUser?.uid === m.authorId;
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1.5`}>
                  <div className="flex items-center space-x-2 px-1">
                    {!isMe && <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{m.authorName}</span>}
                    <span className="text-[9px] text-zinc-600 font-mono">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe 
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-900/20' 
                      : 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700'
                  }`}>
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-800 bg-[#18181b]/30">
        <div className="relative group">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your sync update..."
            className="w-full bg-[#09090b] border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-zinc-200 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-600"
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="absolute right-2 top-1.5 bottom-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed group-focus-within:shadow-lg group-focus-within:shadow-indigo-600/20"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-[9px] text-center text-zinc-600 uppercase font-bold tracking-widest">
           Secure End-to-End Enterprise Tunnel Active
        </p>
      </form>
    </div>
  );
}
