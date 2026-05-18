import React, { useState } from 'react';
import { motion } from 'motion/react';
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
  Users
} from 'lucide-react';
import { cn } from '../lib/utils';

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

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
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
    </div>
  );
}
