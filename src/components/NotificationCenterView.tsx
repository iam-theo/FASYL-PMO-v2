import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { 
  Bell, 
  Check, 
  Plus,
  CheckCheck, 
  Trash2, 
  Clock, 
  Settings, 
  ExternalLink,
  Search,
  Filter,
  Mail,
  Smartphone,
  Layout,
  ChevronRight,
  Shield,
  Info,
  AlertTriangle,
  X,
  Inbox,
  CheckCircle,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function NotificationCenterView() {
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "preferences" | "admin" | "templates">("all");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showAddSetting, setShowAddSetting] = useState(false);
  const [newSetting, setNewSetting] = useState({ key: "", value: "", category: "GENERAL", isSecret: false });
  const [pendingSettings, setPendingSettings] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, { status: 'success' | 'error' | 'testing', message?: string }>>({});
  const [testRecipient, setTestRecipient] = useState("");

  const handleTestConnection = async (category: string) => {
    setTestResults(prev => ({ ...prev, [category]: { status: 'testing' } }));
    try {
      const categorySettings = settings.filter(s => s.category === category);
      const config: any = {};
      categorySettings.forEach(s => {
        const val = pendingSettings[s.key] !== undefined ? pendingSettings[s.key] : s.value;
        config[s.key] = val;
      });

      let res;
      if (category === "EMAIL") {
        const smtpConfig = {
          host: config.SMTP_HOST,
          port: Number(config.SMTP_PORT),
          secure: config.SMTP_SECURE === "true",
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
          fromName: config.SMTP_FROM_NAME,
          fromEmail: config.SMTP_FROM_EMAIL
        };
        res = await api.testEmailConfig({ config: smtpConfig, recipient: testRecipient || "test@example.com" });
      } else if (category === "SMS") {
        const termiiConfig = {
          apiKey: config.TERMII_API_KEY,
          senderId: config.TERMII_SENDER_ID,
          channel: config.TERMII_CHANNEL
        };
        res = await api.testSmsConfig({ config: termiiConfig, recipient: testRecipient || "2348000000000" });
      }

      setTestResults(prev => ({ 
        ...prev, 
        [category]: { status: 'success', message: 'Connection successful! Test notification sent.' } 
      }));
    } catch (err: any) {
      setTestResults(prev => ({ 
        ...prev, 
        [category]: { status: 'error', message: err.message || 'Connection failed' } 
      }));
    }
  };

  const handleUpdateSetting = async (key: string, value: string, category: string, isSecret: boolean) => {
    try {
      const updatedSetting = await api.updateNotificationSetting({ key, value, category, isSecret });
      
      setSettings(prev => {
        const exists = prev.some(s => s.key === key);
        if (exists) {
          return prev.map(s => s.key === key ? { ...s, ...updatedSetting } : s);
        } else {
          return [...prev, updatedSetting];
        }
      });

      setPendingSettings(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err) {
      console.error("Failed to update setting:", err);
    }
  };

  const handleUpdateTemplate = async (data: any) => {
    try {
      await api.updateNotificationTemplate(data.code, data);
      setTemplates(prev => prev.map(t => t.code === data.code ? { ...t, ...data } : t));
      setEditingTemplate(null);
    } catch (err) {
      console.error("Failed to update template:", err);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await api.getOwnProfile();
        if (profile && profile.effectivePermissions) {
          setPermissions(profile.effectivePermissions);
        }
      } catch (err) {
        console.error("Failed to fetch security profile:", err);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const hasPermission = (perm: string) => permissions.includes(perm) || permissions.includes("*");
  const canManageNotifications = hasPermission("admin.notifications");

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === "all" || activeTab === "unread") {
        const res = await api.getNotifications();
        if (res) {
          setNotifications(res.notifications || []);
          setUnreadCount(res.unreadCount || 0);
        }
      } else if (activeTab === "preferences") {
        const res = await api.getNotificationPreferences();
        setPreferences(res || []);
      } else if (activeTab === "admin" && canManageNotifications) {
        const settingsRes = await api.getNotificationSettings();
        const logsRes = await api.getNotificationLogs();
        setSettings(settingsRes || []);
        setLogs(logsRes || []);
      } else if (activeTab === "templates" && canManageNotifications) {
        const res = await api.getNotificationTemplates();
        setTemplates(res || []);
      }
    } catch (err) {
      console.error("Failed to fetch notification data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleUpdatePreference = async (pref: any, channel: string, value: boolean) => {
    try {
      const updated = {
        eventCode: pref.eventCode,
        emailEnabled: channel === "email" ? value : pref.emailEnabled,
        smsEnabled: channel === "sms" ? value : pref.smsEnabled,
        inAppEnabled: channel === "inApp" ? value : pref.inAppEnabled,
      };
      await api.updateNotificationPreference(updated);
      setPreferences(prev => prev.map(p => p.eventCode === pref.eventCode ? { ...p, ...updated } : p));
    } catch (err) {
      console.error("Failed to update preference:", err);
    }
  };

  const getIcon = (type: string) => {
    if (type.includes("TASK")) return <CheckSquare className="h-4 w-4 text-blue-500" />;
    if (type.includes("PROJECT")) return <Briefcase className="h-4 w-4 text-indigo-500" />;
    if (type.includes("USER")) return <Users className="h-4 w-4 text-green-500" />;
    if (type.includes("SECURITY")) return <Shield className="h-4 w-4 text-red-500" />;
    return <Info className="h-4 w-4 text-slate-400" />;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950 font-sans">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-30">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-slate-900 dark:bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-slate-200 dark:shadow-indigo-900/20">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">Notification Hub</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 opacity-70">Enterprise Management System</p>
            </div>
          </div>
        </div>

        <div className="flex items-center bg-slate-100/80 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700">
          <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")} icon={<Inbox className="h-3.5 w-3.5" />} label="Inbox" />
          <TabButton active={activeTab === "preferences"} onClick={() => setActiveTab("preferences")} icon={<Settings className="h-3.5 w-3.5" />} label="Preferences" />
          {canManageNotifications && (
            <TabButton active={activeTab === "admin"} onClick={() => setActiveTab("admin")} icon={<Shield className="h-3.5 w-3.5" />} label="Administration" />
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
        <div className="max-w-7xl mx-auto">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Syncing Notifications...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === "all" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center">
                      Recent Activity
                      {unreadCount > 0 && (
                        <span className="ml-2 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount} New</span>
                      )}
                    </h2>
                    <button 
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider flex items-center"
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Mark all as read
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
                      <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700">
                        <Bell className="h-6 w-6 text-slate-300" />
                      </div>
                      <p className="text-slate-500 text-xs">No notifications yet. You're all caught up!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((n) => (
                        <div 
                          key={n.id}
                          className={`group relative bg-white dark:bg-slate-900 border ${n.isRead ? "border-slate-100 dark:border-slate-800" : "border-indigo-100 dark:border-indigo-900 shadow-sm"} rounded-xl p-4 transition-all hover:border-indigo-200 dark:hover:border-indigo-800`}
                        >
                          {!n.isRead && <div className="absolute top-4 left-1 w-1 h-8 bg-indigo-600 rounded-full" />}
                          <div className="flex items-start space-x-4">
                            <div className={`mt-1 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${n.isRead ? "bg-slate-100 dark:bg-slate-800 text-slate-400" : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600"}`}>
                              {getIcon(n.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h3 className={`text-xs font-bold truncate ${n.isRead ? "text-slate-600 dark:text-slate-400" : "text-slate-800 dark:text-slate-100"}`}>{n.title}</h3>
                                <div className="flex items-center space-x-2">
                                  <span className="text-[10px] text-slate-400 flex items-center">
                                    <Clock className="h-2.5 w-2.5 mr-1" />
                                    {new Date(n.createdAt).toLocaleString()}
                                  </span>
                                  {!n.isRead && (
                                    <button 
                                      onClick={() => handleMarkAsRead(n.id)}
                                      className="h-6 w-6 rounded-md bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                      title="Mark as read"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                {n.message}
                              </p>
                              {n.actionUrl && (
                                <div className="mt-3">
                                  <a 
                                    href={n.actionUrl}
                                    className="inline-flex items-center text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
                                  >
                                    View details
                                    <ChevronRight className="h-3 w-3 ml-0.5" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "preferences" && (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-4"
                >
                   <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Delivery Channels</h2>
                      <span className="text-[10px] text-slate-400 font-mono uppercase">User-Defined Rules</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {preferences.map((pref) => (
                        <div key={pref.eventCode} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <div>
                            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">{pref.eventCode}</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-medium tracking-tight">System Trigger Event</p>
                          </div>
                          <div className="flex items-center space-x-6">
                            <ChannelToggle 
                              icon={<Layout className="h-3.5 w-3.5" />} 
                              label="In-App" 
                              enabled={pref.inAppEnabled} 
                              onChange={(val) => handleUpdatePreference(pref, "inApp", val)} 
                            />
                            <ChannelToggle 
                              icon={<Mail className="h-3.5 w-3.5" />} 
                              label="Email" 
                              enabled={pref.emailEnabled} 
                              onChange={(val) => handleUpdatePreference(pref, "email", val)} 
                            />
                            <ChannelToggle 
                              icon={<Smartphone className="h-3.5 w-3.5" />} 
                              label="SMS" 
                              enabled={pref.smsEnabled} 
                              onChange={(val) => handleUpdatePreference(pref, "sms", val)} 
                            />
                          </div>
                        </div>
                      ))}
                      {preferences.length === 0 && (
                        <div className="p-12 text-center">
                          <p className="text-slate-400 text-xs italic">No preferences found. Defaults will be used.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "templates" && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-4"
                >
                  {templates.map((template) => (
                    <div key={template.code} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="h-7 w-7 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            {getIcon(template.code)}
                          </div>
                          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">{template.name}</h3>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded">{template.code}</span>
                      </div>
                      <div className="p-4 space-y-4">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email Subject</p>
                          <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                            {template.subject}
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">SMS Body</p>
                          <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 font-mono italic">
                            {template.smsBody || "Not defined"}
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <button 
                          onClick={() => setEditingTemplate(template)}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider flex items-center"
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Edit Template
                        </button>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === "admin" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">System Configuration</h2>
                      <p className="text-xs text-slate-500 font-medium">Manage gateway credentials and system parameters</p>
                    </div>
                    <button 
                      onClick={() => setShowAddSetting(true)}
                      className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center uppercase tracking-wider"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Property
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                    {/* Email Block */}
                    <SettingsBlock 
                      title="Email Delivery" 
                      icon={<Mail className="h-4 w-4" />}
                      category="EMAIL"
                      settings={settings.filter(s => s.category === "EMAIL")}
                      pendingSettings={pendingSettings}
                      setPendingSettings={setPendingSettings}
                      onSave={handleUpdateSetting}
                      onTest={() => handleTestConnection("EMAIL")}
                      testResult={testResults["EMAIL"]}
                      testRecipient={testRecipient}
                      setTestRecipient={setTestRecipient}
                    />

                    {/* SMS Block */}
                    <SettingsBlock 
                      title="SMS Gateway" 
                      icon={<Smartphone className="h-4 w-4" />}
                      category="SMS"
                      settings={settings.filter(s => s.category === "SMS")}
                      pendingSettings={pendingSettings}
                      setPendingSettings={setPendingSettings}
                      onSave={handleUpdateSetting}
                      onTest={() => handleTestConnection("SMS")}
                      testResult={testResults["SMS"]}
                      testRecipient={testRecipient}
                      setTestRecipient={setTestRecipient}
                    />

                    {/* Workflow Block */}
                    <SettingsBlock 
                      title="Workflow Logic" 
                      icon={<Clock className="h-4 w-4" />}
                      category="WORKFLOW"
                      settings={settings.filter(s => s.category === "WORKFLOW")}
                      pendingSettings={pendingSettings}
                      setPendingSettings={setPendingSettings}
                      onSave={handleUpdateSetting}
                    />

                    {/* General Block */}
                    <SettingsBlock 
                      title="General Config" 
                      icon={<Shield className="h-4 w-4" />}
                      category="GENERAL"
                      settings={settings.filter(s => !["EMAIL", "SMS", "WORKFLOW"].includes(s.category))}
                      pendingSettings={pendingSettings}
                      setPendingSettings={setPendingSettings}
                      onSave={handleUpdateSetting}
                    />
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                          <Layout className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Global Messaging Templates</h3>
                          <p className="text-[10px] text-slate-500">System-wide content definitions</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {templates.map(template => (
                        <TemplateCard key={template.code} template={template} onEdit={() => setEditingTemplate(template)} />
                      ))}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm h-full flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 flex items-center justify-center">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delivery Activity Stream</h3>
                          <p className="text-[10px] text-slate-500">Live outbound tracking</p>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 uppercase font-bold text-[10px] tracking-widest border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-4">Channel</th>
                            <th className="px-6 py-4">Recipient</th>
                            <th className="px-6 py-4">Subject/Title</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {logs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.channel === "EMAIL" ? "bg-blue-50 text-blue-600" : 
                                  log.channel === "SMS" ? "bg-amber-50 text-amber-600" : 
                                  "bg-indigo-50 text-indigo-600"
                                }`}>
                                  {log.channel}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 font-medium truncate max-w-[150px]">
                                {log.recipientContact || log.recipientId}
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-700 dark:text-slate-200 truncate max-w-[250px]">{log.title}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.status === "SENT" ? "bg-green-50 text-green-600" : 
                                  log.status === "FAILED" ? "bg-red-50 text-red-600" : 
                                  "bg-slate-100 text-slate-500"
                                }`}>
                                  {log.status === "SENT" ? <Check className="h-2.5 w-2.5 mr-1" /> : <AlertTriangle className="h-2.5 w-2.5 mr-1" />}
                                  {log.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-[10px] text-slate-400 font-mono">
                                {new Date(log.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddSetting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Add New Configuration Property</h3>
              <button onClick={() => setShowAddSetting(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Property Key (Unique)</label>
                <input 
                  type="text" 
                  value={newSetting.key}
                  onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="e.g. CUSTOM_TIMEOUT"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Category</label>
                <select 
                  value={newSetting.category}
                  onChange={(e) => setNewSetting({ ...newSetting, category: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="GENERAL">General</option>
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="WORKFLOW">Workflow</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Initial Value</label>
                <textarea 
                  value={newSetting.value}
                  onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[80px]"
                  placeholder="Enter value..."
                />
              </div>
              <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <input 
                  type="checkbox" 
                  id="isSecret"
                  checked={newSetting.isSecret}
                  onChange={(e) => setNewSetting({ ...newSetting, isSecret: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isSecret" className="text-xs text-slate-600 dark:text-slate-400 font-medium">Mark as Sensitive (Masked in UI)</label>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
              <button 
                onClick={() => setShowAddSetting(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!newSetting.key) return;
                  await handleUpdateSetting(newSetting.key, newSetting.value, newSetting.category, newSetting.isSecret);
                  setShowAddSetting(false);
                  setNewSetting({ key: "", value: "", category: "GENERAL", isSecret: false });
                }}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
              >
                Create Property
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {editingTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Edit Template: {editingTemplate.name}</h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{editingTemplate.code}</p>
                  </div>
                </div>
                <button onClick={() => setEditingTemplate(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Email Subject</label>
                  <input 
                    type="text" 
                    defaultValue={editingTemplate.subject}
                    id="edit-subject"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Email Content (HTML)</label>
                  <textarea 
                    rows={4}
                    defaultValue={editingTemplate.content}
                    id="edit-content"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">SMS/In-App Body</label>
                  <textarea 
                    rows={2}
                    defaultValue={editingTemplate.smsBody}
                    id="edit-sms"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Global Channel Support</label>
                  <div className="grid grid-cols-3 gap-3">
                    <ChannelToggle 
                      enabled={editingTemplate.emailEnabled} 
                      onChange={(val) => setEditingTemplate({...editingTemplate, emailEnabled: val})} 
                      icon={<Mail className="h-3.5 w-3.5" />} 
                      label="Email" 
                    />
                    <ChannelToggle 
                      enabled={editingTemplate.smsEnabled} 
                      onChange={(val) => setEditingTemplate({...editingTemplate, smsEnabled: val})} 
                      icon={<Smartphone className="h-3.5 w-3.5" />} 
                      label="SMS" 
                    />
                    <ChannelToggle 
                      enabled={editingTemplate.inAppEnabled} 
                      onChange={(val) => setEditingTemplate({...editingTemplate, inAppEnabled: val})} 
                      icon={<Bell className="h-3.5 w-3.5" />} 
                      label="In-App" 
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="text-[10px] text-slate-400 italic">Variables: {'{taskName}, {dueDate}, {projectName}'}</p>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setEditingTemplate(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      const subject = (document.getElementById("edit-subject") as HTMLInputElement).value;
                      const bodyHtml = (document.getElementById("edit-content") as HTMLTextAreaElement).value;
                      const smsBody = (document.getElementById("edit-sms") as HTMLTextAreaElement).value;
                      handleUpdateTemplate({ ...editingTemplate, subject, bodyHtml, smsBody });
                    }}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all uppercase tracking-wider"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChannelToggle({ enabled, onChange, icon, label }: { enabled: boolean, onChange: (val: boolean) => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={() => onChange(!enabled)}
      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
        enabled 
          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shadow-sm' 
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60 hover:opacity-100'
      }`}
    >
      <div className="flex items-center space-x-2">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
      </div>
      <div className={`h-4 w-4 rounded-full flex items-center justify-center border ${
        enabled ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-transparent border-slate-300'
      }`}>
        {enabled && <Check className="h-2.5 w-2.5" />}
      </div>
    </button>
  );
}

function SettingsBlock({ 
  title, 
  icon, 
  settings, 
  pendingSettings, 
  setPendingSettings, 
  onSave, 
  onTest, 
  testResult,
  testRecipient,
  setTestRecipient
}: any) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
            {icon}
          </div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h2>
        </div>
        <Shield className="h-4 w-4 text-slate-400" />
      </div>
      <div className="p-4 flex-1 space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {settings.map((setting: any) => {
            const isPending = pendingSettings[setting.key] !== undefined;
            const currentValue = isPending ? pendingSettings[setting.key] : setting.value;
            const hasChanged = isPending && pendingSettings[setting.key] !== setting.value;

            return (
              <div key={setting.key}>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">{setting.key}</label>
                <div className="flex items-center space-x-2">
                  <input 
                    type={setting.isSecret ? "password" : "text"} 
                    value={setting.isSecret && !isPending ? "********" : currentValue}
                    onChange={(e) => {
                      setPendingSettings((prev: any) => ({ ...prev, [setting.key]: e.target.value }));
                    }}
                    onFocus={() => {
                      if (setting.isSecret && !isPending) {
                        setPendingSettings((prev: any) => ({ ...prev, [setting.key]: "" }));
                      }
                    }}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                    placeholder={setting.isSecret ? "Enter secret..." : "Enter value..."}
                  />
                  {hasChanged ? (
                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={() => onSave(setting.key, pendingSettings[setting.key], setting.category, setting.isSecret)}
                        className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700 transition-colors shadow-sm"
                        title="Save change"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => {
                          setPendingSettings((prev: any) => {
                            const next = { ...prev };
                            delete next[setting.key];
                            return next;
                          });
                        }}
                        className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                        title="Discard change"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-300">
                      <Settings className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {onTest && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center space-x-2">
            <input 
              type="text" 
              placeholder="Test Recipient (Email/Phone)"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-[10px] text-slate-600 dark:text-slate-300 focus:outline-none"
            />
            <button 
              onClick={onTest}
              disabled={testResult?.status === 'testing'}
              className="px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-[10px] font-bold rounded-lg hover:bg-slate-700 transition-all disabled:opacity-50 flex items-center"
            >
              {testResult?.status === 'testing' ? (
                <div className="h-3 w-3 border-2 border-white/20 border-t-white rounded-full animate-spin mr-1.5" />
              ) : (
                <ExternalLink className="h-3 w-3 mr-1.5" />
              )}
              Test Connection
            </button>
          </div>

          {testResult && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-2 rounded-lg text-[10px] font-medium flex items-center space-x-2 ${
                testResult.status === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 
                testResult.status === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 
                'bg-blue-50 text-blue-700 border border-blue-100'
              }`}
            >
              {testResult.status === 'success' ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              <span>{testResult.message || (testResult.status === 'testing' ? 'Testing connection...' : '')}</span>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
        active 
          ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-600" 
          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatusItem({ label, status }: { label: string, status: string }) {
  return (
    <div className="flex items-center justify-between p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
      <span className="text-[10px] font-medium">{label}</span>
      <div className="flex items-center space-x-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
        <span className="text-[10px] font-bold uppercase tracking-wider">{status}</span>
      </div>
    </div>
  );
}

function TemplateCard({ template, onEdit }: { template: any, onEdit: () => void }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group p-4 flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600">
             <Activity className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{template.name}</h4>
            <p className="text-[10px] text-slate-400 font-mono">{template.code}</p>
          </div>
        </div>
        <button 
          onClick={onEdit}
          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 space-y-2">
        <div className="text-[10px] text-slate-500 line-clamp-2 italic">
          <span className="font-bold uppercase text-[9px] mr-1 opacity-70">Subject:</span>
          {template.subject}
        </div>
      </div>
      <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <ChannelIndicator active={template.emailEnabled} icon={<Mail className="h-2.5 w-2.5" />} />
        <ChannelIndicator active={template.smsEnabled} icon={<Smartphone className="h-2.5 w-2.5" />} />
        <ChannelIndicator active={template.inAppEnabled} icon={<Bell className="h-2.5 w-2.5" />} />
      </div>
    </div>
  );
}

function ChannelIndicator({ active, icon }: { active: boolean, icon: React.ReactNode }) {
  return (
    <div className={`p-1.5 rounded-md flex items-center justify-center ${
      active ? 'bg-green-50 text-green-600 dark:bg-green-900/20' : 'bg-slate-50 text-slate-300 dark:bg-slate-800/50'
    }`}>
      {icon}
    </div>
  );
}

// Missing icons for the seeder/types mapping
function CheckSquare(props: any) { return <Layout {...props} /> }
function Briefcase(props: any) { return <BriefcaseIcon {...props} /> }
function BriefcaseIcon(props: any) { return <Layout {...props} /> }
function Users(props: any) { return <Layout {...props} /> }
