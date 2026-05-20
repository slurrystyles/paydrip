import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Invoice, 
  UserProfile, 
  Payment, 
  RecoveryStage, 
  ReminderTimeline, 
  ClientRiskScore,
  FollowUpSequence,
  FollowUpStep
} from '../types';
import { 
  X, 
  Download, 
  Share2, 
  CheckCircle, 
  CheckCircle2,
  Trash2, 
  Smartphone, 
  ChevronRight,
  Shield,
  AlertCircle,
  Zap,
  Plus,
  History,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  Scale,
  ShieldAlert,
  Play,
  Pause,
  Ban,
  Clock,
  Send
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { usePlan } from '../contexts/PlanContext';
import { UpgradeModal } from './UpgradeModal';
import { recoveryService } from '../lib/recoveryService';
import { RiskBadge } from './RiskBadge';
import { useOrganization } from '../contexts/OrganizationContext';
import LegalNoticeModal from './LegalNoticeModal';
import { useUserRole } from '../hooks/useUserRole';

interface Props {
  invoice: Invoice;
  onClose: () => void;
  onUpdate: () => void;
}

export default function InvoiceDetailModal({ invoice: propInvoice, onClose, onUpdate }: Props) {
  const { currentOrganization } = useOrganization();
  const { capabilities = { canManageInvoices: false, canManageRecovery: false } } = useUserRole() || {};
  const canUpdate = capabilities.canManageInvoices;
  const [invoice, setInvoice] = useState<Invoice>(propInvoice);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [riskScore, setRiskScore] = useState<ClientRiskScore | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [reminderLogs, setReminderLogs] = useState<ReminderTimeline[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'recovery' | 'payments' | 'history'>('recovery');
  const [sequence, setSequence] = useState<FollowUpSequence | null>(null);
  const [sequenceSteps, setSequenceSteps] = useState<FollowUpStep[]>([]);

  const { plan } = usePlan();
  const [recommendation, setRecommendation] = useState<any>(null);
  const [eventLogs, setEventLogs] = useState<any[]>([]);

  const clientInfo = invoice.client || invoice.snapshot_json || {};
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(0, invoice.amount - totalPaid);
  const isFullyPaid = remainingBalance <= 0 || invoice.status === 'paid';

  const refreshLogs = async () => {
    const { data: logs } = await supabase
      .from('reminder_timeline')
      .select('*')
      .eq('invoice_id', invoice.id)
      .eq('organization_id', invoice.organization_id)
      .order('sent_at', { ascending: false });
    if (logs) setReminderLogs(logs);

    const { data: emails } = await supabase
      .from('audit_log')
      .select('*')
      .eq('entity_id', invoice.id)
      .eq('entity_type', 'invoice')
      .in('audit_type', ['email_sent', 'email_failed', 'email_cap_reached'])
      .order('created_at', { ascending: false });
    if (emails) setEmailLogs(emails);

    const { data: sms } = await supabase
      .from('audit_log')
      .select('*')
      .eq('entity_id', invoice.id)
      .eq('entity_type', 'invoice')
      .in('audit_type', ['sms_sent', 'sms_failed'])
      .order('created_at', { ascending: false });
    if (sms) setSmsLogs(sms || []);

    const { data: events } = await supabase
      .from('invoice_events')
      .select('*')
      .eq('invoice_id', invoice.id)
      .eq('organization_id', invoice.organization_id)
      .order('created_at', { ascending: false });
    if (events) setEventLogs(events);
  };

  const refreshPayments = async () => {
    const { data: payData } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoice.id)
      .eq('organization_id', invoice.organization_id)
      .order('paid_at', { ascending: false });
    if (payData) setPayments(payData);
  };

  const refreshSequence = async () => {
    try {
      const { data: seqs, error: seqError } = await supabase
        .from('follow_up_sequences')
        .select('*')
        .eq('invoice_id', invoice.id);
      
      if (seqError) {
        console.error('Sequence fetch error:', seqError);
      }
      
      const seq = seqs && seqs.length > 0 ? seqs[0] : null;
      
      if (seq) {
        setSequence(seq);
        const { data: steps, error: stepsError } = await supabase
          .from('follow_up_steps')
          .select('*')
          .eq('sequence_id', seq.id)
          .order('scheduled_at', { ascending: true });
        if (steps) setSequenceSteps(steps);
        if (stepsError) console.error('Steps fetch error:', stepsError);
      } else {
        setSequence(null);
        setSequenceSteps([]);
      }
    } catch (err) {
      console.error('Sequence refresh caught error:', err);
    }
  };

  useEffect(() => {
    async function fetchData() {
      const { data: profile } = await supabase.from('users').select('*').eq('id', invoice.user_id).single();
      if (profile) setUserProfile(profile);

      refreshLogs();
      refreshPayments();
      refreshSequence();

      if (invoice.client_id) {
        const { data: risk } = await supabase
          .from('client_risk_scores')
          .select('*')
          .eq('client_id', invoice.client_id)
          .eq('organization_id', invoice.organization_id)
          .single();
        if (risk) {
          setRiskScore(risk);
          const rec = await recoveryService.getStrategicRecommendation(invoice, risk, invoice.organization_id);
          setRecommendation(rec);
        }
      }
    }

    // Real-time Subscriptions
    const sub = supabase
      .channel(`invoice_${invoice.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'payments', 
        filter: `invoice_id=eq.${invoice.id}` 
      }, () => {
        refreshPayments();
        onUpdate();
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'reminder_timeline', 
        filter: `invoice_id=eq.${invoice.id}` 
      }, refreshLogs)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'audit_log', 
        filter: `entity_id=eq.${invoice.id}` 
      }, refreshLogs)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'invoice_events', 
        filter: `invoice_id=eq.${invoice.id}` 
      }, refreshLogs)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'follow_up_sequences', 
        filter: `invoice_id=eq.${invoice.id}` 
      }, refreshSequence)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'follow_up_steps' 
      }, (payload: any) => {
        // Since we can't filter by sequence_id in the subscription payload easily without knowing sequence.id,
        // we just refresh if any step changes. A bit more broad but safe.
         refreshSequence();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'invoices', 
        filter: `id=eq.${invoice.id}` 
      }, () => {
        onUpdate();
        fetchData();
      })
      .subscribe();

    fetchData();

    return () => { supabase.removeChannel(sub); };
  }, [invoice.id, invoice.user_id, invoice.client_id, onUpdate]);

  async function recordPayment(amount: number) {
    if (amount <= 0) return;
    setLoading(true);
    
    const { error } = await supabase.from('payments').insert([{
      invoice_id: invoice.id,
      organization_id: invoice.organization_id,
      amount,
      method: 'upi',
      paid_at: new Date().toISOString()
    }]);

    if (!error) {
       const newTotalPaid = totalPaid + amount;
       if (newTotalPaid >= invoice.amount) {
         const { error: invoiceError } = await supabase
           .from('invoices')
           .update({ status: 'paid' })
           .eq('id', invoice.id)
           .eq('organization_id', invoice.organization_id);
         
         if (!invoiceError) {
            setInvoice(prev => ({ ...prev, status: 'paid' }));
         }
       }
       
       await supabase.from('invoice_events').insert([{
         invoice_id: invoice.id,
         user_id: invoice.user_id,
         organization_id: invoice.organization_id,
         event_type: 'payment',
         metadata: { amount }
       }]);
       
       setPaymentAmount('');
       setShowPaymentForm(false);
       onUpdate();
       
       // Refresh payments
       refreshPayments();
    }
    setLoading(false);
  }

  async function verifyPayment(confirm: boolean) {
    setLoading(true);
    try {
      if (confirm) {
        // 1. Record final payment
        const { error: payError } = await supabase.from('payments').insert([{
          invoice_id: invoice.id,
          organization_id: invoice.organization_id,
          amount: remainingBalance,
          method: 'upi',
          paid_at: new Date().toISOString()
        }]);
        if (payError) throw payError;

        // 2. Update status to paid
        const { error: updateError } = await supabase.from('invoices').update({ 
          status: 'paid', 
          payment_reference: null,
          automation_paused: false,
          updated_at: new Date().toISOString() 
        }).eq('id', invoice.id);
        if (updateError) throw updateError;

        // Update local state immediately
        setInvoice(prev => ({ 
          ...prev, 
          status: 'paid', 
          payment_reference: null,
          automation_paused: false 
        }));

        // 3. Log Audit
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('audit_log').insert({
          entity_id: invoice.id,
          entity_type: 'invoice',
          audit_type: 'payment_confirmed',
          organization_id: invoice.organization_id,
          user_id: user?.id,
          meta: { payment_reference: invoice.payment_reference }
        });
        
        setToast("Payment verified. Invoice marked as paid.");
      } else {
        // Reject
        const newStatus = new Date(invoice.due_date) < new Date() ? 'overdue' : 'sent';
        const { error: updateError } = await supabase.from('invoices').update({ 
          status: newStatus,
          payment_reference: null,
          automation_paused: false, 
          updated_at: new Date().toISOString() 
        }).eq('id', invoice.id);
        if (updateError) throw updateError;

        // Update local state immediately
        setInvoice(prev => ({ 
          ...prev, 
          status: newStatus, 
          payment_reference: null,
          automation_paused: false 
        }));

        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('audit_log').insert({
          entity_id: invoice.id,
          entity_type: 'invoice',
          audit_type: 'payment_rejected',
          organization_id: invoice.organization_id,
          user_id: user?.id,
          meta: { payment_reference: invoice.payment_reference }
        });

        setToast("Payment rejected. Recovery sequence resumed.");
      }
      
      // Auto-clear toast after 3s
      setTimeout(() => setToast(null), 3000);
      onUpdate();
      refreshPayments(); // Refresh list after recording verify payment
    } catch (e: any) {
      console.error('Verify payment failed:', e);
      setToast(`Verification failed: ${e.message || 'Unknown error'}`);
      setTimeout(() => setToast(null), 5000);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(status: 'paid' | 'sent') {
    setLoading(true);
    const { error } = await supabase.from('invoices').update({ status }).eq('id', invoice.id).eq('organization_id', invoice.organization_id);
    
    if (status === 'paid' && !error) {
       // If manually marking as paid, we record one big payment if none exist
       if (payments.length === 0) {
         await supabase.from('payments').insert([{
           invoice_id: invoice.id,
           organization_id: invoice.organization_id,
           amount: invoice.amount,
           method: 'cash'
         }]);
       }
       
       await supabase.from('invoice_events').insert([{
         invoice_id: invoice.id,
         user_id: invoice.user_id,
         organization_id: invoice.organization_id,
         event_type: 'payment',
         metadata: { amount: invoice.amount }
       }]);
    }
    
    if (!error) onUpdate();
    setLoading(false);
  }

  async function updateSequenceStatus(status: 'active' | 'paused') {
    if (!sequence) return;
    setLoading(true);
    const { error } = await supabase
      .from('follow_up_sequences')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', sequence.id);
    if (!error) {
       setSequence({ ...sequence, status });
    }
    setLoading(false);
  }

  async function cancelSequence() {
    if (!confirm('Cancel this follow-up sequence? This will skip all pending steps.')) return;
    setLoading(true);
    const { error } = await supabase.rpc('cancel_follow_up_sequence', { p_invoice_id: invoice.id });
    if (!error) {
       const refreshSequence = async () => {
          const { data: seq } = await supabase.from('follow_up_sequences').select('*').eq('invoice_id', invoice.id).single();
          if (seq) {
            setSequence(seq);
            const { data: steps } = await supabase.from('follow_up_steps').select('*').eq('sequence_id', seq.id).order('scheduled_at', { ascending: true });
            if (steps) setSequenceSteps(steps);
          }
       };
       await refreshSequence();
    }
    setLoading(false);
  }

  async function deleteInvoice() {
    if (!confirm('Permanent delete?')) return;
    const { error } = await supabase.from('invoices').delete().eq('id', invoice.id).eq('organization_id', invoice.organization_id);
    if (!error) {
      onUpdate();
      onClose();
    }
  }

  async function handleSendInvoice() {
    if (!userProfile || !clientInfo.email) {
      alert("Missing business profile or client email.");
      return;
    }

    if (!confirm(`Send invoice #${invoice.invoice_number} to ${clientInfo.name || 'Client'} at ${clientInfo.email}? This will start the automated follow-up sequence.`)) return;

    setLoading(true);
    try {
      await recoveryService.sendInvoice({
        to: clientInfo.email,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        business_name: userProfile.business_name,
        organization_id: invoice.organization_id
      });
      onUpdate();
    } catch (e) {
      console.error('Send failed:', e);
      alert(e instanceof Error ? e.message : 'Failed to send invoice');
    } finally {
      setLoading(false);
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

  const [showReminderEditor, setShowReminderEditor] = useState(false);
  const [editingMessage, setEditingMessage] = useState('');
  const [editingType, setEditingType] = useState<'polite' | 'firm' | 'final' | 'receipt' | null>(null);
  const [deliveryChannel, setDeliveryChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);

  const handleGenerateAI = async (tone: 'polite' | 'firm' | 'final') => {
    setIsGeneratingAI(true);
    try {
      const result = await recoveryService.generateAIReminder({
        amount: remainingBalance,
        daysOverdue: Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)),
        tone,
        clientName: clientInfo.name,
        businessName: userProfile?.business_name || 'My Business',
        riskLevel: riskScore?.risk_level || 'low',
        organizationId: invoice.organization_id,
        previousTone: reminderLogs[0]?.tone,
        hasPartialPayments: payments.length > 0
      });
      const publicLink = `${window.location.origin}/v/${invoice.public_token}`;
      let finalMessage = result.message;
      
      // Auto-replace placeholders that AI often uses
      finalMessage = finalMessage.replace(/{{link}}/g, publicLink);
      finalMessage = finalMessage.replace(/\[link\]/g, publicLink);
      finalMessage = finalMessage.replace(/{{name}}/gi, clientInfo.name || 'there');
      finalMessage = finalMessage.replace(/\[name\]/gi, clientInfo.name || 'there');

      setEditingMessage(finalMessage);
      setEditingType(tone);
      setShowReminderEditor(true);
    } catch (error) {
      console.error('AI Error:', error);
      alert('AI Generation failed. Falling back to template.');
      startWhatsAppFlow(tone);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const getWhatsAppMessage = (type: 'polite' | 'firm' | 'final' | 'receipt') => {
    const businessName = userProfile?.business_name || 'My Business';
    const amount = formatCurrency(remainingBalance);
    const paidAmount = formatCurrency(totalPaid);
    const invNum = invoice.invoice_number;
    const upi = userProfile?.upi_id ? `\n\nPay via UPI: ${userProfile.upi_id}` : '';
    const publicLink = `${window.location.origin}/v/${invoice.public_token}`;

    if (type === 'receipt') {
      return `Hi ${clientInfo.name}, thank you for your payment of ${paidAmount} toward invoice #${invNum}. ${isFullyPaid ? 'Your balance is now fully settled!' : `Remaining balance: ${amount}.`} View your updated receipt here: ${publicLink} - ${businessName}`;
    }

    const templates = {
      polite: userProfile?.whatsapp_templates?.polite || `Hey ${clientInfo.name}, just a quick reminder that invoice #${invNum} is due. Sharing the link here: ${publicLink}`,
      firm: userProfile?.whatsapp_templates?.firm || `Hi ${clientInfo.name}, this invoice is now overdue. Would appreciate if you could clear it today. Link: ${publicLink}`,
      final: userProfile?.whatsapp_templates?.final || `Hi ${clientInfo.name}, this is a final reminder for pending invoice #${invNum}. Please process it at the earliest. Link: ${publicLink}`
    };

    let msg = templates[type];
    // Simple variable replacement
    msg = msg.replace(/\[Name\]/g, clientInfo.name || 'there');
    msg = msg.replace(/\[X\]/g, invNum);
    msg = msg.replace(/\[link\]/g, publicLink);

    return msg;
  };

  const startWhatsAppFlow = (type: 'polite' | 'firm' | 'final' | 'receipt') => {
    if (type !== 'receipt' && isFullyPaid) return;
    
    setDeliveryChannel('whatsapp');
    const initialMessage = getWhatsAppMessage(type);
    setEditingMessage(initialMessage);
    setEditingType(type);
    setShowReminderEditor(true);
  };

  const startEmailFlow = (type: 'polite' | 'firm' | 'final' | 'receipt') => {
    if (type !== 'receipt' && isFullyPaid) return;
    
    setDeliveryChannel('email');
    const initialMessage = getWhatsAppMessage(type); // Reuse templates for body
    setEditingMessage(initialMessage);
    setEditingType(type);
    setShowReminderEditor(true);
  };

  const startSMSFlow = (type: 'polite' | 'firm' | 'final' | 'receipt') => {
    if (type !== 'receipt' && isFullyPaid) return;
    
    setDeliveryChannel('sms' as any);
    const initialMessage = getWhatsAppMessage(type);
    setEditingMessage(initialMessage);
    setEditingType(type);
    setShowReminderEditor(true);
  };

  const confirmAndSendSMS = async () => {
    if (!editingType) return;
    
    const phone = (clientInfo.phone || '').replace(/\D/g, '');
    if (!phone) {
      alert("Client phone number missing.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phone,
          body: editingMessage,
          invoice_id: invoice.id,
          organization_id: invoice.organization_id
        }
      });

      if (error) throw error;

      await recoveryService.logReminder({
        invoice_id: invoice.id,
        user_id: invoice.user_id,
        organization_id: invoice.organization_id,
        sent_at: new Date().toISOString(),
        channel: 'sms',
        tone: editingType === 'receipt' ? 'polite' : editingType,
        delivery_status: 'sent',
        reminder_type: 'manual',
        message_content: editingMessage
      });

      setShowReminderEditor(false);
      setToast("SMS Dispatched.");
      refreshLogs();
    } catch (e: any) {
      alert(`SMS Failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const confirmAndSendWhatsApp = async () => {
    if (!editingType) return;
    
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

    const encodedMessage = encodeURIComponent(editingMessage);
    
    // Log reminder
    await recoveryService.logReminder({
      invoice_id: invoice.id,
      user_id: invoice.user_id,
      organization_id: invoice.organization_id,
      sent_at: new Date().toISOString(),
      channel: 'whatsapp',
      tone: editingType === 'receipt' ? 'polite' : editingType,
      delivery_status: 'sent',
      reminder_type: 'manual',
      message_content: editingMessage
    });

    await supabase.from('invoice_events').insert([{
      invoice_id: invoice.id,
      user_id: invoice.user_id,
      organization_id: invoice.organization_id,
      event_type: 'reminder',
      metadata: { type: editingType }
    }]);

    // Update status to 'sent' if it was draft
    if (invoice.status === 'draft') {
      await supabase.from('invoices').update({ status: 'sent' }).eq('id', invoice.id).eq('organization_id', invoice.organization_id);
    }

    // Auto-escalate if not paid and in recovery
    if (!isFullyPaid && editingType !== 'receipt') {
      let nextStage: RecoveryStage = invoice.recovery_stage;
      if (editingType === 'polite') nextStage = 'gentle_followup';
      else if (editingType === 'firm') nextStage = 'firm_followup';
      else if (editingType === 'final') nextStage = 'final_notice';

      if (nextStage !== invoice.recovery_stage) {
        await recoveryService.updateRecoveryStage(invoice.id, nextStage, invoice.organization_id, (invoice.escalation_level || 0) + 1);
      }
      
      // Re-calculate risk score
      if (invoice.client_id) {
        await recoveryService.calculateRiskScore(invoice.client_id, invoice.user_id, invoice.organization_id);
      }
    }

    onUpdate();
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
    setShowReminderEditor(false);

    // Refresh logs
    const { data: logs } = await supabase
      .from('reminder_timeline')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('sent_at', { ascending: false });
    if (logs) setReminderLogs(logs);
  };

  const confirmAndSendEmail = async () => {
    if (!editingType) return;
    if (!clientInfo.email) {
      alert("Client email address missing.");
      return;
    }

    setLoading(true);
    try {
      const publicLink = `${window.location.origin}/v/${invoice.public_token}`;
      const templateType = editingType === 'receipt' ? 'invoice_paid' : 
                          editingType === 'polite' ? 'reminder_polite' : 
                          editingType === 'firm' ? 'reminder_firm' : 'reminder_final';

      await recoveryService.sendManualEmail({
        to: clientInfo.email,
        subject: editingType === 'receipt' ? `Receipt for Invoice #${invoice.invoice_number}` : `Reminder: Invoice #${invoice.invoice_number}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <p>${editingMessage.replace(/\n/g, '<br/>')}</p>
          </div>
        `,
        invoice_id: invoice.id,
        type: templateType,
        organization_id: invoice.organization_id
      });

      // Update status to 'sent' if it was draft
      if (invoice.status === 'draft') {
        await supabase.from('invoices').update({ status: 'sent' }).eq('id', invoice.id).eq('organization_id', invoice.organization_id);
      }

      setShowReminderEditor(false);
      onUpdate();
    } catch (e) {
      console.error('Email failed:', e);
      alert(e instanceof Error ? e.message : 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  // UPI Link generation: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR
  const upiLink = userProfile?.upi_id 
    ? `upi://pay?pa=${userProfile.upi_id}&pn=${encodeURIComponent(userProfile.business_name)}&am=${remainingBalance}&cu=INR`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />
      
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-5xl sm:rounded-3xl shadow-2xl overflow-y-auto md:overflow-hidden flex flex-col md:flex-row h-screen sm:h-[90vh] relative z-10"
      >
        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 20, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="absolute top-0 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-3 whitespace-nowrap"
            >
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Header with Close Button */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-50 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black italic shadow-lg">P</div>
             <p className="font-black text-slate-900 leading-none">Invoice #{invoice.invoice_number}</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 rounded-xl text-slate-400 active:scale-90 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center">
             <X size={20} />
          </button>
        </div>

        {/* Preview Panel */}
        <div className="shrink-0 md:flex-1 bg-slate-50/50 md:overflow-y-auto p-3 sm:p-8 md:p-12 border-b md:border-b-0 md:border-r border-slate-100">
          <div className="bg-white p-5 sm:p-8 md:p-12 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200/60 min-h-[400px] md:min-h-[800px] flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-12 sm:mb-16">
              <div className="min-w-0">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 break-words">{userProfile?.business_name || 'Your Company'}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <p className="text-slate-400 font-mono text-[10px] sm:text-xs uppercase tracking-widest leading-none truncate max-w-full">{userProfile?.email}</p>
                  {riskScore && <RiskBadge level={riskScore.risk_level} />}
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <p className="font-mono text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest">Digital Invoice</p>
                <p className="text-lg sm:text-xl font-black text-slate-900">#{invoice.invoice_number}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12 mb-12 sm:mb-16">
              <div>
                <p className="font-mono text-[9px] sm:text-[10px] uppercase text-slate-400 mb-2 tracking-widest">Bill To</p>
                <p className="font-bold text-base sm:text-lg text-slate-900">{clientInfo.name}</p>
                <p className="text-slate-500 text-xs sm:text-sm italic truncate">{clientInfo.email}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-mono text-[9px] sm:text-[10px] uppercase text-slate-400 mb-2 tracking-widest">Timeline</p>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm"><span className="text-slate-400">Issued:</span> <span className="font-bold">{new Date(invoice.created_at).toLocaleDateString()}</span></p>
                  <p className="text-xs sm:text-sm"><span className="text-slate-400">Due:</span> <span className="font-bold text-indigo-600">{new Date(invoice.due_date).toLocaleDateString()}</span></p>
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

            <div className="border-t-2 border-slate-900 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
              <div className="max-w-[200px]">
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-2">Terms & Notes</p>
                <p className="text-[10px] sm:text-xs text-slate-500 leading-relaxed italic line-clamp-3">"{invoice.notes || 'Please settle within 7 days of receipt.'}"</p>
              </div>
              <div className="text-left sm:text-right w-full sm:w-auto">
                <div className="space-y-1 mb-2">
                  <div className="flex justify-between sm:justify-end gap-12 text-[10px] sm:text-xs font-bold">
                    <span className="text-slate-400 uppercase tracking-widest">Subtotal</span>
                    <span className="text-slate-900">{formatCurrency(invoice.amount)}</span>
                  </div>
                  {totalPaid > 0 && (
                    <div className="flex justify-between sm:justify-end gap-12 text-[10px] sm:text-xs font-bold">
                      <span className="text-green-500 uppercase tracking-widest">Paid to Date</span>
                      <span className="text-green-600">-{formatCurrency(totalPaid)}</span>
                    </div>
                  )}
                </div>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono uppercase tracking-tighter mb-1">Final Balance Due</p>
                <p className="text-4xl sm:text-5xl font-black tracking-tighter text-indigo-600">{formatCurrency(remainingBalance)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="shrink-0 md:flex-1 lg:flex-none lg:w-96 bg-white flex flex-col border-l border-slate-100 min-h-0">
          <div className="hidden lg:flex p-6 border-b border-slate-100 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>
              <h3 className="font-black uppercase font-mono text-[10px] text-slate-400 tracking-widest">Management Console</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 p-4 sm:p-6 space-y-8 md:overflow-y-auto custom-scrollbar pb-32 lg:pb-6">
            {/* Nav Tabs */}
            <div className="flex gap-1 bg-slate-50 p-1 rounded-2xl overflow-x-auto scrollbar-hide shrink-0">
               {(['recovery', 'payments', 'history'] as const).map(tab => (
                 <button
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={cn(
                     "flex-1 min-w-[80px] py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all",
                     activeTab === tab ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                   )}
                 >
                   {tab}
                 </button>
               ))}
            </div>

            {activeTab === 'recovery' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Verify Payment Section */}
                {canUpdate && invoice.status === 'payment_reported' && (
                  <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-[2rem] space-y-4 shadow-xl shadow-amber-100/50">
                    <div className="flex items-center gap-3 text-amber-800">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                        <Smartphone size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Payment Reported</p>
                        <p className="text-sm font-black mt-1">Ref: {invoice.payment_reference || 'No Reference'}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => verifyPayment(true)}
                        disabled={loading}
                        className="flex-1 py-4 bg-green-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                      >
                        Confirm Payment
                      </button>
                      <button 
                        onClick={() => verifyPayment(false)}
                        disabled={loading}
                        className="flex-1 py-4 bg-white border-2 border-red-100 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all"
                      >
                        Reject Payment
                      </button>
                    </div>
                  </div>
                )}

                {/* Send Invoice Button for Drafts */}
                {canUpdate && invoice.status === 'draft' && (
                  <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-[2rem] border-dashed">
                     <button
                        onClick={handleSendInvoice}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 py-5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50"
                     >
                        {loading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                        ) : (
                          <Send size={16} />
                        )}
                        {loading ? 'Sending...' : 'Send Invoice Now'}
                     </button>
                     <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest text-center mt-4">Automated sequences will activate after sending</p>
                  </div>
                )}

                {/* Status Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-black text-slate-400 uppercase font-mono tracking-widest">Recovery Stage</label>
                      <div className="flex items-center gap-2">
                        {emailLogs.length > 0 && (
                          <span className={cn(
                            "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                            emailLogs[0].audit_type === 'email_sent' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          )}>
                            Email {emailLogs[0].audit_type === 'email_sent' ? 'Sent' : 'Failed'}
                          </span>
                        )}
                        {smsLogs.length > 0 && (
                          <span className={cn(
                            "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                            smsLogs[0].audit_type === 'sms_sent' ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                          )}>
                            SMS {smsLogs[0].audit_type === 'sms_sent' ? 'Sent' : 'Failed'}
                          </span>
                        )}
                      </div>
                    </div>
                  <div className={cn(
                    "p-4 rounded-2xl border-2 flex items-center justify-between transition-all duration-500",
                    isFullyPaid ? 'bg-green-50/50 border-green-200 text-green-700 shadow-lg shadow-green-100/50' :
                    invoice.status === 'overdue' ? 'bg-red-50/50 border-red-200 text-red-700 shadow-lg shadow-red-100/50' : 'bg-slate-50/50 border-slate-200 text-slate-700'
                  )}>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full animate-pulse",
                          isFullyPaid ? 'bg-green-500' : 'bg-orange-500'
                        )}></div>
                        <div>
                          <span className="font-black text-[10px] uppercase tracking-widest block leading-none mb-1">{isFullyPaid ? 'Settled' : invoice.recovery_stage.replace('_', ' ')}</span>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Next Action: {invoice.next_action_at ? new Date(invoice.next_action_at).toLocaleDateString() : 'Immediate Nudge'}</p>
                        </div>
                    </div>
                    {!isFullyPaid && canUpdate && (
                        <button 
                          onClick={() => updateStatus('paid')}
                          className="text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white px-3 py-2 rounded-xl"
                        >
                          Recovered
                        </button>
                    )}
                  </div>
                </div>

                {/* Recovery Sequence Panel */}
                {sequence && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-black text-slate-400 uppercase font-mono tracking-widest">Recovery Sequence</label>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                          sequence.status === 'active' ? "bg-green-100 text-green-700" : 
                          sequence.status === 'paused' ? "bg-orange-100 text-orange-700" :
                          sequence.status === 'completed' ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-700"
                        )}>
                          {sequence.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 space-y-6">
                    <div className="flex gap-2">
                        {canUpdate && sequence.status === 'active' && (
                          <button 
                            onClick={() => updateSequenceStatus('paused')}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-orange-300 transition-all"
                          >
                            <Pause size={12} /> Pause
                          </button>
                        )}
                        {canUpdate && sequence.status === 'paused' && (
                          <button 
                            onClick={() => updateSequenceStatus('active')}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all"
                          >
                            <Play size={12} /> Resume
                          </button>
                        )}
                        {canUpdate && (sequence.status === 'active' || sequence.status === 'paused') && (
                          <button 
                            onClick={cancelSequence}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-red-300 transition-all text-red-500"
                          >
                            <Ban size={12} /> Cancel
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        {sequenceSteps.map((step, idx) => (
                          <div key={step.id} className="flex gap-4 relative">
                            {idx !== sequenceSteps.length - 1 && (
                               <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-slate-200"></div>
                            )}
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10",
                              step.status === 'sent' ? "bg-green-500 text-white" :
                              step.status === 'failed' ? "bg-red-500 text-white" :
                              step.status === 'pending' ? "bg-white border-2 border-slate-200 text-slate-400" : "bg-slate-200 text-slate-400"
                            )}>
                              {step.status === 'sent' ? <CheckCircle2 size={14} /> : 
                               step.status === 'failed' ? <AlertCircle size={14} /> : 
                               step.status === 'skipped' ? <Ban size={14} /> :
                               <Clock size={14} />}
                            </div>
                            <div className="flex-1 pb-4">
                               <div className="flex justify-between items-start">
                                  <div>
                                     <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{step.template_type.replace('_', ' ')}</p>
                                     <p className="text-[9px] text-slate-400 font-medium">Scheduled for {new Date(step.scheduled_at).toLocaleDateString()}</p>
                                  </div>
                                  <span className={cn(
                                    "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                                    step.status === 'sent' ? "bg-green-50 text-green-600" :
                                    step.status === 'failed' ? "bg-red-50 text-red-600" :
                                    "bg-slate-100 text-slate-400"
                                  )}>
                                    {step.status}
                                  </span>
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {sequence.status === 'completed' && (
                        <div className="pt-4 border-t border-slate-200 text-center">
                           <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Sequence Completed</p>
                           <p className="text-[9px] text-slate-400 mt-1">Total {sequenceSteps.filter(s => s.status === 'sent').length} contact attempts made.</p>
                        </div>
                      )}
                      
                      {sequence.status === 'cancelled' && (
                        <div className="pt-4 border-t border-slate-200 text-center">
                           <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Sequence Cancelled</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Recommendation Panel */}
                {!isFullyPaid && (
                  <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform duration-1000 opacity-50"></div>
                     <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                           <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">AI Strategy Engine</p>
                           <div className="flex items-center gap-2">
                             {riskScore?.metrics?.recovery_probability && (
                               <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-black">
                                 {Math.round(riskScore.metrics.recovery_probability)}% Recovery Prob
                               </span>
                             )}
                             <Zap size={14} className="text-yellow-400 fill-yellow-400" />
                           </div>
                        </div>
                        <h4 className="text-xl font-black italic tracking-tighter mb-4 leading-tight">
                           {recommendation?.action || 'Optimize Recovery'} for ₹{formatCurrency(remainingBalance)}
                        </h4>
                        <p className="text-[10px] opacity-80 mb-4 leading-relaxed font-medium">
                          {recommendation?.strategy || 'AI is analyzing client behavior to suggest the best next step.'}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                           {(['polite', 'firm', 'final'] as const).map((tone) => (
                             <button
                               key={tone}
                               onClick={() => handleGenerateAI(tone)}
                               disabled={isGeneratingAI || !canUpdate}
                               className="py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border border-white/10 disabled:opacity-50"
                             >
                               {tone}
                             </button>
                           ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                           <p className="text-[10px] font-black opacity-60 leading-relaxed uppercase tracking-widest">
                              Peak Response: <span className="text-white font-bold">{recommendation?.timing || '24h'}</span>
                           </p>
                           <div className="flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                           </div>
                        </div>
                     </div>
                  </div>
                )}

                {/* Reminder Controls */}
                <div className={cn("space-y-4", (isFullyPaid || !canUpdate) && "opacity-40 grayscale pointer-events-none")}>
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black text-slate-400 uppercase font-mono tracking-widest">Escalation Arsenal</label>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Tools Ready</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <WhatsAppTemplateButton 
                      label="Gentle follow-up" 
                      description="Day 1 reminder"
                      onClick={() => startWhatsAppFlow('polite')}
                      onEmailClick={() => startEmailFlow('polite')}
                      onSMSClick={() => startSMSFlow('polite')}
                      icon={<Shield size={16} className="text-indigo-500" />}
                    />
                    <WhatsAppTemplateButton 
                      label="Firm mandate" 
                      description="Overdue escalation"
                      onClick={() => startWhatsAppFlow('firm')}
                      onEmailClick={() => startEmailFlow('firm')}
                      onSMSClick={() => startSMSFlow('firm')}
                      icon={<AlertCircle size={16} className="text-orange-500" />}
                    />
                    <WhatsAppTemplateButton 
                      label="Final ultimatum" 
                      description="Last notice before fail"
                      onClick={() => startWhatsAppFlow('final')}
                      onEmailClick={() => startEmailFlow('final')}
                      onSMSClick={() => startSMSFlow('final')}
                      icon={<Zap size={16} className="text-red-500" />}
                    />
                  </div>
                </div>

                {/* Recovery Actions Group */}
                {!isFullyPaid && canUpdate && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                           <ShieldAlert size={18} />
                        </div>
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 leading-none">Dispute Protocol</p>
                           <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Pauses all automation</p>
                        </div>
                     </div>
                     <button 
                       onClick={() => recoveryService.toggleDispute(invoice.id, !invoice.is_disputed, invoice.organization_id).then(onUpdate)}
                       className={cn(
                        "w-12 h-6 rounded-full transition-all relative p-1",
                        invoice.is_disputed ? "bg-red-500" : "bg-slate-200"
                       )}
                     >
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full shadow-sm transition-all trasform",
                          invoice.is_disputed ? "translate-x-6" : "translate-x-0"
                        )} />
                     </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setShowLegalModal(true)}
                      className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center gap-3 group hover:bg-red-600 transition-all shadow-xl shadow-slate-200/50"
                    >
                      <Scale size={20} className="text-white/60 group-hover:text-white" />
                      <div className="text-left">
                        <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Legal Notice</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => updateStatus('paid')}
                      className="p-4 bg-green-500 rounded-2xl border border-green-400 flex items-center justify-center gap-3 group hover:bg-green-600 transition-all shadow-xl shadow-green-100/50"
                    >
                      <CheckCircle2 size={20} className="text-white" />
                      <div className="text-left">
                        <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Recovered</p>
                      </div>
                    </button>
                  </div>
                </div>
                )}
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Partial Payment Section */}
                {!isFullyPaid && canUpdate && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-black text-slate-400 uppercase font-mono tracking-widest">Add Payment</label>
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
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                          />
                          <button 
                            onClick={() => recordPayment(parseFloat(paymentAmount))}
                            disabled={loading || !paymentAmount}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest disabled:opacity-50 hover:bg-slate-900 transition-all active:scale-95 shadow-xl shadow-indigo-100"
                          >
                            {loading ? 'Processing...' : 'Record Payment'}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {payments.length > 0 && (
                  <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase font-mono tracking-widest flex items-center gap-2">
                            <History size={12} /> Payment History
                          </p>
                        </div>
                        <div className="space-y-3">
                          {payments.map((p) => (
                            <div key={p.id} className="flex items-center justify-between p-4 bg-white rounded-2xl text-[11px] font-bold border border-slate-100 shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                                   <CheckCircle size={14} />
                                </div>
                                <div>
                                  <span className="text-slate-900">{formatCurrency(p.amount)}</span>
                                  <p className="text-[9px] text-slate-400 mt-0.5">{new Date(p.paid_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{p.method}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {activeTab === 'history' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black text-slate-400 uppercase font-mono tracking-widest">Chronological Audit Trail</label>
                </div>
                
                <div className="space-y-6 relative pl-4 border-l-2 border-slate-100 py-2">
                  {eventLogs.concat(reminderLogs).concat(emailLogs).sort((a,b) => new Date(b.created_at || b.sent_at).getTime() - new Date(a.created_at || a.sent_at).getTime()).map((event, i) => {
                    const isReminder = !!event.tone;
                    const isEmail = ['email_sent', 'email_failed', 'email_cap_reached'].includes(event.audit_type);
                    
                    return (
                      <div key={i} className="relative">
                        <div className={cn(
                          "absolute -left-[2.35rem] top-1.5 w-7 h-7 rounded-full border-4 border-white flex items-center justify-center shadow-sm",
                          isReminder ? "bg-indigo-600 text-white" : 
                          isEmail ? "bg-indigo-400 text-white" :
                          "bg-slate-900 text-white"
                        )}>
                          {isReminder ? <Smartphone size={10} /> : 
                           isEmail ? <FileText size={10} /> :
                           <Zap size={10} />}
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">
                            {isReminder ? `${event.tone} Reminder` : 
                             isEmail ? `Email ${event.audit_type.split('_')[1].toUpperCase()}` :
                             event.event_type.replace('_', ' ')}
                          </p>
                          <p className="text-[8px] font-mono text-slate-400 uppercase">
                            {new Date(event.created_at || event.sent_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                          {(event.metadata || event.meta) && (
                            <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                               <p className="text-[9px] text-slate-500 font-medium leading-relaxed italic">
                                 {JSON.stringify(event.metadata || event.meta)}
                               </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Support Actions */}
            <div className="space-y-3 pt-4 border-t border-slate-50">
               <label className="block text-[10px] font-black text-slate-400 uppercase font-mono tracking-widest mb-4">Assets & Links</label>
               <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/v/${invoice.public_token}`);
                      alert("Link copied!");
                    }}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-300 hover:bg-white transition-all group"
                  >
                     <Share2 size={24} className="text-slate-300 group-hover:text-indigo-600" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900">Copy Link</span>
                  </button>
                  <button 
                    onClick={() => plan === 'pro' ? generatePDF() : setShowUpgradeModal(true)}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-300 hover:bg-white transition-all group"
                  >
                     <FileText size={24} className="text-slate-300 group-hover:text-indigo-600" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900">PDF Invoice</span>
                  </button>
               </div>
            </div>
          </div>

          {canUpdate && (
            <div className="p-6 border-t border-slate-100 shrink-0">
               <button 
                 onClick={deleteInvoice}
                 className="w-full flex items-center justify-center p-4 text-slate-400 hover:text-red-600 hover:bg-red-50/50 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest group border border-transparent hover:border-red-100"
               >
                 <Trash2 size={16} className="mr-2" />
                 Delete Invoice
               </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Reminder Editor Modal */}
      <AnimatePresence>
        {showReminderEditor && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-xl tracking-tighter text-slate-900 italic">Review Message</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 font-mono">Personalize before deployment</p>
                </div>
                <button onClick={() => setShowReminderEditor(false)} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
                  <X size={18} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Channel</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setDeliveryChannel('whatsapp')}
                        className={cn(
                          "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                          deliveryChannel === 'whatsapp' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"
                        )}
                      >
                        WhatsApp
                      </button>
                      <button 
                        onClick={() => setDeliveryChannel('sms' as any)}
                        className={cn(
                          "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                          deliveryChannel === 'sms' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"
                        )}
                      >
                        SMS
                      </button>
                      <button 
                        onClick={() => setDeliveryChannel('email')}
                        className={cn(
                          "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                          deliveryChannel === 'email' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"
                        )}
                      >
                        Email
                      </button>
                    </div>
                  </div>

                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 font-mono">Payload Content</label>
                  <textarea 
                    value={editingMessage}
                    onChange={(e) => setEditingMessage(e.target.value)}
                    rows={6}
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-slate-700 text-sm leading-relaxed resize-none"
                  />
                  <p className="text-[10px] text-slate-400 italic px-1 flex items-center gap-1.5 font-mono">
                    <Shield size={10} /> Secure direct link to ledger verified
                  </p>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowReminderEditor(false)}
                    className="flex-1 py-4 px-6 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all"
                  >
                    Abort
                  </button>
                  <button 
                    onClick={() => {
                      if (deliveryChannel === 'whatsapp') confirmAndSendWhatsApp();
                      else if (deliveryChannel === 'sms') confirmAndSendSMS();
                      else confirmAndSendEmail();
                    }}
                    className="flex-2 py-4 px-6 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 group"
                  >
                    {deliveryChannel === 'whatsapp' ? 'Open WhatsApp' : deliveryChannel === 'sms' ? 'Dispatch SMS' : 'Dispatch Email'}
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Legal Notice Modal */}
      {showLegalModal && (
        <LegalNoticeModal 
          invoice={invoice} 
          onClose={() => setShowLegalModal(false)} 
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}

function WhatsAppTemplateButton({ label, description, onClick, onEmailClick, onSMSClick, icon }: { 
  label: string, 
  description: string, 
  onClick: () => void,
  onEmailClick: () => void,
  onSMSClick: () => void,
  icon: React.ReactNode 
}) {
  return (
    <div className="group relative">
      <div className="flex gap-2">
        <button 
          onClick={onClick}
          className="flex-1 flex font-sans items-center justify-between p-4 bg-slate-50/50 hover:bg-white hover:border-slate-300 border border-slate-200/50 rounded-2xl transition-all text-left shadow-sm hover:shadow-md"
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
        <div className="flex flex-col gap-2">
          <button 
            onClick={onSMSClick}
            className="w-12 flex-1 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-white hover:border-blue-300 transition-all group/sms shadow-sm"
            title="Send SMS"
          >
            <Smartphone size={16} className="text-slate-400 group-hover/sms:text-blue-600" />
          </button>
          <button 
            onClick={onEmailClick}
            className="w-12 flex-1 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-white hover:border-indigo-300 transition-all group/email shadow-sm"
            title="Send Email"
          >
            <Mail size={16} className="text-slate-400 group-hover/email:text-indigo-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

