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
import { UpgradeModal } from './UpgradeModal';
import { RiskBadge } from './RiskBadge';
import { usePlan } from '../contexts/PlanContext';
import { useUsageLimits } from '../hooks/useUsageLimits';
import { useOrganization } from '../contexts/OrganizationContext';
import { useUserRole } from '../hooks/useUserRole';
import { recoveryService } from '../lib/recoveryService';

export default function InvoicesView() {
  const { profile, refreshPlanData } = usePlan();
  const { canCreateInvoice, refresh: refreshUsage } = useUsageLimits();
  const isLimitReached = !canCreateInvoice;
  const { currentOrganization } = useOrganization();
  const { capabilities = { canManageInvoices: false } } = useUserRole() || {};
  const canWrite = capabilities.canManageInvoices;
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
      await recoveryService.sendInvoice({
        to: clientInfo.email,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        business_name: currentOrganization?.name || 'Business',
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
      
      await supabase.from('payments').insert([{
        invoice_id: invoice.id,
        organization_id: invoice.organization_id,
        amount: invoice.amount,
        method: 'cash',
        paid_at: new Date().toISOString()
      }]);

      await supabase.from('audit_log').insert({
        entity_id: invoice.id,
        entity_type: 'invoice',
        audit_type: 'invoice_paid',
        organization_id: invoice.organization_id,
        user_id: profile?.id,
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

    if (!currentOrganization) return;

    const channel = supabase
      .channel('invoice_status_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'invoices',
        filter: `organization_id=eq.${currentOrganization.id}`
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrganization]);

  async function fetchData() {
    if (!currentOrganization) return;
    await refreshPlanData();
    try {
      const [invRes, cliRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, client:clients(*), payments(*)')
          .eq('organization_id', currentOrganization.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('clients')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .order('name')
      ]);
      
      if (!invRes.error && invRes.data) {
        const computedInvoices = invRes.data.map(inv => {
          const invPayments = inv.payments || [];
          const totalPaid = invPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
          return {
            ...inv,
            totalPaid,
            remainingBalance: Math.max(0, inv.amount - totalPaid)
          };
        });
        setInvoices(computedInvoices);
      }
      if (!cliRes.error && cliRes.data) setClients(cliRes.data);
    } catch (e) {
      console.error('Error in InvoicesView fetchData:', e);
    } finally {
      setLoading(false);
    }
  }

  const filteredInvoices = invoices.filter(inv => 
    filters === 'all' ? true : inv.status === filters
  );

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
        <div className="flex items-center space-x-1 bg-[#111111] border border-[#222222] p-1 rounded-lg overflow-x-auto">
          <FilterButton active={filters === 'all'} onClick={() => setFilters('all')}>All</FilterButton>
          <FilterButton active={filters === 'paid'} onClick={() => setFilters('paid')}>Paid</FilterButton>
          <FilterButton active={filters === 'payment_reported'} onClick={() => setFilters('payment_reported')}>Reported</FilterButton>
          <FilterButton active={filters === 'sent'} onClick={() => setFilters('sent')}>Sent</FilterButton>
          <FilterButton active={filters === 'draft'} onClick={() => setFilters('draft')}>Draft</FilterButton>
        </div>
        {canWrite && (
          <button 
            onClick={() => {
              if (isLimitReached) {
                setShowUpgradeModal(true);
              } else {
                setIsNewModalOpen(true);
              }
            }}
            className={cn(
              "px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all w-full sm:w-auto",
              isLimitReached 
                ? "bg-[#161616] border border-[#222222] text-[#444444] cursor-not-allowed" 
                : "bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808]"
            )}
          >
            {isLimitReached ? <Zap size={14} /> : <Plus size={14} />}
            <span>{isLimitReached ? 'Upgrade to Create' : 'Create Invoice'}</span>
          </button>
        )}
      </div>

      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />

      <div className="hidden md:block bento-card overflow-hidden bg-[#111111] border border-[#222222] rounded-xl">
        <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="bg-[#161616] border-b border-[#222222]">
                  <th className="px-5 py-3 w-12 text-center">
                    <input 
                      type="checkbox" 
                      onChange={toggleSelectAll}
                      checked={selectedIds.length === sortedInvoices.length && sortedInvoices.length > 0}
                      className="rounded border-[#222222] bg-[#080808] text-[#C8FF00] focus:ring-0 checked:bg-[#C8FF00]"
                    />
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-[#888888] uppercase tracking-wider font-mono">Counterparty</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[#888888] uppercase tracking-wider font-mono">Amount</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[#888888] uppercase tracking-wider font-mono text-center">Risk</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[#888888] uppercase tracking-wider font-mono">Due Date</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[#888888] uppercase tracking-wider font-mono text-center">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]/50 text-xs">
                {sortedInvoices.map((invoice) => (
                  <tr 
                    key={invoice.id} 
                    className={cn(
                      "hover:bg-[#161616]/40 transition-colors group cursor-pointer h-16",
                      selectedIds.includes(invoice.id) && "bg-[#161616]/60"
                    )}
                    onClick={() => setSelectedInvoice(invoice)}
                  >
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                       <input 
                         type="checkbox"
                         checked={selectedIds.includes(invoice.id)}
                         onChange={(e) => toggleSelect(invoice.id, e as any)}
                         className="rounded border-[#222222] bg-[#080808] text-[#C8FF00] focus:ring-0 checked:bg-[#C8FF00]"
                       />
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-[#EEEEEE] text-sm leading-none">{invoice.client?.name || invoice.snapshot_json?.name}</p>
                      <p className="text-[10px] text-[#444444] font-mono uppercase mt-1">#{invoice.invoice_number}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-[#EEEEEE] text-sm">{formatCurrency(invoice.amount)}</p>
                      {invoice.totalPaid && invoice.totalPaid > 0 && (
                        <p className="text-[10px] text-[#10B981] font-semibold uppercase mt-0.5 leading-none">{formatCurrency(invoice.totalPaid)}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                       <RiskBadge level={
                         isOverdue(invoice) 
                           ? (invoice.remainingBalance && invoice.remainingBalance > 50000 ? 'critical' : 'high')
                           : 'minimal'
                       } />
                    </td>
                    <td className={cn(
                      "px-5 py-3 text-xs font-mono",
                      isOverdue(invoice) ? "text-[#EF4444]" : "text-[#888888]"
                    )}>
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-center border-none">
                      <StatusBadge status={invoice.status} isOverdue={isOverdue(invoice)} />
                      {isOverdue(invoice) && invoice.status !== 'payment_reported' && invoice.recovery_stage && (
                        <p className="text-[9px] text-[#444444] uppercase tracking-wider mt-1.5 font-mono">
                          Stage: {invoice.recovery_stage.replace('_', ' ')}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canWrite && invoice.status === 'draft' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleQuickSend(invoice); }}
                            className="p-1.5 rounded-lg bg-[#3B82F610] border border-[#3B82F620] text-[#3B82F6] hover:bg-[#3B82F620] transition-all"
                            title="Send Invoice"
                          >
                            <Send size={13} />
                          </button>
                        )}
                        {canWrite && invoice.status === 'sent' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(invoice); }}
                            className="p-1.5 rounded-lg bg-[#10B98110] border border-[#10B98120] text-[#10B981] hover:bg-[#10B98120] transition-all"
                            title="Verify Payment"
                          >
                            <CheckCircle size={13} />
                          </button>
                        )}
                        <div className="inline-flex items-center justify-center p-1.5 rounded-lg bg-[#161616] border border-[#222222] text-[#888888] group-hover:text-[#EEEEEE] group-hover:border-[#444444] transition-all">
                          <ChevronRight size={13} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              {sortedInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-24 px-6 text-center">
                    <div className="flex flex-col items-center max-w-xs mx-auto">
                      <div className="w-12 h-12 bg-[#161616] border border-[#222222] rounded-xl flex items-center justify-center text-[#888888] mb-4">
                        <FileText size={22} />
                      </div>
                      <h3 className="text-base font-semibold text-[#EEEEEE] mb-1">No invoices found</h3>
                      <p className="text-[#888888] text-xs font-normal mb-6">Create your first invoice to start tracking payments.</p>
                      <button 
                        onClick={() => {
                          if (isLimitReached) {
                            setShowUpgradeModal(true);
                          } else {
                            setIsNewModalOpen(true);
                          }
                        }}
                        className="bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] px-4 py-2 rounded-lg font-semibold text-xs transition-all"
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
      <div className="md:hidden space-y-3">
        {sortedInvoices.map((invoice) => {
          const overdueDays = Math.max(0, Math.floor((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)));
          
          return (
            <div 
              key={invoice.id}
              onClick={() => setSelectedInvoice(invoice)}
              className="bg-[#111111] border border-[#222222] rounded-xl p-4 active:scale-[0.99] transition-all text-left"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-[#EEEEEE] text-sm break-words max-w-[70%]">
                  {invoice.client?.name || invoice.snapshot_json?.name}
                </span>
                <StatusBadge status={invoice.status} isOverdue={isOverdue(invoice)} />
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-[#444444] font-mono">#{invoice.invoice_number}</span>
                <span className="font-bold text-[#EEEEEE] text-sm">
                  {formatCurrency(invoice.remainingBalance || invoice.amount)}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-xs text-[#888888] flex items-center gap-1.5 flex-wrap font-mono">
                  <span>Due {new Date(invoice.due_date).toLocaleDateString()}</span>
                  {isOverdue(invoice) && invoice.status !== 'paid' && (
                    <span className="text-[#EF4444] font-semibold">• {overdueDays} days overdue</span>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                {canWrite && invoice.status === 'draft' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleQuickSend(invoice); }}
                    className="w-full py-2 bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] rounded-lg text-xs font-semibold transition-all"
                  >
                    Send Invoice
                  </button>
                )}
                {canWrite && invoice.status === 'sent' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(invoice); }}
                    className="w-full py-2 bg-[#10B981] hover:bg-[#10B981e0] text-white rounded-lg text-xs font-semibold transition-all"
                  >
                    Mark as Paid
                  </button>
                )}
                {canWrite && invoice.status === 'payment_reported' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedInvoice(invoice); }}
                    className="w-full py-2 bg-[#F59E0B] hover:bg-[#f59e0be0] text-white rounded-lg text-xs font-semibold transition-all"
                  >
                    Verify Payment
                  </button>
                )}
                {(invoice.status === 'paid' || !canWrite) && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedInvoice(invoice); }}
                    className="w-full py-2 bg-[#161616] border border-[#222222] text-[#EEEEEE] rounded-lg text-xs font-semibold transition-all"
                  >
                    View Details
                  </button>
                )}
              </div>
            </div>
          );
        })}
        
        {sortedInvoices.length === 0 && (
          <div className="py-12 px-6 text-center bg-[#111111] border border-[#222222] rounded-xl">
             <FileText className="mx-auto text-[#444444] mb-4" size={32} />
             <p className="text-[#888888] font-semibold tracking-wider text-xs uppercase">No invoices found</p>
          </div>
        )}
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

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {canWrite && selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 bg-[#111111] border border-[#222222] text-[#EEEEEE] px-4 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-4 w-[90%] sm:w-auto"
          >
             <div className="flex items-center gap-3 pr-4 border-r border-[#222222] shrink-0 text-left">
                <div className="w-8 h-8 bg-[#C8FF00] text-[#080808] rounded-lg flex items-center justify-center font-bold text-xs select-none">
                   {selectedIds.length}
                </div>
                <div>
                   <p className="text-[10px] font-semibold uppercase tracking-wider leading-none text-[#EEEEEE]">Selected</p>
                   <p className="text-[9px] text-[#888888] mt-1 uppercase font-mono">Mass Ops</p>
                </div>
             </div>

             <div className="flex items-center gap-2 shrink-0">
                <BulkButton onClick={() => handleBulkAction('pause')} icon={<Pause size={13} />}>Pause</BulkButton>
                <BulkButton onClick={() => handleBulkAction('resume')} icon={<Play size={13} />}>Resume</BulkButton>
                <BulkButton onClick={() => handleBulkAction('nudge')} variant="lime" icon={<Zap size={13} />}>Send Reminders</BulkButton>
                <button 
                  onClick={() => setSelectedIds([])}
                  className="p-1.5 bg-[#161616] hover:bg-[#222222] border border-[#222222] rounded-lg text-[#888888] hover:text-[#EEEEEE] transition-all"
                >
                   <X size={14} />
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
  variant?: 'ghost' | 'lime'
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
        variant === 'lime' ? "bg-[#C8FF00] text-[#080808] hover:bg-[#b8ef00]" : "text-[#888888] hover:text-[#EEEEEE] hover:bg-[#1a1a1a]"
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
        "px-3 py-1 text-xs font-semibold rounded-md transition-all",
        active ? "bg-[#C8FF00] text-[#080808]" : "hover:text-[#EEEEEE] hover:bg-[#161616] text-[#888888]"
      )}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status, isOverdue }: { status: string, isOverdue: boolean }) {
  if (status === 'paid') return (
    <span className="px-2 py-0.5 bg-[#10B98115] text-[#10B981] border border-[#10B98125] rounded-lg text-[10px] font-medium uppercase tracking-wider font-mono">
      Settled
    </span>
  );
  if (status === 'payment_reported') return (
    <span className="px-2 py-0.5 bg-[#F59E0B15] text-[#F59E0B] border border-[#F59E0B25] rounded-lg text-[10px] font-medium uppercase tracking-wider font-mono">
      Reported
    </span>
  );
  if (isOverdue) return (
    <span className="px-2 py-0.5 bg-[#EF444415] text-[#EF4444] border border-[#EF444425] rounded-lg text-[10px] font-medium uppercase tracking-wider font-mono animate-pulse">
      Overdue
    </span>
  );
  if (status === 'sent') return (
    <span className="px-2 py-0.5 bg-[#3B82F615] text-[#3B82F6] border border-[#3B82F625] rounded-lg text-[10px] font-medium uppercase tracking-wider font-mono">
      Sent
    </span>
  );
  return (
    <span className="px-2 py-0.5 bg-[#111111] text-[#888888] border border-[#222222] rounded-lg text-[10px] font-medium uppercase tracking-wider font-mono">
      Draft
    </span>
  );
}
