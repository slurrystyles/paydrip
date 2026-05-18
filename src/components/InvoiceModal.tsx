import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Client } from '../types';
import { X, Calendar, FileText, ChevronRight, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlan } from '../contexts/PlanContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { recoveryService } from '../lib/recoveryService';
import { useUsageLimits } from '../hooks/useUsageLimits';
import { UpgradeModal } from './UpgradeModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onSuccess: () => void;
}

export default function InvoiceModal({ isOpen, onClose, clients, onSuccess }: Props) {
  const { plan } = usePlan();
  const { canCreateInvoice, refresh: refreshUsage } = useUsageLimits();
  const { currentOrganization } = useOrganization();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitMode, setSubmitMode] = useState<'draft' | 'send'>('draft');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentOrganization) return;
    
    if (!canCreateInvoice) {
      setShowUpgrade(true);
      return;
    }
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch limit check relative to organization
    const { count, error: countError } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', currentOrganization.id);

    if (countError) throw countError;

    // NEW Snapshot Rule: Fetch client data for immutable storage
    const { data: clientData, error: clientFetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('organization_id', currentOrganization.id) // Scoped fetch
      .single();

    if (clientFetchError) {
      setError("Failed to secure client snapshot.");
      setLoading(false);
      return;
    }

    const invoiceNumber = `PAY-${Date.now().toString().slice(-6)}`;

    const { data: newInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert([{
        user_id: user.id,
        organization_id: currentOrganization.id,
        client_id: clientId,
        invoice_number: invoiceNumber,
        amount: parseFloat(amount),
        due_date: dueDate,
        status: 'draft',
        notes,
        snapshot_json: clientData // THE SNAPSHOT
      }])
      .select()
      .single();

    if (!insertError && newInvoice) {
      // Production Audit: Log Event
      await supabase.from('invoice_events').insert([{
        invoice_id: newInvoice.id,
        user_id: user.id,
        organization_id: currentOrganization.id,
        event_type: 'creation',
        metadata: { amount: parseFloat(amount) }
      }]);

      if (submitMode === 'send') {
        const { data: profile } = await supabase.from('users').select('business_name').eq('id', user.id).single();
        if (clientData.email && profile) {
          try {
            await recoveryService.sendInvoice({
              to: clientData.email,
              invoice_id: newInvoice.id,
              invoice_number: invoiceNumber,
              business_name: profile.business_name,
              organization_id: currentOrganization.id
            });
          } catch (e) {
            console.error('Initial send failed:', e);
          }
        }
      }

      onSuccess();
      refreshUsage(); // Update usage numbers
      onClose();
      // Reset form
      setClientId('');
      setAmount('');
      setDueDate('');
      setNotes('');
    } else {
      setError(insertError?.message || 'Insert failed');
    }
    setLoading(false);
  }

  return (
    <>
      <UpgradeModal 
        isOpen={showUpgrade} 
        onClose={() => setShowUpgrade(false)} 
        reason="invoices"
      />
      <AnimatePresence>
        {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white w-full max-w-xl sm:rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col h-screen sm:h-auto overflow-y-auto"
          >
            <div className="p-6 sm:p-8 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-black text-xl tracking-tighter text-slate-900 italic">Generate Ledger</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 font-mono">Securing snapshot of transaction</p>
              </div>
              <button 
                onClick={onClose}
                className="p-3 bg-slate-50 rounded-xl text-slate-400 active:scale-90 transition-all font-bold min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 sm:space-y-8 flex-1">
              {error && (
                 <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-black uppercase tracking-widest font-mono shadow-sm">
                   {error}
                 </div>
              )}
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 font-mono px-1">Selected Counterparty</label>
                  <select
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white outline-none transition-all appearance-none font-bold text-slate-700 text-sm min-h-[56px]"
                  >
                    <option value="">-- Choose from active list --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 font-mono px-1">Amount (INR)</label>
                    <div className="relative group">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black group-focus-within:text-indigo-600 transition-colors italic group-focus-within:not-italic font-mono text-sm">₹</span>
                      <input
                        type="number"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white outline-none transition-all font-black text-slate-900 tracking-tighter text-base min-h-[56px]"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 font-mono px-1">Settlement Date</label>
                    <div className="relative group">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={16} />
                      <input
                        type="date"
                        required
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold text-slate-700 text-base min-h-[56px]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 font-mono px-1">Protocol Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white outline-none transition-all resize-none font-medium text-slate-600 text-sm leading-relaxed"
                    placeholder="e.g. UPI transfer only."
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:pt-4 pb-8 sm:pb-0">
                <button 
                  type="submit"
                  disabled={loading}
                  onClick={() => setSubmitMode('draft')}
                  className="w-full sm:flex-1 py-5 px-4 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all border border-slate-200 min-h-[56px]"
                >
                  {loading && submitMode === 'draft' ? (
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  ) : (
                    'Save as Draft'
                  )}
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  onClick={() => setSubmitMode('send')}
                  className="w-full sm:flex-[1.5] py-5 px-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-900 transition-all disabled:opacity-50 shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 group min-h-[56px]"
                >
                  {loading && submitMode === 'send' ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send size={14} />
                      Send Now
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}
