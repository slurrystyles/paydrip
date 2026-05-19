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
    <div className={cn("min-h-screen selection:bg-indigo-100 selection:text-indigo-900", isNested ? "bg-transparent" : "bg-[#FDFDFF]")}>
      {/* Navigation */}
      {!isNested && (
        <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div 
              onClick={() => navigate('/')}
              className="flex items-center gap-3 cursor-pointer"
            >
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-indigo-100 italic"
              >
                P
              </motion.div>
              <span className="text-xl font-black tracking-tighter text-slate-900">Paydrip</span>
            </div>
            <div className="flex items-center gap-6">
              {user ? (
                 <div className="flex items-center gap-4">
                   <button 
                     onClick={() => navigate('/dashboard')}
                     className="hidden sm:flex px-5 py-2.5 bg-slate-50 border border-slate-100 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 flex items-center gap-2"
                   >
                     Go to Dashboard
                     <ArrowUpRight size={14} />
                   </button>
                   
                   <div className="relative">
                     <button 
                       onClick={() => setIsProfileOpen(!isProfileOpen)}
                       className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-xs font-black text-white italic shadow-lg shadow-slate-200 cursor-pointer hover:bg-indigo-600 transition-all active:scale-95"
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
                             className="absolute top-full right-0 mt-4 w-64 bg-white rounded-[1.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] border border-slate-100 p-6 z-50"
                           >
                             <div className="mb-6">
                               <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 italic">Active Node</p>
                               <p className="text-sm font-black text-slate-900 truncate tracking-tight mb-0.5">{user?.email?.split('@')[0]}</p>
                               <p className="text-[9px] text-slate-400 font-mono truncate">{user?.email}</p>
                             </div>
                             
                             <div className="space-y-1.5 border-t border-slate-50 pt-4">
                               <button 
                                 onClick={() => { navigate('/dashboard'); setIsProfileOpen(false); }}
                                 className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all"
                               >
                                 Open Dashboard
                               </button>
                               <button 
                                 onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}
                                 className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all"
                               >
                                 Node Settings
                               </button>
                               <button 
                                 onClick={handleSignOut}
                                 className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
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
                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-100"
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
        <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute top-0 right-0 p-40 bg-indigo-50/50 blur-[120px] rounded-full -mr-20 -mt-20" />
        <div className="container mx-auto px-6 relative z-10 text-center">
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-8"
            >
               <Zap size={14} className="text-indigo-600 fill-current" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Flexible Scaling</span>
            </motion.div>
            
            <motion.h1 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-6 italic uppercase"
            >
               Transparent <span className="text-indigo-600">Pricing</span>
            </motion.h1>
            
            <motion.p 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="text-xl text-slate-500 max-w-2xl mx-auto font-medium"
            >
               Scale your collection operations without the guesswork. Start free, upgrade as you grow.
            </motion.p>

            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: 0.3 }}
               className="mt-12 flex items-center justify-center gap-4"
            >
               <span className={cn("text-sm font-bold uppercase tracking-widest transition-colors", !isYearly ? "text-slate-900" : "text-slate-400")}>Monthly</span>
               <button 
                  onClick={() => setIsYearly(!isYearly)}
                  className="w-14 h-8 bg-slate-900 rounded-full p-1 relative transition-colors"
               >
                  <motion.div 
                     animate={{ x: isYearly ? 24 : 0 }}
                     className="w-6 h-6 bg-white rounded-full shadow-lg"
                  />
               </button>
               <span className={cn("text-sm font-bold uppercase tracking-widest transition-colors", isYearly ? "text-slate-900" : "text-slate-400")}>Yearly</span>
               <div className="px-3 py-1 rounded-full bg-green-50 border border-green-100 text-[10px] font-black uppercase tracking-widest text-green-600 ml-2">
                  Save 20%
               </div>
            </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24">
         <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {PRICING_PLANS.map((plan, i) => (
                  <motion.div
                     key={plan.name}
                     initial={{ opacity: 0, y: 20 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }}
                     transition={{ delay: i * 0.1 }}
                     className={cn(
                        "relative bg-white rounded-[3rem] p-10 border transition-all hover:shadow-2xl hover:shadow-slate-200/50",
                        plan.highlight ? "border-indigo-200 shadow-xl shadow-indigo-100/30 scale-105 z-10" : "border-slate-100 shadow-sm"
                     )}
                  >
                     {plan.highlight && (
                        <div className="absolute -top-4 left-1/2 -track-x-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full">
                           Recommended
                        </div>
                     )}

                     <h3 className="text-xl font-black text-slate-900 italic uppercase mb-2 tracking-tighter">{plan.name}</h3>
                     <p className="text-sm text-slate-400 font-medium leading-relaxed mb-8">{plan.description}</p>

                     <div className="mb-10">
                        <div className="flex items-baseline gap-1">
                           <span className="text-4xl font-black text-slate-900 italic tracking-tight">
                              ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                           </span>
                           <span className="text-sm font-bold text-slate-400">/{isYearly ? 'year' : 'mo'}</span>
                        </div>
                        {isYearly && plan.monthlyPrice > 0 && (
                           <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mt-2 shrink-0">
                              Billed annually
                           </p>
                        )}
                     </div>

                     <div className="space-y-4 mb-10">
                        {plan.features.map((feature, j) => (
                           <div key={j} className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center">
                                 <Check size={12} className="text-indigo-600" />
                              </div>
                              <span className="text-xs font-semibold text-slate-600">{feature}</span>
                           </div>
                        ))}
                     </div>

                     <button className={cn(
                        "w-full py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all",
                        plan.highlight 
                           ? "bg-slate-900 text-white hover:bg-indigo-600 shadow-xl shadow-slate-200" 
                           : "bg-slate-50 text-slate-400 cursor-not-allowed"
                     )}>
                        {plan.cta}
                     </button>
                  </motion.div>
               ))}
            </div>
         </div>
      </section>

      {/* Comparison Grid */}
      <section className="py-24 bg-slate-50">
         <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center mb-16">
               <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tight mb-4">Compare Features</h2>
               <p className="text-slate-500 font-medium">Detailed breakdown of what you get in every tier.</p>
            </div>

            <div className="max-w-5xl mx-auto overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b border-slate-200">
                        <th className="py-6 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Feature</th>
                        <th className="py-6 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Free</th>
                        <th className="py-6 px-4 text-[10px] font-black uppercase tracking-widest text-slate-900">Pro</th>
                        <th className="py-6 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Enterprise</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {[
                        { title: 'Invoices per Month', free: '10', pro: 'Unlimited', enterprise: 'Unlimited' },
                        { title: 'Team Members', free: '1 Seat', pro: 'Up to 3 Seats', enterprise: 'Unlimited' },
                        { title: 'AI Assist', free: '5 Uses/mo', pro: '100 Uses/mo', enterprise: 'Custom' },
                        { title: 'Email Sequences', free: 'Basic', pro: 'Advanced Auto', enterprise: 'Custom Logic' },
                        { title: 'Custom Branding', free: 'No', pro: 'Yes', enterprise: 'Full White-label' },
                        { title: 'WhatsApp Integration', free: 'No', pro: 'Partial', enterprise: 'Full API' },
                        { title: 'Support', free: 'Email', pro: 'Priority', enterprise: 'Dedicated Manager' }
                     ].map((row, i) => (
                        <tr key={i} className="hover:bg-slate-100/50 transition-colors">
                           <td className="py-5 px-4 text-xs font-bold text-slate-900 uppercase tracking-tight">{row.title}</td>
                           <td className="py-5 px-4 text-xs font-medium text-slate-500">{row.free}</td>
                           <td className="py-5 px-4 text-xs font-black text-indigo-600">{row.pro}</td>
                           <td className="py-5 px-4 text-xs font-medium text-slate-500">{row.enterprise}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </section>

      {/* FAQ */}
      <section className="py-24">
         <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
               <div className="text-center mb-16">
                  <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tight mb-4">Frequently Asked Questions</h2>
                  <p className="text-slate-500 font-medium">Everything you need to know about our plans.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {FAQS.map((faq, i) => (
                     <div key={i} className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                        <h4 className="text-sm font-black text-slate-900 mb-3 tracking-tight">{faq.q}</h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">{faq.a}</p>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
         <div className="container mx-auto px-6">
            <div className="bg-slate-900 rounded-[4rem] p-12 md:p-24 text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 p-40 bg-indigo-500/10 blur-[100px] rounded-full -ml-20 -mt-20" />
               <div className="relative z-10">
                  <h2 className="text-4xl md:text-6xl font-black text-white italic uppercase tracking-tighter mb-8 max-w-4xl mx-auto">
                     Ready to <span className="text-indigo-400">Automate</span> Your Collection?
                  </h2>
                  <button className="px-10 py-6 bg-white text-slate-900 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-400 hover:text-white transition-all shadow-2xl shadow-black/20">
                     Join the Early Access
                  </button>
                  <p className="mt-8 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">No Credit Card Required • Pro Trial Included</p>
               </div>
            </div>
         </div>
      </section>
      </main>

      {/* Footer */}
      {!isNested && (
        <footer className="py-12 px-6 border-t border-slate-100 font-bold uppercase tracking-widest bg-white">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic">P</div>
              <span className="text-lg font-black tracking-tight text-slate-900">Paydrip</span>
            </div>
            <div className="flex gap-8 text-[10px] text-slate-400">
              <Link to="/privacy" className="hover:text-indigo-600 transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-indigo-600 transition-colors">Terms</Link>
              <Link to="/contact" className="hover:text-indigo-600 transition-colors">Contact</Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
