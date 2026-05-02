import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, MessageSquare, Mail, Copy, Check, X, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan?: 'pro' | 'unlimited';
}

export default function UpgradeModal({ isOpen, onClose, targetPlan = 'pro' }: UpgradeModalProps) {
  const [copied, setCopied] = React.useState(false);
  const upiId = "paydrip@upi"; // Example UPI ID

  const copyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const benefits = targetPlan === 'pro' 
    ? ["20 Invoices / Month", "Custom Business Branding", "WhatsApp Reminders", "Priority Support"]
    : ["Unlimited Invoices", "No Branding", "White-label Links", "Full Analytics Suite"];

  const price = targetPlan === 'pro' ? '₹199' : '₹499';

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
            className="relative z-10 w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl shadow-indigo-100 italic font-black text-xl">
                P
              </div>
              <h2 className="text-2xl font-black tracking-tighter text-slate-900 italic">Upgrade to {targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1)}</h2>
              <div className="mt-1 text-3xl font-black text-indigo-600 tracking-tighter">
                {price}<span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">/month</span>
              </div>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-1 gap-2 mb-6">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 truncate">{benefit}</span>
                </div>
              ))}
            </div>

            {/* UPI Section */}
            <div className="bg-slate-900 rounded-[1.5rem] p-4 mb-6 text-white relative group">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <ShieldCheck size={32} />
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3 font-mono">Intent Verification</p>
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-xs font-bold text-indigo-400 truncate">{upiId}</div>
                <button 
                  onClick={copyUpi}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all active:scale-90"
                >
                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <a 
                href={`https://wa.me/910000000000?text=Hi, I want to upgrade to Paydrip ${targetPlan}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 active:scale-95"
              >
                <MessageSquare size={14} />
                Continue on WhatsApp
              </a>
              <a 
                href={`mailto:upgrade@paydrip.io?subject=Upgrade to Paydrip ${targetPlan}`}
                className="w-full flex items-center justify-center gap-3 py-4 bg-slate-50 text-slate-400 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95 border border-slate-100"
              >
                <Mail size={14} />
                Email us
              </a>
            </div>

            <button 
              onClick={onClose}
              className="w-full mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 hover:text-slate-900 transition-colors"
            >
              Maybe later
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
