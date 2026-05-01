import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Invoice, Client, InvoiceStatus } from '../types';
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
  Zap
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import InvoiceModal from './InvoiceModal';
import InvoiceDetailModal from './InvoiceDetailModal';
import UpgradeModal from './UpgradeModal';
import { usePlan } from '../contexts/PlanContext';

export default function InvoicesView() {
  const { isLimitReached, refreshPlanData } = usePlan();
  const [invoices, setInvoices] = useState<(Invoice & { totalPaid?: number; remainingBalance?: number })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filters, setFilters] = useState<InvoiceStatus | 'all'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    await refreshPlanData();
    const [invRes, cliRes] = await Promise.all([
      supabase.from('invoices').select('*, client:clients(*)').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').order('name')
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
  // Default: overdue first -> upcoming (by due date) -> paid
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const isOverdueA = (inv: Invoice) => inv.status !== 'paid' && new Date(inv.due_date) < new Date();
    const isOverdueB = (inv: Invoice) => inv.status !== 'paid' && new Date(inv.due_date) < new Date();
    
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-1 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm overflow-x-auto">
          <FilterButton active={filters === 'all'} onClick={() => setFilters('all')}>All</FilterButton>
          <FilterButton active={filters === 'paid'} onClick={() => setFilters('paid')}>Paid</FilterButton>
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
            "px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center space-x-2 transition-all shadow-2xl active:scale-95 w-full sm:w-auto",
            isLimitReached 
              ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200" 
              : "bg-indigo-600 text-white hover:bg-slate-900 shadow-indigo-100"
          )}
        >
          {isLimitReached ? <Zap size={14} /> : <Plus size={14} />}
          <span>{isLimitReached ? 'Upgrade to Create' : 'Create Invoice'}</span>
        </button>
      </div>

      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />

      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-3 text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Client Name</th>
                <th className="px-6 py-3 text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-3 text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Due Date</th>
                <th className="px-6 py-3 text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedInvoices.map((invoice) => (
                <tr 
                  key={invoice.id} 
                  className="hover:bg-indigo-50/20 transition-colors group cursor-pointer h-16"
                  onClick={() => setSelectedInvoice(invoice)}
                >
                  <td className="px-6 py-3">
                    <p className="font-black text-slate-900 tracking-tight text-sm leading-none">{invoice.client?.name || invoice.snapshot_json?.name}</p>
                    <p className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-widest mt-1 leading-none">#{invoice.invoice_number}</p>
                  </td>
                  <td className="px-6 py-3">
                    <p className="font-black text-slate-900 text-sm">{formatCurrency(invoice.amount)}</p>
                    {invoice.totalPaid && invoice.totalPaid > 0 && (
                      <p className="text-[9px] text-green-600 font-black uppercase mt-0.5 leading-none">{formatCurrency(invoice.totalPaid)}</p>
                    )}
                  </td>
                  <td className={cn(
                    "px-6 py-3 text-[10px] font-black uppercase tracking-widest",
                    isOverdue(invoice) ? "text-red-500 italic" : "text-slate-500"
                  )}>
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {/* SECTION 4: INVOICE STATUS SYSTEM */}
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                      invoice.status === 'paid' ? 'bg-green-50 text-green-600 border-green-100 shadow-sm' :
                      isOverdue(invoice) ? 'bg-red-50 text-red-600 border-red-100 shadow-sm' :
                      invoice.status === 'sent' ? 'bg-yellow-50 text-yellow-600 border-yellow-100 shadow-sm' :
                      'bg-slate-50 text-slate-400 border-slate-100 shadow-sm'
                    )}>
                      {invoice.status === 'paid' ? 'Settled' : invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                      <ChevronRight size={14} />
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
                        onClick={() => setIsNewModalOpen(true)}
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
    </div>
  );
}

function FilterButton({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
        active ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "hover:bg-slate-50 text-slate-400"
      )}
    >
      {children}
    </button>
  );
}
