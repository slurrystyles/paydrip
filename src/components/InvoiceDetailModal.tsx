import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Invoice, UserProfile, Payment } from '../types';
import { 
  X, 
  Download, 
  Share2, 
  CheckCircle, 
  Trash2, 
  Smartphone, 
  ChevronRight,
  Shield,
  AlertCircle,
  Zap,
  Plus,
  History
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  invoice: Invoice;
  onClose: () => void;
  onUpdate: () => void;
}

export default function InvoiceDetailModal({ invoice, onClose, onUpdate }: Props) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const [reminderLogs, setReminderLogs] = useState<any[]>([]);

  const clientInfo = invoice.client || invoice.snapshot_json || {};
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(0, invoice.amount - totalPaid);
  const isFullyPaid = remainingBalance <= 0 || invoice.status === 'paid';

  useEffect(() => {
    async function fetchData() {
      const { data: profile } = await supabase.from('users').select('*').eq('id', invoice.user_id).single();
      if (profile) setUserProfile(profile);

      const { data: logs } = await supabase
        .from('reminder_logs')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('sent_at', { ascending: false });
      if (logs) setReminderLogs(logs);

      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('paid_at', { ascending: false });
      if (payData) setPayments(payData);
    }
    fetchData();
  }, [invoice.id, invoice.user_id]);

  async function recordPayment(amount: number) {
    if (amount <= 0) return;
    setLoading(true);
    
    const { error } = await supabase.from('payments').insert([{
      invoice_id: invoice.id,
      amount,
      method: 'upi',
      paid_at: new Date().toISOString()
    }]);

    if (!error) {
       const newTotalPaid = totalPaid + amount;
       if (newTotalPaid >= invoice.amount) {
         await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoice.id);
       }
       
       await supabase.from('events').insert([{
         user_id: invoice.user_id,
         type: 'payment_received',
         meta: { invoice_id: invoice.id, amount }
       }]);
       
       setPaymentAmount('');
       setShowPaymentForm(false);
       onUpdate();
       
       // Refresh payments
       const { data } = await supabase.from('payments').select('*').eq('invoice_id', invoice.id).order('paid_at', { ascending: false });
       if (data) setPayments(data);
    }
    setLoading(false);
  }

  async function updateStatus(status: 'paid' | 'sent') {
    setLoading(true);
    const { error } = await supabase.from('invoices').update({ status }).eq('id', invoice.id);
    
    if (status === 'paid' && !error) {
       // If manually marking as paid, we record one big payment if none exist
       if (payments.length === 0) {
         await supabase.from('payments').insert([{
           invoice_id: invoice.id,
           amount: invoice.amount,
           method: 'cash'
         }]);
       }
       
       await supabase.from('events').insert([{
         user_id: invoice.user_id,
         type: 'payment_received',
         meta: { invoice_id: invoice.id, amount: invoice.amount }
       }]);
    }
    
    if (!error) onUpdate();
    setLoading(false);
  }

  async function deleteInvoice() {
    if (!confirm('Permanent delete?')) return;
    const { error } = await supabase.from('invoices').delete().eq('id', invoice.id);
    if (!error) {
      onUpdate();
      onClose();
    }
  }

  const generatePDF = () => {
    const doc = new jsPDF() as any;
    const margin = 20;

    doc.setFontSize(22);
    doc.text(userProfile?.business_name || 'Business Invoice', margin, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Invoice #${invoice.invoice_number}`, margin, 40);
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, margin, 45);

    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text('BILL TO', margin, 65);
    doc.setFontSize(14);
    doc.text(clientInfo.name || 'Client', margin, 75);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(clientInfo.email || '', margin, 80);

    (doc as any).autoTable({
      startY: 95,
      head: [['Description', 'Amount']],
      body: [[`Services Rendered`, formatCurrency(invoice.amount)]],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
    });

    const finalY = (doc as any).lastAutoTable.finalY || 110;

    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(`Total: ${formatCurrency(invoice.amount)}`, 140, finalY + 20);
    
    if (totalPaid > 0) {
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Paid: ${formatCurrency(totalPaid)}`, 140, finalY + 30);
      doc.text(`Balance: ${formatCurrency(remainingBalance)}`, 140, finalY + 40);
    }

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(invoice.notes || 'Thank you for your business.', margin, finalY + 60);

    doc.save(`Invoice_${invoice.invoice_number}.pdf`);
  };

  const generateReceipt = () => {
    const doc = new jsPDF() as any;
    const margin = 20;

    // Header
    doc.setFontSize(24);
    doc.setTextColor(0);
    doc.text('PAYMENT RECEIPT', margin, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Reference: RCPT-${invoice.invoice_number}-${Date.now().toString().slice(-4)}`, margin, 40);
    doc.text(`Date Issued: ${new Date().toLocaleDateString()}`, margin, 45);

    // Business Info
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(userProfile?.business_name || 'Business Name', margin, 65);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`UPI: ${userProfile?.upi_id || 'N/A'}`, margin, 72);

    // Client Info
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('BILL TO', 120, 65);
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(clientInfo.name || 'Client', 120, 75);

    // "PAID" Badge if fully settled
    if (isFullyPaid) {
      doc.setDrawColor(34, 197, 94); // Green 500
      doc.setLineWidth(1);
      doc.rect(150, 20, 40, 15);
      doc.setTextColor(34, 197, 94);
      doc.setFontSize(16);
      doc.text('PAID', 160, 30);
    }

    // Payment Table
    const tableBody = payments.map(p => [
      new Date(p.paid_at).toLocaleDateString(),
      p.method.toUpperCase(),
      formatCurrency(p.amount)
    ]);

    (doc as any).autoTable({
      startY: 90,
      head: [['Date', 'Method', 'Amount']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] }, // Green 500
    });

    const finalY = (doc as any).lastAutoTable.finalY || 110;

    // Summary
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Original Invoice Amount: ${formatCurrency(invoice.amount)}`, 120, finalY + 20);
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(14);
    doc.text(`Total Paid: ${formatCurrency(totalPaid)}`, 120, finalY + 30);
    
    if (remainingBalance > 0) {
      doc.setTextColor(239, 68, 68); // Red 500
      doc.text(`Outstanding: ${formatCurrency(remainingBalance)}`, 120, finalY + 40);
    }

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('This is a computer generated receipt.', margin, finalY + 60);

    doc.save(`Receipt_${invoice.invoice_number}.pdf`);
  };

  const getWhatsAppMessage = (type: 'polite' | 'firm' | 'final' | 'receipt') => {
    const businessName = userProfile?.business_name || 'My Business';
    const amount = formatCurrency(remainingBalance);
    const paidAmount = formatCurrency(totalPaid);
    const invNum = invoice.invoice_number;
    const upi = userProfile?.upi_id ? `\n\nPay via UPI: ${userProfile.upi_id}` : '';
    const publicLink = `\n\nView Secure Invoice: ${window.location.origin}/v/${invoice.public_token}`;

    if (type === 'receipt') {
      return encodeURIComponent(`Hi ${clientInfo.name}, thank you for your payment of ${paidAmount} toward invoice #${invNum}. ${isFullyPaid ? 'Your balance is now fully settled!' : `Remaining balance: ${amount}.`} View your updated receipt here: ${window.location.origin}/v/${invoice.public_token} - ${businessName}`);
    }

    const templates = {
      polite: `Hi ${clientInfo.name}, hope you're well! Just a friendly reminder about invoice #${invNum}. Remaining balance: ${amount}. Let me know if you need anything else! - ${businessName}${publicLink}${upi}`,
      firm: `Hi ${clientInfo.name}, invoice #${invNum} balance of ${amount} is now overdue. Please settle this at your earliest convenience to avoid any service interruption. Thanks! - ${businessName}${publicLink}${upi}`,
      final: `URGENT: Hi ${clientInfo.name}, invoice #${invNum} (${amount}) is critically overdue. This is a final notice for payment. Please settle immediately. - ${businessName}${publicLink}${upi}`
    };

    return encodeURIComponent(templates[type]);
  };

  const openWhatsApp = async (type: 'polite' | 'firm' | 'final' | 'receipt') => {
    if (type !== 'receipt' && isFullyPaid) return;
    
    const phone = (clientInfo.phone || '').replace(/\D/g, '');
    if (!phone) {
      alert("Client phone number missing.");
      return;
    }

    // Business Rule: Check Reminder Limits (Max 3 per day, 4h gap)
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayReminders = reminderLogs.filter(l => new Date(l.sent_at) >= today);
    
    if (todayReminders.length >= 3) {
      alert("Limit reached: Max 3 reminders per invoice per day.");
      return;
    }

    const lastReminder = reminderLogs[0];
    if (lastReminder) {
      const gap = (Date.now() - new Date(lastReminder.sent_at).getTime()) / (1000 * 60 * 60);
      if (gap < 4) {
        alert("Wait at least 4 hours between reminders.");
        return;
      }
    }

    const message = getWhatsAppMessage(type);
    
    // Log reminder
    await supabase.from('reminder_logs').insert([{
      invoice_id: invoice.id,
      type
    }]);

    await supabase.from('events').insert([{
      user_id: invoice.user_id,
      type: 'reminder_sent',
      meta: { invoice_id: invoice.id, type }
    }]);

    // Update status to 'sent' if it was draft
    if (invoice.status === 'draft') {
      await supabase.from('invoices').update({ status: 'sent' }).eq('id', invoice.id);
      onUpdate();
    }

    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  // UPI Link generation: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR
  const upiLink = userProfile?.upi_id 
    ? `upi://pay?pa=${userProfile.upi_id}&pn=${encodeURIComponent(userProfile.business_name)}&am=${remainingBalance}&cu=INR`
    : null;

  return (
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
        className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] relative z-10"
      >
        {/* Preview Panel */}
        <div className="flex-1 bg-slate-50/50 overflow-y-auto p-8 md:p-12 border-r border-slate-100 hidden md:block">
          <div className="bg-white p-12 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200/60 min-h-[800px] flex flex-col">
            <div className="flex justify-between items-start mb-16">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">{userProfile?.business_name || 'Your Company'}</h2>
                <p className="text-slate-400 font-mono text-xs mt-2 uppercase tracking-widest">{userProfile?.email}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">Digital Invoice</p>
                <p className="text-xl font-black text-slate-900">#{invoice.invoice_number}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-16">
              <div>
                <p className="font-mono text-[10px] uppercase text-slate-400 mb-2 tracking-widest">Bill To</p>
                <p className="font-bold text-lg text-slate-900">{clientInfo.name}</p>
                <p className="text-slate-500 text-sm italic">{clientInfo.email}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] uppercase text-slate-400 mb-2 tracking-widest">Timeline</p>
                <div className="space-y-1">
                  <p className="text-sm"><span className="text-slate-400">Issued:</span> <span className="font-bold">{new Date(invoice.created_at).toLocaleDateString()}</span></p>
                  <p className="text-sm"><span className="text-slate-400">Due:</span> <span className="font-bold text-indigo-600">{new Date(invoice.due_date).toLocaleDateString()}</span></p>
                </div>
              </div>
            </div>

            <div className="flex-1">
              <table className="w-full text-left">
                <thead className="border-b border-slate-100">
                  <tr>
                    <th className="py-4 font-mono text-[10px] uppercase text-slate-400 tracking-widest">Description</th>
                    <th className="py-4 text-right font-mono text-[10px] uppercase text-slate-400 tracking-widest">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <tr>
                    <td className="py-6 text-sm font-medium text-slate-700 font-sans">
                      Standard Professional Services
                      <p className="text-[10px] text-slate-400 mt-1 font-normal italic">Fixed price project delivery</p>
                    </td>
                    <td className="py-6 text-right font-black font-mono text-slate-900">{formatCurrency(invoice.amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border-t-2 border-slate-900 pt-8 flex justify-between items-end">
              <div className="max-w-[200px]">
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-2">Terms & Notes</p>
                <p className="text-xs text-slate-500 leading-relaxed italic line-clamp-3">"{invoice.notes || 'Please settle within 7 days of receipt.'}"</p>
              </div>
              <div className="text-right">
                <div className="space-y-1 mb-2">
                  <div className="flex justify-end gap-12 text-xs font-bold">
                    <span className="text-slate-400 uppercase tracking-widest">Subtotal</span>
                    <span className="text-slate-900">{formatCurrency(invoice.amount)}</span>
                  </div>
                  {totalPaid > 0 && (
                    <div className="flex justify-end gap-12 text-xs font-bold">
                      <span className="text-green-500 uppercase tracking-widest">Paid to Date</span>
                      <span className="text-green-600">-{formatCurrency(totalPaid)}</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter mb-1">Final Balance Due</p>
                <p className="text-5xl font-black tracking-tighter text-indigo-600">{formatCurrency(remainingBalance)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="w-full md:w-96 bg-white flex flex-col border-l border-slate-100">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>
              <h3 className="font-black uppercase font-mono text-[10px] text-slate-400 tracking-widest">Management Console</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar">
            {/* Status Section */}
            <div className="space-y-3">
               <label className="block text-[10px] font-black text-slate-400 uppercase font-mono tracking-widest">Ledger Status</label>
               <div className={cn(
                  "p-4 rounded-2xl border-2 flex items-center justify-between transition-all duration-500",
                  isFullyPaid ? 'bg-green-50/50 border-green-200 text-green-700 shadow-lg shadow-green-100/50' :
                  invoice.status === 'overdue' ? 'bg-red-50/50 border-red-200 text-red-700 shadow-lg shadow-red-100/50' : 'bg-slate-50/50 border-slate-200 text-slate-700'
               )}>
                 <div className="flex items-center gap-3">
                    {isFullyPaid && <CheckCircle size={18} className="text-green-600" />}
                    <span className="font-black text-xs uppercase tracking-widest">{isFullyPaid ? 'Settled' : invoice.status}</span>
                 </div>
                 {!isFullyPaid && (
                    <button 
                      onClick={() => updateStatus('paid')}
                      className="text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white px-4 py-2 rounded-xl transition-all hover:bg-indigo-600 active:scale-95 shadow-md"
                    >
                      Instant Settle
                    </button>
                 )}
               </div>
            </div>

            {/* Partial Payment Section */}
            {!isFullyPaid && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black text-slate-400 uppercase font-mono tracking-widest">Record Payment</label>
                  <button 
                    onClick={() => setShowPaymentForm(!showPaymentForm)}
                    className="text-[10px] font-bold text-indigo-600 flex items-center gap-1"
                  >
                    {showPaymentForm ? 'Cancel' : <><Plus size={12}/> Record Partial</>}
                  </button>
                </div>
                
                <AnimatePresence>
                  {showPaymentForm && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-3"
                    >
                      <input 
                        type="number"
                        placeholder="Amount (₹)"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                      />
                      <button 
                        onClick={() => recordPayment(parseFloat(paymentAmount))}
                        disabled={loading || !paymentAmount}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 hover:bg-indigo-600 transition-all active:scale-95 shadow-md"
                      >
                        {loading ? 'Processing...' : 'Confirm Payment'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {payments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase font-mono tracking-widest flex items-center gap-2">
                      <History size={12} /> Payment History
                    </p>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                      {payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-[10px] font-bold border border-slate-100">
                          <span className="text-slate-500">{new Date(p.paid_at).toLocaleDateString()}</span>
                          <span className="text-green-600">+{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* WhatsApp Integration - DISBALED IF PAID */}
            <div className={cn("space-y-4", isFullyPaid && "opacity-40 grayscale pointer-events-none")}>
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black text-slate-400 uppercase font-mono tracking-widest">Reminders</label>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Live Support</span>
                </div>
              </div>
              <div className="space-y-2">
                <WhatsAppTemplateButton 
                  label="Polite nudge" 
                  description="Initial approach"
                  onClick={() => openWhatsApp('polite')}
                  icon={<Shield size={16} className="text-indigo-500" />}
                />
                <WhatsAppTemplateButton 
                  label="Firm ask" 
                  description="Secondary request"
                  onClick={() => openWhatsApp('firm')}
                  icon={<AlertCircle size={16} className="text-orange-500" />}
                />
                <WhatsAppTemplateButton 
                  label="Final notice" 
                  description="Critical ultimatum"
                  onClick={() => openWhatsApp('final')}
                  icon={<Zap size={16} className="text-red-500" />}
                />
              </div>
            </div>

            {/* Public Link Section */}
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase font-mono tracking-widest">Cloud Access Link</label>
              <div className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between group hover:border-indigo-100 transition-all">
                <div className="overflow-hidden mr-2">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mb-1">Public URL</p>
                  <p className="text-xs text-slate-500 font-mono underline decoration-indigo-200 truncate">{window.location.host}/v/{invoice.public_token}</p>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/v/${invoice.public_token}`);
                    alert("Link copied!");
                  }}
                  className="p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-600 transition-all text-slate-600 hover:text-indigo-600 shadow-sm active:scale-90"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            {/* General Actions */}
            <div className="space-y-3">
              <button 
                onClick={generatePDF}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-2xl transition-all group border border-transparent hover:border-slate-800"
              >
                <div className="flex items-center">
                  <Download size={18} className="mr-3 text-indigo-600 group-hover:text-white" />
                  <span className="text-xs font-black uppercase tracking-widest">Download Ledger</span>
                </div>
              </button>

              {totalPaid > 0 && (
                <>
                  <button 
                    onClick={generateReceipt}
                    className="w-full flex items-center justify-between p-4 bg-green-50/50 hover:bg-green-600 hover:text-white rounded-2xl transition-all group border border-green-100 hover:border-green-700"
                  >
                    <div className="flex items-center">
                      <FileText size={18} className="mr-3 text-green-600 group-hover:text-white" />
                      <span className="text-xs font-black uppercase tracking-widest">Download Receipt</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => openWhatsApp('receipt')}
                    className="w-full flex items-center justify-between p-4 bg-green-50/30 hover:bg-green-500 hover:text-white rounded-2xl transition-all group border border-green-100/50"
                  >
                    <div className="flex items-center">
                      <Smartphone size={18} className="mr-3 text-green-500 group-hover:text-white" />
                      <span className="text-xs font-black uppercase tracking-widest">Share Receipt Link</span>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-slate-100">
             <button 
               onClick={deleteInvoice}
               className="w-full flex items-center justify-center p-4 text-slate-400 hover:text-red-600 hover:bg-red-50/50 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest group"
             >
               <Trash2 size={16} className="mr-2" />
               Purge Record
             </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function WhatsAppTemplateButton({ label, description, onClick, icon }: { 
  label: string, 
  description: string, 
  onClick: () => void,
  icon: React.ReactNode 
}) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex font-sans items-center justify-between p-4 bg-slate-50/50 hover:bg-white hover:border-slate-300 border border-slate-200/50 rounded-2xl transition-all group text-left shadow-sm hover:shadow-md"
    >
      <div className="flex items-center">
        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mr-4 group-hover:scale-110 transition-transform border border-slate-100">
          {icon}
        </div>
        <div>
          <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{label}</p>
          <p className="text-[10px] text-slate-400 font-mono italic">{description}</p>
        </div>
      </div>
      <div className="p-2 bg-indigo-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
        <Smartphone size={14} className="text-indigo-600" />
      </div>
    </button>
  );
}

