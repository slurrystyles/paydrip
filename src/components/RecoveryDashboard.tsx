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
  PieChart,
  History,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { recoveryService } from '../lib/recoveryService';
import { supabase } from '../lib/supabase';
import { formatCurrency, cn } from '../lib/utils';
import { useOrganization } from '../contexts/OrganizationContext';
import RecoveryAnalytics from './RecoveryAnalytics';

export const RecoveryDashboard: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');
  const [activities, setActivities] = useState<any[]>([]);
  const [highRiskClients, setHighRiskClients] = useState<any[]>([]);

  const fetchStats = async () => {
    if (!currentOrganization) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [statsData, events, riskScores] = await Promise.all([
      recoveryService.getRecoveryStats(currentOrganization.id),
      supabase.from('invoice_events').select('*').eq('organization_id', currentOrganization.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('client_risk_scores').select('*, clients(name)').eq('organization_id', currentOrganization.id).order('score', { ascending: false }).limit(3)
    ]);

    setStats(statsData);
    setActivities(events.data || []);
    setHighRiskClients(riskScores.data || []);
  };

  useEffect(() => {
    fetchStats().then(() => setLoading(false));

    if (!currentOrganization) return;
    const sub = supabase
      .channel(`recovery_updates_${currentOrganization.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `organization_id=eq.${currentOrganization.id}` }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `organization_id=eq.${currentOrganization.id}` }, fetchStats)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'invoice_events', filter: `organization_id=eq.${currentOrganization.id}` }, fetchStats)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [currentOrganization]);

  if (loading) return (
    <div className="p-12 flex flex-col items-center justify-center">
       <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synchronizing Recovery Logs...</p>
    </div>
  );

  const statCards = [
    {
      label: 'Money at Risk',
      value: formatCurrency(stats?.moneyAtRisk || 0),
      icon: <ShieldAlert className="text-red-500" />,
      subtext: `${stats?.overdueCount || 0} Overdue Nodes`,
      color: 'border-red-100 shadow-red-50/50'
    },
    {
      label: 'Recovery Rate',
      value: `${Math.round(stats?.successRate || 0)}%`,
      icon: <TrendingUp className="text-green-500" />,
      subtext: '+4% from last month',
      color: 'border-green-100 shadow-green-50/50'
    },
    {
      label: 'Collection Velocity',
      value: `${Math.round(stats?.avgRecoveryDays || 0)} Days`,
      icon: <Clock className="text-indigo-500" />,
      subtext: 'Mean time to settle',
      color: 'border-indigo-100 shadow-indigo-50/50'
    },
    {
      label: 'Strategic Escals',
      value: stats?.activeEscalations || 0,
      icon: <Zap className="text-orange-500" />,
      subtext: 'Manual nudges pending',
      color: 'border-orange-100 shadow-orange-50/50'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="flex items-center gap-4">
           <div className="w-14 h-14 bg-slate-900 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl rotate-3">
              <ShieldAlert size={28} />
           </div>
           <div>
             <h1 className="text-4xl font-black tracking-tighter text-slate-900 italic leading-none">Recovery Agent</h1>
             <div className="flex items-center gap-2 mt-2">
                <div className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Real-time Recovery Ops Active</p>
             </div>
           </div>
        </div>
        <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200/60 h-fit">
           <button 
             onClick={() => setActiveTab('overview')}
             className={cn(
               "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
               activeTab === 'overview' ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100" : "text-slate-400 hover:text-slate-600"
             )}
           >
              <LayoutDashboard size={14} /> Control
           </button>
           <button 
             onClick={() => setActiveTab('analytics')}
             className={cn(
               "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
               activeTab === 'analytics' ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100" : "text-slate-400 hover:text-slate-600"
             )}
           >
              <PieChart size={14} /> Intelligence
           </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-white p-7 rounded-[2.5rem] border ${card.color} shadow-2xl flex flex-col justify-between group hover:scale-[1.02] transition-all`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform">
                    {card.icon}
                  </div>
                  <BarChart3 size={16} className="text-slate-100" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">{card.label}</p>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{card.value}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight">
                    {card.subtext}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Strategic Snapshot */}
              <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-[11px] flex items-center gap-3">
                    <ArrowRight size={18} className="text-indigo-600" /> Recovery Funnel
                  </h3>
                  <div className="flex gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-900 animate-pulse"></span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Assets</span>
                  </div>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        {[
                          { stage: 'Gentle follow-up', value: stats?.stageBreakdown?.gentle_followup || 0, color: 'bg-indigo-500' },
                          { stage: 'Firm follow-up', value: stats?.stageBreakdown?.firm_followup || 0, color: 'bg-orange-500' },
                          { stage: 'Final notice', value: stats?.stageBreakdown?.final_notice || 0, color: 'bg-red-500' },
                          { stage: 'Legal Warning', value: stats?.stageBreakdown?.legal_warning || 0, color: 'bg-slate-900' }
                        ].map((item, i) => (
                          <div key={i} className="group">
                            <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest mb-2">
                              <span className="text-slate-500 italic group-hover:text-slate-900 transition-colors uppercase">{item.stage}</span>
                              <span className="text-slate-300 font-mono">{formatCurrency(item.value)}</span>
                            </div>
                            <div className="h-2 bg-slate-50 rounded-full overflow-hidden flex">
                              <div 
                                className={`h-full ${item.color} rounded-full transition-all duration-1000`} 
                                style={{ width: `${(item.value / (stats?.moneyAtRisk || 150000)) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 flex flex-col justify-center">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">Collection Strategy</p>
                       <div className="space-y-4">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600">
                                <Zap size={18} />
                             </div>
                             <p className="text-[11px] font-bold text-slate-600 leading-snug">
                               Deploy <span className="text-indigo-600">AI-Firm</span> nudges for Final Notice nodes to boost recovery by 18%.
                             </p>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-orange-600">
                                <AlertTriangle size={18} />
                             </div>
                             <p className="text-[11px] font-bold text-slate-600 leading-snug">
                               {stats?.overdueCount || 0} nodes are drifting toward <span className="text-orange-600 font-black">Critical Risk</span>. Immediate action required.
                             </p>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-900">
                                <History size={18} />
                             </div>
                             <p className="text-[11px] font-bold text-slate-600 leading-snug">
                               Detected <span className="font-black italic">Ghosting Pattern</span> in active accounts. Switching to legal escalation recommended.
                             </p>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Behavior Analysis Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                       <PieChart size={14} className="text-indigo-500" /> Chronic Late Payers
                    </h4>
                    <div className="space-y-4">
                       {highRiskClients.filter(r => r.score > 70).slice(0, 3).map((r, i) => (
                         <div key={i} className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">{r.clients?.name}</span>
                            <span className="text-[10px] font-black text-red-500 uppercase">High Risk Pattern</span>
                         </div>
                       ))}
                       {highRiskClients.filter(r => r.score > 70).length === 0 && (
                          <p className="text-[10px] text-slate-300 italic uppercase">No chronic lates detected</p>
                       )}
                    </div>
                 </div>
                 <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-8">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                       <Clock size={14} className="text-orange-500" /> Response Intelligence
                    </h4>
                    <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">
                       "Strategic analysis indicates highest response rate window: <span className="text-indigo-600 underline">Tuesdays between 10am - 12pm</span> for your sector."
                    </p>
                 </div>
              </div>

              {/* Activity Trail */}
              <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden p-8">
                 <h3 className="font-black text-slate-900 uppercase tracking-widest text-[11px] flex items-center gap-3 mb-8">
                    <History size={18} className="text-indigo-600" /> Collection Feed
                 </h3>
                 <div className="space-y-4">
                    {activities.map((ev, i) => (
                      <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:border-indigo-100 transition-all group">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                               <Zap size={20} className="text-indigo-600" />
                            </div>
                            <div>
                               <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{ev.event_type.replace('_', ' ')}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                  {new Date(ev.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                               </p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">Impact</p>
                            <p className="text-xs font-black text-slate-900 italic tracking-tighter">
                               {ev.metadata?.amount ? formatCurrency(ev.metadata.amount) : ev.metadata?.stage || 'Processed'}
                            </p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* HIGH RISK WIDGET */}
              <div className="bg-slate-900 rounded-[3rem] shadow-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600 rounded-full -mr-16 -mt-16 blur-3xl opacity-40"></div>
                <div className="relative z-10">
                   <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                     <AlertCircle size={28} className="text-red-400" />
                   </div>
                   <h3 className="text-2xl font-black italic tracking-tighter mb-2 leading-none">Exposure Alert</h3>
                   <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-8">Priority Nodes for Intervention</p>
                   
                   <div className="space-y-4">
                      {highRiskClients.map((risk, i) => (
                        <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer">
                           <div>
                              <p className="text-xs font-black text-white italic group-hover:text-red-400 transition-colors uppercase">{risk.clients?.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                 <div className="text-[8px] font-black uppercase tracking-widest text-white/40">Risk Node</div>
                                 <div className="h-1 w-12 bg-white/10 rounded-full overflow-hidden">
                                     <div className="h-full bg-red-400" style={{ width: `${risk.score}%` }}></div>
                                 </div>
                              </div>
                           </div>
                           <p className="text-sm font-black text-white">₹{formatCurrency(risk.metrics?.overdue_count * 15000 || 25000)}</p>
                        </div>
                      ))}
                      {highRiskClients.length === 0 && (
                        <div className="py-12 border-2 border-dashed border-white/10 rounded-[2rem] text-center">
                           <CheckCircle2 size={32} className="mx-auto text-white/10 mb-4" />
                           <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No Critical Exposure detected</p>
                        </div>
                      )}
                   </div>
                </div>
              </div>

              {/* Performance Summary */}
              <div className="bg-white rounded-[3rem] shadow-2xl p-8 border border-slate-100 flex flex-col justify-between flex-1">
                 <div>
                    <h3 className="text-xl font-black italic tracking-tighter mb-8 leading-none flex items-center gap-3">
                       <TrendingUp className="text-green-500" /> Efficiency
                    </h3>
                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nudge Conversion</p>
                          <p className="text-xl font-black text-slate-900">{Math.round(stats?.successRate || 0)}%</p>
                       </div>
                       <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${stats?.successRate || 0}%` }}></div>
                       </div>
                       
                       <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Strategic recovered</p>
                          <p className="text-xl font-black text-slate-900">{formatCurrency(stats?.recoveredRevenue || 0)}</p>
                       </div>
                       <div className="flex items-center justify-between text-indigo-600 mt-8 pt-8 border-t border-slate-50">
                          <p className="text-[10px] font-black uppercase tracking-widest">Monthly Outlook</p>
                          <BarChart3 size={18} />
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <RecoveryAnalytics />
      )}
    </div>
  );
};
