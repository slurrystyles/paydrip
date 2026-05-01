import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Invoice, UserProfile, Payment } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Shield, Landmark, CheckCircle, ArrowDown } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { motion } from 'motion/react';

export default function PublicInvoiceView() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoice() {
      if (!token) return;

      const { data, error } = await supabase
        .from('invoices')
        .select(`*`)
        .eq('public_token', token)
        .single();

      if (error) {
        setError("Invoice not found or inaccessible.");
        setLoading(false);
        return;
      }

      setInvoice(data);

      // Audit: Log the public view
      await supabase.from('invoice_views').insert([{
        invoice_id: data.id
      }]);

      // Fetch the business profile of the sender
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user_id)
        .single();
      
      setUserProfile(profile);

      // Fetch payments
      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', data.id)
        .order('paid_at', { ascending: false });
      if (payData) setPayments(payData);

      setLoading(false);
    }

    fetchInvoice();
  }, [token]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = invoice ? Math.max(0, invoice.amount - totalPaid) : 0;
  const isFullyPaid = remainingBalance <= 0 || invoice?.status === 'paid';

  const downloadPDF = () => {
    if (!invoice || !userProfile) return;
    const doc = new jsPDF() as any;
    const margin = 20;

    // Decide if it's an Invoice or Receipt
    const isReceipt = totalPaid > 0;
    const title = isReceipt ? (isFullyPaid ? 'PAYMENT RECEIPT' : 'PAYMENT LEDGER') : 'TAX INVOICE';
    
    doc.setFontSize(22);
    doc.setTextColor(0);
    doc.text(userProfile.business_name, margin, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`${title} #${invoice.invoice_number}`, margin, 40);
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, margin, 45);

    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text('BILL TO', margin, 65);
    doc.setFontSize(14);
    doc.text(clientName, margin, 75);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(clientEmail, margin, 80);

    if (isFullyPaid) {
      doc.setDrawColor(34, 197, 94);
      doc.setTextColor(34, 197, 94);
      doc.rect(150, 20, 40, 15);
      doc.text('PAID', 160, 30);
    }

    if (isReceipt && payments.length > 0) {
      // Payment Breakdown for Receipts
      const tableBody = payments.map(p => [
        new Date(p.paid_at).toLocaleDateString(),
        p.method.toUpperCase(),
        formatCurrency(p.amount)
      ]);

      (doc as any).autoTable({
        startY: 95,
        head: [['Payment Date', 'Method', 'Amount']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
      });
    } else {
      // Standard Invoice Table
      (doc as any).autoTable({
        startY: 95,
        head: [['Description', 'Amount']],
        body: [['Professional Services Rendered', formatCurrency(invoice.amount)]],
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
      });
    }

    const finalY = (doc as any).lastAutoTable.finalY || 110;

    doc.setFontSize(16);
    doc.setTextColor(0);
    if (isReceipt) {
      doc.text(`Total Invoice: ${formatCurrency(invoice.amount)}`, 130, finalY + 20);
      doc.setTextColor(34, 197, 94);
      doc.text(`Total Paid: ${formatCurrency(totalPaid)}`, 130, finalY + 30);
      doc.setTextColor(0);
      doc.text(`Balance Due: ${formatCurrency(remainingBalance)}`, 130, finalY + 40);
    } else {
      doc.text(`Total Due: ${formatCurrency(invoice.amount)}`, 130, finalY + 20);
    }

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Generated via Paydrip Secure Ledger.', margin, finalY + 60);

    doc.save(`${isReceipt ? 'Receipt' : 'Invoice'}_${invoice.invoice_number}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center p-6">
        <motion.div 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="flex flex-col items-center"
        >
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mb-6 shadow-2xl shadow-indigo-100 flex items-center justify-center text-white font-black text-3xl italic animate-pulse">P</div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Synchronizing Ledger...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !invoice || !userProfile) {
    return (
      <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-50 rounded-2xl mb-6 mx-auto flex items-center justify-center text-red-500">
             <Shield size={32} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-400 text-sm leading-relaxed">This invoice record does not exist or has been archived by the issuer.</p>
        </div>
      </div>
    );
  }

  const clientName = invoice.snapshot_json?.name || 'Client';
  const clientEmail = invoice.snapshot_json?.email || '';

  const upiLink = userProfile.upi_id 
    ? `upi://pay?pa=${userProfile.upi_id}&pn=${encodeURIComponent(userProfile.business_name)}&am=${remainingBalance}&cu=INR`
    : null;

  return (
    <div className="min-h-screen bg-[#FDFDFF] py-20 px-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10"
        >
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black italic text-2xl shadow-xl shadow-indigo-100">P</div>
             <div>
               <h1 className="text-2xl font-black tracking-tighter text-slate-900">{userProfile.business_name}</h1>
               <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] leading-none mt-1">Verified Payment Request</p>
             </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={downloadPDF}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            >
              <Download size={14} />
              Save PDF
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden"
        >
          <div className="p-10 md:p-16">
            <div className="grid md:grid-cols-2 gap-16 mb-20 items-start">
              <div>
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8 inline-block",
                    isFullyPaid ? "bg-green-50 text-green-600 border border-green-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                  )}
                >
                  {isFullyPaid ? 'Settled Invoice' : 'Payment Awaiting'}
                </motion.div>
                
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 font-mono">Invoice Ledger Due</h2>
                <div className="text-7xl font-black tracking-[-0.04em] text-slate-900 mb-6 flex flex-col">
                  {formatCurrency(remainingBalance)}
                  {totalPaid > 0 && (
                    <span className="text-lg text-slate-400 font-medium tracking-tight mt-2 line-through opacity-50">
                      Original: {formatCurrency(invoice.amount)}
                    </span>
                  )}
                </div>
                <p className="text-slate-400 font-black font-mono text-xs uppercase tracking-widest">ID: {invoice.invoice_number}</p>
              </div>

              {!isFullyPaid && upiLink && (
                <div className="bg-slate-50/50 p-10 rounded-[2rem] border border-slate-100 flex flex-col items-center">
                  <div className="bg-white p-3 rounded-2xl shadow-2xl shadow-indigo-100/50 mb-8 border border-slate-100">
                    <QRCodeSVG value={upiLink} size={160} />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 text-center">Scan to Pay via UPI</p>
                  <a 
                    href={upiLink} 
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl text-center text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all"
                  >
                    Open Wallet App
                  </a>
                </div>
              )}

              {isFullyPaid && (
                <div className="bg-green-50/50 p-10 rounded-[2rem] border border-green-100 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                    <CheckCircle size={48} />
                  </div>
                  <h3 className="text-xl font-black text-green-900 mb-2 font-mono uppercase tracking-tighter">Paid in Full</h3>
                  <p className="text-green-700/60 text-sm font-medium">Thank you! Your payment has been successfully recorded in the ledger.</p>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-16 border-t border-slate-50 pt-16">
              <div className="space-y-12">
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 font-mono">Recipient</h3>
                  <p className="font-black text-slate-900 text-xl tracking-tight leading-tight">{clientName}</p>
                  <p className="text-slate-500 font-medium italic mt-1">{clientEmail}</p>
                </div>

                {payments.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 font-mono">Payment Stream</h3>
                    <div className="space-y-3">
                      {payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-green-500">
                              <ArrowDown size={14} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{new Date(p.paid_at).toLocaleDateString()}</span>
                          </div>
                          <span className="text-sm font-black text-slate-900">+{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 font-mono">Timeline</h3>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Landmark size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Issue Date</p>
                      <p className="text-lg font-black text-slate-700 tracking-tight">{new Date(invoice.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      invoice.status === 'overdue' ? "bg-red-50 text-red-500" : "bg-indigo-50 text-indigo-600"
                    )}>
                      <Shield size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Settlement Deadline</p>
                      <p className={cn(
                        "text-lg font-black tracking-tight",
                        invoice.status === 'overdue' ? "text-red-600" : "text-slate-700"
                      )}>
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-20 p-8 bg-slate-50/50 rounded-3xl italic text-slate-500 text-sm leading-relaxed border border-slate-100 flex items-start gap-4">
                <span className="text-4xl text-indigo-200 font-serif leading-none">“</span>
                <p>"{invoice.notes}"</p>
              </div>
            )}
          </div>

          <div className="bg-slate-900 p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -z-0" />
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Enterprise Settlement Protocol</p>
              <div className="flex items-center justify-center gap-3">
                <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black italic text-[10px]">P</div>
                <span className="text-lg font-black text-white tracking-tighter">Paydrip</span>
              </div>
            </div>
          </div>
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]"
        >
          Direct inquiries to <span className="text-slate-900">{userProfile.business_name}</span>.
        </motion.p>
      </div>
    </div>
  );
}
