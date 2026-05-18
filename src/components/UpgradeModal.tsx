import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  X, 
  Check, 
  Zap, 
  Shield, 
  Bot, 
  Users, 
  ArrowRight,
  TrendingUp,
  Mail,
  Smartphone,
  Globe,
  Settings
} from 'lucide-react';
import { cn } from '../lib/utils';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: 'invoices' | 'members' | 'automations' | 'ai';
}

const PLANS = [
  {
    name: 'Free',
    slug: 'free',
    price: '$0',
    interval: 'forever',
    features: [
      '5 clients',
      '10 invoices / month',
      'Manual reminders',
      'Email delivery',
      'Basic dashboard'
    ],
    cta: 'Current Plan',
    current: true,
    color: 'slate'
  },
  {
    name: 'Pro',
    slug: 'pro',
    price: '$12',
    interval: 'per month',
    features: [
      'Unlimited clients',
      'Unlimited invoices',
      'Automated sequences',
      'AI messages',
      'Custom branding',
      'Analytics',
      'WhatsApp prompts'
    ],
    cta: 'Upgrade to Pro',
    highlight: true,
    color: 'indigo'
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    price: '$39',
    interval: 'per month',
    features: [
      'Everything in Pro',
      'White-label',
      'Webhooks',
      'RBAC',
      'SMS delivery',
      'SSO support',
      'Dedicated support'
    ],
    cta: 'Contact Sales',
    color: 'slate'
  }
];

export function UpgradeModal({ isOpen, onClose, reason }: UpgradeModalProps) {
  const [view, setView] = React.useState<'plans' | 'manual'>('plans');

  const handleUpgrade = () => {
    setView('manual');
  };

  const getReasonTitle = () => {
    if (view === 'manual') return 'Manual Activation';
    switch (reason) {
      case 'invoices': return 'Invoice limit reached';
      case 'members': return 'Team seat limit reached';
      case 'automations': return 'Automation limit reached';
      case 'ai': return 'AI generation limit reached';
      default: return 'Level up your operations';
    }
  };

  const getReasonDesc = () => {
    if (view === 'manual') return "Automated billing is being configured. Please use the details below for instant manual activation.";
    switch (reason) {
      case 'invoices': return "You've sent 10 invoices this month. Upgrade to Pro for unlimited volume.";
      case 'members': return "Free plan includes 1 team seat. Pro supports up to 3 collaborators.";
      case 'automations': return "Automated sequences are a Pro feature. Level up to automate your collections.";
      default: return "Upgrade to Pro to unlock advanced features and scale your business.";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row"
          >
            {/* Close Button */}
            <button 
              onClick={() => {
                onClose();
                setTimeout(() => setView('plans'), 300); // Reset after exit
              }}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 z-50 md:text-white md:hover:bg-white/10"
            >
              <X size={20} />
            </button>

            {/* Promo Sidebar (Mobile hidden top, Desktop left) */}
            <div className="w-full md:w-[35%] bg-slate-900 p-8 md:p-12 text-white flex flex-col justify-between overflow-hidden relative">
               <div className="absolute top-0 right-0 p-24 bg-indigo-500/10 blur-[100px] rounded-full -mr-12 -mt-12" />
               
               <div className="relative z-10">
                  <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/20">
                     {view === 'plans' ? (
                       <Zap size={24} className="text-white fill-current" />
                     ) : (
                       <Check size={24} className="text-white" />
                     )}
                  </div>
                  <h2 className="text-3xl font-black tracking-tight mb-4 uppercase italic">
                    {getReasonTitle()}
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed font-medium mb-8">
                    {getReasonDesc()}
                  </p>

                  <div className="space-y-4">
                     {[
                        { icon: <TrendingUp size={16} />, text: 'Unlimited Invoice Volume' },
                        { icon: <Bot size={16} />, text: 'AI-Powered Recovery' },
                        { icon: <Globe size={16} />, text: 'Custom Branding' },
                        { icon: <Smartphone size={16} />, text: 'WhatsApp Integration' }
                     ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-300">
                           <div className="text-indigo-400">{item.icon}</div>
                           {item.text}
                        </div>
                     ))}
                  </div>
               </div>

               <div className="mt-12 relative z-10">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                     <p className="text-[10px] font-black tracking-[0.2em] uppercase text-indigo-400 mb-2">Team Favorite</p>
                     <p className="text-xs text-slate-400 italic">"Paydrip Pro paid for itself within the first 48 hours. Our collection speed increased by 300%."</p>
                  </div>
               </div>
            </div>

            {/* Plans Grid / Manual Payment View */}
            <div className="flex-1 p-8 md:p-12 bg-slate-50 flex flex-col">
               <AnimatePresence mode="wait">
                 {view === 'plans' ? (
                   <motion.div 
                     key="plans"
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -20 }}
                     className="flex flex-col h-full"
                   >
                     <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xs font-black tracking-[0.2em] uppercase text-slate-400">Choose your tier</h3>
                        <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                           <button className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white rounded-lg">Monthly</button>
                           <button className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900">Yearly (20% Off)</button>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                        {PLANS.map((plan) => (
                           <div 
                              key={plan.slug}
                              className={cn(
                                 "bg-white rounded-3xl p-6 border transition-all flex flex-col",
                                 plan.highlight ? "border-indigo-200 shadow-xl shadow-indigo-100/50 scale-[1.02] relative" : "border-slate-100 shadow-sm"
                              )}
                           >
                              {plan.highlight && (
                                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
                                    Most Popular
                                 </div>
                              )}

                              <div className="mb-6">
                                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{plan.name}</p>
                                 <h4 className="text-3xl font-black text-slate-900 tracking-tight italic">
                                    {plan.price}
                                    <span className="text-xs font-medium text-slate-400 tracking-normal not-italic ml-1">/ {plan.interval}</span>
                                 </h4>
                              </div>

                              <div className="space-y-3 mb-8 flex-1">
                                 {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                       <Check size={14} className="text-green-500 shrink-0" />
                                       {feature}
                                    </div>
                                 ))}
                              </div>

                              <button 
                                 onClick={plan.current ? onClose : handleUpgrade}
                                 className={cn(
                                    "w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                                    plan.current 
                                       ? "bg-slate-50 text-slate-400 cursor-default" 
                                       : plan.highlight 
                                          ? "bg-slate-900 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-100" 
                                          : "bg-white border border-slate-200 text-slate-900 hover:bg-slate-50"
                                 )}
                              >
                                 {plan.cta}
                              </button>
                           </div>
                        ))}
                     </div>
                   </motion.div>
                 ) : (
                   <motion.div 
                     key="manual"
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -20 }}
                     className="flex flex-col h-full space-y-8"
                   >
                     <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-black tracking-[0.2em] uppercase text-slate-400">Payment Instructions</h3>
                        <button 
                          onClick={() => setView('plans')}
                          className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-slate-900 transition-colors"
                        >
                          Back to Plans
                        </button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bento-card p-8 bg-white border-2 border-indigo-100 shadow-xl shadow-indigo-100/30 flex flex-col items-center text-center">
                           <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                              <CheckCircle size={32} className="text-indigo-600" />
                           </div>
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Manual Payment via UPI</p>
                           <h4 className="text-2xl font-black text-slate-900 tracking-tight italic mb-4">suresh.roshanlal@okaxis</h4>
                           <p className="text-xs text-slate-500 max-w-[200px]">Send the plan amount ($12 / ₹999) to this ID for instant activation.</p>
                        </div>

                        <div className="bento-card p-8 bg-white border border-slate-200 shadow-sm flex flex-col items-center text-center">
                           <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                              <Mail size={32} className="text-slate-400" />
                           </div>
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Send Confirmation</p>
                           <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-4">suresh.roshanlal@gmail.com/h4>
                           <p className="text-xs text-slate-500 max-w-[200px]">Email your transaction screenshot and organization name.</p>
                        </div>
                     </div>

                     <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-amber-200 shrink-0">
                           <Shield size={20} className="text-amber-500" />
                        </div>
                        <div>
                           <h5 className="text-xs font-black uppercase text-amber-900 mb-1">Human-Verified Activation</h5>
                           <p className="text-[10px] text-amber-700 leading-relaxed font-medium">Our team verifies payments manually within 2-4 hours. Once verified, your Pro features will be unlocked across all nodes instantly.</p>
                        </div>
                     </div>

                     <div className="flex-1" />

                     <button 
                       onClick={onClose}
                       className="w-full py-5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200"
                     >
                       I've made the payment
                     </button>
                   </motion.div>
                 )}
               </AnimatePresence>

               <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">
                     Security Guaranteed • No credit card required to start • Cancel anytime
                  </p>
                  <Link 
                     to="/pricing" 
                     onClick={onClose}
                     className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:text-slate-900 transition-colors flex items-center gap-1.5"
                  >
                     Review full feature matrix <ArrowRight size={10} />
                  </Link>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
