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
  AlertCircle
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import InvoiceModal from './InvoiceModal';
import InvoiceDetailModal from './InvoiceDetailModal';

export default function InvoicesView() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filters, setFilters] = useState<InvoiceStatus | 'all'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [invRes, cliRes] = await Promise.all([
      supabase.from('invoices').select('*, client:clients(*)').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').order('name')
    ]);
    
    if (!invRes.error && invRes.data) setInvoices(invRes.data);
    if (!cliRes.error && cliRes.data) setClients(cliRes.data);
    setLoading(false);
  }

  const filteredInvoices = invoices.filter(inv => 
    filters === 'all' ? true : inv.status === filters
  );

  const statusIcons = {
    paid: <CheckCircle className="text-green-500" size={14} />,
    overdue: <AlertCircle className="text-red-500" size={14} />,
    sent: <Send className="text-blue-500" size={14} />,
    draft: <Clock className="text-gray-400" size={14} />,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-1 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm">
          <FilterButton active={filters === 'all'} onClick={() => setFilters('all')}>All</FilterButton>
          <FilterButton active={filters === 'paid'} onClick={() => setFilters('paid')}>Paid</FilterButton>
          <FilterButton active={filters === 'sent'} onClick={() => setFilters('sent')}>Sent</FilterButton>
          <FilterButton active={filters === 'overdue'} onClick={() => setFilters('overdue')}>Overdue</FilterButton>
        </div>
        <button 
          onClick={() => setIsNewModalOpen(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center space-x-2 hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100 active:scale-95"
        >
          <Plus size={16} />
          <span>Generate Ledger</span>
        </button>
      </div>

      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Invoice Code</th>
                <th className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Client Identity</th>
                <th className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Total Amount</th>
                <th className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Current Status</th>
                <th className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Target Date</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredInvoices.map((invoice) => (
                <tr 
                  key={invoice.id} 
                  className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  onClick={() => setSelectedInvoice(invoice)}
                >
                  <td className="px-6 py-5 font-mono text-xs text-slate-500 tracking-tighter">
                    #{invoice.invoice_number}
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-black text-slate-900 tracking-tight">{invoice.client?.name || invoice.snapshot_json?.name}</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none mt-1">{invoice.client?.email || invoice.snapshot_json?.email}</p>
                  </td>
                  <td className="px-6 py-5 font-black text-slate-900 text-sm">
                    {formatCurrency(invoice.amount)}
                  </td>
                  <td className="px-6 py-5 uppercase tracking-widest text-[9px] font-black">
                    <span className={cn(
                      "px-3 py-1 rounded-full shadow-sm border",
                      invoice.status === 'paid' ? 'bg-green-50 text-green-600 border-green-100' :
                      invoice.status === 'overdue' ? 'bg-red-50 text-red-600 border-red-100' :
                      invoice.status === 'sent' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                    )}>
                      {invoice.status === 'paid' ? 'Settled' : invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-xs font-medium text-slate-500 italic">
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                      <ChevronRight size={16} />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic text-sm">
                    No matching ledger entries found.
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
