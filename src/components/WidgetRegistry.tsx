import React from "react";
import { 
  Briefcase, Users, CheckSquare, Clock, AlertTriangle, 
  TrendingUp, Activity, PieChart, BarChart2 
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, LineChart, Line
} from "recharts";

// Mock Widget Components (In a real app, these would fetch their own data or receive it)
const StatWidget = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-[#18181b] border border-zinc-800 p-5 rounded-xl shadow-lg flex items-center space-x-4">
    <div className={`p-3 rounded-lg bg-${color}-500/10 border border-${color}-500/20 text-${color}-400`}>
      <Icon className="h-6 w-6" />
    </div>
    <div>
      <span className="text-xs text-zinc-500 block uppercase tracking-wider font-mono">{title}</span>
      <span className="text-xl font-bold font-mono text-zinc-100">{value}</span>
    </div>
  </div>
);

const ChartWidget = ({ title, type, data }: any) => (
  <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5 shadow-lg">
    <h3 className="font-semibold text-zinc-200 text-sm mb-4 uppercase tracking-wider font-mono">{title}</h3>
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        {type === "BAR" ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
            <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
            <YAxis stroke="#71717a" fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
            <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
            <YAxis stroke="#71717a" fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
            <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  </div>
);

export const WidgetRegistry: Record<string, React.FC<any>> = {
  "PROJECT_COUNT": (props) => <StatWidget title="Total Projects" value="24" icon={Briefcase} color="indigo" {...props} />,
  "ACTIVE_USERS": (props) => <StatWidget title="Active Users" value="1,240" icon={Users} color="emerald" {...props} />,
  "PENDING_TASKS": (props) => <StatWidget title="Pending Tasks" value="84" icon={CheckSquare} color="amber" {...props} />,
  "SYSTEM_HEALTH": (props) => <StatWidget title="System Health" value="99.9%" icon={Activity} color="rose" {...props} />,
  "PORTFOLIO_PERFORMANCE": (props) => (
    <ChartWidget 
      title="Portfolio Performance" 
      type="BAR" 
      data={[
        { name: "Q1", value: 400 },
        { name: "Q2", value: 300 },
        { name: "Q3", value: 600 },
        { name: "Q4", value: 800 },
      ]} 
      {...props} 
    />
  ),
  "REVENUE_TREND": (props) => (
    <ChartWidget 
      title="Revenue Trend" 
      type="LINE" 
      data={[
        { name: "Jan", value: 100 },
        { name: "Feb", value: 200 },
        { name: "Mar", value: 150 },
        { name: "Apr", value: 300 },
        { name: "May", value: 250 },
      ]} 
      {...props} 
    />
  ),
};
