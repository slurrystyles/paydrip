import React, { useState } from 'react';
import { X, ShieldAlert, FileText, Download, Send, CheckCircle2, AlertTriangle, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Invoice, RecoveryStage } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { recoveryService } from '../lib/recoveryService';
import jsPDF from 'jspdf';

interface Props {
  invoice: Invoice;
  onClose: () => void;
  onUpdate: () => void;
}

const TEMPLATES = [
  {
    id: 'first_warning',
    label: 'Formal Demand (Stage 1)',
    description: 'Calculated reminder of legal obligation.',
    severity: 'medium'
  },
  {
    id: 'final_notice',
    label: 'Final Notice before Suit',
    description: 'Mandatory pre-litigation ultimatum.',
    severity: 'high'
  },
  {
    id: 'statutory_demand',
    label: 'Statutory Payment Demand',
    description: 'Formal legal demand under debt recovery act.',
    severity: 'critical'
  }
];

export default function LegalNoticeModal({ invoice, onClose, onUpdate }: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'selection' | 'preview' | 'success'>('selection');

  const generateLegalPDF = () => {
    const doc = new jsPDF();
    const margin = 25;
    const client = invoice.client || invoice.snapshot_json || {};
    
    // Header
    doc.setFontSize(28);
    doc.setTextColor(220, 38, 38); // Red-600
    doc.text('FORMAL LEGAL NOTICE', margin, 40);
    
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(1.5);
    doc.line(margin, 45, 185, 45);

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Reference: LN-${invoice.invoice_number}-${Date.now().toString().slice(-6)}`, margin, 55);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, 60);

    // Addressee
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIPIENT:', margin, 75);
    doc.setFont('helvetica', 'normal');
    doc.text(client.name || 'Client', margin, 82);
    doc.text(client.address || 'Address on record', margin, 88);

    // Subject
    doc.setFont('helvetica', 'bold');
    doc.text(`SUBJECT: FINAL DEMAND FOR PAYMENT OF OUTSTANDING INVOICE #${invoice.invoice_number}`, margin, 105);

    // Body
    doc.setFont('helvetica', 'normal');
    const bodyText = `
    This is a formal communication regarding the outstanding balance of ${formatCurrency(invoice.amount)} for services rendered. 
    
    Despite numerous attempts to resolve this matter amicably via ${invoice.escalation_level} previous reminders, the balance remains unpaid. Your account is currently in ${invoice.recovery_stage.replace('_', ' ')} status.
    
    FAILING PAYMENT in full within 7 calendar days of this notice, we reserve the right to initiate formal legal proceedings to recover the debt, including interest, legal costs, and statutory penalties.
    
    Please process payment immediately via the link provided below to avoid further escalation.
    `;
    
    const splitText = doc.splitTextToSize(bodyText, 160);
    doc.text(splitText, margin, 115);

    // Link
    doc.setTextColor(79, 70, 229); // Indigo 600
    doc.text(`Payment Link: ${window.location.origin}/v/${invoice.public_token}`, margin, 180);

    // Footer
    doc.setTextColor(150);
    doc.setFontSize(8);
    doc.text('This is a computer-generated formal notice issued by Paydrip Recovery Agent.', margin, 280);

    doc.save(`Legal_Notice_${invoice.invoice_number}.pdf`);
  };

  const handleEscalate = async () => {
    setLoading(true);
    try {
      await recoveryService.recordLegalNotice(invoice.id, invoice.user_id, invoice.organization_id, {
        template: selectedTemplate.id,
        amount: invoice.amount,
        status: 'dispatched'
      });
      generateLegalPDF();
      onUpdate();
      setStep('success');
    } catch (error) {
      console.error(error);
      alert('Escalation failed. Check console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
        className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden relative z-10 border border-red-50"
      >
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-red-50/30">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-red-100 rotate-2">
                <Scale size={24} />
             </div>
             <div>
               <h3 className="text-2xl font-black tracking-tighter text-slate-900 italic leading-none">Legal Escalation</h3>
               <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mt-2">Stage 5 Intervention Protocol</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-slate-900">
            <X size={24} />
          </button>
        </div>

        <div className="p-10">
          <AnimatePresence mode="wait">
            {step === 'selection' && (
              <motion.div 
                key="selection"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Select Notice Severity</label>
                  <div className="grid gap-4">
                    {TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => setSelectedTemplate(tpl)}
                        className={cn(
                          "p-6 rounded-[2rem] border-2 text-left transition-all group relative overflow-hidden",
                          selectedTemplate.id === tpl.id 
                            ? "border-red-500 bg-red-50/50 shadow-xl shadow-red-100/50" 
                            : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center justify-between relative z-10">
                           <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                selectedTemplate.id === tpl.id ? "bg-red-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                              )}>
                                 <FileText size={20} />
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{tpl.label}</p>
                                <p className="text-[11px] font-medium text-slate-500 mt-1">{tpl.description}</p>
                              </div>
                           </div>
                           {tpl.severity === 'critical' && <AlertTriangle size={18} className="text-red-500 animate-pulse" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex items-center justify-between">
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">System note</p>
                      <p className="text-xs font-bold text-white/80 mt-1 max-w-[300px]">
                        "Deploying this notice will record a formal legal event and lock the invoice into high-risk recovery mode."
                      </p>
                   </div>
                   <button 
                     onClick={() => setStep('preview')}
                     className="px-8 py-4 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl"
                   >
                     Confirm Notice
                   </button>
                </div>
              </motion.div>
            )}

            {step === 'preview' && (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                 <div className="p-10 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 min-h-[300px] flex flex-col items-center justify-center text-center">
                    <ShieldAlert size={48} className="text-red-600 mb-6" />
                    <h4 className="text-xl font-black italic tracking-tighter text-slate-900 mb-4 uppercase">Irreversible Escalation</h4>
                    <p className="text-sm font-bold text-slate-500 max-w-sm leading-relaxed">
                      You are about to issue a formal <span className="text-red-600">{selectedTemplate.label}</span>. 
                      This will be permanently added to the recovery trail and generate a PDF document.
                    </p>
                 </div>

                 <div className="flex gap-4">
                    <button 
                      onClick={() => setStep('selection')}
                      className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-slate-900 transition-all"
                    >
                      Abort
                    </button>
                    <button 
                      onClick={handleEscalate}
                      disabled={loading}
                      className="flex-[2] py-5 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? 'Dispatching...' : <><Send size={14} /> Dispatch Notice</>}
                    </button>
                 </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                 <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-green-100">
                    <CheckCircle2 size={48} />
                 </div>
                 <h4 className="text-3xl font-black italic tracking-tighter text-slate-900 mb-4">Notice Dispatched</h4>
                 <p className="text-sm font-bold text-slate-500 max-w-sm mx-auto leading-relaxed mb-10">
                   The formal notice has been recorded and the recovery stage has been updated to Legal Warning.
                 </p>
                 <button 
                   onClick={onClose}
                   className="px-10 py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
                 >
                   Return to Dashboard
                 </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
