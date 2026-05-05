import React, { useState } from 'react';
import { 
  Smartphone, 
  Zap, 
  CheckCircle, 
  ArrowRight,
  Plus,
  ArrowUpRight,
  Check,
  MessageSquare,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'motion/react';
import AuthView from './AuthView';
import UpgradeModal from './UpgradeModal';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePlan } from '../contexts/PlanContext';

export default function LandingPage({ user }: { user: User | null }) {
  const [showAuth, setShowAuth] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [targetPlan, setTargetPlan] = useState<'pro'>('pro');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();
  const { plan } = usePlan();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
    setIsProfileOpen(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      {/* Navigation */}
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
                            <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1 italic">{plan === 'free' ? 'Standard Node' : `${plan} Access`}</p>
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
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowAuth(true)}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-xl shadow-slate-100"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* SECTION 1: HERO (ABOVE THE FOLD) */}
        <section className="pt-16 pb-20 px-6 relative overflow-hidden">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 text-left">
              <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-black tracking-[-0.04em] text-slate-900 leading-[1.05] mb-6">
                Get paid faster. <br />
                <span className="text-indigo-600/40">Without chasing clients.</span>
              </motion.h1>
              
              <motion.p variants={itemVariants} className="text-lg md:text-xl text-slate-600 max-w-xl mb-10 leading-relaxed font-medium">
                Send invoices, track payments, and remind clients on WhatsApp — all in one place.
              </motion.p>
              
              <motion.div variants={itemVariants} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <button 
                    onClick={() => user ? navigate('/dashboard') : setShowAuth(true)}
                    className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-2xl text-base font-black tracking-tight hover:bg-slate-900 transition-all shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3 group active:scale-95"
                  >
                    Start Free
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No credit card required</p>
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Used by freelancers across India</p>
              </motion.div>
            </div>
            
            <motion.div 
              variants={itemVariants}
              className="lg:col-span-5 relative"
            >
              <div className="absolute inset-0 bg-indigo-600/5 rounded-[4rem] -rotate-3 blur-2xl"></div>
              <div className="relative bg-white p-4 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(79,70,229,0.15)] border border-slate-100">
                <div className="bg-slate-50 rounded-[2.2rem] p-8 overflow-hidden aspect-[4/5] sm:aspect-auto">
                  <div className="flex justify-between items-center mb-10">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl"></div>
                    <div className="h-6 w-32 bg-slate-200 rounded-full animate-pulse"></div>
                  </div>
                  <div className="space-y-4 mb-12">
                    <div className="h-12 w-full bg-slate-100 rounded-2xl"></div>
                    <div className="h-12 w-3/4 bg-slate-100 rounded-2xl"></div>
                    <div className="h-40 w-full bg-indigo-600/10 rounded-3xl border-2 border-dashed border-indigo-200 flex items-center justify-center">
                       <Zap size={40} className="text-indigo-600" />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="h-14 flex-1 bg-slate-900 rounded-2xl"></div>
                    <div className="h-14 flex-1 bg-slate-200 rounded-2xl"></div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 2: PROBLEM → SOLUTION */}
        <section className="py-24 px-6 bg-slate-50 border-y border-slate-100">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              {/* Problem Block */}
              <div className="space-y-8">
                <h2 className="text-3xl font-black tracking-tighter text-slate-900 italic">Manual chasing is broken.</h2>
                <div className="space-y-4">
                  {["Copy-pasting messages on WhatsApp", "Forgetting who owes what", "Awkward follow-ups"].map((point, i) => (
                    <div key={i} className="flex items-center gap-5 p-5 bg-white rounded-2xl border border-slate-200/50 shadow-sm opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all border-l-4 border-l-red-100">
                      <div className="w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0">
                        <Plus className="rotate-45" size={16} />
                      </div>
                      <span className="text-base font-bold text-slate-700">{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Solution Block */}
              <div className="space-y-8">
                <h2 className="text-3xl font-black tracking-tighter text-indigo-600 italic">Paydrip automates the flow.</h2>
                <div className="space-y-4">
                  {[
                    { title: "Create invoice", icon: <Plus size={18} /> },
                    { title: "Send via WhatsApp", icon: <MessageSquare size={18} /> },
                    { title: "Get paid", icon: <Check size={18} /> }
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-5 p-5 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 transition-transform hover:scale-[1.02] border-l-4 border-l-white/20">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                        {step.icon}
                      </div>
                      <span className="text-lg font-black uppercase tracking-widest">{step.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: CORE FEATURES */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard 
                icon={<Smartphone size={22} />}
                title="WhatsApp Reminders"
                description="Send polite to final reminders instantly without typing a single word."
              />
              <FeatureCard 
                icon={<Zap size={22} />}
                title="UPI-Ready Invoices"
                description="Embed QR codes for GPay, PhonePe, and Paytm. Clients pay in seconds."
              />
              <FeatureCard 
                icon={<BarChart3 size={22} />}
                title="Track Everything"
                description="Know exactly who paid, who hasn't, and who is ignoring your messages."
              />
              <FeatureCard 
                icon={<ExternalLink size={22} />}
                title="Public Invoice Link"
                description="No boring PDFs. Send a secure public link that looks professional on mobile."
              />
            </div>
          </div>
        </section>

        {/* SECTION 5: PRICING */}
        <section id="pricing" className="py-24 px-6 bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black tracking-tighter mb-4 italic">Simple, transparent pricing.</h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No hidden fees. Indian freelancers first.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <PricingCard 
                name="Free"
                price="0"
                features={[
                  "5 Invoices / Month",
                  "All 3 Reminder Tones",
                  "UPI QR Generation",
                  "Public Payment Page"
                ]}
                cta="Start Free"
                onCta={() => user ? navigate('/dashboard') : setShowAuth(true)}
              />
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[2.6rem] blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <PricingCard 
                  name="Pro"
                  price="299"
                  isPro
                  features={[
                    "Unlimited Invoices",
                    "Custom Branding",
                    "Reminder Logs",
                    "PDF Downloads",
                    "Client Payment History"
                  ]}
                  cta="Go Pro"
                  onCta={() => {
                    setTargetPlan('pro');
                    setShowUpgrade(true);
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: FINAL CTA */}
        <section className="py-24 px-6 text-center bg-indigo-50 border-y border-indigo-100/50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 mb-8 italic">Stop chasing. <br />Start getting paid.</h2>
            <button 
              onClick={() => user ? navigate('/dashboard') : setShowAuth(true)}
              className="px-10 py-5 bg-indigo-600 text-white rounded-2xl text-lg font-black tracking-tight hover:bg-slate-900 transition-all shadow-2xl shadow-indigo-200 active:scale-95"
            >
              Create your first invoice
            </button>
          </div>
        </section>
      </motion.main>

      {/* SECTION 7: FOOTER */}
      <footer className="py-12 px-6 border-t border-slate-100 font-bold uppercase tracking-widest">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic">P</div>
            <span className="text-lg font-black tracking-tight">Paydrip</span>
          </div>
          <div className="flex gap-8 text-[10px] text-slate-400">
            <Link to="/privacy" className="hover:text-indigo-600 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-indigo-600 transition-colors">Terms</Link>
            <Link to="/contact" className="hover:text-indigo-600 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

      {/* Auth Modal Overlay */}
      <AnimatePresence>
        {showAuth && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuth(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative z-10 w-full max-w-sm max-h-[95vh] overflow-hidden bg-white rounded-[2rem] shadow-2xl flex flex-col"
            >
              <div className="absolute top-6 right-6 z-20">
                <button 
                  onClick={() => setShowAuth(false)} 
                  className="p-2 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 hover:text-slate-900 transition-all pointer-events-auto active:scale-90 shadow-sm"
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

      <UpgradeModal 
        isOpen={showUpgrade} 
        onClose={() => setShowUpgrade(false)} 
        targetPlan={targetPlan}
      />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 bg-white border border-slate-100 rounded-[2rem] hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-50 transition-all group">
      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
        {icon}
      </div>
      <h3 className="text-lg font-black mb-3 uppercase tracking-tighter italic">{title}</h3>
      <p className="text-slate-600 leading-relaxed font-medium text-xs">{description}</p>
    </div>
  );
}

function PricingCard({ name, price, features, cta, onCta, isPro }: any) {
  return (
    <div className={cn(
      "relative p-10 rounded-[2.2rem] flex flex-col justify-between transition-all h-full",
      isPro ? "bg-white text-slate-900 shadow-2xl" : "bg-white/5 border border-white/10"
    )}>
      <div>
        <h3 className={cn(
          "text-[10px] font-black uppercase tracking-[0.2em] mb-6",
          isPro ? "text-indigo-600" : "text-slate-500"
        )}>{name}</h3>
        <div className="text-5xl font-black tracking-tighter flex items-end mb-8 italic">
          ₹{price} <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 ml-2">/mo</span>
        </div>
        <ul className="space-y-4 mb-10">
          {features.map((f: string) => (
            <li key={f} className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest leading-none">
              <Check size={14} className={isPro ? "text-indigo-600" : "text-indigo-400"} />
              <span className={isPro ? "text-slate-700" : "text-slate-400"}>{f}</span>
            </li>
          ))}
        </ul>
      </div>
      <button 
        onClick={onCta}
        className={cn(
          "w-full py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-xl",
          isPro ? "bg-indigo-600 text-white hover:bg-slate-900 shadow-indigo-100" : "bg-white text-slate-900 hover:bg-slate-100 shadow-white/5"
        )}
      >
        {cta}
      </button>
    </div>
  );
}
