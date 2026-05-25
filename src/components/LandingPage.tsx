import React, { useState, useEffect } from 'react';
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
import { UpgradeModal } from './UpgradeModal';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePlan } from '../contexts/PlanContext';

export default function LandingPage({ user }: { user: User | null }) {
  const [showAuth, setShowAuth] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  // TODO: Extend targetPlan type to include 'enterprise' when Lemon Squeezy billing is wired
  const [targetPlan, setTargetPlan] = useState<'pro'>('pro');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [loadVideo, setLoadVideo] = useState(false);
  const navigate = useNavigate();
  const { plan } = usePlan();

  // Location-based pricing logic
  const [currency, setCurrency] = useState<'usd'|'inr'|'eur'>('usd');

  useEffect(() => {
    // Dynamic Font Injection
    const linkId = 'landing-fonts';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Syne:wght@700;800&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        const country = data.country_code;
        if (country === 'IN') setCurrency('inr');
        else if (['GB','DE','FR','IT','ES','NL','PT','SE',
                   'NO','DK','FI','AT','BE','CH','PL'].includes(country)) 
          setCurrency('eur');
        else setCurrency('usd');
      })
      .catch(() => setCurrency('usd'));
  }, []);

  const PRICES = {
    usd: { free: '$0', pro_monthly: '$12/mo', pro_annual: '$99/yr', 
           ent_monthly: '$39/mo', ent_annual: '$299/yr' },
    inr: { free: '₹0', pro_monthly: '₹399/mo', pro_annual: '₹2,999/yr', 
           ent_monthly: '₹999/mo', ent_annual: '₹7,999/yr' },
    eur: { free: '€0', pro_monthly: '€11/mo', pro_annual: '€89/yr', 
           ent_monthly: '€35/mo', ent_annual: '€269/yr' },
  };

  useEffect(() => {
    // Only fetch/load heavy video streams after page is fully loaded to maximize load efficiency
    if (document.readyState === 'complete') {
      const timer = setTimeout(() => setLoadVideo(true), 150);
      return () => clearTimeout(timer);
    } else {
      const handleLoad = () => {
        setTimeout(() => setLoadVideo(true), 150);
      };
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
    setIsProfileOpen(false);
  };

  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const easeExpo = [0.16, 1, 0.3, 1] as any;

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.08, ease: easeExpo }
    }
  };

  const itemVariants: any = {
    hidden: { y: 24, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: easeExpo } }
  };

  // TODO: Replace hardcoded waitlist count with live Supabase query
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F0EFE9] font-['DM_Sans'] selection:bg-[#F5A623] selection:text-[#0A0A0F] overflow-x-hidden relative">
      {/* Navigation */}
      <nav className="border-b border-[#2A2A38] bg-[#0A0A0F]/95 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 bg-[#F5A623] rounded-xl flex items-center justify-center text-[#0A0A0F] font-['Syne'] font-extrabold italic text-sm shadow-xl"
            >
              P
            </motion.div>
            <span className="text-xl font-['Syne'] font-extrabold tracking-tight text-[#F0EFE9]">Paydrip</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => handleScrollTo('how-it-works')} 
              className="text-sm font-medium text-[#8A8A9A] hover:text-[#F5A623] transition-colors"
            >
              How it works
            </button>
            <button 
              onClick={() => handleScrollTo('features')} 
              className="text-sm font-medium text-[#8A8A9A] hover:text-[#F5A623] transition-colors"
            >
              Features
            </button>
            <button 
              onClick={() => handleScrollTo('pricing')} 
              className="text-sm font-medium text-[#8A8A9A] hover:text-[#F5A623] transition-colors"
            >
              Pricing
            </button>
          </div>

          <div className="flex items-center gap-6">
            {user ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="hidden sm:flex px-5 py-2.5 bg-[#F5A623] hover:bg-[#E09615] text-[#0A0A0F] rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                >
                  Go to Dashboard
                  <ArrowUpRight size={14} />
                </button>
                
                <div className="relative">
                  <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="h-10 w-10 rounded-xl bg-[#13131A] border border-[#2A2A38] flex items-center justify-center text-xs font-bold text-[#F0EFE9] italic shadow-lg cursor-pointer hover:bg-[#1C1C26] transition-all active:scale-95"
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
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute top-full right-0 mt-4 w-64 bg-[#13131A] border border-[#2A2A38] rounded-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] p-6 z-50"
                        >
                          <div className="mb-6">
                            <p className="text-[9px] font-semibold text-[#F5A623] uppercase tracking-widest mb-1">
                              {plan === 'free' ? 'Free Plan' : `${plan} Access`}
                            </p>
                            <p className="text-sm font-bold text-[#F0EFE9] truncate tracking-tight mb-0.5">{user?.email?.split('@')[0]}</p>
                            <p className="text-[9px] text-[#8A8A9A] font-mono truncate">{user?.email}</p>
                          </div>
                          
                          <div className="space-y-1.5 border-t border-[#2A2A38] pt-4">
                            <button 
                              onClick={() => { navigate('/dashboard'); setIsProfileOpen(false); }}
                              className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#8A8A9A] hover:text-[#F5A623] hover:bg-[#1C1C26] rounded-xl transition-all"
                            >
                              Open Dashboard
                            </button>
                            <button 
                              onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}
                              className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#8A8A9A] hover:text-[#F5A623] hover:bg-[#1C1C26] rounded-xl transition-all"
                            >
                              Settings
                            </button>
                            <button 
                              onClick={handleSignOut}
                              className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#EF4444] hover:bg-red-950/20 rounded-xl transition-all"
                            >
                              Sign Out
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
                  className="px-6 py-2.5 border border-[#2A2A38] text-[#F0EFE9] rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-[#F5A623] hover:text-[#F5A623] transition-all active:scale-95 bg-[#13131A]/40"
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
        <section className="pt-16 pb-24 px-6 relative">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 text-left">
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 bg-[#F5A62320] border border-[#F5A62340] rounded-full text-[11px] font-semibold text-[#F5A623] uppercase tracking-[0.2em] mb-6">
                <Zap size={10} className="fill-current" /> AI-Powered Invoice Recovery
              </motion.div>

              <motion.h1 
                variants={itemVariants} 
                className="text-5xl md:text-6xl lg:text-7xl font-['Syne'] font-extrabold tracking-tight text-[#F0EFE9] leading-[1.08] mb-6"
              >
                Your invoices <br />
                <span className="text-[#F5A623]">follow up themselves.</span>
              </motion.h1>
              
              <motion.p 
                variants={itemVariants} 
                className="text-[#8A8A9A] text-lg md:text-xl font-['DM_Sans'] max-w-xl mb-10 leading-relaxed font-semibold"
              >
                Send once. Paydrip's AI generates personalised recovery sequences and delivers them across Email, SMS, and WhatsApp — automatically.
              </motion.p>
              
              <motion.div variants={itemVariants} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-5">
                  <button 
                    onClick={() => user ? navigate('/dashboard') : setShowAuth(true)}
                    className="px-8 py-4 bg-[#F5A623] hover:bg-[#E09615] text-[#0A0A0F] rounded-xl text-sm font-bold font-['DM_Sans'] transition-all flex items-center justify-center gap-2 group active:scale-95 shadow-lg hover:shadow-[#F5A62310]"
                  >
                    Start Free
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => handleScrollTo('how-it-works')}
                    className="text-[#8A8A9A] hover:text-[#F5A623] py-2 text-sm font-bold font-['DM_Sans'] transition-colors flex items-center justify-center cursor-pointer gap-1"
                  >
                    See how it works →
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-['DM_Sans'] text-[#8A8A9A]">
                    <CheckCircle size={12} className="text-[#F5A623]" /> No credit card
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-['DM_Sans'] text-[#8A8A9A]">
                    <CheckCircle size={12} className="text-[#F5A623]" /> Free forever plan
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-['DM_Sans'] text-[#8A8A9A]">
                    <CheckCircle size={12} className="text-[#F5A623]" /> Setup in 2 minutes
                  </div>
                </div>
              </motion.div>
            </div>
            
            <motion.div 
              variants={itemVariants}
              className="lg:col-span-5 relative"
            >
              <div className="absolute inset-0 bg-[#F5A623]/5 rounded-[4rem] -rotate-3 blur-3xl"></div>
              
              {/* WhatsApp Mockup */}
              <div className="relative bg-[#0A0A0F] border border-[#2A2A38] w-full max-w-[320px] mx-auto rounded-3xl shadow-[0_32px_64px_-16px_rgba(245,166,35,0.15)] overflow-hidden aspect-[9/16] flex flex-col">
                {/* Status Bar */}
                <div className="h-6 bg-slate-950/20 flex justify-between px-6 items-center border-b border-[#2A2A38]/50">
                  <div className="w-12 h-2 bg-slate-800 rounded-full"></div>
                </div>

                {/* Header */}
                <div className="bg-[#13131A] p-4 flex items-center gap-3 border-b border-[#2A2A38]">
                  <div className="w-8 h-8 bg-[#F5A623] rounded-xl flex items-center justify-center text-[#0A0A0F] text-[10px] font-['Syne'] font-extrabold italic">P</div>
                  <div>
                    <h4 className="text-[#F0EFE9] text-xs font-bold leading-none font-['DM_Sans']">Paydrip Finance</h4>
                    <p className="text-[#22C55E] text-[8px] font-semibold mt-1 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-[#22C55E] relative">
                        <span className="absolute inset-0 bg-[#22C55E] animate-ping rounded-full" />
                      </span> 
                      Online
                    </p>
                  </div>
                </div>

                {/* Chat Area */}
                <div className="p-4 space-y-4 font-['DM_Sans'] h-full bg-[#0A0A0F]">
                  <div className="flex justify-center">
                    <span className="bg-[#13131A] text-[#8A8A9A] text-[8px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-[#2A2A38]">Today</span>
                  </div>

                  {/* Message Bubble */}
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0, x: -20 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, ease: easeExpo }}
                    className="bg-[#13131A] p-3.5 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] relative border-l-4 border-l-[#F5A623] border-t border-r border-b border-t-[#2A2A38] border-r-[#2A2A38] border-b-[#2A2A38]"
                  >
                    <p className="text-[11px] text-[#8A8A9A] leading-relaxed font-medium">
                      Hey Arjun Bhatia, just a quick reminder that invoice <span className="font-bold text-[#F0EFE9]">#INV-204</span> is due today. 
                      <br /><br />
                      Total: <span className="font-black text-[#F0EFE9]">₹12,450.00</span>
                      <br /><br />
                      Sharing the secure payment link here: 
                    </p>
                    <div className="mt-2.5 p-2 bg-[#0A0A0F] border border-[#2A2A38] rounded-xl flex items-center gap-2">
                       <div className="w-6 h-6 bg-[#F5A623] rounded flex items-center justify-center text-[#0A0A0F] text-[8px] font-['Syne'] font-extrabold italic shrink-0">P</div>
                       <div className="flex-1 overflow-hidden">
                         <p className="text-[9px] font-bold text-[#F0EFE9] truncate">paydrip.io/v/secure</p>
                         <p className="text-[7px] text-[#4A4A5A]">Click to pay invoice instantly</p>
                       </div>
                    </div>
                  </motion.div>

                  {/* Reply Bubble (Mocking real trust) */}
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0, x: 20 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    transition={{ delay: 1.2, ease: easeExpo }}
                    className="bg-[#131215] p-3.5 rounded-2xl rounded-tr-none shadow-sm max-w-[80%] ml-auto border border-[#2A2A38]"
                  >
                    <p className="text-[11px] text-[#F0EFE9] leading-relaxed font-medium">
                      Ah thanks for the reminder! Just paid via UPI. ⚡️
                    </p>
                    <span className="text-[7px] text-[#4A4A5A] float-right mt-1.5 font-mono">10:42 AM</span>
                  </motion.div>
                </div>
              </div>

              {/* Floating Badge */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 -left-4 bg-[#13131A] p-5 rounded-2xl shadow-2xl border border-[#2A2A38] flex items-center gap-4 z-20"
              >
                <div className="w-10 h-10 bg-[#F5A62320] text-[#F5A623] rounded-xl flex items-center justify-center relative shrink-0">
                  <span className="w-3.5 h-3.5 bg-[#22C55E] rounded-full relative">
                    <span className="absolute inset-0 rounded-full bg-[#22C55E] animate-ping opacity-75" />
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[#8A8A9A] uppercase tracking-widest leading-none mb-1 font-['DM_Sans']">Receipt Generated</p>
                  <p className="text-sm font-extrabold text-[#F0EFE9] font-['Syne'] tracking-tight">₹12,450 Settled</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 2: HOW IT WORKS */}
        <motion.section 
          id="how-it-works"
          whileInView={{ opacity: 1, y: 0 }} 
          initial={{ opacity: 0, y: 24 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: easeExpo }}
          className="py-20 px-6 bg-[#0A0A0F] border-t border-b border-[#2A2A38]"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-[11px] font-semibold font-['DM_Sans'] uppercase tracking-[0.2em] text-[#F5A623] mb-4">How it works</p>
              <h2 className="text-4xl md:text-5xl font-['Syne'] font-extrabold tracking-tight text-[#F0EFE9]">From invoice to payment — on autopilot.</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              {/* Steps (High Contrast Stepper Styling with Fix 2) */}
              <div className="lg:col-span-6 space-y-4">
                {[
                  { step: "01", title: "Set up your workspace", desc: "Add your org details and invite team members. Takes under 2 minutes." },
                  { step: "02", title: "Add your clients", desc: "Build your client list with contact details and risk profiles. Paydrip auto-scores payment risk." },
                  { step: "03", title: "Create & send invoices", desc: "Generate professional invoices instantly. Clients get a secure payment portal with UPI QR, card, and bank transfer options." },
                  { step: "04", title: "AI sequences kick in", desc: "Paydrip's AI writes personalised follow-ups — polite, then firm, then final. Delivered on Email, SMS, and WhatsApp automatically." },
                  { step: "05", title: "Get paid. Generate receipts.", desc: "Client pays and reports payment. You verify and generate a professional PDF receipt in one click." }
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className="p-6 bg-[#131118] border-l-4 border-l-[#2A2A38] border-t border-r border-b border-t-[#2A2A38] border-r-[#2A2A38] border-b-[#2A2A38] hover:border-l-[#F5A623] transition-colors duration-300 rounded-2xl flex gap-5 group"
                  >
                    <div className="text-xl font-['Syne'] font-extrabold text-[#F5A623]/30 group-hover:text-[#F5A623] transition-colors">{item.step}</div>
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-[#F0EFE9] mb-1 font-['DM_Sans']">{item.title}</h4>
                      <p className="text-sm text-[#8A8A9A] font-medium leading-relaxed font-['DM_Sans']">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Product Live Demo Mockup UI (Static React JSX Mockup) */}
              <div className="lg:col-span-6 lg:sticky lg:top-28">
                <div className="bg-[#13131A] border border-[#2A2A38] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[#2A2A38]/60 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#F5A623]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
                    </div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#4A4A5A]">live_dashboard_status</span>
                  </div>

                  {/* Mini Invoice Card */}
                  <div className="bg-[#1C1C26] border border-[#2A2A38] rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-[#F5A623] mb-0.5 font-['DM_Sans']">Active Invoice</p>
                        <span className="text-[14px] font-['Syne'] font-extrabold text-[#F0EFE9] block">Arjun Bhatia</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-[#F5A623]/20 text-[#F5A623]">
                        Sequence Active
                      </span>
                    </div>
                    <div className="text-xl font-['Syne'] font-extrabold text-[#F5A623] mb-1">
                      ₹12,450
                    </div>
                    <p className="text-[10px] text-[#8A8A9A] font-mono">Invoice #INV-204 · Overdue 5 days</p>
                  </div>

                  {/* Status Pills */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-[#1C1C26] border border-[#2A2A38] px-2 py-2.5 rounded-xl flex flex-col items-center justify-center text-center">
                      <span className="text-lg mb-1">📧</span>
                      <span className="text-[9px] font-bold uppercase text-[#22C55E]">Email Sent</span>
                    </div>
                    <div className="bg-[#1C1C26] border border-[#2A2A38] px-2 py-2.5 rounded-xl flex flex-col items-center justify-center text-center">
                      <span className="text-lg mb-1">💬</span>
                      <span className="text-[9px] font-bold uppercase text-[#F5A623]">SMS Queued</span>
                    </div>
                    <div className="bg-[#1C1C26] border border-[#2A2A38] px-2 py-2.5 rounded-xl flex flex-col items-center justify-center text-center">
                      <span className="text-lg mb-1">✅</span>
                      <span className="text-[9px] font-bold uppercase text-[#22C55E]">WA Delivered</span>
                    </div>
                  </div>

                  {/* AI Message Preview Box */}
                  <div className="border border-[#F5A623] rounded-xl p-4 bg-[#1C1C26]/50">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse" />
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#F5A623] font-['DM_Sans']">AI-generated · Polite tone</span>
                    </div>
                    <p className="text-[11px] text-[#8A8A9A] leading-relaxed italic pr-4 font-['DM_Sans']">
                      "We noticed invoice #INV-204 is due today. We kindly request settling payment via the secure portal linked below..."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* SECTION 3: FEATURES (BENTO GRID) */}
        <motion.section 
          id="features"
          whileInView={{ opacity: 1, y: 0 }} 
          initial={{ opacity: 0, y: 24 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: easeExpo }}
          className="py-20 px-6 bg-[#13131A] relative"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-[11px] font-semibold font-['DM_Sans'] uppercase tracking-[0.2em] text-[#F5A623] mb-4">Everything you need</p>
              <h2 className="text-4xl md:text-5xl font-['Syne'] font-extrabold tracking-tight text-[#F0EFE9]">Built for freelancers who mean business.</h2>
            </div>

            {/* Bento Grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 [&>*:nth-child(1)]:lg:col-span-2 [&>*:nth-child(4)]:lg:col-span-2">
              <FeatureCard 
                icon={<Zap size={22} />}
                title="AI Recovery Sequences"
                isLarge
                description="Gemini AI writes personalised follow-up messages for every client — polite, firm, and final. Tone adapts to invoice age and client history. You never write a chase email again."
                badge="Powered by Gemini 2.0 Flash"
              />

              <FeatureCard 
                icon={<MessageSquare size={22} />}
                title="Multi-Channel Delivery"
                description="Email via Resend, SMS via Twilio, WhatsApp manual prompt. All three in one sequence."
              />

              <FeatureCard 
                icon={<BarChart3 size={22} />}
                title="Client Risk Scoring"
                description="Auto-calculated risk score on every client. Know who needs chasing before they're overdue."
              />

              <FeatureCard 
                icon={<ExternalLink size={22} />}
                title="Client Payment Portal"
                isLarge
                description="Every invoice gets a public, mobile-first payment page. UPI QR code, bank transfer details, and payment reporting — all included. No login required for your clients."
                badge="UPI · Bank Transfer · Card"
              />

              <FeatureCard 
                icon={<BarChart3 size={22} />}
                title="Real-time Analytics"
                description="Track recovery rates, overdue amounts, and sequence performance. Full dashboard included."
              />

              <FeatureCard 
                icon={<Zap size={22} />}
                title="Webhook & White-label"
                description="Enterprise-grade webhooks and white-label portal with custom domain. Built for agencies."
              />
            </div>
          </div>
        </motion.section>

        {/* SECTION 4: SOCIAL PROOF / WAITLIST */}
        <motion.section 
          whileInView={{ opacity: 1, y: 0 }} 
          initial={{ opacity: 0, y: 24 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: easeExpo }}
          className="py-16 px-6 bg-[#0A0A0F]"
        >
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-[11px] font-semibold font-['DM_Sans'] uppercase tracking-[0.2em] text-[#F5A623] mb-4">Early access</p>
            <h2 className="text-3xl md:text-5xl font-['Syne'] font-extrabold text-[#F0EFE9] mb-8">Built in public. Launching soon.</h2>
            
            <div className="max-w-2xl mx-auto bg-[#13131A] border border-[#2A2A38] rounded-2xl p-8 md:p-12 text-center">
              <div className="flex flex-col items-center">
                <span className="font-['Syne'] font-extrabold text-6xl md:text-8xl text-[#F5A623]">47</span>
                <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#8A8A9A] mt-2 font-['DM_Sans']">freelancers on the waitlist</span>
              </div>
              
              <div className="border-b border-[#2A2A38] my-8 w-24 mx-auto" />
              
              <p className="text-sm font-['DM_Sans'] text-[#8A8A9A] max-w-md mx-auto leading-relaxed mb-8 font-medium">
                Paydrip is in active beta. We're onboarding freelancers and agencies for early access. Free plan available now — no credit card required.
              </p>
              
              <button 
                onClick={() => user ? navigate('/dashboard') : setShowAuth(true)}
                className="px-8 py-3.5 bg-[#F5A623] hover:bg-[#E09615] text-[#0A0A0F] rounded-xl text-sm font-bold font-['DM_Sans'] transition-all active:scale-95 shadow-md"
              >
                Join the waitlist
              </button>
            </div>
          </div>
        </motion.section>

        {/* SECTION 5: PRICING */}
        <motion.section 
          id="pricing"
          whileInView={{ opacity: 1, y: 0 }} 
          initial={{ opacity: 0, y: 24 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: easeExpo }}
          className="py-20 px-6 bg-[#13131A]"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-[11px] font-semibold font-['DM_Sans'] uppercase tracking-[0.2em] text-[#F5A623] mb-4">Pricing</p>
              <h2 className="text-4xl md:text-5xl font-['Syne'] font-extrabold tracking-tight text-[#F0EFE9]">Start free. Scale when you're ready.</h2>
              
              {/* Currency Toggle */}
              <div className="flex justify-center mt-8">
                <div className="bg-[#13131A] border border-[#2A2A38] rounded-full p-1.5 flex items-center gap-1.5">
                  {(['usd', 'inr', 'eur'] as const).map((curr) => (
                    <button
                      key={curr}
                      onClick={() => setCurrency(curr)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-bold font-['DM_Sans'] uppercase tracking-wider transition-all",
                        currency === curr
                          ? "bg-[#F5A623] text-[#0A0A0F]"
                          : "text-[#8A8A9A] hover:text-[#F0EFE9]"
                      )}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pricing columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-12 items-stretch">
              <PricingCard 
                name="Free"
                priceKey="free"
                currency={currency}
                prices={PRICES}
                features={[
                  "10 invoices / month",
                  "5 clients",
                  "AI messages (5/month)",
                  "2 active sequences",
                  "Email + WhatsApp delivery",
                  "Public payment portal",
                  "UPI QR code",
                  "Basic analytics"
                ]}
                cta="Get started free"
                onCta={() => user ? navigate('/dashboard') : setShowAuth(true)}
              />

              <PricingCard 
                name="Pro"
                priceKey="pro_monthly"
                yearlyPriceKey="pro_annual"
                isPro
                currency={currency}
                prices={PRICES}
                features={[
                  "500 invoices / month",
                  "Unlimited clients",
                  "AI messages (100/month)",
                  "50 active sequences",
                  "Email + SMS + WhatsApp",
                  "Custom email templates",
                  "Full analytics",
                  "3 team seats",
                  "No Paydrip branding"
                ]}
                cta="Start Pro"
                onCta={() => {
                  setTargetPlan('pro');
                  setShowUpgrade(true);
                }}
              />

              <PricingCard 
                name="Enterprise"
                priceKey="ent_monthly"
                yearlyPriceKey="ent_annual"
                isEnterprise
                currency={currency}
                prices={PRICES}
                features={[
                  "Unlimited everything",
                  "WhatsApp Business API",
                  "AI messages (unlimited)",
                  "20 team seats",
                  "RBAC & SSO/SAML",
                  "Webhooks",
                  "White-label portal",
                  "Custom domain",
                  "Priority support"
                ]}
                cta="Contact us"
                // TODO: Replace with active contact email or Lemon Squeezy enterprise flow
                onCta={() => {
                  alert('Enterprise enquiries coming soon. For now, sign up free and we will reach out.');
                }}
              />
            </div>
          </div>
        </motion.section>

        {/* SECTION 6: FINAL CTA */}
        <motion.section 
          whileInView={{ opacity: 1, y: 0 }} 
          initial={{ opacity: 0, y: 24 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: easeExpo }}
          className="py-24 px-6 text-center bg-[#0A0A0F]"
        >
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-['Syne'] font-extrabold tracking-tight text-[#F0EFE9]">Stop chasing payments.</h2>
            <p className="font-['Syne'] font-extrabold text-3xl md:text-5xl text-[#F5A623] mt-3 mb-6">Start recovering them.</p>
            <p className="text-[#8A8A9A] font-['DM_Sans'] text-sm max-w-lg mx-auto mb-10 leading-relaxed font-semibold">
              Join freelancers using Paydrip to automate invoice recovery across Email, SMS, and WhatsApp.
            </p>
            <button 
              onClick={() => user ? navigate('/dashboard') : setShowAuth(true)}
              className="px-10 py-5 bg-[#F5A623] hover:bg-[#E09615] text-[#0A0A0F] rounded-xl text-base font-bold font-['DM_Sans'] transition-all active:scale-95 shadow-xl hover:shadow-[#F5A62310]"
            >
              Create your first invoice — it's free
            </button>
          </div>
        </motion.section>
      </motion.main>

      {/* FOOTER */}
      <footer className="py-16 px-6 bg-[#0A0A0F] border-t border-[#2A2A38] text-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#F5A623] rounded-xl flex items-center justify-center text-[#0A0A0F] font-['Syne'] font-extrabold italic text-xs">P</div>
            <span className="text-lg font-['Syne'] font-extrabold text-[#F0EFE9]">Paydrip</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 font-medium font-['DM_Sans'] text-[#8A8A9A]">
            <button onClick={() => handleScrollTo('how-it-works')} className="hover:text-[#F5A623] transition-colors">How it works</button>
            <button onClick={() => handleScrollTo('features')} className="hover:text-[#F5A623] transition-colors">Features</button>
            <button onClick={() => handleScrollTo('pricing')} className="hover:text-[#F5A623] transition-colors">Pricing</button>
            <Link to="/privacy" className="hover:text-[#F5A623] transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-[#F5A623] transition-colors">Terms</Link>
          </div>

          <p className="text-[11px] font-semibold text-[#4A4A5A] uppercase tracking-widest font-['DM_Sans']">
            Made for freelancers, everywhere.
          </p>
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
              className="absolute inset-0 bg-[#0A0A0F]/85 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative z-10 w-full max-w-sm max-h-[95vh] overflow-hidden bg-white text-slate-950 rounded-3xl shadow-2xl flex flex-col"
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
      />
    </div>
  );
}

function FeatureCard({ icon, title, description, isLarge, badge }: { icon: React.ReactNode, title: string, description: string, isLarge?: boolean, badge?: string }) {
  return (
    <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-2xl p-8 hover:border-[#F5A62360] transition-colors duration-300 flex flex-col justify-between text-left min-h-[200px]">
      <div>
        <div className="w-12 h-12 bg-[#F5A62320] text-[#F5A623] rounded-xl flex items-center justify-center mb-6">
          {icon}
        </div>
        <h3 className="text-xl font-['Syne'] font-extrabold text-[#F0EFE9] mb-3">{title}</h3>
        <p className="text-sm font-['DM_Sans'] text-[#8A8A9A] leading-relaxed mb-6 font-medium">{description}</p>
      </div>
      {badge && (
        <span className="text-[10px] uppercase tracking-widest font-bold text-[#F5A623] bg-[#F5A62320] px-3.5 py-1 rounded-full w-fit font-['DM_Sans']">
          {badge}
        </span>
      )}
    </div>
  );
}

function PricingCard({ name, priceKey, yearlyPriceKey, features, cta, onCta, isPro, isEnterprise, currency, prices }: any) {
  const priceVal = prices[currency]?.[priceKey] || '$0';
  const yearlyVal = yearlyPriceKey ? prices[currency]?.[yearlyPriceKey] : null;

  // TODO: Add Lemon Squeezy integration for subscription syncing on checkout completion below

  return (
    <div className={cn(
      "relative p-8 rounded-2xl flex flex-col justify-between transition-all duration-300 h-full bg-[#0A0A0F] border text-left",
      isPro ? "border-[#F5A623] shadow-[0_0_40px_#F5A62315]" : "border-[#2A2A38] hover:border-[#F5A62360]"
    )}>
      {isPro && (
        <div className="absolute -top-3.5 left-8 bg-[#F5A623] text-[#0A0A0F] text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full font-['DM_Sans']">
          Most popular
        </div>
      )}

      <div>
        <h3 className={cn(
          "text-[10px] font-bold uppercase tracking-[0.2em] mb-6 font-['DM_Sans']",
          isPro ? "text-[#F5A623]" : "text-[#8A8A9A]"
        )}>{name}</h3>
        
        <div className="mb-8">
          <div className="text-4xl font-['Syne'] font-extrabold tracking-tight text-[#F0EFE9]">
            {priceVal}
          </div>
          {priceKey === 'free' && (
            <p className="text-[11px] text-[#8A8A9A] font-['DM_Sans'] mt-1">Free forever</p>
          )}
          {yearlyVal && (
            <div className="text-[11px] font-medium text-[#8A8A9A] mt-2 font-['DM_Sans']">
              or {yearlyVal} billed yearly
            </div>
          )}
        </div>

        <ul className="space-y-4 mb-10">
          {features.map((f: string) => (
            <li key={f} className="flex items-start gap-3 text-xs font-medium font-['DM_Sans'] leading-normal">
              <div className="shrink-0 mt-0.5">
                <CheckCircle size={14} className="text-[#F5A623]" />
              </div>
              <span className="text-[#8A8A9A]">{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <button 
        onClick={onCta}
        className={cn(
          "w-full py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] font-['DM_Sans'] transition-all active:scale-95 shadow-lg",
          isPro 
            ? "bg-[#F5A623] text-[#0A0A0F] hover:bg-[#E09615] hover:shadow-[#F5A62310]" 
            : "border border-[#2A2A38] text-[#F0EFE9] hover:border-[#F5A623] hover:text-[#F5A623] bg-[#13131A]/30"
        )}
      >
        {cta}
      </button>
    </div>
  );
}
