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
  Settings,
  CheckCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: 'invoices' | 'members' | 'automations' | 'ai';
}

export function UpgradeModal({ isOpen, onClose, reason }: UpgradeModalProps) {
  const [view, setView] = React.useState<'plans' | 'manual' | 'success'>('plans');
  const [activeMobileTab, setActiveMobileTab] = React.useState(1); // Default to 'Pro' (index 1)
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'yearly'>('monthly');

  const plans = React.useMemo(() => [
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
      price: billingCycle === 'monthly' ? '$12' : '$10',
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
      price: billingCycle === 'monthly' ? '$39' : '$32',
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
  ], [billingCycle]);

  const handleUpgrade = (slug: string) => {
    if (slug === 'enterprise') {
      window.location.href = `mailto:suresh.roshanlal@gmail.com?subject=Enterprise Inquiry: ${reason || 'General'}&body=I would like to discuss the Enterprise plan for my organization.`;
      return;
    }
    setView('manual');
  };

  const handleManualPaymentComplete = () => {
    setView('success');
    // In a real app, this might trigger a server-side notification
  };

  const getReasonTitle = () => {
    if (view === 'success') return 'Request Received';
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
    if (view === 'success') return "Your payment claim has been submitted. Our team will verify the transaction and activate your Pro features within 2-4 hours.";
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6 overflow-hidden">
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
            className="relative bg-white sm:rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-full sm:h-auto max-h-screen sm:max-h-[85vh] overflow-hidden flex flex-col md:flex-row"
          >
            {/* Close Button */}
            <button 
              onClick={() => {
                onClose();
                setTimeout(() => {
                  setView('plans');
                  setBillingCycle('monthly');
                }, 300); // Reset after exit
              }}
              className="absolute top-4 right-4 md:top-6 md:right-6 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 z-50 md:text-white md:hover:bg-white/10"
            >
              <X size={20} />
            </button>

            {/* Promo Sidebar (Mobile top, Desktop left) */}
            <div className="w-full md:w-[35%] bg-slate-900 p-6 md:p-12 text-white flex flex-col justify-between relative shrink-0">
               <div className="absolute top-0 right-0 p-24 bg-indigo-500/10 blur-[100px] rounded-full -mr-12 -mt-12" />
               
               <div className="relative z-10">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-xl shadow-indigo-500/20">
                     {view === 'plans' ? (
                       <Zap size={20} className="text-white fill-current md:size-6" />
                     ) : view === 'success' ? (
                       <Check size={20} className="text-white md:size-6" />
                     ) : (
                       <TrendingUp size={20} className="text-white md:size-6" />
                     )}
                  </div>
                  <h2 className="text-xl md:text-3xl font-black tracking-tight mb-2 md:mb-4 uppercase italic">
                    {getReasonTitle()}
                  </h2>
                  <p className="text-slate-400 text-[11px] md:text-sm leading-relaxed font-medium mb-4 md:mb-8 max-w-[280px] md:max-w-none">
                    {getReasonDesc()}
                  </p>

                  <div className="flex flex-wrap md:flex-col gap-3 md:gap-4 pb-2 md:pb-0">
                     {[
                        { icon: <TrendingUp size={14} />, text: 'Unlimited Invoices' },
                        { icon: <Bot size={14} />, text: 'AI Recovery' },
                        { icon: <Globe size={14} />, text: 'Custom Branding' },
                        { icon: <Smartphone size={14} />, text: 'WhatsApp Prompts' }
                     ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-300">
                           <div className="text-indigo-400 shrink-0">{item.icon}</div>
                           {item.text}
                        </div>
                     ))}
                  </div>
               </div>

               <div className="mt-8 md:mt-12 relative z-10 hidden md:block">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                     <p className="text-[10px] font-black tracking-[0.2em] uppercase text-indigo-400 mb-2">Team Favorite</p>
                     <p className="text-[11px] md:text-xs text-slate-400 italic leading-relaxed">"Paydrip Pro paid for itself within the first 48 hours. Our collection speed increased by 300%."</p>
                  </div>
               </div>
            </div>

            {/* Plans Grid / Manual Payment View */}
            <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden relative">
               <AnimatePresence mode="wait">
                 {view === 'plans' ? (
                   <motion.div 
                     key="plans"
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -20 }}
                     className="flex flex-col h-full overflow-hidden"
                   >
                     {/* Tab Headers (Mobile Only) */}
                     <div className="md:hidden flex p-4 bg-white border-b border-slate-100 shrink-0">
                        <div className="flex w-full bg-slate-50 p-1 rounded-xl">
                           {plans.map((plan, idx) => (
                              <button
                                 key={plan.slug}
                                 onClick={() => setActiveMobileTab(idx)}
                                 className={cn(
                                    "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                    activeMobileTab === idx 
                                       ? "bg-white text-indigo-600 shadow-sm" 
                                       : "text-slate-400"
                                 )}
                              >
                                 {plan.name}
                              </button>
                           ))}
                        </div>
                     </div>

                     {/* Main Content Area */}
                     <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                           <h3 className="text-[10px] md:text-xs font-black tracking-[0.2em] uppercase text-slate-400">Choose your tier</h3>
                           <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                              <button 
                                onClick={() => setBillingCycle('monthly')}
                                className={cn(
                                  "px-3 md:px-4 py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                  billingCycle === 'monthly' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
                                )}
                              >
                                Monthly
                              </button>
                              <button 
                                onClick={() => setBillingCycle('yearly')}
                                className={cn(
                                  "px-3 md:px-4 py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                  billingCycle === 'yearly' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
                                )}
                              >
                                Yearly <span className="text-[8px] text-green-500 ml-1">-20%</span>
                              </button>
                           </div>
                        </div>

                        {/* Desktop: Grid, Mobile: Selected Tab */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 h-full">
                           {plans.map((plan, idx) => (
                              <div 
                                 key={plan.slug}
                                 className={cn(
                                    "bg-white rounded-3xl p-6 border transition-all flex flex-col group",
                                    idx !== activeMobileTab ? "hidden md:flex" : "flex",
                                    plan.highlight ? "border-indigo-200 shadow-xl shadow-indigo-100/50 md:scale-[1.02] relative" : "border-slate-100 shadow-sm"
                                 )}
                              >
                                 {plan.highlight && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg z-20">
                                       Most Popular
                                    </div>
                                 )}

                                 <div className="mb-6">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{plan.name}</p>
                                    <h4 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight italic">
                                       {plan.price}
                                       <span className="text-xs font-medium text-slate-400 tracking-normal not-italic ml-1">
                                         / {billingCycle === 'yearly' && plan.slug !== 'free' ? 'yr (billed annually)' : plan.interval}
                                       </span>
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
                                    onClick={plan.current ? onClose : () => handleUpgrade(plan.slug)}
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
                     </div>
                   </motion.div>
                 ) : view === 'manual' ? (
                   <motion.div 
                     key="manual"
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -20 }}
                     className="flex flex-col h-full p-6 md:p-12 overflow-y-auto custom-scrollbar"
                   >
                     <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[10px] md:text-xs font-black tracking-[0.2em] uppercase text-slate-400">Payment Instructions</h3>
                        <button 
                          onClick={() => setView('plans')}
                          className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-slate-900 transition-colors"
                        >
                          Back to Plans
                        </button>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8">
                        <div className="bento-card p-6 md:p-8 bg-white border-2 border-indigo-100 shadow-xl shadow-indigo-100/30 flex flex-col items-center text-center">
                           <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 md:mb-6">
                              <CheckCircle size={28} className="text-indigo-600 md:size-8" />
                           </div>
                           <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Via UPI</p>
                           <h4 className="text-base md:text-xl font-black text-slate-900 tracking-tight italic mb-3 select-all">suresh.roshanlal@okaxis</h4>
                           <p className="text-[10px] text-slate-500">Send ₹{billingCycle === 'monthly' ? '999' : '9,999'} for activation.</p>
                        </div>

                        <div className="bento-card p-6 md:p-8 bg-white border border-slate-200 shadow-sm flex flex-col items-center text-center">
                           <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 md:mb-6">
                              <Mail size={28} className="text-slate-400 md:size-8" />
                           </div>
                           <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Confirmation</p>
                           <h4 className="text-base md:text-xl font-black text-slate-900 tracking-tight mb-3 break-all select-all">suresh.roshanlal@gmail.com</h4>
                           <p className="text-[10px] text-slate-500">Email transaction ID/screenshot.</p>
                        </div>
                     </div>

                     <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-4 mb-8">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-amber-200 shrink-0">
                           <Shield size={20} className="text-amber-500" />
                        </div>
                        <div>
                           <h5 className="text-[11px] font-black uppercase text-amber-900 mb-1">Human-Verified Activation</h5>
                           <p className="text-[10px] text-amber-700 leading-relaxed font-medium">Payments are verified manually within 2-4 hours. Once verified, features unlock across all nodes instantly.</p>
                        </div>
                     </div>

                     <button 
                       onClick={handleManualPaymentComplete}
                       className="w-full py-5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 mb-6"
                     >
                       I've made the payment
                     </button>
                   </motion.div>
                 ) : (
                   <motion.div 
                     key="success"
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="flex flex-col items-center justify-center h-full p-8 text-center"
                   >
                     <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                        <Check size={40} className="text-green-600" />
                     </div>
                     <h3 className="text-2xl font-black text-slate-900 mb-4 uppercase italic">Claim Submitted</h3>
                     <p className="text-sm text-slate-500 max-w-xs mb-8 leading-relaxed">
                       We've logged your activation request. You'll receive an email confirmation once our team verifies the transaction.
                     </p>
                     <button 
                       onClick={onClose}
                       className="px-8 py-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all"
                     >
                       Back to Dashboard
                     </button>
                   </motion.div>
                 )}
               </AnimatePresence>

               {/* Sticky Footer */}
               <div className="mt-auto p-6 md:p-8 border-t border-slate-100 bg-white/50 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">
                     Security Guaranteed • No CC required
                  </p>
                  <Link 
                     to="/pricing" 
                     onClick={onClose}
                     className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:text-slate-900 transition-colors flex items-center gap-1.5"
                  >
                     Feature matrix <ArrowRight size={10} />
                  </Link>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
