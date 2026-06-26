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
import { UpgradeModal } from './UpgradeModal';
import { usePlan } from '../contexts/PlanContext';
import { useUsageLimits } from '../hooks/useUsageLimits';
import { useOrganization } from '../contexts/OrganizationContext';
import { useUserRole } from '../hooks/useUserRole';

// Simple client-side cache for instantaneous transitions
let globalCachedInvoices: any[] = [];
let globalCachedClients: any[] = [];
let globalCachedOrgId: string | null = null;

export default function DashboardView() {
  const { plan, refreshPlanData } = usePlan();
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const { limits, canCreateInvoice, isLoading: isUsageLoading } = useUsageLimits();
  const isLimitReached = !canCreateInvoice;
  const { currentOrganization } = useOrganization();
  const { capabilities = { canManageInvoices: false } } = useUserRole() || {};
  const canUpdate = capabilities.canManageInvoices;
  
  const [invoices, setInvoices] = useState<(Invoice & { totalPaid?: number; remainingBalance?: number })[]>(() => {
    if (globalCachedOrgId && currentOrganization && globalCachedOrgId === currentOrganization.id) {
      return globalCachedInvoices;
    }
    return [];
  });
  const [clients, setClients] = useState<Client[]>(() => {
    if (globalCachedOrgId && currentOrganization && globalCachedOrgId === currentOrganization.id) {
      return globalCachedClients;
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (globalCachedOrgId && currentOrganization && globalCachedOrgId === currentOrganization.id && globalCachedInvoices.length > 0) {
      return false;
    }
    return true;
  });
  
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  async function fetchData() {
    if (!currentOrganization) return;
    const orgId = currentOrganization.id;
    
    if (globalCachedOrgId !== orgId || globalCachedInvoices.length === 0) {
      setLoading(true);
    }
    
    await refreshPlanData();
    
    try {
      const [invRes, clientRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, client:clients(*), payments(*)')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        supabase
          .from('clients')
          .select('*')
          .eq('organization_id', orgId)
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
        globalCachedInvoices = computedInvoices;
      }
      
      if (!clientRes.error && clientRes.data) {
        setClients(clientRes.data);
        globalCachedClients = clientRes.data;
      }
      
      globalCachedOrgId = orgId;
    } catch (e) {
      console.error('Error in DashboardView fetchData:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!currentOrganization) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [currentOrganization]);

  useEffect(() => {
    const pending = sessionStorage.getItem(
      'pendingCheckout'
    );
    if (pending) {
      sessionStorage.removeItem('pendingCheckout');
      window.open(pending, '_blank');
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );
    if (params.get('upgraded') === 'true') {
      // Remove the query param from URL 
      // without page reload
      window.history.replaceState(
        {}, '', '/dashboard'
      );
      // Show success toast/banner
      setUpgradeSuccess(true);
      setTimeout(() => {
        setUpgradeSuccess(false);
      }, 5000);
    }
  }, []);

  const totalOutstanding = invoices
    .reduce((sum, i) => sum + (i.remainingBalance ?? i.amount), 0);

  const totalPaid = invoices
    .reduce((sum, i) => sum + (i.totalPaid || 0), 0);

  const navigate = useNavigate();

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const isOverdue = (invoice: Invoice) => {
    const dueDate = new Date(invoice.due_date);
    return invoice.status !== 'paid' && invoice.status !== 'payment_reported' && dueDate < now;
  };

  const totalOverall = totalPaid + totalOutstanding;
  const collectionRate = totalOverall > 0 ? Math.round((totalPaid / totalOverall) * 100) : 0;
  const overdueAmount = invoices.filter(isOverdue).reduce((sum, i) => sum + (i.remainingBalance ?? i.amount), 0);

  // SECTION 0: NO ORGANIZATION STATE
  if (!currentOrganization && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full bento-card p-12 bg-[#111111] border border-[#222222] rounded-xl"
        >
          <div className="w-16 h-16 bg-[#111111] border border-[#222222] rounded-xl flex items-center justify-center text-[#C8FF00] mx-auto mb-8">
            <Zap size={32} />
          </div>
          <h2 className="text-3xl font-bold text-[#EEEEEE] tracking-tight mb-4">Welcome to Paydrip</h2>
          <p className="text-[#888888] font-normal text-sm mb-12">Set up your workspace to start creating invoices and recovering payments.</p>
          
          <button 
            onClick={() => setShowCreateOrgModal(true)}
            className="w-full bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] py-4 rounded-lg font-semibold text-sm transition-all"
          >
            Create Organization
          </button>
        </motion.div>

        {showCreateOrgModal && (
          <CreateOrganizationModal 
            onClose={() => setShowCreateOrgModal(false)}
            onSuccess={() => {
              setShowCreateOrgModal(false);
              window.location.reload();
            }}
          />
        )}
      </div>
    );
  }

  if (loading) return (
    <div className="animate-pulse space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-[#111111] rounded-xl border border-[#222222]" />)}
      </div>
      <div className="h-96 bg-[#111111] border border-[#222222] rounded-xl" />
    </div>
  );

  // SECTION 1: ONBOARDING EXPERIENCE
  if (invoices.length === 0) {
    return (
      <>
        {upgradeSuccess && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 bg-[#111111] border border-[#C8FF00] text-[#EEEEEE] px-6 py-3 rounded-xl shadow-2xl shadow-[#C8FF00]/10 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-2 h-2 rounded-full bg-[#C8FF00]" />
            <p className="text-sm font-medium">
              Your plan has been upgraded successfully!
            </p>
            <button 
              onClick={() => setUpgradeSuccess(false)}
              className="text-[#888888] hover:text-[#EEEEEE] ml-2 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl w-full bento-card p-12 bg-[#111111] border border-[#222222] rounded-xl"
          >
            <div className="w-16 h-16 bg-[#111111] border border-[#222222] rounded-xl flex items-center justify-center text-[#C8FF00] mx-auto mb-8">
              <FileText size={32} />
            </div>
            <h2 className="text-3xl font-bold text-[#EEEEEE] tracking-tight mb-4">Get paid faster</h2>
            <p className="text-[#888888] font-normal text-sm mb-12">Create and send your first invoice in under a minute.</p>
            
            <div className="space-y-4 text-left mb-12 max-w-sm mx-auto flex flex-col">
              {[
                "Update your Settings",
                "Add a client",
                "Create an invoice",
                "Send via WhatsApp"
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#222222] flex items-center justify-center text-[#EEEEEE] font-medium text-sm">{i + 1}</div>
                  <span className="font-medium text-[#888888] text-sm">{step}</span>
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
              className="w-full bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] py-4 rounded-lg font-semibold text-sm transition-all"
            >
              Create First Invoice
            </button>
            <p className="mt-4 text-xs text-[#444444] uppercase tracking-widest font-semibold">No setup required</p>
          </motion.div>

          <InvoiceModal 
            isOpen={isInvoiceModalOpen}
            onClose={() => setIsInvoiceModalOpen(false)}
            clients={clients}
            onSuccess={fetchData}
          />
        </div>
      </>
    );
  }

  const sortedInvoices = [...invoices].sort((a, b) => {
    if (a.status === 'payment_reported' && b.status !== 'payment_reported') return -1;
    if (a.status !== 'payment_reported' && b.status === 'payment_reported') return 1;

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
      {upgradeSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 bg-[#111111] border border-[#C8FF00] text-[#EEEEEE] px-6 py-3 rounded-xl shadow-2xl shadow-[#C8FF00]/10 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-2 h-2 rounded-full bg-[#C8FF00]" />
          <p className="text-sm font-medium">
            Your plan has been upgraded successfully!
          </p>
          <button 
            onClick={() => setUpgradeSuccess(false)}
            className="text-[#888888] hover:text-[#EEEEEE] ml-2 transition-colors"
          >
            ✕
          </button>
        </div>
      )}
      {/* SECTION 7: AUTOMATION NUDGE */}
      {overdueCount > 0 && canUpdate && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-[#111111] border border-[#222222] text-[#EEEEEE] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden relative"
        >
          <div className="flex items-center gap-4 relative z-10 w-full sm:w-auto">
            <div className="w-12 h-12 bg-[#1a1a1a] border border-[#222222] rounded-xl flex items-center justify-center">
              <Zap size={22} className="text-[#C8FF00]" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#EEEEEE] leading-tight">Automation Suggestion</h4>
              <p className="text-xs text-[#888888] mt-1">
                {overdueCount} {overdueCount === 1 ? 'invoice' : 'invoices'} overdue for payment
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/invoices')}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#C8FF00] text-[#080808] hover:bg-[#b8ef00] rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2"
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
          subtext="Pending"
          color="neutral"
          icon={<Clock size={20} />}
        />
        <MetricCard 
          label="Recovered Funds" 
          value={formatCurrency(totalPaid)} 
          subtext="Recovered"
          color="green"
          icon={<CheckCircle2 size={20} />}
        />
        <MetricCard 
          label="Risk Exposure" 
          value={formatCurrency(overdueAmount)} 
          subtext="Overdue"
          color="red"
          icon={<AlertCircle size={20} />}
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Main Invoices Card */}
        <div className="col-span-12 lg:col-span-8 bento-card p-5 flex flex-col min-h-[350px] bg-[#111111] border border-[#222222] rounded-xl">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
            <div>
              <h2 className="font-bold text-[#EEEEEE] text-lg leading-tight">Invoices</h2>
              <p className="text-xs text-[#888888] mt-0.5">Priority Status Routing</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              {plan === 'free' && canUpdate && (
                <div className="px-3 py-1.5 bg-[#1a1a1a] border border-[#222222] rounded-lg flex items-center justify-between gap-3 text-left">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888888] leading-none">Free Plan</p>
                    <p className="text-[10px] text-[#444444] font-mono mt-0.5 leading-none">
                      {isUsageLoading ? '...' : `${limits.invoices_month.current}/${limits.invoices_month.limit}`} Invoices
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowUpgradeModal(true)}
                    className="p-1 px-1.5 bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] rounded text-[10px] font-bold"
                  >
                    Upgrade
                  </button>
                </div>
              )}
              {canUpdate && (
                <button 
                  onClick={() => {
                    if (isLimitReached) {
                      setShowUpgradeModal(true);
                    } else {
                      setIsInvoiceModalOpen(true);
                    }
                  }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-semibold transition-all w-full sm:w-auto flex items-center justify-center gap-2",
                    isLimitReached 
                      ? "bg-[#161616] border border-[#222222] text-[#444444] cursor-not-allowed" 
                      : "bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808]"
                  )}
                >
                  + Create Invoice
                </button>
              )}
            </div>
          </div>

          {isLimitReached && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-[#EF444410] border border-[#EF444420] rounded-lg flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-[#EF444415] text-[#EF4444] rounded-lg flex items-center justify-center">
                <AlertCircle size={18} />
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-xs font-semibold text-[#EEEEEE]">Free limit reached</h4>
                <p className="text-xs text-[#888888] mt-0.5">Upgrade to Pro to create more invoices.</p>
              </div>
              <button 
                onClick={() => setShowUpgradeModal(true)}
                className="px-3 py-1.5 bg-[#EF4444] hover:bg-[#df3434] text-white rounded-lg text-[10px] font-semibold transition-all"
              >
                Upgrade Now
              </button>
            </motion.div>
          )}

          {/* TABLE INTERFACE */}
          <div className="flex-1 overflow-x-auto hidden md:block">
            <table className="w-full text-left min-w-[650px]">
              <thead className="text-[10px] font-semibold text-[#888888] uppercase border-b border-[#222222] tracking-wider font-mono">
                <tr className="h-10">
                  <th className="px-4">Recipient</th>
                  <th className="px-4">Total</th>
                  <th className="px-4">Balance</th>
                  <th className="px-4">Due Date</th>
                  <th className="px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {sortedInvoices.slice(0, 8).map((invoice) => (
                  <tr 
                    key={invoice.id} 
                    onClick={() => setSelectedInvoice(invoice)}
                    className="h-14 border-b border-[#222222]/40 hover:bg-[#161616]/40 transition-all cursor-pointer group"
                  >
                    <td className="px-4">
                      <p className="font-semibold text-[#EEEEEE] text-sm tracking-tight leading-none">{invoice.client?.name}</p>
                      <p className="text-[10px] font-mono text-[#444444] uppercase mt-1 tracking-wider">#{invoice.invoice_number}</p>
                    </td>
                    <td className="px-4 font-semibold text-[#EEEEEE]">{formatCurrency(invoice.amount)}</td>
                    <td className={`px-4 font-semibold ${invoice.remainingBalance === 0 ? 'text-[#444444]' : 'text-[#EEEEEE]'}`}>
                      {formatCurrency(invoice.remainingBalance ?? invoice.amount)}
                    </td>
                    <td className={`px-4 font-mono text-xs ${isOverdue(invoice) ? 'text-[#EF4444]' : 'text-[#888888]'}`}>
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 text-right">
                       <StatusBadge status={invoice.status} isOverdue={isOverdue(invoice)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="flex-1 md:hidden space-y-3">
            {sortedInvoices.slice(0, 5).map((invoice) => (
              <div 
                key={invoice.id}
                onClick={() => setSelectedInvoice(invoice)}
                className="bg-[#161616]/40 border border-[#222222] rounded-xl p-4 active:bg-[#161616] transition-all text-left"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#EEEEEE] text-sm tracking-tight truncate">{invoice.client?.name}</p>
                    <p className="text-[10px] font-mono text-[#444444] uppercase tracking-wider">#{invoice.invoice_number}</p>
                  </div>
                  <StatusBadge status={invoice.status} isOverdue={isOverdue(invoice)} />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[9px] font-semibold text-[#888888] uppercase tracking-widest mb-0.5">Balance</p>
                    <p className="font-semibold text-[#C8FF00] text-sm">{formatCurrency(invoice.remainingBalance ?? invoice.amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-semibold text-[#888888] uppercase tracking-widest mb-0.5">Due</p>
                    <p className={cn(
                      "text-xs font-mono",
                      isOverdue(invoice) ? "text-[#EF4444]" : "text-[#888888]"
                    )}>
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {invoices.length > 8 && (
            <button 
              onClick={() => navigate('/invoices')}
              className="mt-6 text-xs font-semibold text-[#888888] hover:text-[#EEEEEE] flex justify-center items-center gap-2 group mx-auto"
            >
              Full Invoice Ledger
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>

        {/* Right Rail */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Recovery Rate */}
          <div className="bento-card p-5 bg-[#111111] border border-[#222222] rounded-xl">
            <p className="text-xs font-mono text-[#888888] mb-2 uppercase tracking-wider">Collection Rate</p>
            <div className="flex justify-between items-end mb-3">
              <h3 className="text-3xl font-bold text-[#C8FF00] tracking-tight">{collectionRate}%</h3>
              <div className="w-8 h-8 bg-[#1a1a1a] border border-[#222222] rounded-lg flex items-center justify-center text-[#888888]">
                 <TrendingUp size={16} />
              </div>
            </div>
            <div className="w-full bg-[#161616] h-1 rounded-full overflow-hidden">
              <div 
                className="bg-[#C8FF00] h-full rounded-full transition-all duration-1000" 
                style={{ width: `${collectionRate}%` }}
              ></div>
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

      {showCreateOrgModal && (
        <CreateOrganizationModal 
          onClose={() => setShowCreateOrgModal(false)}
          onSuccess={() => {
            setShowCreateOrgModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function CreateOrganizationModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { createOrganization } = useOrganization();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createOrganization(name.trim());
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to establish workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#080808]/85 backdrop-blur-sm">
      <div className="bg-[#111111] w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 border border-[#222222] p-8 space-y-6">
        <div>
          <h3 className="font-black text-2xl tracking-tighter text-[#EEEEEE] italic uppercase">Create Workspace</h3>
          <p className="text-[10px] font-black text-[#888888] uppercase tracking-widest mt-1 font-mono">Multi-Tenant Isolation Protocol</p>
        </div>

        {error && (
          <p className="text-xs text-[#EF4444] font-mono">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-mono">
          <div>
            <label className="block text-[9px] font-black text-[#888888] uppercase tracking-widest mb-1.5 px-1 font-mono font-bold">Workspace Name</label>
            <input 
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-3 bg-[#161616] border border-[#222222] rounded-2xl focus:border-[#C8FF00] focus:bg-[#161616] outline-none transition-all font-bold text-[#EEEEEE]"
              placeholder="e.g. Acme Agency"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-[#161616] hover:bg-[#222222] text-[#888888] rounded-xl font-black uppercase tracking-[0.15em] text-[10px] transition-all border border-[#222222]"
            >
              Cancel
            </button>
            <button 
              disabled={loading}
              type="submit"
              className="flex-1 py-3 px-4 bg-[#C8FF00] text-[#080808] rounded-xl font-black uppercase tracking-[0.15em] text-[10px] hover:bg-[#b8ef00] transition-all flex items-center justify-center gap-2 font-mono font-bold"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-[#080808] border-t-transparent rounded-full animate-spin"></div>
              ) : 'Deploy'}
            </button>
          </div>
        </form>
      </div>
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
  const badgeColors = {
    neutral: 'bg-[#1a1a1a] text-[#888888] border-[#222222]',
    green: 'bg-[#10B98115] text-[#10B981] border-[#10B98125]',
    red: 'bg-[#EF444415] text-[#EF4444] border-[#EF444425]'
  };

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-xl p-5 text-left group relative overflow-hidden">
      <div className="flex justify-between items-start relative z-10 mb-4">
        <div>
          <p className="text-xs font-semibold text-[#888888] uppercase tracking-wider leading-none">{label}</p>
          <h3 className="text-xl font-bold text-[#EEEEEE] mt-2 tracking-tight leading-none">{value}</h3>
        </div>
        <div className="w-8 h-8 rounded-lg bg-[#161616] border border-[#222222] flex items-center justify-center text-[#888888]">
          {React.cloneElement(icon as React.ReactElement, { size: 14 } as any)}
        </div>
      </div>
      <div className="flex items-center gap-2 relative z-10">
        <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-mono leading-none border uppercase tracking-wider", badgeColors[color])}>
          {subtext}
        </span>
      </div>
    </div>
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
