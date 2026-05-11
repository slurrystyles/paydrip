import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  BarChart3, 
  AlertCircle,
  Zap,
  ArrowRight,
  LayoutDashboard,
  PieChart
} from 'lucide-react';
import { motion } from 'motion/react';
import { recoveryService } from '../lib/recoveryService';
import { supabase } from '../lib/supabase';
import { formatCurrency, cn } from '../lib/utils';
import RecoveryAnalytics from './RecoveryAnalytics';

export const RecoveryDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const data = await recoveryService.getRecoveryStats(user.id);
          setStats(data);
        } catch (error) {
          console.error('Error loading recovery stats:', error);
        } finally {
          setLoading(false);
        }
      }
    }
    init();
  }, []);

  if (loading) return (
    <div className="p-8 flex justify-center">
       <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const statCards = [
    {
      label: 'Money at Risk',
      value: formatCurrency(stats?.moneyAtRisk || 0),
      icon: <ShieldAlert className="text-red-500" />,
      subtext: `${stats?.overdueCount || 0} Overdue Invoices`,
      color: 'border-red-100 shadow-red-50/50'
    },
    {
      label: 'Recovery Rate',
      value: `${Math.round(stats?.successRate || 0)}%`,
      icon: <TrendingUp className="text-green-500" />,
      subtext: 'Successful collections',
      color: 'border-green-100 shadow-green-50/50'
    },
    {
      label: 'Avg. Delay',
      value: `${Math.round(stats?.avgRecoveryDays || 0)} Days`,
      icon: <Clock className="text-indigo-500" />,
      subtext: 'Days to settle',
      color: 'border-indigo-100 shadow-indigo-50/50'
    },
    {
      label: 'Active Escalations',
      value: stats?.activeEscalations || 0,
      icon: <Zap className="text-orange-500" />,
      subtext: 'Follow-ups in progress',
      color: 'border-orange-100 shadow-orange-50/50'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 italic">Recovery Engine</h1>
          <p className="text-sm font-medium text-slate-500">Intelligent payment recovery & automated escalation.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
           <button 
             onClick={() => setActiveTab('overview')}
             className={cn(
               "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
               activeTab === 'overview' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
             )}
           >
              <LayoutDashboard size={14} /> Overview
           </button>
           <button 
             onClick={() => setActiveTab('analytics')}
             className={cn(
               "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
               activeTab === 'analytics' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
             )}
           >
              <PieChart size={14} /> Analytics
           </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Primary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-white p-6 rounded-3xl border ${card.color} shadow-xl flex flex-col justify-between h-full`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center">
                    {card.icon}
                  </div>
                  <BarChart3 size={16} className="text-slate-200" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{card.label}</p>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{card.value}</h3>
                  <p className="text-[11px] font-bold text-slate-500 mt-2 flex items-center gap-1">
                    {card.subtext}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recovery Pipeline */}
            <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm flex items-center gap-2">
                  <ArrowRight size={18} className="text-indigo-600" /> Recovery Pipeline
                </h3>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Live Monitor</span>
              </div>
              <div className="p-8">
                <div className="space-y-6">
                    {[
                      { stage: 'Gentle Follow-up', count: 12, value: 45000, color: 'bg-green-500' },
                      { stage: 'Firm Follow-up', count: 8, value: 32000, color: 'bg-orange-500' },
                      { stage: 'Final Notice', count: 4, value: 18500, color: 'bg-red-500' },
                      { stage: 'Legal Warning', count: 2, value: 50000, color: 'bg-slate-900' }
                    ].map((item, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                          <span className="text-slate-600 italic">{item.stage}</span>
                          <span className="text-slate-400">{item.count} Invoices · {formatCurrency(item.value)}</span>
                        </div>
                        <div className="h-3 bg-slate-50 rounded-full overflow-hidden flex">
                          <div 
                            className={`h-full ${item.color} rounded-full`} 
                            style={{ width: `${(item.value / (stats?.moneyAtRisk || 150000)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Recently Recovered */}
            <div className="bg-slate-900 rounded-[2.5rem] shadow-xl p-8 text-white flex flex-col justify-between overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                  <CheckCircle2 size={24} className="text-green-400" />
                </div>
                <h3 className="text-2xl font-black italic tracking-tighter mb-2">Revenue Recovered</h3>
                <p className="text-white/60 text-xs font-medium mb-8">Great job! You recovered {formatCurrency(stats?.recoveredRevenue || 0)} this month.</p>
                
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                      <div>
                        <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Last Recovery</p>
                        <p className="text-xs font-bold text-white">#INV-204 Settled</p>
                      </div>
                      <p className="text-sm font-black text-green-400">₹12,450</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                      <div>
                        <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Success Streak</p>
                        <p className="text-xs font-bold text-white">4 Invoices this week</p>
                      </div>
                      <TrendingUp size={16} className="text-white/40" />
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setActiveTab('analytics')}
                className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-colors"
              >
                View Analysis
              </button>
            </div>
          </div>
        </div>
      ) : (
        <RecoveryAnalytics />
      )}
    </div>
  );
};
