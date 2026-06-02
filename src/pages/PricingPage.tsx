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
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { useNavigate, Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';

const PRICING_PLANS = [
  {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Perfect for exploring the power of automated collection.',
    features: [
      '5 active clients',
      '10 invoices per month',
      'Manual email reminders',
      'Standard dashboard',
      'Basic analytics',
      'Community support'
    ],
    cta: 'Get Started Free',
    href: '/signup',
    color: 'slate'
  },
  {
    name: 'Pro',
    monthlyPrice: 12,
    yearlyPrice: 99,
    description: 'The standard for growing businesses and professional operators.',
    features: [
      'Everything in Free',
      'Unlimited clients',
      'Unlimited invoices',
      'Automated sequences',
      'AI-powered messages',
      'WhatsApp prompts',
      'Custom branding'
    ],
    cta: 'Coming Soon',
    highlight: true,
    color: 'indigo'
  },
  {
    name: 'Enterprise',
    monthlyPrice: 39,
    yearlyPrice: 299,
    description: 'Advanced features for maximum control and scalability.',
    features: [
      'Everything in Pro',
      'White-label portal',
      'API & Webhooks',
      'Advanced RBAC',
      'SLA guarantee',
      'Dedicated manager'
    ],
    cta: 'Coming Soon',
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
    a: "We are currently in early access. Paid plans will launch soon with full subscription management."
  },
  {
    q: "Can I use Paydrip for international clients?",
    a: "Absolutely. Paydrip supports global currencies and multilingual notification templates."
  },
  {
    q: "What payment methods do you support?",
    a: "During early access, we facilitate UPI, Bank Transfer, and Credit Cards via our partner integrations."
  }
];

export default function PricingPage({ isNested = false }: { isNested?: boolean }) {
  const [isYearly, setIsYearly] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
    setIsProfileOpen(false);
  };

  return (
    <div className={cn("min-h-screen selection:bg-[#C8FF00] selection:text-[#080808] text-[#EEEEEE]", isNested ? "bg-transparent" : "bg-[#080808]")}>
      {/* Navigation */}
      {!isNested && <PublicHeader />}
      {false && (
        <nav className="border-b border-[#222222] bg-[#080808]/95 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div 
              onClick={() => navigate('/')}
              className="flex items-center gap-3 cursor-pointer"
            >
              <motion.img 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                src="/images/logo.png" 
                alt="Paydrip Logo" 
                className="h-8 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex items-center gap-6">
              {user ? (
                 <div className="flex items-center gap-4">
                   <button 
                     onClick={() => navigate('/dashboard')}
                     className="hidden sm:flex px-5 py-2.5 bg-[#111111] border border-[#222222] text-[#EEEEEE] rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-[#C8FF00] transition-all active:scale-95 flex items-center gap-2"
                   >
                     Go to Dashboard
                     <ArrowUpRight size={14} />
                   </button>
                   
                   <div className="relative">
                     <button 
                       onClick={() => setIsProfileOpen(!isProfileOpen)}
                       className="h-10 w-10 rounded-xl bg-[#111111] border border-[#222222] flex items-center justify-center text-xs font-bold text-[#C8FF00] uppercase cursor-pointer hover:border-[#C8FF00] transition-all active:scale-95"
                     >
                       {user?.email?.[0].toUpperCase() || 'U'}
                     </button>
                     
                     <AnimatePresence>
                       {isProfileOpen && (
                         <>
                           <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                           <motion.div 
                             initial={{ opacity: 0, y: 10, scale: 0.95 }}
                             animate={{ opacity: 1, y: 0, scale: 1 }}
                             exit={{ opacity: 0, y: 10, scale: 0.95 }}
                             className="absolute top-full right-0 mt-4 w-64 bg-[#111111] rounded-[1.5rem] shadow-2xl border border-[#222222] p-6 z-50"
                           >
                             <div className="mb-6">
                               <p className="text-[10px] font-bold text-[#C8FF00] uppercase tracking-widest mb-1">Active User</p>
                               <p className="text-sm font-bold text-[#EEEEEE] truncate tracking-tight mb-0.5">{user?.email?.split('@')[0]}</p>
                               <p className="text-[9px] text-[#888888] font-mono truncate">{user?.email}</p>
                             </div>
                             
                             <div className="space-y-1.5 border-t border-[#222222] pt-4">
                               <button 
                                 onClick={() => { navigate('/dashboard'); setIsProfileOpen(false); }}
                                 className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#888888] hover:text-[#C8FF00] hover:bg-[#161616] rounded-xl transition-all"
                               >
                                 Open Dashboard
                               </button>
                               <button 
                                 onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}
                                 className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#888888] hover:text-[#C8FF00] hover:bg-[#161616] rounded-xl transition-all"
                               >
                                 Node Settings
                               </button>
                               <button 
                                 onClick={handleSignOut}
                                 className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-500 hover:bg-red-950/20 rounded-xl transition-all"
                               >
                                 Exit Session
                               </button>
                             </div>
                           </motion.div>
                         </>
                       )}
                     </AnimatePresence>
                   </div>
                 </div>
              ) : (
                 <Link 
                    to="/" 
                    className="px-6 py-2.5 bg-[#C8FF00] text-[#080808] rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#b8ef00] transition-all active:scale-95"
                 >
                    Get Started
                 </Link>
              )}
            </div>
          </div>
        </nav>
      )}

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
                              ${isYearly ? p.yearlyPrice : p.monthlyPrice}
                           </span>
                           <span className="text-xs font-bold text-[#888888]">/{isYearly ? 'yr' : 'mo'}</span>
                        </div>
                        {isYearly && p.monthlyPrice > 0 && (
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

                     {p.monthlyPrice === 0 ? (
                       <button 
                         onClick={() => {
                           if (user) {
                             navigate('/dashboard');
                           } else {
                             navigate('/');
                           }
                         }}
                         className="w-full py-4 bg-[#161616] border border-[#222222] text-[#EEEEEE] rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:border-[#C8FF00] transition-colors"
                       >
                         {p.cta}
                       </button>
                     ) : (
                       <button className="w-full py-4 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all bg-[#161616] border border-[#222222] text-[#888888] cursor-not-allowed">
                         {p.cta}
                       </button>
                     )}
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
                    onClick={() => navigate('/')}
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
    </div>
  );
}
