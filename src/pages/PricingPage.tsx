import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  ArrowRight, 
  Zap, 
  Bot, 
  Shield, 
  HelpCircle,
  Globe,
  Smartphone,
  Star,
  Users,
  ArrowUpRight,
  Menu,
  X,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { useNavigate, Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import { useCurrency } from '../contexts/CurrencyContext';
import { usePlan } from '../contexts/PlanContext';
import AuthView from '../components/AuthView';

function savePendingCheckout(url: string) {
  sessionStorage.setItem(
    'pendingCheckout', url
  );
}

function getPendingCheckout(): string | null {
  return sessionStorage.getItem(
    'pendingCheckout'
  );
}

function clearPendingCheckout() {
  sessionStorage.removeItem('pendingCheckout');
}

async function createRazorpaySubscription(
  planId: string,
  userEmail: string,
  userName: string,
  accessToken: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-razorpay-subscription`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          planId,
          userEmail,
          userName
        })
      }
    );
    const data = await response.json();
    return data.short_url || null;
  } catch {
    return null;
  }
}


const PRICING_PLANS = [
  {
    name: 'Free',
    description: 'Perfect for exploring the power of automated collection.',
    features: [
      '10 invoices / month',
      '5 clients',
      'AI messages (5/month)',
      '2 active sequences',
      'Email + WhatsApp delivery',
      'Public payment portal',
      'UPI QR code',
      'Basic analytics'
    ],
    cta: 'Get started free',
    slug: 'free',
    color: 'slate'
  },
  {
    name: 'Pro',
    description: 'The standard for growing businesses and professional operators.',
    features: [
      '500 invoices / month',
      'Unlimited clients',
      'AI messages (100/month)',
      '50 active sequences',
      'Email + SMS + WhatsApp',
      'Custom email templates',
      'Full analytics',
      '3 team seats',
      'No Paydrip branding'
    ],
    cta: 'Start Pro',
    slug: 'pro',
    highlight: true,
    color: 'indigo'
  },
  {
    name: 'Enterprise',
    description: 'Advanced features for maximum control and scalability.',
    features: [
      'Unlimited everything',
      'WhatsApp Business API',
      'AI messages (unlimited)',
      '20 team seats',
      'RBAC & SSO/SAML',
      'Webhooks',
      'White-label portal',
      'Custom domain',
      'Priority support'
    ],
    cta: 'Start Enterprise',
    slug: 'enterprise',
    color: 'slate'
  }
];

const FAQS = [
  {
    q: "Is the free plan really free?",
    a: "Yes. No credit card required. You get 10 invoices per month forever."
  },
  {
    q: "When will paid plans be available?",
    a: "Paid plans are active! We support Lemon Squeezy for global checkouts and Razorpay for users in India."
  },
  {
    q: "Can I use Paydrip for international clients?",
    a: "Absolutely. Paydrip supports global currencies and multilingual notification templates."
  },
  {
    q: "What payment methods do you support?",
    a: "We support UPI, Netbanking, Credit/Debit cards, Apple Pay, and Google Pay through our secure payment gateway partners."
  }
];

export default function PricingPage({ isNested = false }: { isNested?: boolean }) {
  const { profile } = usePlan();
  const user = profile;

  const [isYearly, setIsYearly] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const navigate = useNavigate();

  const { currency, prices: PRICES, isIndia } = useCurrency();

  useEffect(() => {
    if (user) {
      const pending = getPendingCheckout();
      if (pending) {
        clearPendingCheckout();
        window.open(pending, '_blank');
      }
    }
  }, [user]);

  const handleCheckout = async (
    slug: string,
    cycle: 'monthly' | 'yearly'
  ) => {
    if (slug === 'free') {
      if (!user) {
        setShowAuth(true);
        return;
      }
      navigate('/dashboard');
      return;
    }

    const key = `${slug}-${
      cycle === 'yearly' ? 'annual' : 'monthly'
    }`;

    if (isIndia) {
      const razorpayPlanMap: 
        Record<string, string> = {
        'pro-monthly': import.meta.env
          .VITE_RAZORPAY_PRO_MONTHLY,
        'pro-annual': import.meta.env
          .VITE_RAZORPAY_PRO_ANNUAL,
        'ent-monthly': import.meta.env
          .VITE_RAZORPAY_ENT_MONTHLY,
        'ent-annual': import.meta.env
          .VITE_RAZORPAY_ENT_ANNUAL,
      };

      const planId = razorpayPlanMap[key];
      if (!planId) return;

      setCheckoutLoading(true);
      try {
        const { data: { session } } = 
          await supabase.auth.getSession();
        
        if (!session) {
          setShowAuth(true);
          return;
        }

        const shortUrl = 
          await createRazorpaySubscription(
            planId,
            user?.email || '',
            user?.name || 
              user?.email?.split('@')[0] || '',
            session.access_token
          );

        if (shortUrl) {
          window.open(shortUrl, '_blank');
        } else {
          alert(
            'Could not create subscription. ' +
            'Please try again or contact ' +
            'hello@paydripapp.com'
          );
        }
      } finally {
        setCheckoutLoading(false);
      }
      return;
    }

    const variantMap: Record<string, string> = {
      'pro-monthly': import.meta.env.VITE_LEMONSQUEEZY_PRO_MONTHLY_VARIANT,
      'pro-annual': import.meta.env.VITE_LEMONSQUEEZY_PRO_ANNUAL_VARIANT,
      'ent-monthly': import.meta.env.VITE_LEMONSQUEEZY_ENT_MONTHLY_VARIANT,
      'ent-annual': import.meta.env.VITE_LEMONSQUEEZY_ENT_ANNUAL_VARIANT,
    };
    const variantId = variantMap[key];
    const checkoutUrl = variantId 
      ? `https://paydripapp.lemonsqueezy.com/checkout/buy/${variantId}`
      : '';

    if (!checkoutUrl) return;

    if (!user) {
      savePendingCheckout(checkoutUrl);
      setShowAuth(true);
      return;
    }

    window.open(checkoutUrl, '_blank');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
    setIsProfileOpen(false);
  };

  return (
    <div className={cn("min-h-screen selection:bg-[#C8FF00] selection:text-[#080808] text-[#EEEEEE]", isNested ? "bg-transparent" : "bg-[#080808]")}>
      {/* Navigation */}
      {!isNested && <PublicHeader />}

      <main className={cn(isNested && "pt-6")}>
        {/* Header Section */}
        <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="container mx-auto px-6 relative z-10 text-center">
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#111111] border border-[#222222] mb-8"
            >
               <Zap size={14} className="text-[#C8FF00] fill-current" />
               <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8FF00]">Flexible Scaling</span>
            </motion.div>
            
            <motion.h1 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="text-4xl md:text-6xl font-bold tracking-tight text-[#EEEEEE] mb-6 uppercase"
            >
               Transparent <span className="text-[#C8FF00]">Pricing</span>
            </motion.h1>
            
            <motion.p 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="text-lg text-[#888888] max-w-2xl mx-auto font-medium"
            >
               Scale your collection operations without the guesswork. Start free, upgrade as you grow.
            </motion.p>

            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: 0.3 }}
               className="mt-12 flex items-center justify-center gap-4"
            >
               <span className={cn("text-xs font-bold uppercase tracking-widest transition-colors", !isYearly ? "text-[#EEEEEE]" : "text-[#888888]")}>Monthly</span>
               <button 
                  onClick={() => setIsYearly(!isYearly)}
                  className="w-14 h-8 bg-[#111111] border border-[#222222] rounded-full p-1 relative transition-colors"
               >
                  <motion.div 
                     animate={{ x: isYearly ? 24 : 0 }}
                     className="w-6 h-6 bg-[#C8FF00] rounded-full shadow-lg"
                  />
               </button>
               <span className={cn("text-xs font-bold uppercase tracking-widest transition-colors", isYearly ? "text-[#EEEEEE]" : "text-[#888888]")}>Yearly</span>
               <div className="px-3 py-1 rounded-full bg-[#1e2501] border border-[#3e4a05] text-[10px] font-bold uppercase tracking-widest text-[#C8FF00] ml-2">
                  Save 20%
               </div>
            </motion.div>
         </div>
       </section>

      {/* Pricing Cards */}
      <section className="pb-24">
         <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
               {PRICING_PLANS.map((p, i) => (
                  <motion.div
                     key={p.name}
                     initial={{ opacity: 0, y: 20 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }}
                     transition={{ delay: i * 0.1 }}
                     className={cn(
                        "relative bg-[#111111] rounded-[2rem] p-8 border transition-all hover:border-[#C8FF00]/50",
                        p.highlight ? "border-[#C8FF00] scale-105 z-10" : "border-[#222222]"
                     )}
                  >
                     {p.highlight && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#C8FF00] text-[#080808] text-[9px] font-bold uppercase tracking-[0.2em] px-6 py-1.5 rounded-full">
                           Recommended
                        </div>
                     )}

                     <h3 className="text-xl font-bold text-[#EEEEEE] uppercase mb-2 tracking-wide">{p.name}</h3>
                     <p className="text-xs text-[#888888] font-medium leading-relaxed mb-8">{p.description}</p>

                     <div className="mb-8">
                        <div className="flex items-baseline gap-1">
                           <span className="text-4xl font-bold text-[#EEEEEE] tracking-tight">
                              {p.slug === 'free' 
                                ? PRICES[currency]?.free 
                                : p.slug === 'pro' 
                                  ? (isYearly ? PRICES[currency]?.pro_annual : PRICES[currency]?.pro_monthly) 
                                  : (isYearly ? PRICES[currency]?.ent_annual : PRICES[currency]?.ent_monthly)}
                           </span>
                           <span className="text-xs font-bold text-[#888888]">/{isYearly ? 'yr' : 'mo'}</span>
                        </div>
                        
                        {!isYearly && p.slug !== 'free' && (
                           <p className="text-[10px] font-bold text-[#C8FF00] uppercase tracking-widest mt-2 shrink-0">
                              Yearly: {p.slug === 'pro' ? PRICES[currency]?.pro_annual : PRICES[currency]?.ent_annual}
                           </p>
                        )}
                        {isYearly && p.slug !== 'free' && (
                           <p className="text-[10px] font-bold text-[#C8FF00] uppercase tracking-widest mt-2 shrink-0">
                              Billed annually
                           </p>
                        )}
                     </div>

                     <div className="space-y-4 mb-8">
                        {p.features.map((feature, j) => (
                           <div key={j} className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded-full bg-[#161616] border border-[#222222] flex items-center justify-center">
                                 <Check size={12} className="text-[#C8FF00]" />
                              </div>
                              <span className="text-xs font-semibold text-[#888888]">{feature}</span>
                           </div>
                        ))}
                     </div>

                     <button 
                        onClick={() => handleCheckout(p.slug, isYearly ? 'yearly' : 'monthly')}
                        disabled={p.slug !== 'free' && checkoutLoading}
                        className={cn(
                           "w-full py-4 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-200 cursor-pointer text-center",
                           p.highlight 
                              ? "bg-[#C8FF00] text-[#080808] hover:bg-[#b8ef00] hover:shadow-lg hover:shadow-[#C8FF00]/10" 
                              : "bg-[#161616] border border-[#222222] text-[#EEEEEE] hover:border-[#C8FF00]",
                           (p.slug !== 'free' && checkoutLoading) && "opacity-50 cursor-not-allowed"
                        )}
                     >
                        {p.slug === 'free' ? p.cta : checkoutLoading ? 'Processing...' : p.cta}
                     </button>
                  </motion.div>
               ))}
            </div>
         </div>
      </section>

      {/* Comparison Grid */}
      <section className="py-20 bg-[#111111]/50 border-t border-b border-[#222222]">
         <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center mb-12">
               <h2 className="text-2xl font-bold text-[#EEEEEE] uppercase tracking-wide mb-3">Compare Features</h2>
               <p className="text-[#888888] text-sm font-medium">Detailed breakdown of what you get in every tier.</p>
            </div>

            <div className="max-w-4xl mx-auto overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b border-[#222222]">
                        <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-[#888888]">Feature</th>
                        <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-[#888888]">Free</th>
                        <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-[#C8FF00]">Pro</th>
                        <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-widest text-[#888888]">Enterprise</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222222]">
                     {[
                        { title: 'Invoices per Month', free: '10', pro: 'Unlimited', enterprise: 'Unlimited' },
                        { title: 'Team Members', free: '1 Seat', pro: 'Up to 3 Seats', enterprise: 'Unlimited' },
                        { title: 'AI Assist', free: '5 Uses/mo', pro: '100 Uses/mo', enterprise: 'Custom' },
                        { title: 'Email Sequences', free: 'Basic', pro: 'Advanced Auto', enterprise: 'Custom Logic' },
                        { title: 'Custom Branding', free: 'No', pro: 'Yes', enterprise: 'Full White-label' },
                        { title: 'WhatsApp Integration', free: 'No', pro: 'Partial', enterprise: 'Full API' },
                        { title: 'Support', free: 'Email', pro: 'Priority', enterprise: 'Dedicated Manager' }
                     ].map((row, i) => (
                        <tr key={i} className="hover:bg-[#111111] transition-colors">
                           <td className="py-4 px-4 text-xs font-bold text-[#EEEEEE] uppercase tracking-tight">{row.title}</td>
                           <td className="py-4 px-4 text-xs font-medium text-[#888888]">{row.free}</td>
                           <td className="py-4 px-4 text-xs font-black text-[#C8FF00]">{row.pro}</td>
                           <td className="py-4 px-4 text-xs font-medium text-[#888888]">{row.enterprise}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
         <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
               <div className="text-center mb-12">
                  <h2 className="text-2xl font-bold text-[#EEEEEE] uppercase tracking-wide mb-3">Frequently Asked Questions</h2>
                  <p className="text-[#888888] text-sm font-medium">Everything you need to know about our plans.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {FAQS.map((faq, i) => (
                     <div key={i} className="p-6 bg-[#111111] border border-[#222222] rounded-[1.5rem]">
                        <h4 className="text-xs font-bold text-[#EEEEEE] mb-2 tracking-wide uppercase">{faq.q}</h4>
                        <p className="text-xs text-[#888888] font-medium leading-relaxed">{faq.a}</p>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </section>

      {/* Final CTA */}
      <section className="py-16">
         <div className="container mx-auto px-6">
            <div className="bg-[#111111] border border-[#222222] rounded-[2rem] p-12 text-center relative overflow-hidden max-w-4xl mx-auto">
               <div className="relative z-10">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#EEEEEE] uppercase tracking-tight mb-4">
                     Ready to Automate Your Collection?
                  </h2>
                  <button 
                    onClick={() => user ? navigate('/dashboard') : setShowAuth(true)}
                    className="px-8 py-4 bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
                  >
                     Join the Early Access
                  </button>
                  <p className="mt-4 text-[#888888] text-[9px] font-bold uppercase tracking-[0.2em]">No Credit Card Required • Pro Trial Included</p>
               </div>
            </div>
         </div>
      </section>
      </main>

      {/* Footer */}
      {!isNested && <PublicFooter />}

      {/* Auth Modal Overlay */}
      <AnimatePresence>
        {showAuth && (
          <div className="fixed inset-0 bg-[#080808]/80 backdrop-blur-md flex items-center justify-center p-4 z-[999] pointer-events-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111111] border border-[#222222] rounded-[2rem] p-8 max-w-lg w-full relative flex flex-col justify-start max-h-[90vh]"
            >
              <div className="absolute top-6 right-6 z-20">
                <button 
                  onClick={() => setShowAuth(false)} 
                  className="p-2 bg-[#111111] border border-[#222222] text-[#888888] rounded-full hover:bg-[#1a1a1a] hover:text-[#EEEEEE] transition-all pointer-events-auto active:scale-90 shadow-sm cursor-pointer flex items-center justify-center"
                >
                  <Plus className="rotate-45" size={18} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 scrollbar-hide">
                 <AuthView onClose={() => setShowAuth(false)} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
