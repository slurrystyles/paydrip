import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Invoice, UserProfile } from '../types';
import { formatCurrency } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Shield, Landmark } from 'lucide-react';
import jsPDF from 'jspdf';

export default function PublicInvoiceView() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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
      setLoading(false);
    }

    fetchInvoice();
  }, [token]);

  const downloadPDF = () => {
    if (!invoice || !userProfile) return;
    const clientName = invoice.snapshot_json?.name || 'Client';
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text(userProfile.business_name, 20, 20);
    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoice.invoice_number}`, 20, 30);
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 20, 35);
    doc.line(20, 40, 190, 40);
    doc.text('Bill To:', 20, 50);
    doc.text(clientName, 20, 55);
    doc.setFontSize(16);
    doc.text(`Amount: ${formatCurrency(invoice.amount)}`, 20, 80);
    doc.save(`Invoice_${invoice.invoice_number}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mb-4"></div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !invoice || !userProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">404</h1>
          <p className="text-slate-500">This invoice record does not exist or has been archived.</p>
        </div>
      </div>
    );
  }

  const clientName = invoice.snapshot_json?.name || 'Client';
  const clientEmail = invoice.snapshot_json?.email || '';

  const upiLink = userProfile.upi_id 
    ? `upi://pay?pa=${userProfile.upi_id}&pn=${encodeURIComponent(userProfile.business_name)}&am=${invoice.amount}&cu=INR`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Branding Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold italic text-xl">P</div>
             <div>
               <h1 className="text-xl font-bold text-slate-900">{userProfile.business_name}</h1>
               <p className="text-xs text-slate-400 font-mono uppercase tracking-widest leading-none mt-1">Payment Portal</p>
             </div>
          </div>
          <button 
            onClick={downloadPDF}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <Download size={18} />
            PDF
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
              <div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 inline-block",
                  invoice.status === 'paid' ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                )}>
                  {invoice.status}
                </span>
                <h2 className="text-5xl font-black tracking-tight text-slate-900 mb-2">
                  {formatCurrency(invoice.amount)}
                </h2>
                <p className="text-slate-400 text-sm font-medium">Invoice #{invoice.invoice_number}</p>
              </div>

              {invoice.status !== 'paid' && upiLink && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center">
                  <div className="bg-white p-2 rounded-xl shadow-sm mb-4">
                    <QRCodeSVG value={upiLink} size={140} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Scan to Pay via UPI</p>
                  <a 
                    href={upiLink} 
                    className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-center text-sm font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-transform"
                  >
                    Pay via App
                  </a>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-12 border-t border-slate-50 pt-12">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 font-mono">Billed To</h3>
                <p className="font-bold text-slate-900 text-lg">{clientName}</p>
                <p className="text-slate-500 text-sm">{clientEmail}</p>
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 font-mono">Payment Schedule</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                      <Landmark size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Issued On</p>
                      <p className="text-sm font-bold text-slate-700">{new Date(invoice.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                      <Shield size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Due Date</p>
                      <p className="text-sm font-bold text-slate-700">{new Date(invoice.due_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-12 p-6 bg-slate-50 rounded-2xl italic text-slate-500 text-sm">
                "{invoice.notes}"
              </div>
            )}
          </div>

          <div className="bg-slate-900 p-8 text-center">
            <p className="text-xs text-slate-500 font-medium mb-1">Secure payment processing powered by</p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold italic text-[10px]">P</div>
              <span className="text-sm font-bold text-white tracking-tight">Paydrip</span>
            </div>
          </div>
        </div>
        
        <p className="text-center mt-8 text-slate-400 text-xs font-medium">
          If you have questions about this invoice, contact {userProfile.business_name} directly.
        </p>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
