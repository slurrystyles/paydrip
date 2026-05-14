import React, { useState, useEffect } from 'react';
import { 
  History, 
  Settings, 
  Zap, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  X, 
  Play, 
  Pause, 
  Search,
  Kanban,
  List as ListIcon,
  ChevronRight,
  ShieldAlert,
  Fingerprint,
  Activity,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { recoveryService } from '../lib/recoveryService';
import { EscalationQueueItem, Invoice, AuditLog, SecurityAbuseFlag } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useOrganization } from '../contexts/OrganizationContext';
import OperationsHealth from './OperationsHealth';

export default function RecoveryOpsCenter() {
  const { currentOrganization } = useOrganization();
  const [activeView, setActiveView] = useState<'board' | 'queue' | 'logs' | 'security' | 'health'>('board');
  const [queue, setQueue] = useState<EscalationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [abuseFlags, setAbuseFlags] = useState<SecurityAbuseFlag[]>([]);

  const fetchData = async () => {
    if (!currentOrganization) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [queueData, invoiceData, auditData, abuseData] = await Promise.all([
      supabase.from('escalation_queue').select('*').eq('organization_id', currentOrganization.id).order('scheduled_at', { ascending: true }),
      supabase.from('invoices').select('*, client:clients(*)').eq('organization_id', currentOrganization.id).order('created_at', { ascending: false }),
      supabase.from('audit_logs').select('*').eq('organization_id', currentOrganization.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('abuse_flags').select('*').eq('organization_id', currentOrganization.id).order('created_at', { ascending: false }).limit(20)
    ]);

    if (queueData.error) console.error('Queue Fetch Error:', queueData.error);
    if (invoiceData.error) console.error('Invoice Fetch Error:', invoiceData.error);
    if (auditData.error) console.error('Audit Fetch Error:', auditData.error);
    if (abuseData.error) console.error('Abuse Fetch Error:', abuseData.error);

    setQueue(queueData.data || []);
    setInvoices(invoiceData.data || []);
    setAuditLogs(auditData.data || []);
    setAbuseFlags(abuseData.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    if (!currentOrganization) return;
    const channel = supabase.channel(`ops_center_${currentOrganization.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escalation_queue', filter: `organization_id=eq.${currentOrganization.id}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `organization_id=eq.${currentOrganization.id}` }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentOrganization]);

  const handleRetry = async (id: string) => {
    if (!currentOrganization) return;
    try {
      await recoveryService.retryQueueItem(id, currentOrganization.id);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 italic font-black text-xl">
              OP
           </div>
           <div>
             <h1 className="text-3xl font-black tracking-tighter text-slate-900 italic leading-none">Operations Center</h1>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Real-time Recovery Fleet Monitor</p>
           </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
           {[
             { id: 'board', label: 'Kanban', icon: <Kanban size={14} /> },
             { id: 'queue', label: 'Monitor', icon: <ListIcon size={14} /> },
             { id: 'logs', label: 'Logs', icon: <History size={14} /> },
             { id: 'security', label: 'Security', icon: <ShieldAlert size={14} /> },
             { id: 'health', label: 'Health', icon: <Activity size={14} /> }
           ].map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveView(tab.id as any)}
               className={cn(
                 "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                 activeView === tab.id ? "bg-white text-indigo-600 shadow-lg" : "text-slate-400 hover:text-slate-600"
               )}
             >
               {tab.icon} {tab.label}
             </button>
           ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'board' && (
          <motion.div 
            key="board"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex gap-6 overflow-x-auto pb-8 snap-x"
          >
             {['pending', 'gentle_followup', 'firm_followup', 'final_notice', 'legal_warning'].map((stage) => (
               <div key={stage} className="min-w-[320px] w-[320px] snap-center">
                  <div className="mb-4 flex items-center justify-between px-2">
                     <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          stage === 'pending' ? 'bg-slate-300' :
                          stage === 'legal_warning' ? 'bg-red-500' : 'bg-indigo-500'
                        )}></div>
                        {stage.replace('_', ' ')}
                     </h4>
                     <span className="text-[10px] font-black text-slate-300">
                       {invoices.filter(i => i.recovery_stage === stage).length}
                     </span>
                  </div>
                  <div className="space-y-4 min-h-[600px] bg-slate-50/50 p-4 rounded-[2.5rem] border border-dashed border-slate-200">
                     {invoices.filter(i => i.recovery_stage === stage).map((inv) => (
                       <div key={inv.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 group hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer">
                          <div className="flex justify-between items-start mb-3">
                             <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-slate-900 italic tracking-tighter">#{inv.invoice_number}</span>
                                {inv.status === 'payment_reported' && (
                                   <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[7px] font-black uppercase tracking-widest w-fit">
                                     Reported
                                   </span>
                                )}
                             </div>
                             {inv.automation_paused && <Pause size={12} className={cn(inv.status === 'payment_reported' ? "text-amber-400" : "text-orange-400")} />}
                          </div>
                          <p className="text-xs font-bold text-slate-700 truncate mb-1">{inv.client?.name}</p>
                          <p className="text-xl font-black text-slate-900 tracking-tighter mb-4">{formatCurrency(inv.amount)}</p>
                          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                             <div className="flex items-center gap-2">
                                <Clock size={12} className="text-slate-300" />
                                <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(inv.due_date).toLocaleDateString()}</span>
                             </div>
                             <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-50 text-indigo-600 rounded-lg">
                                <ChevronRight size={14} />
                             </button>
                          </div>
                       </div>
                     ))}
                     {invoices.filter(i => i.recovery_stage === stage).length === 0 && (
                       <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-200 mb-4 shadow-sm border border-slate-50">
                             <Activity size={20} />
                          </div>
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No cases in {stage.replace('_', ' ')}</p>
                       </div>
                     )}
                  </div>
               </div>
             ))}
          </motion.div>
        )}

        {activeView === 'queue' && (
          <motion.div 
            key="queue"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden"
          >
             <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-[11px] flex items-center gap-3">
                   <Clock size={18} className="text-indigo-600" /> Pending Reminders Queue
                </h3>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2 bg-green-50 text-green-600 px-3 py-1.5 rounded-full">
                      <Zap size={12} />
                      <span className="text-[9px] font-black uppercase">Auto-Processing Active</span>
                   </div>
                </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-slate-50">
                         <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Invoice</th>
                         <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Scheduled</th>
                         <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action Type</th>
                         <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                         <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ops</th>
                      </tr>
                   </thead>
                   <tbody>
                      {queue.map((item) => (
                        <tr key={item.id} className="border-t border-slate-50 group hover:bg-slate-50/50 transition-colors">
                           <td className="px-8 py-6">
                              <p className="text-xs font-black text-slate-900 italic tracking-tighter">#INV-{item.invoice_id.slice(-6).toUpperCase()}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Manual node attached</p>
                           </td>
                           <td className="px-8 py-6">
                              <p className="text-xs font-bold text-slate-600">{new Date(item.scheduled_at).toLocaleDateString()}</p>
                              <p className="text-[9px] font-mono text-slate-400 uppercase mt-1">{new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                           </td>
                           <td className="px-8 py-6">
                              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                                 {item.action_type.replace('_', ' ')}
                              </span>
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-2">
                                 <div className={cn(
                                   "w-2 h-2 rounded-full",
                                   item.status === 'pending' ? 'bg-orange-400 animate-pulse' :
                                   item.status === 'processed' ? 'bg-green-500' : 'bg-red-500'
                                 )}></div>
                                 <span className="text-[10px] font-black uppercase text-slate-500">{item.status}</span>
                              </div>
                           </td>
                           <td className="px-8 py-6 text-right">
                              {item.status === 'failed' && (
                                <button 
                                  onClick={() => handleRetry(item.id)}
                                  className="p-2 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-lg"
                                >
                                   <RefreshCw size={14} />
                                </button>
                              )}
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </motion.div>
        )}

        {activeView === 'logs' && (
          <motion.div 
            key="logs"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
             <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-2xl">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-[11px] mb-8 flex items-center gap-3">
                   <ShieldAlert size={18} className="text-red-500" /> Error Forensics
                </h3>
                <div className="space-y-4">
                   {queue.filter(q => q.status === 'failed').map((error, i) => (
                     <div key={i} className="p-5 bg-red-50/50 rounded-2xl border border-red-100">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">Logic Failure</span>
                           <span className="text-[8px] font-mono text-red-400">{new Date(error.updated_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 italic leading-snug">
                           "{error.last_error || 'Unknown runtime error in queue processor'}"
                        </p>
                     </div>
                   ))}
                </div>
             </div>

             <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl opacity-50 border border-white/20"></div>
                <div className="relative z-10">
                   <h3 className="text-3xl font-black italic tracking-tighter mb-4 italic leading-tight">Automation Pulse</h3>
                   <div className="grid grid-cols-2 gap-8 mt-10">
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Success Velocity</p>
                         <p className="text-4xl font-black mt-2">
                           {queue.filter(q => q.status === 'processed').length + queue.filter(q => q.status === 'failed').length > 0 
                             ? Math.round((queue.filter(q => q.status === 'processed').length / (queue.filter(q => q.status === 'processed').length + queue.filter(q => q.status === 'failed').length)) * 100) 
                             : 100}%
                         </p>
                         <div className="w-full h-1 bg-white/10 rounded-full mt-4">
                            <div 
                              className="h-full bg-white rounded-full transition-all duration-1000" 
                              style={{ width: `${queue.filter(q => q.status === 'processed').length + queue.filter(q => q.status === 'failed').length > 0 
                                ? (queue.filter(q => q.status === 'processed').length / (queue.filter(q => q.status === 'processed').length + queue.filter(q => q.status === 'failed').length)) * 100 
                                : 100}%` }}
                            ></div>
                         </div>
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Resolved Nodes</p>
                         <p className="text-4xl font-black mt-2">{queue.filter(q => q.status === 'processed').length}</p>
                         <p className="text-[9px] font-bold mt-4">Lifetime Processing</p>
                      </div>
                   </div>
                </div>
             </div>
          </motion.div>
        )}

        {activeView === 'security' && (
          <motion.div 
            key="security"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex items-center gap-6">
                   <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                      <Fingerprint size={28} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Defenses</p>
                      <p className="text-2xl font-black text-slate-900 tracking-tighter">Hardened</p>
                   </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex items-center gap-6">
                   <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                      <Activity size={28} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recent Audits</p>
                      <p className="text-2xl font-black text-slate-900 tracking-tighter">{auditLogs.length}</p>
                   </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex items-center gap-6">
                   <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                      <UserCheck size={28} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Blocked IPs</p>
                      <p className="text-2xl font-black text-slate-900 tracking-tighter">{abuseFlags.length}</p>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden">
                   <div className="p-8 border-b border-slate-50">
                      <h3 className="font-black text-slate-900 uppercase tracking-widest text-[11px] flex items-center gap-3">
                         <Fingerprint size={18} className="text-indigo-600" /> Enterprise Audit Trail
                      </h3>
                   </div>
                   <div className="p-4 space-y-2">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="p-4 hover:bg-slate-50 rounded-2xl transition-colors flex items-center justify-between group">
                           <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-1.5 h-8 rounded-full",
                                log.severity === 'critical' ? 'bg-red-500' : 'bg-slate-200'
                              )}></div>
                              <div>
                                 <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{log.action.replace('_', ' ')}</p>
                                 <p className="text-[9px] font-bold text-slate-400 mt-0.5">{log.resource_type} • {log.ip_address}</p>
                              </div>
                           </div>
                           <span className="text-[8px] font-mono text-slate-300 group-hover:text-slate-500 transition-colors uppercase">
                              {new Date(log.created_at).toLocaleTimeString()}
                           </span>
                        </div>
                      ))}
                      {auditLogs.length === 0 && (
                        <div className="py-20 text-center">
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No audit signals detected</p>
                        </div>
                      )}
                   </div>
                </div>

                <div className="space-y-8">
                   <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full -mr-32 -mt-32 blur-[80px] opacity-20"></div>
                      <h3 className="text-2xl font-black italic tracking-tighter mb-6 leading-tight">Security Posture: EXCELLENT</h3>
                      <div className="space-y-4">
                         {[
                           { label: 'Rate Limiting', status: 'ACTIVE' },
                           { label: 'Spam Filtering', status: 'LEARNING' },
                           { label: 'Brute Force Shield', status: 'ACTIVE' },
                           { label: 'Worker Verification', status: 'PENDING' }
                         ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                               <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{item.label}</span>
                               <span className={cn(
                                 "text-[9px] font-black px-2 py-0.5 rounded-full",
                                 item.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'
                               )}>{item.status}</span>
                            </div>
                         ))}
                      </div>
                   </div>

                   <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-8">
                      <h3 className="font-black text-slate-900 uppercase tracking-widest text-[11px] mb-6 flex items-center gap-3">
                         <ShieldAlert size={18} className="text-red-500" /> Active Threats
                      </h3>
                      <div className="space-y-4">
                         {abuseFlags.map((flag) => (
                           <div key={flag.id} className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                              <div>
                                 <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">{flag.severity} RISK</p>
                                 <p className="text-[11px] font-bold text-slate-900 mt-1">{flag.reason}</p>
                              </div>
                              <button className="p-2 bg-white text-red-600 rounded-xl shadow-sm hover:bg-red-50 transition-all">
                                 <X size={14} />
                              </button>
                           </div>
                         ))}
                         {abuseFlags.length === 0 && (
                            <div className="py-10 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Environment Secure • 0 Threats</p>
                            </div>
                         )}
                      </div>
                   </div>
                </div>
             </div>
          </motion.div>
        )}
        {activeView === 'health' && (
          <motion.div 
            key="health"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
             <OperationsHealth />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
