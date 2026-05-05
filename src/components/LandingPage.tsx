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
              </motion.div>
            </div>
            
            <motion.div 
              variants={itemVariants}
              className="lg:col-span-5 relative"
            >
              <div className="absolute inset-0 bg-indigo-600/5 rounded-[4rem] -rotate-3 blur-3xl"></div>
              
              {/* WhatsApp Mockup */}
              <div className="relative bg-[#E5DDD5] w-full max-w-[320px] mx-auto rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border-[8px] border-slate-900 overflow-hidden aspect-[9/16]">
                {/* Status Bar */}
                <div className="h-6 bg-slate-900/10 flex justify-between px-6 items-center">
                  <div className="w-12 h-2 bg-slate-400/20 rounded-full"></div>
                </div>

                {/* Header */}
                <div className="bg-[#075E54] p-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-black italic border border-white/20">P</div>
                  <div>
                    <h4 className="text-white text-[11px] font-bold leading-none">Paydrip Finance</h4>
                    <p className="text-white/60 text-[8px] mt-0.5">Online</p>
                  </div>
                </div>

                {/* Chat Area */}
                <div className="p-4 space-y-4 font-sans h-full">
                  <div className="flex justify-center">
                    <span className="bg-white/90 text-slate-400 text-[8px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Today</span>
                  </div>

                  {/* Message Bubble */}
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0, x: -20 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white p-3 rounded-xl rounded-tl-none shadow-sm max-w-[85%] relative border-l-4 border-l-indigo-400"
                  >
                    <p className="text-[11px] text-slate-800 leading-relaxed font-medium">
                      Hey Arjun Bhatia, just a quick reminder that invoice <span className="font-bold text-indigo-600">#INV-204</span> is due today. 
                      <br /><br />
                      Total: <span className="font-black">₹12,450.00</span>
                      <br /><br />
                      Sharing the secure payment link here: 
                    </p>
                    <div className="mt-2 p-2 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-2">
                       <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white text-[8px] font-black italic">P</div>
                       <div className="flex-1 overflow-hidden">
                         <p className="text-[9px] font-bold text-slate-900 truncate">paydrip.io/v/secure-node</p>
                         <p className="text-[7px] text-slate-400">Click to settle ledger instantly</p>
                       </div>
                    </div>
                  </motion.div>

                  {/* Reply Bubble (Mocking real trust) */}
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0, x: 20 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    transition={{ delay: 1.2 }}
                    className="bg-[#DCF8C6] p-3 rounded-xl rounded-tr-none shadow-sm max-w-[80%] ml-auto"
                  >
                    <p className="text-[11px] text-slate-800 leading-relaxed font-medium">
                      Ah thanks for the reminder! Just paid via UPI. ⚡️
                    </p>
                    <span className="text-[7px] text-slate-500 float-right mt-1">10:42 AM</span>
                  </motion.div>
                </div>
              </div>

              {/* Floating Badge */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 -left-6 bg-white p-5 rounded-3xl shadow-2xl border border-slate-100 flex items-center gap-4 z-20"
              >
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Receipt Generated</p>
                  <p className="text-sm font-black text-slate-900 tracking-tight">₹12,450 Settled</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 2: THE PRODUCT FLOW */}
        <section className="py-24 px-6 bg-[#F8F9FF] border-y border-indigo-100/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-4">Seamless Pipeline</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 italic">How most of your payments start arriving in hours.</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Product Demo Placeholder (Mobile Mode) */}
              <div className="lg:col-span-6 flex justify-center">
                <div className="relative w-full max-w-[280px] aspect-[9/16] bg-slate-900 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(79,70,229,0.3)] overflow-hidden group border-[6px] border-slate-800">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 animate-pulse">
                      <Zap size={24} />
                    </div>
                    <h3 className="text-sm font-black text-white mb-2 uppercase tracking-tighter italic">Mobile Demo</h3>
                    <p className="text-slate-400 text-[9px] font-medium max-w-[140px] uppercase tracking-widest leading-relaxed">Simulating the flow from reminder to payment.</p>
                  </div>
                  {/* Visual Hint of UI */}
                  <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-slate-900 to-transparent"></div>
                </div>
              </div>

              {/* Steps (High Contrast Styling) */}
              <div className="lg:col-span-6 space-y-4">
                {[
                  { step: "01", title: "Generate Invoice", desc: "Instantly create a professional, UPI-ready invoice link." },
                  { step: "02", title: "Nudge on WhatsApp", desc: "Drop a pre-filled, polite reminder directly into their chat." },
                  { step: "03", title: "Automatic Receipt", desc: "Client pays via UPI; we auto-generate their PDF receipt." }
                ].map((item, i) => (
                  <div key={i} className="p-6 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-100 flex gap-5 group hover:scale-[1.02] transition-all border-l-4 border-l-white/20">
                    <div className="text-2xl font-black text-white/30 group-hover:text-white transition-colors italic">{item.step}</div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-white mb-1">{item.title}</h4>
                      <p className="text-[11px] text-white/70 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: CORE FEATURES */}
        <section className="py-24 px-6 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-[0.03]">
             <div className="grid grid-cols-12 h-full border-x border-slate-900 border-dashed"></div>
          </div>
          
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-4">Functional Arsenal</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 italic">Built for Indian freelancers who are tired of following up.</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* WhatsApp Card (Top Row, Spans 2 Columns) */}
              <div className="lg:col-span-2 p-10 bg-indigo-600 text-white rounded-[2.5rem] shadow-2xl shadow-indigo-100 flex flex-col justify-between group overflow-hidden relative min-h-[320px]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-8 border border-white/20">
                    <Smartphone size={28} />
                  </div>
                  <h3 className="text-3xl font-black mb-6 uppercase tracking-tight italic">WhatsApp Reminders</h3>
                  <p className="text-white/80 leading-relaxed font-medium text-base max-w-sm mb-8">
                    Send polite, firm, or final reminders instantly. No typing, no scrolling through chats, no friction. Just results.
                  </p>
                </div>
                <div className="relative z-10 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest bg-white/10 w-fit px-4 py-2 rounded-full border border-white/10">
                   <Zap size={12} className="animate-pulse" /> Highly Addictive
                </div>
              </div>
              
              {/* Individual Feature Cards (Grid Fillers) */}
              <FeatureCard 
                icon={<Zap size={22} />}
                title="UPI-Ready"
                description="Embed QR codes for GPay, PhonePe, and Paytm. Settlement in seconds."
              />
              <FeatureCard 
                icon={<BarChart3 size={22} />}
                title="Real-time Tracking"
                description="Know exactly who viewed your link and who is yet to settle their ledger."
              />
              <FeatureCard 
                icon={<ExternalLink size={22} />}
                title="Secure Links"
                description="No slow PDFs. Send a secure, mobile-first payment page that builds trust."
              />
              <FeatureCard 
                icon={<CheckCircle size={22} />}
                title="Pro Receipts"
                description="Automatic PDF receipt generation as soon as payment is verified."
              />
            </div>
          </div>
        </section>

        {/* SECTION 4 REMOVED: PLACEHOLDER SOCIAL PROOF */}

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
