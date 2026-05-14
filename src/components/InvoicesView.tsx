import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Invoice, Client, InvoiceStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Send, 
  MoreHorizontal,
  ChevronRight,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Zap,
  Pause,
  Play,
  X
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import InvoiceModal from './InvoiceModal';
import InvoiceDetailModal from './InvoiceDetailModal';
import UpgradeModal from './UpgradeModal';
import { RiskBadge } from './RiskBadge';
import { usePlan } from '../contexts/PlanContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { recoveryService } from '../lib/recoveryService';

export default function InvoicesView() {
  const { isLimitReached, refreshPlanData } = usePlan();
  const { currentOrganization } = useOrganization();
  const [invoices, setInvoices] = useState<(Invoice & { totalPaid?: number; remainingBalance?: number })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filters, setFilters] = useState<InvoiceStatus | 'all'>('all');

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedInvoices.length && sortedInvoices.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedInvoices.map(i => i.id));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkAction = async (action: 'pause' | 'resume' | 'nudge') => {
    if (!currentOrganization) return;
    try {
      await recoveryService.bulkProcessInvoices(selectedIds, action, currentOrganization.id);
      setSelectedIds([]);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickSend = async (invoice: Invoice) => {
    const clientInfo = invoice.client || invoice.snapshot_json;
    if (!clientInfo?.email) {
      alert("Missing client email.");
      return;
    }

    if (!confirm(`Send invoice #${invoice.invoice_number} to ${clientInfo.name}?`)) return;

    try {
      const { data: profile } = await supabase.from('users').select('business_name').eq('id', invoice.user_id).single();
      
      await recoveryService.sendInvoice({
        to: clientInfo.email,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        business_name: profile?.business_name || 'Business',
        organization_id: invoice.organization_id
      });
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Failed to send invoice');
    }
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    if (!confirm(`Mark invoice #${invoice.invoice_number} as paid? This will stop all automated reminders.`)) return;

    try {
      const { error } = await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoice.id).eq('organization_id', invoice.organization_id);
      if (error) throw error;
      
      // Log payment
      await supabase.from('payments').insert([{
        invoice_id: invoice.id,
        organization_id: invoice.organization_id,
        amount: invoice.amount,
        method: 'cash',
        paid_at: new Date().toISOString()
      }]);

      // Audit Log
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('audit_log').insert({
        entity_id: invoice.id,
        entity_type: 'invoice',
        audit_type: 'invoice_paid',
        organization_id: invoice.organization_id,
        user_id: user?.id,
        meta: { method: 'manual', amount: invoice.amount }
      });

      fetchData();
    } catch (e) {
      console.error(e);
      alert('Failed to mark as paid');
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentOrganization]);

  async function fetchData() {
    if (!currentOrganization) return;
    await refreshPlanData();
    const [invRes, cliRes] = await Promise.all([
      supabase.from('invoices').select('*, client:clients(*)').eq('organization_id', currentOrganization.id).order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('organization_id', currentOrganization.id).order('name')
    ]);
    
    if (!invRes.error && invRes.data) {
      const invoiceIds = invRes.data.map(i => i.id);
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .in('invoice_id', invoiceIds);

      const computedInvoices = invRes.data.map(inv => {
        const invPayments = paymentsData?.filter(p => p.invoice_id === inv.id) || [];
        const totalPaid = invPayments.reduce((sum, p) => sum + p.amount, 0);
        return {
          ...inv,
          totalPaid,
          remainingBalance: Math.max(0, inv.amount - totalPaid)
        };
      });
      setInvoices(computedInvoices);
    }
    if (!cliRes.error && cliRes.data) setClients(cliRes.data);
    setLoading(false);
  }

  const filteredInvoices = invoices.filter(inv => 
    filters === 'all' ? true : inv.status === filters
  );

  // SECTION 6: SORTING
  // Default: reported first -> overdue first -> upcoming (by due date) -> paid
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    if (a.status === 'payment_reported' && b.status !== 'payment_reported') return -1;
    if (a.status !== 'payment_reported' && b.status === 'payment_reported') return 1;

    const isOverdueA = (inv: Invoice) => inv.status !== 'paid' && inv.status !== 'payment_reported' && new Date(inv.due_date) < new Date();
    const isOverdueB = (inv: Invoice) => inv.status !== 'paid' && inv.status !== 'payment_reported' && new Date(inv.due_date) < new Date();
    
    const overdueA = isOverdueA(a);
    const overdueB = isOverdueB(b);

    if (overdueA && !overdueB) return -1;
    if (!overdueA && overdueB) return 1;

    if (a.status === 'paid' && b.status !== 'paid') return 1;
    if (a.status !== 'paid' && b.status === 'paid') return -1;

    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  const isOverdue = (inv: Invoice) => inv.status !== 'paid' && new Date(inv.due_date) < new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-1 bg-white border border-slate-200 p-1 rounded-xl shadow-sm overflow-x-auto">
          <FilterButton active={filters === 'all'} onClick={() => setFilters('all')}>All</FilterButton>
          <FilterButton active={filters === 'paid'} onClick={() => setFilters('paid')}>Paid</FilterButton>
          <FilterButton active={filters === 'payment_reported'} onClick={() => setFilters('payment_reported')}>Reported</FilterButton>
          <FilterButton active={filters === 'sent'} onClick={() => setFilters('sent')}>Sent</FilterButton>
          <FilterButton active={filters === 'draft'} onClick={() => setFilters('draft')}>Draft</FilterButton>
        </div>
        {/* SECTION 5: PRIMARY ACTION */}
        <button 
          onClick={() => {
            if (isLimitReached) {
              setShowUpgradeModal(true);
            } else {
              setIsNewModalOpen(true);
            }
          }}
          className={cn(
            "px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center space-x-2 transition-all shadow-xl active:scale-95 w-full sm:w-auto",
            isLimitReached 
              ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200" 
              : "bg-indigo-600 text-white hover:bg-slate-900 shadow-indigo-100"
          )}
        >
          {isLimitReached ? <Zap size={12} /> : <Plus size={12} />}
          <span>{isLimitReached ? 'Upgrade to Create' : 'Create Invoice'}</span>
        </button>
      </div>

      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />

      <div className="hidden sm:block bento-card overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 uppercase tracking-[0.2em] italic">
                  <th className="px-5 py-4 w-12">
                    <input 
                      type="checkbox" 
                      onChange={toggleSelectAll}
                      checked={selectedIds.length === sortedInvoices.length && sortedInvoices.length > 0}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-5 py-4 text-[8px] font-black text-slate-400">Client Name</th>
                  <th className="px-5 py-4 text-[8px] font-black text-slate-400">Amount</th>
                  <th className="px-5 py-4 text-[8px] font-black text-slate-400 text-center">Risk</th>
                  <th className="px-5 py-4 text-[8px] font-black text-slate-400">Due Date</th>
                  <th className="px-5 py-4 text-[8px] font-black text-slate-400 text-center">Status</th>
                  <th className="px-5 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedInvoices.map((invoice) => (
                  <tr 
                    key={invoice.id} 
                    className={cn(
                      "hover:bg-indigo-50/20 transition-colors group cursor-pointer h-16",
                      selectedIds.includes(invoice.id) && "bg-indigo-50/40"
                    )}
                    onClick={() => setSelectedInvoice(invoice)}
                  >
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                       <input 
                         type="checkbox"
                         checked={selectedIds.includes(invoice.id)}
                         onChange={(e) => toggleSelect(invoice.id, e as any)}
                         className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                       />
                    </td>
                    <td className="px-5 py-2.5">
                      <p className="font-black text-slate-900 tracking-tight text-xs leading-none">{invoice.client?.name || invoice.snapshot_json?.name}</p>
                      <p className="text-[8px] text-slate-400 font-mono font-bold uppercase tracking-widest mt-1 leading-none">#{invoice.invoice_number}</p>
                    </td>
                    <td className="px-5 py-2.5">
                      <p className="font-black text-slate-900 text-xs">{formatCurrency(invoice.amount)}</p>
                      {invoice.totalPaid && invoice.totalPaid > 0 && (
                        <p className="text-[8px] text-green-600 font-black uppercase mt-0.5 leading-none">{formatCurrency(invoice.totalPaid)}</p>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-center">
                       <RiskBadge level={
                         isOverdue(invoice) 
                           ? (invoice.remainingBalance && invoice.remainingBalance > 50000 ? 'critical' : 'high')
                           : 'minimal'
                       } />
                    </td>
                    <td className={cn(
                      "px-5 py-2.5 text-[9px] font-black uppercase tracking-widest",
                      isOverdue(invoice) ? "text-red-500 italic" : "text-slate-500"
                    )}>
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      {/* SECTION 4: INVOICE STATUS SYSTEM */}
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                        invoice.status === 'paid' ? 'bg-green-50 text-green-600 border-green-100 shadow-sm' :
                        invoice.status === 'payment_reported' ? 'bg-amber-50 text-amber-600 border-amber-100 shadow-sm' :
                        isOverdue(invoice) ? 'bg-red-50 text-red-600 border-red-100 shadow-sm' :
                        invoice.status === 'sent' ? 'bg-yellow-50 text-yellow-600 border-yellow-100 shadow-sm' :
                        'bg-slate-50 text-slate-400 border-slate-100 shadow-sm'
                      )}>
                        {invoice.status === 'paid' ? 'Settled' : 
                         invoice.status === 'payment_reported' ? 'Reported' : 
                         invoice.status}
                      </span>
                      {isOverdue(invoice) && invoice.status !== 'payment_reported' && invoice.recovery_stage && (
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mt-1 italic">
                          Stage: {invoice.recovery_stage.replace('_', ' ')}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {invoice.status === 'draft' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleQuickSend(invoice); }}
                            className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                            title="Send Invoice"
                          >
                            <Send size={14} />
                          </button>
                        )}
                        {invoice.status === 'sent' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(invoice); }}
                            className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all shadow-sm"
                            title="Mark as Paid"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                        <div className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                          <ChevronRight size={14} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              {/* SECTION 2: EMPTY STATE */}
              {sortedInvoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-24 px-6 text-center">
                    <div className="flex flex-col items-center max-w-xs mx-auto">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100 border-dashed mb-6">
                        <FileText size={32} />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mb-2 italic">No invoices created</h3>
                      <p className="text-slate-400 text-sm font-medium mb-8">Create your first invoice and start tracking payments</p>
                      <button 
                        onClick={() => {
                          if (isLimitReached) {
                            setShowUpgradeModal(true);
                          } else {
                            setIsNewModalOpen(true);
                          }
                        }}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-50 hover:bg-slate-900 transition-all"
                      >
                        Create Invoice
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="sm:hidden space-y-4">
        {sortedInvoices.map((invoice) => (
          <div 
            key={invoice.id}
            onClick={() => setSelectedInvoice(invoice)}
            className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-black text-slate-900 tracking-tight text-sm leading-tight">{invoice.client?.name || invoice.snapshot_json?.name}</p>
                <p className="text-[8px] text-slate-400 font-mono font-bold uppercase tracking-widest mt-1">#{invoice.invoice_number}</p>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                invoice.status === 'paid' ? 'bg-green-50 text-green-600 border-green-100' :
                invoice.status === 'payment_reported' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                isOverdue(invoice) ? 'bg-red-50 text-red-600 border-red-100' :
                invoice.status === 'sent' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                'bg-slate-50 text-slate-400 border-slate-100'
              )}>
                {invoice.status === 'paid' ? 'Settled' : 
                 invoice.status === 'payment_reported' ? 'Reported' : 
                 isOverdue(invoice) ? 'Overdue' : invoice.status}
              </span>
            </div>
            
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Amount Due</p>
                <div className="flex items-center gap-2">
                  <p className="font-extrabold text-slate-900 text-lg">{formatCurrency(invoice.remainingBalance || invoice.amount)}</p>
                  {invoice.totalPaid && invoice.totalPaid > 0 && (
                     <p className="text-[8px] text-green-600 font-black uppercase bg-green-50 px-1.5 py-0.5 rounded-lg border border-green-100">+{formatCurrency(invoice.totalPaid)}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Due Date</p>
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                   isOverdue(invoice) ? "text-red-500 italic" : "text-slate-600"
                )}>
                  {new Date(invoice.due_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
              <RiskBadge level={
                 isOverdue(invoice) 
                   ? (invoice.remainingBalance && invoice.remainingBalance > 50000 ? 'critical' : 'high')
                   : 'minimal'
              } />
              <div className="flex gap-2">
                {invoice.status === 'draft' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleQuickSend(invoice); }}
                    className="p-2.5 rounded-xl bg-slate-900 text-white shadow-lg active:scale-95"
                  >
                    <Send size={14} />
                  </button>
                )}
                {invoice.status === 'sent' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(invoice); }}
                    className="p-2.5 rounded-xl bg-green-600 text-white shadow-lg active:scale-95"
                  >
                    <CheckCircle size={14} />
                  </button>
                )}
                <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400">
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FAB for Mobile */}
      <div className="sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full px-6 flex justify-center pointer-events-none">
        <button 
          onClick={() => {
            if (isLimitReached) {
              setShowUpgradeModal(true);
            } else {
              setIsNewModalOpen(true);
            }
          }}
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all active:scale-90 pointer-events-auto",
            isLimitReached ? "bg-slate-200 text-slate-400" : "bg-slate-900 text-white shadow-slate-300"
          )}
        >
          {isLimitReached ? <Zap size={24} /> : <Plus size={24} />}
        </button>
      </div>

      <InvoiceModal 
        isOpen={isNewModalOpen} 
        onClose={() => setIsNewModalOpen(false)} 
        clients={clients}
        onSuccess={fetchData}
      />

      {selectedInvoice && (
        <InvoiceDetailModal 
          invoice={selectedInvoice} 
          onClose={() => setSelectedInvoice(null)} 
          onUpdate={fetchData}
        />
      )}

      {/* Floating Bulk Toolbar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 sm:px-8 py-4 sm:py-5 rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl z-50 flex items-center gap-4 sm:gap-8 border border-white/10 backdrop-blur-xl w-[90%] sm:w-auto overflow-x-auto scrollbar-hide"
          >
             <div className="flex items-center gap-3 pr-4 sm:pr-8 border-r border-white/10 shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black italic text-xs sm:text-sm">
                   {selectedIds.length}
                </div>
                <div className="hidden sm:block">
                   <p className="text-[10px] font-black uppercase tracking-widest leading-none">Nodes Selected</p>
                   <p className="text-[9px] font-bold text-white/40 mt-1 uppercase">Mass Operation Active</p>
                </div>
             </div>

             <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <BulkButton onClick={() => handleBulkAction('pause')} icon={<Pause size={14} />}>Pause</BulkButton>
                <BulkButton onClick={() => handleBulkAction('resume')} icon={<Play size={14} />}>Resume</BulkButton>
                <BulkButton onClick={() => handleBulkAction('nudge')} variant="indigo" icon={<Zap size={14} />}>Mass Nudge</BulkButton>
                <button 
                  onClick={() => setSelectedIds([])}
                  className="p-2 sm:p-3 hover:bg-white/10 rounded-xl transition-all"
                >
                   <X size={16} />
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BulkButton({ children, icon, onClick, variant = 'ghost' }: { 
  children: React.ReactNode, 
  icon: React.ReactNode, 
  onClick: () => void,
  variant?: 'ghost' | 'indigo'
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
        variant === 'indigo' ? "bg-indigo-600 hover:bg-indigo-700" : "hover:bg-white/10"
      )}
    >
      {icon} {children}
    </button>
  );
}

function FilterButton({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all",
        active ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "hover:bg-slate-50 text-slate-400"
      )}
    >
      {children}
    </button>
  );
}
