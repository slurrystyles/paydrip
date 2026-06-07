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
import { useUserRole } from '../hooks/useUserRole';
import { usePlan } from '../contexts/PlanContext';
import RecoveryAnalytics from './RecoveryAnalytics';

export const RecoveryDashboard: React.FC = () => {
  const { profile } = usePlan();
  const { currentOrganization } = useOrganization();
  const { capabilities = { canManageRecovery: false } } = useUserRole() || {};
  const canUpdate = capabilities.canManageRecovery;
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');
  const [activities, setActivities] = useState<any[]>([]);
  const [highRiskClients, setHighRiskClients] = useState<any[]>([]);

  const fetchStats = async () => {
    if (!currentOrganization) return;
    if (!profile) return;

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
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'invoices', 
        filter: `organization_id=eq.${currentOrganization.id}` 
      }, fetchStats)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'payments', 
        filter: `organization_id=eq.${currentOrganization.id}` 
      }, fetchStats)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'invoice_events', 
        filter: `organization_id=eq.${currentOrganization.id}` 
      }, fetchStats)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [currentOrganization]);

  if (loading) return (
    <div className="p-12 flex flex-col items-center justify-center animate-pulse">
       <div className="w-10 h-10 border-2 border-t-[#C8FF00] border-[#222222] rounded-full animate-spin mb-4"></div>
       <p className="text-xs text-[#888888] font-mono">Synchronizing Logs...</p>
    </div>
  );

  const statCards = [
    {
      label: 'Exposure at Risk',
      value: formatCurrency(stats?.moneyAtRisk || 0),
      icon: <ShieldAlert className="text-[#EF4444]" size={18} />,
      subtext: `${stats?.overdueCount || 0} Overdue Invoices`,
      color: 'border-[#EF4444]/20'
    },
    {
      label: 'Recovery Rate',
      value: `${Math.round(stats?.successRate || 0)}%`,
      icon: <TrendingUp className="text-[#10B981]" size={18} />,
      subtext: '+4% from last month',
      color: 'border-[#10B981]/20'
    },
    {
      label: 'Collection Velocity',
      value: `${Math.round(stats?.avgRecoveryDays || 0)} Days`,
      icon: <Clock className="text-[#3B82F6]" size={18} />,
      subtext: 'Mean duration to recover',
      color: 'border-[#3B82F6]/20'
    },
    {
      label: 'Strategic Escals',
      value: stats?.activeEscalations || 0,
      icon: <Zap className="text-[#F59E0B]" size={18} />,
      subtext: 'Pending communications',
      color: 'border-[#F59E0B]/20'
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 text-left">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-[#111111] border border-[#222222] rounded-xl flex items-center justify-center text-[#C8FF00]">
              <ShieldAlert size={20} />
           </div>
           <div>
             <h1 className="text-2xl font-bold text-[#EEEEEE] leading-none">Intelligence</h1>
             <div className="flex items-center gap-2 mt-1.5">
                <div className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10B981]"></span>
                </div>
                <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider">Recovery Ops Connected</p>
             </div>
           </div>
        </div>
        <div className="flex bg-[#111111] border border-[#222222] p-1 rounded-lg w-full sm:w-fit overflow-x-auto">
           <button 
             onClick={() => setActiveTab('overview')}
             className={cn(
               "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
               activeTab === 'overview' ? "bg-[#C8FF00] text-[#080808]" : "text-[#888888] hover:text-[#EEEEEE]"
             )}
           >
              <LayoutDashboard size={14} /> Control Panel
           </button>
           <button 
             onClick={() => setActiveTab('analytics')}
             className={cn(
               "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
               activeTab === 'analytics' ? "bg-[#C8FF00] text-[#080808]" : "text-[#888888] hover:text-[#EEEEEE]"
             )}
           >
              <PieChart size={14} /> Recovery Analytics
           </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-6 animate-in fade-in transition-all duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn("bg-[#111111] border border-[#222222] p-6 rounded-xl flex flex-col justify-between text-left", card.color)}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 bg-[#161616] border border-[#222222] rounded-lg flex items-center justify-center">
                    {card.icon}
                  </div>
                  <BarChart3 size={14} className="text-[#444444]" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1">{card.label}</p>
                  <h3 className="text-2xl font-bold text-[#EEEEEE] tracking-tight">{card.value}</h3>
                  <p className="text-[10px] text-[#444444] mt-1 uppercase tracking-wider font-mono">
                    {card.subtext}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Main Stage Funnel breakdown */}
            <div className="lg:col-span-8 bg-[#111111] border border-[#222222] rounded-xl p-5 text-left">
              <div className="pb-4 mb-4 border-b border-[#222222] flex items-center justify-between">
                <h3 className="font-semibold text-xs text-[#EEEEEE] uppercase tracking-wider flex items-center gap-2">
                  <ArrowRight size={14} className="text-[#C8FF00]" /> Recovery Funnel
                </h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#C8FF00] animate-pulse"></span>
                  <span className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider">Active Strategy</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    {[
                      { stage: 'Gentle follow-up', value: stats?.stageBreakdown?.gentle_followup || 0, color: 'bg-[#3B82F6]' },
                      { stage: 'Firm follow-up', value: stats?.stageBreakdown?.firm_followup || 0, color: 'bg-[#F59E0B]' },
                      { stage: 'Final notice', value: stats?.stageBreakdown?.final_notice || 0, color: 'bg-[#EF4444]' },
                      { stage: 'Legal Warning', value: stats?.stageBreakdown?.legal_warning || 0, color: 'bg-[#EEEEEE]' }
                    ].map((item, i) => (
                      <div key={i} className="group">
                        <div className="flex justify-between items-end text-[10px] font-semibold mb-1.5 uppercase font-mono">
                          <span className="text-[#888888]">{item.stage}</span>
                          <span className="text-[#EEEEEE]">{formatCurrency(item.value)}</span>
                        </div>
                        <div className="h-1 bg-[#161616] rounded-full overflow-hidden flex">
                          <div 
                            className={cn('h-full rounded-full transition-all duration-1000', item.color)} 
                            style={{ width: `${(item.value / (stats?.moneyAtRisk || 150000)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                </div>
                
                <div className="bg-[#161616] rounded-lg p-5 border border-[#222222]/50 flex flex-col justify-center">
                   <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-4">Collection Strategy recommendations</p>
                   <div className="space-y-4">
                      <div className="flex gap-3 text-left">
                         <div className="w-8 h-8 rounded-lg bg-[#222222] flex items-center justify-center text-[#C8FF00] shrink-0">
                            <Zap size={14} />
                         </div>
                         <p className="text-xs text-[#888888] leading-normal font-medium">
                            Deploy automation nudges for Final Notice cases to increase collection velocity.
                         </p>
                      </div>
                      <div className="flex gap-3 text-left">
                         <div className="w-8 h-8 rounded-lg bg-[#222222] flex items-center justify-center text-[#EF4444] shrink-0">
                            <AlertTriangle size={14} />
                         </div>
                         <p className="text-xs text-[#888888] leading-normal font-medium">
                           {stats?.overdueCount || 0} accounts have exceeded standard terms. Deploy legal warning templates.
                         </p>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {/* High risk sidebar widget */}
            <div className="lg:col-span-4 bg-[#111111] border border-[#222222] rounded-xl p-5 text-left flex flex-col justify-between">
              <div>
                 <div className="pb-4 mb-4 border-b border-[#222222] flex items-center justify-between">
                   <h3 className="font-semibold text-xs text-[#EEEEEE] uppercase tracking-wider flex items-center gap-2">
                     <AlertCircle size={14} className="text-[#EF4444]" /> Exposure Risk
                   </h3>
                 </div>
                 
                 <div className="space-y-3">
                    {highRiskClients.map((risk, i) => (
                      <div key={i} className="p-3 bg-[#161616] border border-[#222222]/60 rounded-lg flex items-center justify-between">
                         <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#EEEEEE] truncate uppercase tracking-wider">{risk.clients?.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <div className="text-[9px] font-semibold text-[#888888] font-mono">Risk Profile</div>
                               <div className="h-1 w-12 bg-[#222222] rounded-full overflow-hidden">
                                   <div className="h-full bg-[#EF4444]" style={{ width: `${risk.score}%` }}></div>
                               </div>
                            </div>
                         </div>
                         <p className="text-xs font-semibold text-[#EEEEEE] font-mono">{formatCurrency(risk.metrics?.overdue_count * 15000 || 25000)}</p>
                      </div>
                    ))}
                    {highRiskClients.length === 0 && (
                      <div className="py-8 border-2 border-dashed border-[#222222] rounded-lg text-center">
                         <CheckCircle2 size={24} className="mx-auto text-[#444444] mb-3" />
                         <p className="text-xs text-[#888888]">No critical exposures currently.</p>
                      </div>
                    )}
                 </div>
              </div>
              
              <div className="border-t border-[#222222] pt-4 mt-4 space-y-3">
                 <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-wider">Average Recovered</p>
                    <p className="text-sm font-semibold text-[#EEEEEE] font-mono">{formatCurrency(stats?.recoveredRevenue || 0)}</p>
                 </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {/* Feed or Analytics sections */}
             <div className="md:col-span-2 bg-[#111111] border border-[#222222] rounded-xl p-5 text-left">
                <h3 className="font-semibold text-xs text-[#EEEEEE] uppercase tracking-wider flex items-center gap-2 mb-4">
                   <History size={14} className="text-[#888888]" /> Collection Logs
                </h3>
                <div className="space-y-2">
                   {activities.map((ev, i) => (
                     <div key={i} className="flex items-center justify-between p-3 bg-[#161616] border border-[#222222]/40 rounded-lg">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-[#222222] flex items-center justify-center text-[#888888]">
                              <Zap size={14} />
                           </div>
                           <div>
                              <p className="text-[11px] font-semibold text-[#EEEEEE] uppercase tracking-wider">{ev.event_type.replace('_', ' ')}</p>
                              <p className="text-[9px] text-[#888888] font-mono mt-0.5">
                                 {new Date(ev.created_at).toLocaleDateString()}
                              </p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-semibold text-[#EEEEEE] font-mono">
                              {ev.metadata?.amount ? formatCurrency(ev.metadata.amount) : ev.metadata?.stage || 'Processed'}
                           </p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 text-left">
                <h3 className="font-semibold text-xs text-[#EEEEEE] uppercase tracking-wider flex items-center gap-2 mb-4">
                   <TrendingUp size={14} className="text-[#10B981]" /> Efficacy Ratio
                </h3>
                <div className="space-y-4">
                   <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#888888]">Nudge Conversion</span>
                      <span className="text-[#EEEEEE] font-semibold">{Math.round(stats?.successRate || 0)}%</span>
                   </div>
                   <div className="w-full bg-[#161616] h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#C8FF00]" style={{ width: `${stats?.successRate || 0}%` }}></div>
                   </div>
                   
                   <p className="text-[11px] text-[#888888] leading-relaxed italic">
                      Recommended nudge channel: Tuesdays during business hours yields optimal response rates.
                   </p>
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
