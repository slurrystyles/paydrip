import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Client } from '../types';
import { X, Calendar, DollarSign, FileText } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onSuccess: () => void;
}

export default function InvoiceModal({ isOpen, onClose, clients, onSuccess }: Props) {
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

    if (count !== null && count >= 3) {
      setError("You've reached the free limit of 3 invoices. Please upgrade to Pro.");
      setLoading(false);
      return;
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
      setError(insertError.message);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
          <h3 className="font-bold text-lg leading-none">New Ledger Entry</h3>
          <button onClick={onClose} className="hover:opacity-70 transition-opacity">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
             <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold uppercase tracking-wider animate-pulse font-mono">
               LIMIT BREACH: {error}
             </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 font-mono">Select Client</label>
              <select
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-black outline-none transition-all appearance-none"
              >
                <option value="">-- Choose a client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 font-mono">Amount (INR)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-black outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 font-mono">Due Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-black outline-none transition-all"
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 font-mono">Notes / Payment Terms</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-black outline-none transition-all resize-none"
                placeholder="e.g. Please pay via UPI. Net 15 days."
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 px-6 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all uppercase tracking-widest text-xs"
            >
              Discard
            </button>
            <button 
              disabled={loading}
              type="submit"
              className="flex-1 py-3 px-6 bg-black text-white rounded-xl font-bold hover:bg-gray-900 transition-all disabled:opacity-50 uppercase tracking-widest text-xs flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <FileText size={16} />
                  <span>Generate Invoice</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
