import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Client } from '../types';
import { X, Calendar, FileText, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlan } from '../contexts/PlanContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onSuccess: () => void;
}

export default function InvoiceModal({ isOpen, onClose, clients, onSuccess }: Props) {
  const { isLimitReached } = usePlan();
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLimitReached) {
      setError("Free plan limit reached (3 invoices). Please upgrade to continue.");
      return;
    }
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch limit check (existing logic)...
    const { count, error: countError } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) throw countError;

    if (count !== null && count >= 100) { // Increased for Pro/Dev purposes or check tier
      // Implementation of tier check can go here
    }

    // NEW Snapshot Rule: Fetch client data for immutable storage
    const { data: clientData, error: clientFetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
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
      await supabase.from('events').insert([{
        user_id: user.id,
        type: 'invoice_created',
        meta: { invoice_id: newInvoice.id, amount: parseFloat(amount) }
      }]);

      onSuccess();
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100"
          >
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-xl tracking-tighter text-slate-900 italic">Generate Ledger</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 font-mono">Securing snapshot of transaction</p>
              </div>
              <button onClick={onClose} className="p-1.5 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                 <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[9px] font-black uppercase tracking-widest font-mono shadow-sm">
                   {error}
                 </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono px-1">Selected Counterparty</label>
                  <select
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-600 focus:bg-white outline-none transition-all appearance-none font-bold text-slate-700 text-sm"
                  >
                    <option value="">-- Choose from active list --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono px-1">Amount (INR)</label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black group-focus-within:text-indigo-600 transition-colors italic group-focus-within:not-italic font-mono text-sm">₹</span>
                      <input
                        type="number"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-600 focus:bg-white outline-none transition-all font-black text-slate-900 tracking-tighter text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono px-1">Settlement Date</label>
                    <div className="relative group">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={14} />
                      <input
                        type="date"
                        required
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold text-slate-700 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono px-1">Protocol Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-600 focus:bg-white outline-none transition-all resize-none font-medium text-slate-600 text-xs leading-relaxed"
                    placeholder="e.g. UPI transfer only."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-slate-50 text-slate-500 rounded-xl font-black uppercase tracking-[0.2em] text-[9px] hover:bg-slate-100 transition-all active:scale-95 border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  disabled={loading}
                  type="submit"
                  className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-[0.2em] text-[9px] hover:bg-slate-900 transition-all disabled:opacity-50 active:scale-95 shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Create Invoice
                      <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
