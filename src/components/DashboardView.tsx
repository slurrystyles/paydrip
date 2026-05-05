import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Invoice, Client } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  ChevronRight,
  FileText,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

// Components
import InvoiceModal from './InvoiceModal';
import InvoiceDetailModal from './InvoiceDetailModal';
import UpgradeModal from './UpgradeModal';
import { usePlan } from '../contexts/PlanContext';

export default function DashboardView() {
  const { plan, isLimitReached, refreshPlanData } = usePlan();
  const [invoices, setInvoices] = useState<(Invoice & { totalPaid?: number; remainingBalance?: number })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  async function fetchData() {
    setLoading(true);
    await refreshPlanData();
    const { data: invData, error: invError } = await supabase
      .from('invoices')
      .select('*, client:clients(*)')
      .order('created_at', { ascending: false });
    
    if (!invError && invData) {
      // Fetch payments for these invoices to calculate balances
      const invoiceIds = invData.map(i => i.id);
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .in('invoice_id', invoiceIds);

      const computedInvoices = invData.map(inv => {
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

    const { data: clientData } = await supabase.from('clients').select('*').order('name');
    if (clientData) setClients(clientData);

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const totalOutstanding = invoices
    .reduce((sum, i) => sum + (i.remainingBalance ?? i.amount), 0);

  const totalPaid = invoices
    .reduce((sum, i) => sum + (i.totalPaid || 0), 0);

  const navigate = useNavigate();

  // Business Rule: Computed Overdue Status
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const isOverdue = (invoice: Invoice) => {
    const dueDate = new Date(invoice.due_date);
    return invoice.status !== 'paid' && dueDate < now;
  };

  const totalOverall = totalPaid + totalOutstanding;
  const collectionRate = totalOverall > 0 ? Math.round((totalPaid / totalOverall) * 100) : 0;
  const overdueAmount = invoices.filter(isOverdue).reduce((sum, i) => sum + (i.remainingBalance ?? i.amount), 0);

  if (loading) return (
    <div className="animate-pulse space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-3xl" />)}
      </div>
      <div className="h-96 bg-slate-50 rounded-3xl" />
    </div>
  );

  // SECTION 1: ONBOARDING EXPERIENCE
  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full bento-card p-12 bg-white shadow-2xl shadow-indigo-100/50"
        >
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-indigo-200">
            <FileText size={40} />
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4 italic">Get your first payment faster</h2>
          <p className="text-slate-500 font-medium mb-12">Create and send your first invoice in under a minute.</p>
          
          <div className="space-y-6 text-left mb-12 max-w-sm mx-auto flex flex-col">
            {[
              "Update your System Settings",
              "Add a client",
              "Create an invoice",
              "Send via WhatsApp"
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-sm">{i + 1}</div>
                <span className="font-bold text-slate-700">{step}</span>
              </div>
            ))}
          </div>

          <button 
            onClick={() => {
              if (isLimitReached) {
                setShowUpgradeModal(true);
              } else {
                setIsInvoiceModalOpen(true);
              }
            }}
            className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-900 transition-all shadow-xl shadow-indigo-200 active:scale-95"
          >
            Create First Invoice
          </button>
          <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">No setup required</p>
        </motion.div>

        <InvoiceModal 
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          clients={clients}
          onSuccess={fetchData}
        />
      </div>
    );
  }

  // Define sorting rules: overdue first, then upcoming (due date closest to now), then paid
  const sortedInvoices = [...invoices].sort((a, b) => {
    const isAOverdue = isOverdue(a);
    const isBOverdue = isOverdue(b);
    
    if (isAOverdue && !isBOverdue) return -1;
    if (!isAOverdue && isBOverdue) return 1;
    
    if (a.status === 'paid' && b.status !== 'paid') return 1;
    if (a.status !== 'paid' && b.status === 'paid') return -1;
    
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  const overdueInvoices = invoices.filter(isOverdue);
  const overdueCount = overdueInvoices.length;

  return (
    <div className="space-y-4 pb-8">
      {/* SECTION 7: AUTOMATION NUDGE */}
      {overdueCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-indigo-900 text-white rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl shadow-indigo-100 overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
              <Zap size={24} className="text-white fill-white animate-pulse" />
            </div>
            <div>
              <h4 className="text-lg font-black tracking-tighter italic leading-tight">Automation Suggestion</h4>
              <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mt-0.5">
                {overdueCount} {overdueCount === 1 ? 'Ledger Node' : 'Ledger Nodes'} overdue for settlement
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/invoices')}
            className="w-full sm:w-auto px-8 py-3.5 bg-white text-indigo-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all active:scale-95 shadow-xl relative z-10 flex items-center justify-center gap-2"
          >
            Deploy Reminders
            <ChevronRight size={14} />
          </button>
        </motion.div>
      )}

      {/* SECTION 3: DASHBOARD CLARITY - TOP METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard 
          label="Money in Flight" 
          value={formatCurrency(totalOutstanding)} 
          subtext="Total Pending"
          color="neutral"
          icon={<Clock size={20} />}
        />
        <MetricCard 
          label="Settled Funds" 
          value={formatCurrency(totalPaid)} 
          subtext="Total Paid"
          color="green"
          icon={<CheckCircle2 size={20} />}
        />
        <MetricCard 
          label="Risk Exposure" 
          value={formatCurrency(overdueAmount)} 
          subtext="Overdue Amount"
          color="red"
          icon={<AlertCircle size={20} />}
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Main Invoices Card */}
        <div className="col-span-12 lg:col-span-8 bento-card p-5 flex flex-col min-h-[350px]">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
            <div>
              <h2 className="font-black text-slate-900 text-xl tracking-tighter italic leading-tight">Ledger Overview</h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sorting: Priority Status</p>
            </div>
            {/* SECTION 5: BUTTON HIERARCHY - PRIMARY */}
            <div className="flex flex-col sm:flex-row gap-2">
              {plan === 'free' && (
                <div className="px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between gap-2.5">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-indigo-600 leading-none">Free Tier</p>
                    <p className="text-[8px] text-slate-400 font-mono mt-1 leading-none">{invoices.length}/5 Invoices</p>
                  </div>
                  <button 
                    onClick={() => setShowUpgradeModal(true)}
                    className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100"
                  >
                    <Zap size={10} className="fill-white" />
                  </button>
                </div>
              )}
              <button 
                onClick={() => {
                  if (isLimitReached) {
                    setShowUpgradeModal(true);
                  } else {
                    setIsInvoiceModalOpen(true);
                  }
                }}
                className={cn(
                  "px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 w-full sm:w-auto flex items-center justify-center gap-2",
                  isLimitReached 
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200" 
                    : "bg-indigo-600 text-white hover:bg-slate-900 shadow-indigo-100"
                )}
              >
                + Create Invoice
                {isLimitReached && <Clock size={10} />}
              </button>
            </div>
          </div>

          {isLimitReached && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-5 bg-red-50 border border-red-100 rounded-[1.5rem] flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                <AlertCircle size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight italic">Free limit reached</h4>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5 italic">Upgrade to Pro to create more invoices.</p>
              </div>
              <button 
                onClick={() => setShowUpgradeModal(true)}
                className="px-4 py-2.5 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-95"
              >
                Upgrade Now
              </button>
            </motion.div>
          )}

          {/* SECTION 6: INVOICE TABLE IMPROVEMENTS */}
          <div className="flex-1 overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-left min-w-[700px]">
              <thead className="text-[9px] font-black text-slate-400 uppercase border-b border-slate-100 tracking-[0.15em] font-mono">
                <tr className="h-10">
                  <th className="px-5">Identity</th>
                  <th className="px-5">Total</th>
                  <th className="px-5">Balance</th>
                  <th className="px-5">Due Date</th>
                  <th className="px-5">Status</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {sortedInvoices.slice(0, 8).map((invoice) => (
                  <tr 
                    key={invoice.id} 
                    onClick={() => setSelectedInvoice(invoice)}
                    className="h-14 border-b border-slate-50 hover:bg-indigo-50/20 transition-all cursor-pointer group"
                  >
                    <td className="px-5">
                      <p className="font-black text-slate-900 text-xs tracking-tight leading-none">{invoice.client?.name}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest font-mono">#{invoice.invoice_number}</p>
                    </td>
                    <td className="px-5 font-black text-slate-900">{formatCurrency(invoice.amount)}</td>
                    <td className={`px-5 font-black ${invoice.remainingBalance === 0 ? 'text-slate-300' : 'text-indigo-600'}`}>
                      {formatCurrency(invoice.remainingBalance ?? invoice.amount)}
                    </td>
                    <td className={`px-5 text-[9px] font-black uppercase tracking-widest ${isOverdue(invoice) ? 'text-red-500 italic' : 'text-slate-400'}`}>
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-5">{/* SECTION 4: INVOICE STATUS SYSTEM */}
                       <StatusBadge status={invoice.status} isOverdue={isOverdue(invoice)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {invoices.length > 8 && (
            <button 
              onClick={() => navigate('/invoices')}
              className="mt-8 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:text-slate-900 flex justify-center items-center gap-2 group mx-auto"
            >
              Full Ledger Vault
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>

        {/* Right Rail */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Collection Rate */}
          <div className="bento-card p-5 group">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono mb-2">Liquidity Ratio</p>
            <div className="flex justify-between items-end mb-3">
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">{collectionRate}%</h3>
              <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shadow-lg border border-green-50">
                 <TrendingUp size={18} />
              </div>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner">
              <div 
                className="bg-green-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(34,197,94,0.3)]" 
                style={{ width: `${collectionRate}%` }}
              ></div>
            </div>
          </div>

          {/* System Status */}
          <div className="bento-card bg-slate-900 border-none p-5 text-white group overflow-hidden relative" id="system-status-card">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full -mr-12 -mt-12 blur-2xl transition-transform group-hover:scale-150 duration-700"></div>
            <h4 className="font-black text-[9px] uppercase tracking-widest mb-1 italic">Security Protocol</h4>
            <p className="text-[8px] text-slate-500 font-mono mb-4 uppercase tracking-widest">Node: Online</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                  <CheckCircle2 size={14} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest leading-none">AES-256 E2E</p>
                  <p className="text-[8px] text-slate-500 mt-1 font-mono uppercase">Full Encryption</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                  <TrendingUp size={14} className="text-green-400" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest leading-none">Global Sync</p>
                  <p className="text-[8px] text-green-500/50 mt-1 font-mono uppercase">High Propagation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <InvoiceModal 
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        clients={clients}
        onSuccess={fetchData}
      />
      
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
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

function MetricCard({ label, value, subtext, color, icon }: { 
  label: string; 
  value: string; 
  subtext: string;
  color: 'neutral' | 'green' | 'red';
  icon: React.ReactNode;
}) {
  const colors = {
    neutral: 'bg-slate-50 text-slate-400 border-slate-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    red: 'bg-red-50 text-red-600 border-red-100'
  };

  const iconColors = {
    neutral: 'bg-slate-100 text-slate-600',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700'
  };

  return (
    <div className="bento-card p-5 group relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700 opacity-10 ${iconColors[color].split(' ')[0]}`}></div>
      <div className="flex justify-between items-start relative z-10 mb-4">
        <div>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono leading-none">{label}</p>
          <h3 className="text-xl font-black text-slate-900 mt-1 tracking-tighter italic leading-none">{value}</h3>
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110 duration-300 border border-slate-100/10 ${iconColors[color]}`}>
          {React.cloneElement(icon as React.ReactElement, { size: 16 })}
        </div>
      </div>
      <div className="flex items-center gap-2 relative z-10">
        <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border ${colors[color]}`}>
          {subtext}
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status, isOverdue }: { status: string, isOverdue: boolean }) {
  if (status === 'paid') return (
    <span className="px-2 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded-full text-[9px] font-black uppercase tracking-widest">
      Settled
    </span>
  );
  if (isOverdue) return (
    <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">
      Overdue
    </span>
  );
  if (status === 'sent') return (
    <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 border border-yellow-100 rounded-full text-[9px] font-black uppercase tracking-widest">
      Sent
    </span>
  );
  return (
    <span className="px-2 py-0.5 bg-slate-50 text-slate-400 border border-slate-100 rounded-full text-[9px] font-black uppercase tracking-widest">
      Draft
    </span>
  );
}
