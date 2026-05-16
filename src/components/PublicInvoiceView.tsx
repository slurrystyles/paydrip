import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Invoice, UserProfile, Payment } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Download, Shield, Landmark, CheckCircle, 
  ArrowDown, Copy, Check, Clock, AlertCircle,
  ExternalLink, CreditCard, Wallet, MapPin, Mail, Phone
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';

export default function PublicInvoiceView() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [reportedAmount, setReportedAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'bank' | 'cash'>('upi');
  const [copied, setCopied] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    async function fetchInvoice() {
      if (!token) return;

      try {
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select(`*`)
          .eq('public_token', token)
          .single();

        if (invoiceError || !invoiceData) {
          setError("Invoice not found or inaccessible.");
          setLoading(false);
          return;
        }

        // Check expiry
        const isExpired = invoiceData.public_token_expires_at && new Date(invoiceData.public_token_expires_at) < new Date();
        
        // Fetch profile even if expired for context
        const { data: profile } = await supabase
          .from('public_business_profiles')
          .select('*')
          .eq('id', invoiceData.user_id)
          .single();
        
        setUserProfile(profile as UserProfile);

        if (isExpired) {
          setError("expired");
          setLoading(false);
          return;
        }

        setInvoice(invoiceData);
        setReportedAmount(invoiceData.amount.toString());

        // Audit Logging (once per session)
        const sessionKey = `viewed_${invoiceData.id}`;
        if (!sessionStorage.getItem(sessionKey)) {
          await supabase.from('audit_log').insert([{
            entity_id: invoiceData.id,
            entity_type: 'invoice',
            audit_type: 'invoice_viewed',
            organization_id: invoiceData.organization_id,
            meta: { public_token: token, timestamp: new Date().toISOString() }
          }]);
          sessionStorage.setItem(sessionKey, 'true');
        }

        // Fetch payments
        const { data: payData } = await supabase
          .from('payments')
          .select('*')
          .eq('invoice_id', invoiceData.id)
          .order('paid_at', { ascending: false });
        
        if (payData) setPayments(payData as Payment[]);
      } catch (err) {
        console.error(err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    }

    fetchInvoice();
  }, [token]);

  const handleCopyUpi = () => {
    if (!userProfile?.upi_id) return;
    navigator.clipboard.writeText(userProfile.upi_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReportPayment = async () => {
    if (!invoice || !userProfile) return;
    if (!transactionRef.trim()) {
      alert('Please enter a Transaction ID or payment reference.');
      return;
    }
    
    setIsProcessing(true);
    try {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ 
          status: 'payment_reported', 
          payment_reference: transactionRef,
          updated_at: new Date().toISOString() 
        })
        .eq('id', invoice.id);
      
      if (updateError) throw updateError;
      
      await supabase.from('audit_log').insert({
        entity_id: invoice.id,
        entity_type: 'invoice',
        audit_type: 'payment_reported',
        organization_id: invoice.organization_id,
        meta: { 
          reference: transactionRef, 
          amount: parseFloat(reportedAmount),
          method: paymentMethod,
          source: 'public_portal' 
        }
      });

      setInvoice({ ...invoice, status: 'payment_reported', payment_reference: transactionRef });
      setShowConfirmation(true);
    } catch (e) {
      console.error(e);
      alert('Failed to report payment. Please check your connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getDueDateInfo = (dueDate: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        color: 'text-red-600 bg-red-50 border-red-100', 
        text: `${Math.abs(diffDays)} days overdue`,
        icon: AlertCircle,
        intensity: 'high'
      };
    } else if (diffDays <= 3) {
      return { 
        color: 'text-amber-600 bg-amber-50 border-amber-100', 
        text: diffDays === 0 ? 'Due Today' : `Due in ${diffDays} days`,
        icon: Clock,
        intensity: 'medium'
      };
    } else {
      return { 
        color: 'text-green-600 bg-green-50 border-green-100', 
        text: `Due in ${diffDays} days`,
        icon: CheckCircle,
        intensity: 'low'
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Loading Secure Invoice...</p>
        </div>
      </div>
    );
  }

  if (error === 'expired') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
            <Clock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Link Expired</h1>
          <p className="text-slate-500 text-sm mb-8">This secure payment link has expired for security reasons. Please contact the business for a new one.</p>
          <div className="p-4 bg-slate-50 rounded-2xl text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Contact Business</p>
            <p className="font-bold text-slate-900">{userProfile?.business_name}</p>
            {userProfile?.email && <p className="text-slate-500 text-sm">{userProfile.email}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice || !userProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-50 rounded-full mb-6 mx-auto flex items-center justify-center text-red-500">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invoice Not Found</h1>
          <p className="text-slate-500 text-sm">We couldn't find the invoice you're looking for. It may have been removed or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  const clientName = invoice.snapshot_json?.name || 'Client';
  const clientEmail = invoice.snapshot_json?.email || '';
  const items = invoice.snapshot_json?.items || [];
  const status = invoice.status;
  const isPaid = status === 'paid';
  const isReported = status === 'payment_reported';
  const isDraft = status === 'draft';
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(0, invoice.amount - totalPaid);
  
  const dueDateInfo = getDueDateInfo(invoice.due_date);
  const upiLink = userProfile.upi_id 
    ? `upi://pay?pa=${userProfile.upi_id}&pn=${encodeURIComponent(userProfile.business_name)}&am=${remainingBalance}&cu=INR`
    : null;

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            {userProfile.logo_url ? (
              <img src={userProfile.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                {userProfile.business_name?.[0]}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Invoice from {userProfile.business_name}</h1>
              <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest mt-0.5">
                <Shield size={10} className="text-indigo-500" />
                <span>Verified Secure Portal</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Download size={14} />
              Save PDF
            </button>
          </div>
        </div>

        {/* Status Alert for Draft */}
        {isDraft && (
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-amber-900 font-bold text-sm">Draft Invoice</p>
              <p className="text-amber-700 text-xs">This invoice hasn't been finalized yet. No payment is required at this time.</p>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Invoice Details */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
            >
              <div className="p-6 sm:p-8 space-y-8">
                {/* Summary Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-8 border-b border-slate-50">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-2">
                      {formatCurrency(invoice.amount)}
                    </h2>
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">#{invoice.invoice_number}</span>
                       <span className="text-slate-300">•</span>
                       <span className="text-xs text-slate-500">{new Date(invoice.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className={cn(
                      "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                      isPaid ? "bg-green-50 text-green-600 border-green-100" :
                      isReported ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                      "bg-slate-50 text-slate-600 border-slate-100"
                    )}>
                      {isPaid ? 'Payment Confirmed ✓' : isReported ? 'Payment under review' : 'Payment Awaiting'}
                    </div>
                    <div className={cn(
                      "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5",
                      dueDateInfo.color
                    )}>
                      <dueDateInfo.icon size={12} />
                      {dueDateInfo.text}
                    </div>
                  </div>
                </div>

                {/* Billing Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Billed To</h3>
                    <p className="font-bold text-slate-900 text-lg">{clientName}</p>
                    {clientEmail && <p className="text-slate-500 text-sm mt-1">{clientEmail}</p>}
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">From</h3>
                    <p className="font-bold text-slate-900 text-lg">{userProfile.business_name}</p>
                    {userProfile.upi_id && (
                      <div className="flex items-center gap-2 mt-1 text-slate-500 text-sm">
                        <Landmark size={14} className="text-slate-400" />
                        <span>UPI: {userProfile.upi_id}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                {items.length > 0 ? (
                  <div className="pt-8 border-t border-slate-50">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Invoice Items</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
                            <th className="text-left py-3">Description</th>
                            <th className="text-center py-3">Qty</th>
                            <th className="text-right py-3">Rate</th>
                            <th className="text-right py-3">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {items.map((item: any, idx: number) => (
                            <tr key={idx}>
                              <td className="py-4 text-sm font-medium text-slate-700">{item.description}</td>
                              <td className="py-4 text-sm text-center text-slate-500 font-mono">{item.quantity}</td>
                              <td className="py-4 text-sm text-right text-slate-500 font-mono">{formatCurrency(item.rate)}</td>
                              <td className="py-4 text-sm text-right font-bold text-slate-900 font-mono">{formatCurrency(item.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-8 flex flex-col items-end space-y-3">
                      <div className="w-full max-w-[240px] space-y-2">
                        {invoice.snapshot_json?.subtotal && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Subtotal</span>
                            <span className="text-slate-900 font-medium font-mono">{formatCurrency(invoice.snapshot_json.subtotal)}</span>
                          </div>
                        )}
                        {invoice.snapshot_json?.tax && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Tax</span>
                            <span className="text-slate-900 font-medium font-mono">+{formatCurrency(invoice.snapshot_json.tax)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                          <span className="font-bold text-slate-900">Total Due</span>
                          <span className="text-xl font-black text-indigo-600 font-mono">{formatCurrency(invoice.snapshot_json?.total || invoice.amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                   <div className="pt-8 border-t border-slate-50 flex justify-end">
                      <div className="w-full max-w-[240px] flex justify-between items-center">
                        <span className="font-bold text-slate-900">Total Due</span>
                        <span className="text-2xl font-black text-indigo-600 font-mono">{formatCurrency(invoice.amount)}</span>
                      </div>
                   </div>
                )}

                {invoice.notes && (
                  <div className="pt-8 border-t border-slate-50">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Notes</h3>
                    <p className="text-slate-500 text-sm italic">{invoice.notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column: Payment & Stats */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {isPaid ? (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-50 border border-green-100 rounded-3xl p-8 text-center"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-green-900 mb-2">Payment Confirmed!</h3>
                  <p className="text-green-700 text-sm mb-6">Thank you, {clientName}. Your payment has been received and verified by {userProfile.business_name}.</p>
                  <div className="bg-white/50 rounded-2xl p-4 text-xs text-green-800 font-bold border border-green-200/50">
                     Receipt Generated #${invoice.invoice_number}
                  </div>
                </motion.div>
              ) : isReported ? (
                <motion.div 
                  key="reported"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-indigo-50 border border-indigo-100 rounded-3xl p-8"
                >
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-6">
                    <Clock size={24} className="animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold text-indigo-900 mb-2">Under Verification</h3>
                  <p className="text-indigo-700 text-sm mb-6">Your payment report is under manual review. This usually takes 2-4 hours during business periods.</p>
                  <div className="space-y-3">
                    <div className="p-4 bg-white rounded-2xl border border-indigo-100 space-y-1">
                       <p className="text-[10px] text-slate-400 font-bold uppercase">Transaction Reference</p>
                       <p className="font-bold text-indigo-900 font-mono text-sm">{invoice.payment_reference}</p>
                    </div>
                  </div>
                </motion.div>
              ) : !isDraft ? (
                <motion.div 
                  key="payment"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 space-y-8"
                >
                  {/* UPI QR Section */}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                       <Wallet size={12} className="text-indigo-500" />
                       How to Pay
                    </h3>
                    
                    {userProfile.upi_id ? (
                      <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-2xl flex flex-col items-center">
                          <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 mb-4">
                            <QRCodeSVG value={upiLink || ''} size={160} />
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Scan to pay via UPI</p>
                        </div>

                        <div className="relative">
                           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                              <div className="min-w-0">
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Business UPI ID</p>
                                 <p className="font-bold text-slate-900 truncate">{userProfile.upi_id}</p>
                              </div>
                              <button 
                                onClick={handleCopyUpi}
                                className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all active:scale-90"
                              >
                                 {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                              </button>
                           </div>
                           <AnimatePresence>
                             {copied && (
                               <motion.div 
                                 initial={{ opacity: 0, y: 5 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 exit={{ opacity: 0 }}
                                 className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-full"
                               >
                                 Copied!
                               </motion.div>
                             )}
                           </AnimatePresence>
                        </div>

                        <a 
                          href={upiLink || '#'} 
                          className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                        >
                          Open UPI App
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700 text-xs">
                        No UPI ID associated with this profile. Please contact the business for bank details.
                      </div>
                    )}
                  </div>

                  {/* Bank Details */}
                  {userProfile.bank_details && (
                    <div className="pt-8 border-t border-slate-50">
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                          <Landmark size={12} className="text-indigo-500" />
                          Bank Transfer
                       </h3>
                       <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 whitespace-pre-wrap text-sm text-slate-600 font-medium">
                          {userProfile.bank_details}
                       </div>
                    </div>
                  )}

                  {/* Payment Reporting Form */}
                  <div className="pt-8 border-t border-slate-50 space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Report Payment</h3>
                    
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block px-1">Amount Paid</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <input 
                          type="number"
                          value={reportedAmount}
                          onChange={(e) => setReportedAmount(e.target.value)}
                          className="w-full pl-8 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:border-indigo-600 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block px-1">Payment Method</label>
                      <div className="grid grid-cols-3 gap-2">
                         <button 
                           onClick={() => setPaymentMethod('upi')}
                           className={cn(
                             "py-2 px-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all",
                             paymentMethod === 'upi' ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-400 border-slate-100"
                           )}
                         >
                           UPI
                         </button>
                         <button 
                           onClick={() => setPaymentMethod('bank')}
                           className={cn(
                             "py-2 px-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all",
                             paymentMethod === 'bank' ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-400 border-slate-100"
                           )}
                         >
                           Bank
                         </button>
                         <button 
                           onClick={() => setPaymentMethod('cash')}
                           className={cn(
                             "py-2 px-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all",
                             paymentMethod === 'cash' ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-400 border-slate-100"
                           )}
                         >
                           Cash
                         </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block px-1">Transaction ID / Ref</label>
                      <input 
                        type="text"
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        placeholder="e.g. 412389471..."
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:border-indigo-600 outline-none transition-all"
                      />
                    </div>

                    <button 
                      onClick={handleReportPayment}
                      disabled={isProcessing}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        "I've Made the Payment"
                      )}
                    </button>
                    <p className="text-[8px] text-slate-400 text-center font-bold uppercase">Payments are verified manually by {userProfile.business_name}</p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Support Info */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Need Help?</h3>
              <div className="space-y-3">
                 <div className="flex items-center gap-3 text-slate-600">
                    <Mail size={16} className="text-slate-400" />
                    <span className="text-xs font-medium">{userProfile.email}</span>
                 </div>
                 {userProfile.phone && (
                   <div className="flex items-center gap-3 text-slate-600">
                      <Phone size={16} className="text-slate-400" />
                      <span className="text-xs font-medium">{userProfile.phone}</span>
                   </div>
                 )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-12 pb-8 border-t border-slate-200/60 flex flex-col items-center gap-6">
           <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-slate-200 shadow-sm">
                 <Shield size={10} className="text-indigo-600" />
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Secured by Paydrip</span>
              </div>
              <p className="text-[9px] text-slate-400 text-center leading-relaxed">
                 You are receiving this invoice because of your recent transaction with {userProfile.business_name}.<br/>
                 Paydrip acts as a secure processing portal.
              </p>
           </div>
           
           <div className="flex gap-4">
              <button className="text-[9px] font-bold text-slate-400 hover:text-slate-600">Privacy Policy</button>
              <button className="text-[9px] font-bold text-slate-400 hover:text-slate-600">Terms of Service</button>
              <button className="text-[9px] font-bold text-slate-400 hover:text-slate-600 underline">Unsubscribe from reminders</button>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {showConfirmation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xl">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white rounded-[2.5rem] p-8 sm:p-12 max-w-sm w-full text-center shadow-2xl border border-slate-100"
             >
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto mb-6 sm:mb-8">
                   <CheckCircle size={40} />
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mb-4 italic uppercase">Payment Reported</h2>
                <p className="text-slate-500 text-sm mb-8 sm:mb-10 leading-relaxed font-medium">Thank you! Your payment report has been sent to <span className="font-bold text-slate-900">{userProfile?.business_name}</span> for verification.</p>
                <button 
                  onClick={() => setShowConfirmation(false)}
                   className="w-full py-4 sm:py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200"
                >
                  Close Confirmation
                </button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
