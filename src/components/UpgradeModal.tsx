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
            className="relative z-10 w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 overflow-hidden"
          >
            {/* Header */}
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-indigo-100 italic font-black text-2xl">
                P
              </div>
              <h2 className="text-3xl font-black tracking-tighter text-slate-900 italic">Upgrade to {targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1)}</h2>
              <div className="mt-2 text-4xl font-black text-indigo-600 tracking-tighter">
                {price}<span className="text-sm text-slate-400 font-bold uppercase tracking-widest ml-1">/month</span>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-4 mb-10">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-600">{benefit}</span>
                </div>
              ))}
            </div>

            {/* UPI Section */}
            <div className="bg-slate-900 rounded-[2rem] p-6 mb-8 text-white relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldCheck size={40} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 font-mono">Instant Intent Verification</p>
              <div className="flex items-center justify-between gap-4">
                <div className="font-mono text-sm font-bold text-indigo-400 truncate">{upiId}</div>
                <button 
                  onClick={copyUpi}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-90"
                >
                  {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-[9px] text-slate-500 mt-4 uppercase font-bold tracking-widest">Pay manually & notify us below</p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <a 
                href={`https://wa.me/910000000000?text=Hi, I want to upgrade to Paydrip ${targetPlan}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-3 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 active:scale-95"
              >
                <MessageSquare size={16} />
                Continue on WhatsApp
              </a>
              <a 
                href={`mailto:upgrade@paydrip.io?subject=Upgrade to Paydrip ${targetPlan}`}
                className="w-full flex items-center justify-center gap-3 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95 border border-slate-100"
              >
                <Mail size={16} />
                Email us
              </a>
            </div>

            <button 
              onClick={onClose}
              className="w-full mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 hover:text-slate-900 transition-colors"
            >
              Maybe later
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
