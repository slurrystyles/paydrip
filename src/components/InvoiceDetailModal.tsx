import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Invoice, UserProfile } from '../types';
import { 
  X, 
  Download, 
  Share2, 
  CheckCircle, 
  Trash2, 
  Smartphone, 
  ExternalLink, 
  ChevronRight,
  Shield,
  AlertCircle,
  Zap
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Props {
  invoice: Invoice;
  onClose: () => void;
  onUpdate: () => void;
}

export default function InvoiceDetailModal({ invoice, onClose, onUpdate }: Props) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const isPaid = invoice.status === "paid";
  const [reminderLogs, setReminderLogs] = useState<any[]>([]);

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
    }
    fetchData();
  }, [invoice.id, invoice.user_id]);

  async function updateStatus(status: 'paid' | 'sent') {
    setLoading(true);
    const { error } = await supabase.from('invoices').update({ status }).eq('id', invoice.id);
    
    if (status === 'paid' && !error) {
       // Log Payment
       await supabase.from('payments').insert([{
         invoice_id: invoice.id,
         amount: invoice.amount,
         method: 'upi'
       }]);
       
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

    // Header
    doc.setFontSize(22);
    doc.text(userProfile?.business_name || 'Business Invoice', margin, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Invoice #${invoice.invoice_number}`, margin, 40);
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, margin, 45);

    // Bill to
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text('BILL TO', margin, 65);
    doc.setFontSize(14);
    doc.text(invoice.client?.name || '', margin, 75);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(invoice.client?.email || '', margin, 80);

    // Table
    (doc as any).autoTable({
      startY: 95,
      head: [['Description', 'Amount']],
      body: [[`Services for week ending ${new Date().toLocaleDateString()}`, formatCurrency(invoice.amount)]],
      theme: 'striped',
      headStyles: { fillStyle: 'black' },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 110;

    // Total
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(`Total: ${formatCurrency(invoice.amount)}`, 140, finalY + 20);

    // Footer/Notes
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(invoice.notes || 'Thank you for your business.', margin, finalY + 40);

    doc.save(`Invoice_${invoice.invoice_number}.pdf`);
  };

  const getWhatsAppMessage = (type: 'polite' | 'firm' | 'final') => {
    const businessName = userProfile?.business_name || 'My Business';
    const amount = formatCurrency(invoice.amount);
    const invNum = invoice.invoice_number;
    const upi = userProfile?.upi_id ? `\n\nPay via UPI: ${userProfile.upi_id}` : '';

    const templates = {
      polite: `Hi ${invoice.client?.name}, hope you're well! Just a friendly reminder about invoice #${invNum} (${amount}) which is due soon. Let me know if you need anything else! - ${businessName}${upi}`,
      firm: `Hi ${invoice.client?.name}, invoice #${invNum} (${amount}) is now overdue. Please settle this at your earliest convenience to avoid any service interruption. Thanks! - ${businessName}${upi}`,
      final: `URGENT: Hi ${invoice.client?.name}, invoice #${invNum} (${amount}) is critically overdue. This is a final notice for payment. Please settle immediately via UPI. - ${businessName}${upi}`
    };

    return encodeURIComponent(templates[type]);
  };

  const openWhatsApp = async (type: 'polite' | 'firm' | 'final') => {
    const phone = invoice.client?.phone?.replace(/\D/g, '');
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
    ? `upi://pay?pa=${userProfile.upi_id}&pn=${encodeURIComponent(userProfile.business_name)}&am=${invoice.amount}&cu=INR`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh]">
        {/* Preview Panel */}
        <div className="flex-1 bg-gray-50 overflow-y-auto p-12 border-r border-gray-100 hidden md:block">
          <div className="bg-white p-12 shadow-sm border border-gray-200 min-h-[800px] flex flex-col">
            <div className="flex justify-between items-start mb-16">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{userProfile?.business_name || 'Your Company'}</h2>
                <p className="text-gray-500 font-mono text-sm mt-2">{userProfile?.email}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs text-gray-400 uppercase">Invoice</p>
                <p className="text-xl font-bold">#{invoice.invoice_number}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-16">
              <div>
                <p className="font-mono text-[10px] uppercase text-gray-400 mb-2">Bill To</p>
                <p className="font-bold text-lg">{invoice.client?.name}</p>
                <p className="text-gray-500 text-sm">{invoice.client?.email}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] uppercase text-gray-400 mb-2">Issued On</p>
                <p className="font-medium">{new Date(invoice.created_at).toLocaleDateString()}</p>
                <p className="font-mono text-[10px] uppercase text-gray-400 mt-4 mb-2">Due By</p>
                <p className="font-medium">{new Date(invoice.due_date).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex-1">
              <table className="w-full text-left">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="py-4 font-mono text-[10px] uppercase text-gray-400">Description</th>
                    <th className="py-4 text-right font-mono text-[10px] uppercase text-gray-400">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr>
                    <td className="py-6 text-sm">Service Provision & Delivery</td>
                    <td className="py-6 text-right font-bold font-mono">{formatCurrency(invoice.amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border-t border-black pt-8 flex justify-between items-end">
              <div className="max-w-[200px]">
                <p className="text-[10px] text-gray-400 font-mono uppercase mb-2">Payment Notes</p>
                <p className="text-xs text-gray-500 leading-relaxed italic line-clamp-2">{invoice.notes}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-mono uppercase mb-1">Total Due</p>
                <p className="text-4xl font-bold tracking-tighter">{formatCurrency(invoice.amount)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="w-full md:w-80 bg-white flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold uppercase font-mono text-xs text-gray-500">Actions</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 p-6 space-y-8 overflow-y-auto">
            {/* Status Section */}
            <div className="space-y-3">
               <label className="block text-xs font-bold text-gray-400 uppercase font-mono">Current Status</label>
               <div className={cn(
                  "p-3 rounded-xl border flex items-center justify-between",
                  invoice.status === 'paid' ? 'bg-green-50 border-green-200 text-green-700' :
                  invoice.status === 'overdue' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-700'
               )}>
                 <span className="font-bold text-sm uppercase">{invoice.status}</span>
                 {invoice.status !== 'paid' && (
                    <button 
                      onClick={() => updateStatus('paid')}
                      className="text-xs bg-white px-2 py-1 rounded shadow-sm border border-current hover:bg-black hover:text-white transition-all"
                    >
                      Mark Paid
                    </button>
                 )}
               </div>
            </div>

            {/* UPI QR Code Section */}
            {userProfile?.upi_id && invoice.status !== 'paid' && (
              <div className="space-y-4">
                <label className="block text-xs font-bold text-gray-400 uppercase font-mono">India-First (UPI)</label>
                <div className="bg-gray-50 p-6 rounded-2xl flex flex-col items-center border border-dashed border-gray-300">
                  <div className="bg-white p-2 rounded-xl shadow-sm mb-4">
                    <QRCodeSVG 
                      value={upiLink!} 
                      size={120}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 text-center font-mono uppercase leading-tight">
                    Scan for instant payment<br/>to {userProfile.upi_id}
                  </p>
                  {upiLink && (
                    <a 
                      href={upiLink} 
                      className="mt-4 flex items-center text-xs font-bold text-black border-b border-black pb-0.5"
                    >
                      <Smartphone size={12} className="mr-1" />
                      Open in App
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Payment Link Section */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-400 uppercase font-mono">Client Access Portal</label>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                <div className="overflow-hidden mr-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mb-1">Public Link</p>
                  <p className="text-xs text-slate-500 font-mono truncate">{window.location.origin}/v/{invoice.public_token}</p>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/v/${invoice.public_token}`);
                    alert("Link copied to clipboard!");
                  }}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-600 transition-all text-slate-600 hover:text-indigo-600 shadow-sm"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            {/* WhatsApp Integration */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-gray-400 uppercase font-mono">WhatsApp Recovery Tool</label>
              <div className="space-y-2">
                <WhatsAppTemplateButton 
                  label="Polite Reminder" 
                  description="Pre-due / On-due"
                  disabled={isPaid}
                  onClick={() => openWhatsApp('polite')}
                  icon={<Shield size={16} className="text-green-500" />}
                />
                <WhatsAppTemplateButton 
                  label="Firm Request" 
                  description="3-5 days overdue"
                  disabled={isPaid}
                  onClick={() => openWhatsApp('firm')}
                  icon={<AlertCircle size={16} className="text-orange-500" />}
                />
                <WhatsAppTemplateButton 
                  label="Final Notice" 
                  description="Critical overdue"
                  disabled={isPaid}
                  onClick={() => openWhatsApp('final')}
                  icon={<Zap size={16} className="text-red-500" />}
                />
              </div>
            </div>

            {/* General Actions */}
            <div className="space-y-3">
              <button 
                onClick={generatePDF}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-black hover:text-white rounded-xl transition-all group"
              >
                <div className="flex items-center">
                  <Download size={18} className="mr-3" />
                  <span className="text-sm font-semibold">Download PDF</span>
                </div>
                <ChevronRight size={16} className="opacity-0 group-hover:opacity-100" />
              </button>

              <button className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-600 hover:text-white rounded-xl transition-all group">
                <div className="flex items-center">
                  <Share2 size={18} className="mr-3" />
                  <span className="text-sm font-semibold">Share Link</span>
                </div>
                <ChevronRight size={16} className="opacity-0 group-hover:opacity-100" />
              </button>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100">
             <button 
               onClick={deleteInvoice}
               className="w-full flex items-center justify-center p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all text-sm font-bold border border-transparent hover:border-red-100"
             >
               <Trash2 size={16} className="mr-2" />
               Delete Invoice
             </button>
          </div>
        </div>
      </div>
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
      className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-white hover:border-slate-300 border border-transparent rounded-xl transition-all group text-left"
    >
      <div className="flex items-center">
        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800">{label}</p>
          <p className="text-[10px] text-slate-400 font-mono italic">{description}</p>
        </div>
      </div>
      <Share2 size={14} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
    </button>
  );
}
