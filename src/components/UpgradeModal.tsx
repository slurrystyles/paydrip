import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, MessageSquare, Mail, Copy, Check, X, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan?: 'pro' | 'unlimited';
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [copied, setCopied] = React.useState(false);
  
  const upiId = "suresh.roshanlal@okicici";

  const copyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const benefits = [
    "Unlimited Invoices", 
    "Custom Branding", 
    "Reminder History", 
    "PDF Downloads",
    "Payment Analytics",
    "Unlimited Clients"
  ];

  const price = '₹299';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative z-10 w-full max-w-sm bg-white rounded-[1.5rem] shadow-2xl p-4 overflow-hidden max-h-[90vh] flex flex-col scale-95 sm:scale-100"
          >
              {/* Header */}
              <div className="text-center mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white mx-auto mb-1 shadow-lg shadow-indigo-100 italic font-black text-base">
                  P
                </div>
                <h2 className="text-lg font-black tracking-tighter text-slate-900 italic leading-tight">Upgrade to Pro</h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Unlock Professional Logistics</p>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-4 text-center">
                <div className="text-2xl font-black text-indigo-600 tracking-tighter">
                  {price}<span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest ml-1">/mo</span>
                </div>
              </div>
  
              {/* Benefits Grid */}
              <div className="grid grid-cols-2 gap-1.5 mb-4">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="w-3.5 h-3.5 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                      <Check size={8} strokeWidth={4} />
                    </div>
                    <span className="text-[7px] font-black uppercase tracking-tight text-slate-600 truncate">{benefit}</span>
                  </div>
                ))}
              </div>
  
              {/* UPI Section */}
              <div className="bg-slate-900 rounded-xl p-2.5 mb-3 text-white relative group">
                <p className="text-[7px] font-black uppercase tracking-widest text-slate-500 mb-1.5 font-mono">Settlement ID (UPI)</p>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-[9px] font-bold text-indigo-400 truncate">{upiId}</div>
                  <button 
                    onClick={copyUpi}
                    className="p-1 bg-white/10 hover:bg-white/20 rounded-md transition-all active:scale-90"
                  >
                    {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                  </button>
                </div>
              </div>
  
              {/* Actions */}
              <div className="grid grid-cols-1 gap-1.5">
                <a 
                  href={`https://wa.me/918522091817?text=Hi, I want to upgrade to Paydrip Pro. I've noted the UPI ID: ${upiId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg font-black uppercase tracking-widest text-[8px] hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                >
                  <MessageSquare size={10} />
                  Confirm on WhatsApp
                </a>
                <a 
                  href={`mailto:suresh.roshanlal@gmail.com?subject=Paydrip Upgrade Request: Pro&body=I'm interested in the Pro plan.`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-400 rounded-lg font-black uppercase tracking-widest text-[8px] hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95 border border-slate-100"
                >
                  <Mail size={10} />
                  Email Verification
                </a>
              </div>
  
              <button 
                onClick={onClose}
                className="w-full mt-3 text-[8px] font-black uppercase tracking-[0.2em] text-slate-300 hover:text-slate-900 transition-colors"
              >
                Maybe later
              </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
