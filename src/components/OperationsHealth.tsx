import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ShieldAlert, 
  Zap, 
  Box, 
  ArrowUpRight, 
  AlertOctagon, 
  CheckCircle,
  Clock,
  ShieldCheck,
  CreditCard,
  BarChart3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DeadLetterJob, UsageCounter, Subscription, AuditLog } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useOrganization } from '../contexts/OrganizationContext';
import { useUserRole } from '../hooks/useUserRole';

export default function OperationsHealth() {
  const { currentOrganization } = useOrganization();
  const { capabilities } = useUserRole();
  const canUpdate = capabilities.canManageRecovery;
  const [dlqJobs, setDlqJobs] = useState<DeadLetterJob[]>([]);
  const [usage, setUsage] = useState<UsageCounter[]>([]);
  const [auditStats, setAuditStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!currentOrganization) return;
    const [dlq, use, audit] = await Promise.all([
      supabase.from('dead_letter_queue').select('*').eq('organization_id', currentOrganization.id).order('quarantined_at', { ascending: false }).limit(20),
      supabase.from('usage_counters').select('*').eq('organization_id', currentOrganization.id).limit(50),
      supabase.from('audit_logs').select('severity').eq('organization_id', currentOrganization.id).limit(100)
    ]);

    if (dlq.error) console.error('DLQ Fetch Error:', dlq.error);
    if (use.error) console.error('Usage Fetch Error:', use.error);
    if (audit.error) console.error('Audit Fetch Error:', audit.error);

    setDlqJobs(dlq.data || []);
    setUsage(use.data || []);
    
    // Process audit stats client-side instead of using complex grouping
    if (audit.data) {
      const counts = audit.data.reduce((acc: any, curr: any) => {
        acc[curr.severity] = (acc[curr.severity] || 0) + 1;
        return acc;
      }, {});
      setAuditStats(Object.entries(counts).map(([severity, count]) => ({ severity, count })));
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentOrganization]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* DLQ Monitoring */}
        <div className="lg:col-span-2 bg-white rounded-3xl sm:rounded-[3rem] border border-slate-100 shadow-2xl p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-10">
            <div>
              <h3 className="text-xl font-black italic tracking-tighter text-slate-900 leading-none">Dead-Letter Repository</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Poison Job Registry & Quarantine</p>
            </div>
            <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-2xl border border-red-100 w-fit">
              <AlertOctagon size={16} />
              <span className="text-xs font-black uppercase">{dlqJobs.length} Quarantined</span>
            </div>
          </div>

          <div className="space-y-4">
            {dlqJobs.map((job) => (
              <div key={job.id} className="p-5 sm:p-6 bg-slate-50/50 rounded-3xl border border-slate-100 group hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-red-500">
                      <Box size={14} />
                    </div>
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{job.action_type}</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 bg-white px-2 py-1 rounded-lg shadow-sm border border-slate-50 uppercase w-fit">
                    {job.failure_reason}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-600 leading-relaxed italic mb-4">
                  "{job.last_error || 'Critical runtime failure without trace.'}"
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100/50">
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-slate-300" />
                    <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(job.quarantined_at).toLocaleString()}</span>
                  </div>
                  {canUpdate && (
                    <button className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline">
                      Manual Replay →
                    </button>
                  )}
                </div>
              </div>
            ))}
            {dlqJobs.length === 0 && (
              <div className="py-20 text-center bg-slate-50/30 rounded-[2.5rem] border border-dashed border-slate-200">
                 <ShieldCheck size={48} className="mx-auto text-green-200 mb-4" />
                 <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Environment Clean • No Quarantined Jobs</p>
              </div>
            )}
          </div>
        </div>

        {/* Usage & Metering */}
        <div className="space-y-6 sm:space-y-8">
           <div className="bg-indigo-600 rounded-3xl sm:rounded-[3rem] p-8 sm:p-10 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-[80px] opacity-20"></div>
              <div className="relative z-10">
                <h3 className="text-xl sm:text-2xl font-black italic tracking-tighter mb-8 leading-tight">Usage Metering</h3>
                <div className="space-y-8">
                  {usage.slice(0, 3).map((u, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-end mb-3">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 italic">{u.metric.replace('_', ' ')}</p>
                        <p className="text-sm font-black">{u.count} units</p>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((u.count / 100) * 100, 100)}%` }}
                          className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                        />
                      </div>
                    </div>
                  ))}
                  {usage.length === 0 && (
                    <div className="py-10 text-center opacity-40">
                      <p className="text-[10px] font-black uppercase tracking-widest italic">No usage detected this period</p>
                    </div>
                  )}
                </div>
              </div>
           </div>

           {/* Security Signals Card */}
           <div className="bg-white rounded-3xl sm:rounded-[3rem] border border-slate-100 shadow-2xl p-8 sm:p-10 relative overflow-hidden">
              <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-slate-50 rounded-full blur-3xl opacity-50"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                   <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-100">
                      <BarChart3 size={18} className="sm:w-5 sm:h-5" />
                   </div>
                   <div>
                     <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Security Pulse</h4>
                     <p className="text-lg sm:text-xl font-black text-slate-900 tracking-tighter">Observability</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all cursor-default">
                      <p className="text-[9px] font-black uppercase text-slate-400">Errors</p>
                      <p className="text-2xl font-black text-slate-900 mt-1">0.05%</p>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all cursor-default">
                      <p className="text-[9px] font-black uppercase text-slate-400">Latency</p>
                      <p className="text-2xl font-black text-indigo-600 mt-1">124ms</p>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all cursor-default">
                      <p className="text-[9px] font-black uppercase text-slate-400">Audit/Sec</p>
                      <p className="text-2xl font-black text-slate-900 mt-1">1.2</p>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all cursor-default">
                      <p className="text-[9px] font-black uppercase text-slate-400">Uptime</p>
                      <p className="text-2xl font-black text-green-500 mt-1">99.9%</p>
                   </div>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
