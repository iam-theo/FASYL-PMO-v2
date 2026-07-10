import React, { useState, useEffect } from "react";
import { 
  Briefcase, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  PieChart
} from "lucide-react";
import { motion } from "motion/react";
import { api } from "../lib/api";

interface Props {
  projectId?: string;
}

export function FinanceView({ projectId }: Props) {
  const [evmData, setEvmData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (projectId) {
          const data = await api.getProgressEVM(projectId);
          setEvmData(data);
        } else {
            setLoading(false);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load financial data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800">Error Loading Financials</h3>
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  if (!projectId || !evmData) {
    return (
      <div className="p-8 text-center">
        <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800">No Project Selected</h3>
        <p className="text-slate-500">Please select a project to view its financial analysis.</p>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const isUnderBudget = evmData.interpretation?.costStatus === "UNDER_BUDGET";
  const isAheadOfSchedule = evmData.interpretation?.scheduleStatus === "AHEAD_OF_SCHEDULE";

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-indigo-600" />
            Financial Analysis
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Earned Value Management (EVM) for {evmData.projectName}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <Activity className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Health Score</p>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-extrabold ${evmData.healthScore >= 80 ? 'text-emerald-600' : evmData.healthScore >= 50 ? 'text-amber-500' : 'text-rose-600'}`}>
                {evmData.healthScore}
              </span>
              <span className="text-sm text-slate-400">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">BAC</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1">Budget at Completion</p>
            <h3 className="text-2xl font-extrabold text-slate-900">{formatCurrency(evmData.budgetAtCompletion)}</h3>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">EV</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1">Earned Value</p>
            <h3 className="text-2xl font-extrabold text-slate-900">{formatCurrency(evmData.earnedValue)}</h3>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-rose-600" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AC</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1">Actual Cost</p>
            <h3 className="text-2xl font-extrabold text-slate-900">{formatCurrency(evmData.actualCost)}</h3>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-500" />
            Cost & Schedule Variances
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Cost Variance (CV)</p>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider">EV - AC</p>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${isUnderBudget ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {evmData.variances?.costVariance > 0 ? '+' : ''}{formatCurrency(evmData.variances?.costVariance || 0)}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 flex overflow-hidden">
                 <div 
                   className={`h-2.5 rounded-full ${isUnderBudget ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                   style={{ width: `${Math.min(100, Math.max(0, 50 + ((evmData.variances?.costVariance || 0) / evmData.budgetAtCompletion) * 100))}%` }}
                 ></div>
              </div>
              <p className={`text-xs font-medium mt-2 flex items-center gap-1 ${isUnderBudget ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isUnderBudget ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {isUnderBudget ? 'Under Budget' : 'Over Budget'}
              </p>
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Schedule Variance (SV)</p>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider">EV - PV</p>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${isAheadOfSchedule ? 'text-indigo-600' : 'text-amber-500'}`}>
                    {evmData.variances?.scheduleVariance > 0 ? '+' : ''}{formatCurrency(evmData.variances?.scheduleVariance || 0)}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 flex overflow-hidden">
                 <div 
                   className={`h-2.5 rounded-full ${isAheadOfSchedule ? 'bg-indigo-500' : 'bg-amber-500'}`} 
                   style={{ width: `${Math.min(100, Math.max(0, 50 + ((evmData.variances?.scheduleVariance || 0) / evmData.budgetAtCompletion) * 100))}%` }}
                 ></div>
              </div>
              <p className={`text-xs font-medium mt-2 flex items-center gap-1 ${isAheadOfSchedule ? 'text-indigo-600' : 'text-amber-500'}`}>
                {isAheadOfSchedule ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {isAheadOfSchedule ? 'Ahead of Schedule' : 'Behind Schedule'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            Performance Indexes
          </h3>
          <div className="grid grid-cols-2 gap-6 h-full pb-8">
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col justify-center text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">CPI</span>
              <h4 className="text-3xl font-extrabold text-slate-900 mb-1">{evmData.indexes?.CPI}</h4>
              <p className="text-sm text-slate-500 font-medium">Cost Perf. Index</p>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className={`text-xs font-bold ${evmData.indexes?.CPI >= 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {evmData.indexes?.CPI >= 1 ? 'Favorable (>1.0)' : 'Unfavorable (<1.0)'}
                </p>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col justify-center text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">SPI</span>
              <h4 className="text-3xl font-extrabold text-slate-900 mb-1">{evmData.indexes?.SPI}</h4>
              <p className="text-sm text-slate-500 font-medium">Schedule Perf. Index</p>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className={`text-xs font-bold ${evmData.indexes?.SPI >= 1 ? 'text-indigo-600' : 'text-amber-500'}`}>
                  {evmData.indexes?.SPI >= 1 ? 'Favorable (>1.0)' : 'Unfavorable (<1.0)'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
