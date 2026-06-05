import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  X, 
  Check, 
  Zap, 
  Bot, 
  ArrowRight,
  TrendingUp,
  Smartphone,
  Globe
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useCurrency } from '../contexts/CurrencyContext';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: 'invoices' | 'members' | 'automations' | 'ai';
}

export function UpgradeModal({ isOpen, onClose, reason }: UpgradeModalProps) {
  const [activeMobileTab, setActiveMobileTab] = React.useState(1); // Default to 'Pro' (index 1)
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'yearly'>('monthly');
  const { currency, prices, isIndia } = useCurrency();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setReady(true);
  }, [currency, isIndia]);

  React.useEffect(() => {
    console.log('Currency resolved:', { 
      currency, isIndia });
  }, [currency, isIndia]);

  const plans = React.useMemo(() => [
    {
      name: 'Free',
      slug: 'free',
      price: prices[currency].free,
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
      price: billingCycle === 'monthly' ? prices[currency].pro_monthly : prices[currency].pro_annual,
      interval: billingCycle === 'monthly' ? 'per month' : 'per year',
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
      color: 'lime'
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      price: billingCycle === 'monthly' ? prices[currency].ent_monthly : prices[currency].ent_annual,
      interval: billingCycle === 'monthly' ? 'per month' : 'per year',
      features: [
        'Everything in Pro',
        'White-label branding',
        'Integrations & Webhooks',
        'Role-based permissions',
        'SMS delivery',
        'Enterprise support',
        'Continuous recovery'
      ],
      cta: 'Upgrade to Enterprise',
      color: 'slate'
    }
  ], [billingCycle, currency, prices]);

  // After successful payment, Lemon Squeezy 
  // redirects to /dashboard?upgraded=true
  // The dashboard handles showing a success message
  const handleUpgrade = (
    slug: string, 
    cycle: 'monthly' | 'yearly'
  ) => {
    if (slug === 'enterprise') {
      // TODO: Replace with active enterprise 
      // contact or dedicated enterprise flow
      alert('Enterprise enquiries coming soon. Contact hello@paydripapp.com to upgrade.');
      return;
    }

    const key = `${slug}-${cycle === 'yearly' ? 'annual' : 'monthly'}`;

    if (isIndia) {
      // Razorpay payment links for INR
      const razorpayLinks: Record<string, string> = {
        'pro-monthly': import.meta.env.VITE_RAZORPAY_PRO_MONTHLY,
        'pro-annual': import.meta.env.VITE_RAZORPAY_PRO_ANNUAL,
        'ent-monthly': import.meta.env.VITE_RAZORPAY_ENT_MONTHLY,
        'ent-annual': import.meta.env.VITE_RAZORPAY_ENT_ANNUAL,
      };
      const link = razorpayLinks[key];
      if (link) window.open(link, '_blank');
      return;
    }

    // Lemon Squeezy checkout for USD
    const variantMap: Record<string, string> = {
      'pro-monthly': import.meta.env.VITE_LEMONSQUEEZY_PRO_MONTHLY_VARIANT,
      'pro-annual': import.meta.env.VITE_LEMONSQUEEZY_PRO_ANNUAL_VARIANT,
      'ent-monthly': import.meta.env.VITE_LEMONSQUEEZY_ENT_MONTHLY_VARIANT,
      'ent-annual': import.meta.env.VITE_LEMONSQUEEZY_ENT_ANNUAL_VARIANT,
    };

    const variantId = variantMap[key];
    if (!variantId) return;

    const checkoutUrl = `https://paydripapp.lemonsqueezy.com/checkout/buy/${variantId}`;
    window.open(checkoutUrl, '_blank');
  };

  const getReasonTitle = () => {
    switch (reason) {
      case 'invoices': return 'Invoice Limit Reached';
      case 'members': return 'Personnel limit reached';
      case 'automations': return 'Automation sequence locked';
      case 'ai': return 'Smart operations locked';
      default: return 'Upgrade your plan';
    }
  };

  const getReasonDesc = () => {
    switch (reason) {
      case 'invoices': return "You've sent 10 invoices this month under the Free Plan. Level up to Pro for unlimited billing volume.";
      case 'members': return "Your current plan includes 1 team operator. Pro supports multiple concurrent team seats.";
      case 'automations': return "Dynamic email and SMS triggers are standard on premium plans. Upgrade to automate sequence runs.";
      default: return "Upgrade to Pro to streamline your collections framework and accelerate settlements.";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 overflow-hidden text-left">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#080808]/85 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 15 }}
            className="relative bg-[#111111] border border-[#222222] sm:rounded-xl shadow-2xl w-full max-w-5xl h-full sm:h-auto max-h-screen sm:max-h-[90vh] overflow-hidden flex flex-col md:flex-row"
          >
            {/* Close Button */}
            <button 
              onClick={() => {
                onClose();
                setTimeout(() => {
                  setBillingCycle('monthly');
                }, 300);
              }}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[#222222] transition-colors text-[#888888] z-50 hover:text-[#EEEEEE]"
            >
              <X size={18} />
            </button>

            {/* Promo Sidebar */}
            <div className="w-full md:w-[35%] bg-[#161616] p-6 md:p-10 text-[#EEEEEE] flex flex-col justify-between relative border-b md:border-b-0 md:border-r border-[#222222] shrink-0">
               <div className="absolute top-0 right-0 p-24 bg-[#C8FF00]/5 blur-[70px] rounded-full -mr-12 -mt-12" />
               
               <div className="relative z-10">
                  <div className="w-10 h-10 bg-[#111111] border border-[#222222] rounded-xl flex items-center justify-center mb-4 text-[#C8FF00]">
                    <Zap size={16} className="fill-[#C8FF00]" />
                  </div>
                  <h2 className="text-lg md:text-xl font-bold tracking-tight mb-2 uppercase font-mono">
                    {getReasonTitle()}
                  </h2>
                  <p className="text-[#888888] text-xs leading-relaxed mb-6 max-w-[280px] md:max-w-none">
                    {getReasonDesc()}
                  </p>

                  <div className="flex flex-wrap md:flex-col gap-3 pb-2 md:pb-0">
                     {[
                        { icon: <TrendingUp size={12} />, text: 'Unlimited Invoices' },
                        { icon: <Bot size={12} />, text: 'AI Recovery Sequences' },
                        { icon: <Globe size={12} />, text: 'Custom Branding' },
                        { icon: <Smartphone size={12} />, text: 'WhatsApp Reminders' }
                     ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-wider text-[#EEEEEE] font-mono">
                           <div className="text-[#C8FF00] shrink-0">{item.icon}</div>
                           {item.text}
                        </div>
                     ))}
                  </div>
               </div>

               <div className="mt-8 md:mt-12 relative z-10 hidden md:block">
                  <div className="p-4 bg-[#111111] border border-[#222222] rounded-lg">
                     <p className="text-[9px] font-bold tracking-wider uppercase text-[#C8FF00] mb-1 font-mono">User Testimonial</p>
                     <p className="text-[11px] text-[#888888] italic leading-relaxed">"Upgrading paid for itself in less than 48 hours. Excellent workflow customization speed."</p>
                  </div>
               </div>
            </div>

            {/* Plans Grid */}
            <div className="flex-1 bg-[#080808] flex flex-col overflow-hidden relative">
               <motion.div 
                 key="plans"
                 initial={{ opacity: 0, x: 15 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -15 }}
                 className="flex flex-col h-full overflow-hidden"
               >
                 {/* Mobile Tab Headers */}
                 <div className="md:hidden flex p-3 bg-[#111111] border-b border-[#222222] shrink-0">
                    <div className="flex w-full bg-[#080808] p-0.5 rounded-lg border border-[#222222]">
                       {plans.map((plan, idx) => (
                          <button
                             key={plan.slug}
                             onClick={() => setActiveMobileTab(idx)}
                             className={cn(
                                "flex-1 py-1.5 text-[9px] font-semibold uppercase tracking-wider rounded-md transition-all",
                                activeMobileTab === idx 
                                   ? "bg-[#111111] text-[#C8FF00] border border-[#222222]" 
                                   : "text-[#888888]"
                             )}
                          >
                             {plan.name}
                          </button>
                       ))}
                    </div>
                 </div>

                 {/* Main Grid */}
                 <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
                       <h3 className="text-[10px] font-semibold tracking-widest uppercase text-[#888888] font-mono">Select a plan</h3>
                       <div className="flex items-center gap-1.5 bg-[#111111] p-0.5 rounded-lg border border-[#222222]">
                          <button 
                            onClick={() => setBillingCycle('monthly')}
                            className={cn(
                              "px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all",
                              billingCycle === 'monthly' ? "bg-[#C8FF00] text-[#080808]" : "text-[#888888] hover:text-[#EEEEEE]"
                            )}
                          >
                            Monthly
                          </button>
                          <button 
                            onClick={() => setBillingCycle('yearly')}
                            className={cn(
                              "px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all",
                              billingCycle === 'yearly' ? "bg-[#C8FF00] text-[#080808]" : "text-[#888888] hover:text-[#EEEEEE]"
                            )}
                          >
                            Yearly <span className="text-[8px] font-mono ml-1 text-emerald-500 font-black">-20%</span>
                          </button>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
                       {plans.map((plan, idx) => (
                          <div 
                             key={plan.slug}
                             className={cn(
                                "bg-[#111111] rounded-xl p-5 border transition-all flex flex-col relative",
                                idx !== activeMobileTab ? "hidden md:flex" : "flex",
                                plan.highlight ? "border-[#C8FF00]/40 shadow-xl shadow-[#C8FF00]/5 scale-[1.01]" : "border-[#222222]"
                             )}
                          >
                             {plan.highlight && (
                                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#C8FF00] text-[#080808] text-[8px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg z-20">
                                   Recommended
                                </div>
                             )}

                             <div className="mb-5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1 font-mono">{plan.name}</p>
                                <h4 className="text-xl md:text-2xl font-black text-[#EEEEEE] tracking-tight font-mono">
                                   {plan.price}
                                   <span className="text-[10px] font-normal text-[#888888] ml-1 tracking-normal font-sans">
                                     / {plan.interval}
                                   </span>
                                </h4>
                             </div>

                             <div className="space-y-2.5 mb-6 flex-1 text-xs">
                                {plan.features.map((feature, i) => (
                                   <div key={i} className="flex items-center gap-1.5 font-medium text-[#888888]">
                                      <Check size={12} className="text-[#C8FF00] shrink-0" />
                                      {feature}
                                   </div>
                                ))}
                             </div>

                             <button 
                                onClick={plan.current ? onClose : () => handleUpgrade(plan.slug, billingCycle)}
                                className={cn(
                                   "w-full py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wide transition-all",
                                   plan.current 
                                      ? "bg-[#161616] text-[#444444] cursor-default border border-[#222222]" 
                                      : plan.highlight 
                                         ? "bg-[#C8FF00] text-[#080808] hover:bg-[#b8ef00]" 
                                         : "bg-[#161616] hover:bg-[#222222] text-[#EEEEEE] border border-[#222222]"
                                )}
                                type="button"
                             >
                                {plan.cta}
                             </button>
                          </div>
                       ))}
                    </div>
                 </div>
               </motion.div>

               {/* Sticky Footer */}
               <div className="mt-auto p-4 md:p-5 border-t border-[#222222] bg-[#111111] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-[10px]">
                  <p className="font-semibold uppercase tracking-wider text-[#444444] font-mono">
                     {isIndia 
                        ? "Secured by Razorpay" 
                        : "Secured by Lemon Squeezy"}
                  </p>
                  <Link 
                     to="/pricing" 
                     onClick={onClose}
                     className="font-bold uppercase tracking-wider text-[#C8FF00] hover:underline flex items-center gap-1 font-mono"
                  >
                     View all plans <ArrowRight size={10} />
                  </Link>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
