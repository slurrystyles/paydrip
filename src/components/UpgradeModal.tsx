import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, MessageSquare, Mail, Copy, Check, X, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan?: 'pro' | 'unlimited';
}

export default function UpgradeModal({ isOpen, onClose, targetPlan: initialPlan = 'pro' }: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = React.useState<'pro' | 'unlimited'>(initialPlan);
  const [copied, setCopied] = React.useState(false);
  
  // Update internal state if initialPlan changes externally
  React.useEffect(() => {
    setSelectedPlan(initialPlan);
  }, [initialPlan]);

  const upiId = "paydrip@upi"; // Example UPI ID

  const copyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const benefits = selectedPlan === 'pro' 
    ? ["20 Invoices / Mo", "Custom Branding", "WA Reminders", "Priority Support"]
    : ["Unlimited Invoices", "No Branding", "White-label Links", "Full Analytics"];

  const price = selectedPlan === 'pro' ? '₹199' : '₹499';

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
            className="relative z-10 w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-5 overflow-hidden max-h-[95vh] flex flex-col"
          >
            {/* Header */}
            <div className="text-center mb-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white mx-auto mb-2 shadow-lg shadow-indigo-100 italic font-black text-lg">
                P
              </div>
              <h2 className="text-xl font-black tracking-tighter text-slate-900 italic leading-tight">Upgrade Plan</h2>
              
              {/* Plan Switcher */}
              <div className="flex p-1 bg-slate-100 rounded-xl mt-4 mb-2">
                <button 
                  onClick={() => setSelectedPlan('pro')}
                  className={cn(
                    "flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                    selectedPlan === 'pro' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Pro
                </button>
                <button 
                  onClick={() => setSelectedPlan('unlimited')}
                  className={cn(
                    "flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                    selectedPlan === 'unlimited' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Unlimited
                </button>
              </div>

              <div className="text-2xl font-black text-indigo-600 tracking-tighter">
                {price}<span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest ml-1">/mo</span>
              </div>
            </div>

            {/* Benefits - 2 Column Grid to save space */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="w-4 h-4 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                    <Check size={10} strokeWidth={3} />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-tight text-slate-600 truncate">{benefit}</span>
                </div>
              ))}
            </div>

            {/* UPI Section */}
            <div className="bg-slate-900 rounded-xl p-3 mb-4 text-white relative group">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-2 font-mono">Intent Verification</p>
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-[10px] font-bold text-indigo-400 truncate">{upiId}</div>
                <button 
                  onClick={copyUpi}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all active:scale-90"
                >
                  {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <a 
                href={`https://wa.me/910000000000?text=Hi, I want to upgrade to Paydrip ${selectedPlan}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-lg font-black uppercase tracking-widest text-[9px] hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100 active:scale-95"
              >
                <MessageSquare size={12} />
                WhatsApp Upgrade
              </a>
              <a 
                href={`mailto:upgrade@paydrip.io?subject=Upgrade to Paydrip ${selectedPlan}`}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-400 rounded-lg font-black uppercase tracking-widest text-[9px] hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95 border border-slate-100"
              >
                <Mail size={12} />
                Email Support
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
