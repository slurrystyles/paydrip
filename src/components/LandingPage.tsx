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
import { useCurrency } from '../contexts/CurrencyContext';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';

function savePendingCheckout(
  slug: string, 
  cycle: 'monthly' | 'yearly'
) {
  sessionStorage.setItem(
    'pendingCheckout', 
    JSON.stringify({ slug, cycle })
  );
}

function getPendingCheckout(): {
  slug: string, 
  cycle: 'monthly' | 'yearly'
} | null {
  const raw = sessionStorage.getItem(
    'pendingCheckout'
  );
  if (!raw) return null;
  try { return JSON.parse(raw); } 
  catch { return null; }
}

function clearPendingCheckout() {
  sessionStorage.removeItem('pendingCheckout');
}

export default function LandingPage({ user }: { user: User | null }) {
  const [showAuth, setShowAuth] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [targetPlan, setTargetPlan] = useState<'pro' | 'enterprise'>('pro');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [loadVideo, setLoadVideo] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const navigate = useNavigate();
  const { plan } = usePlan();

  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  useEffect(() => {
    async function getWaitlistCount() {
      try {
        const { count, error } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true });
        if (error) throw error;
        setWaitlistCount(count || 0);
      } catch (err) {
        console.warn('Could not fetch live count from users table:', err);
        setWaitlistCount(0);
      }
    }
    getWaitlistCount();
  }, []);

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
    }
  }, [window.location.hash]);

  const { currency, prices: PRICES, isIndia } = useCurrency();

  useEffect(() => {
    // Dynamic Font Injection
    const linkId = 'landing-fonts';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
      document.head.appendChild(link);
    }
  }, []);

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

  const handleCheckout = (
    slug: string,
    cycle: 'monthly' | 'yearly'
  ) => {
    if (!user) {
      savePendingCheckout(slug, cycle);
      setShowAuth(true);
      return;
    }

    if (slug === 'free') {
      navigate('/dashboard');
      return;
    }

    if (slug === 'enterprise') {
      alert('Enterprise enquiries coming soon. Contact hello@paydripapp.com to upgrade.');
      return;
    }

    const key = `${slug}-${
      cycle === 'yearly' ? 'annual' : 'monthly'
    }`;

    if (isIndia) {
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

    const variantMap: Record<string, string> = {
      'pro-monthly': import.meta.env.VITE_LEMONSQUEEZY_PRO_MONTHLY_VARIANT,
      'pro-annual': import.meta.env.VITE_LEMONSQUEEZY_PRO_ANNUAL_VARIANT,
      'ent-monthly': import.meta.env.VITE_LEMONSQUEEZY_ENT_MONTHLY_VARIANT,
      'ent-annual': import.meta.env.VITE_LEMONSQUEEZY_ENT_ANNUAL_VARIANT,
    };

    const variantId = variantMap[key];
    if (!variantId) return;

    window.open(
      `https://paydripapp.lemonsqueezy.com/checkout/buy/${variantId}`,
      '_blank'
    );
  };

  useEffect(() => {
    if (user) {
      const pending = getPendingCheckout();
      if (pending) {
        clearPendingCheckout();
        handleCheckout(pending.slug, pending.cycle);
      }
    }
  }, [user]);

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
    <div className="min-h-screen bg-[#080808] text-[#EEEEEE] font-['Inter'] selection:bg-[#C8FF00] selection:text-[#080808] overflow-x-hidden relative">
      <PublicHeader />

      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* SECTION 1: HERO (ABOVE THE FOLD) */}
        <section className="min-h-screen flex flex-col justify-center py-20 bg-[#080808] relative border-b border-[#222222]">
          <div className="max-w-6xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 text-left">
              <motion.div variants={itemVariants} className="inline-flex items-center bg-[#111111] border border-[#222222] rounded-full px-3 py-1 text-xs text-[#888888] mb-6">
                AI-Powered Invoice Recovery
              </motion.div>

              <motion.h1 
                variants={itemVariants} 
                className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-6 max-w-2xl text-[#EEEEEE]"
              >
                Your invoices <br />
                <span className="text-[#C8FF00]">follow up themselves.</span>
              </motion.h1>
              
              <motion.p 
                variants={itemVariants} 
                className="text-base text-[#888888] leading-relaxed mb-8 max-w-lg"
              >
                Send once. Paydrip's AI writes personalised recovery sequences and delivers them across Email, SMS, and WhatsApp — automatically.
              </motion.p>
              
              <motion.div variants={itemVariants} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <button 
                    onClick={() => user ? navigate('/dashboard') : setShowAuth(true)}
                    className="bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] font-semibold text-sm rounded-lg px-6 py-3 transition-colors text-center active:scale-95"
                  >
                    Start for free
                  </button>
                  <button 
                    onClick={() => handleScrollTo('how-it-works')}
                    className="text-[#888888] text-sm hover:text-[#EEEEEE] underline underline-offset-4 hover:no-underline transition-all py-3 px-1 text-center cursor-pointer"
                  >
                    See how it works
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-[#444444]">
                  <span>No credit card</span>
                  <span>·</span>
                  <span>Free forever plan</span>
                  <span>·</span>
                  <span>Setup in 2 minutes</span>
                </div>
              </motion.div>
            </div>
            
            <motion.div 
              variants={itemVariants}
              className="lg:col-span-5 relative"
            >
              <div className="relative flex justify-center lg:justify-end">
                <div className="absolute inset-0 bg-[#C8FF0015] rounded-full blur-3xl opacity-50" />
                
                {/* WhatsApp Mockup phone frame */}
                <div className="relative bg-[#111111] border border-[#222222] w-full max-w-[280px] h-[480px] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                  {/* Status Bar */}
                  <div className="h-6 bg-black/45 flex justify-between px-6 items-center border-b border-[#222222]/30">
                    <div className="w-12 h-2 bg-[#222222] rounded-full"></div>
                  </div>

                  {/* Header */}
                  <div className="bg-[#1a1a1a] p-3 flex items-center gap-3 border-b border-[#222222]">
                    <div className="w-7 h-7 bg-[#C8FF00] rounded-lg flex items-center justify-center text-[#080808] text-[9px] font-bold">P</div>
                    <div>
                      <h4 className="text-[#EEEEEE] text-xs font-semibold leading-none">Paydrip Finance</h4>
                      <p className="text-[#888888] text-[8px] mt-0.5">Online</p>
                    </div>
                  </div>

                  {/* Chat Area */}
                  <div className="p-4 space-y-4 h-full bg-[#111111] overflow-y-auto">
                    <div className="flex justify-center">
                      <span className="bg-[#1a1a1a] text-[#444444] text-[8px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-widest">Today</span>
                    </div>

                    {/* Message Bubble */}
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0, x: -10 }}
                      animate={{ scale: 1, opacity: 1, x: 0 }}
                      transition={{ delay: 0.5, ease: easeExpo }}
                      className="bg-[#1a1a1a] border border-[#222222] p-3 rounded-xl rounded-tl-none shadow-sm max-w-[85%]"
                    >
                      <p className="text-[10px] text-[#888888] leading-normal font-medium">
                        Hey Arjun Bhatia, just a quick reminder that invoice <span className="font-semibold text-[#EEEEEE]">#INV-204</span> is due today. 
                        <br /><br />
                        Total: <span className="font-semibold text-[#EEEEEE]">₹12,450.00</span>
                        <br /><br />
                        Sharing secure payment link: 
                      </p>
                      <div className="mt-2 p-1.5 bg-[#111111] border border-[#222222] rounded-lg flex items-center gap-2">
                         <div className="w-5 h-5 bg-[#C8FF00] rounded flex items-center justify-center text-[#080808] text-[7px] font-bold">P</div>
                         <div className="flex-1 overflow-hidden">
                           <p className="text-[8px] font-semibold text-[#EEEEEE] truncate">paydripapp.com/pay</p>
                         </div>
                      </div>
                    </motion.div>

                    {/* Reply Bubble */}
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0, x: 10 }}
                      animate={{ scale: 1, opacity: 1, x: 0 }}
                      transition={{ delay: 1.2, ease: easeExpo }}
                      className="bg-[#1a1a1a] border border-[#222222] p-3 rounded-xl rounded-tr-none shadow-sm max-w-[80%] ml-auto"
                    >
                      <p className="text-[10px] text-[#EEEEEE] leading-normal font-medium">
                        Ah thanks for the reminder! Just paid via UPI.
                      </p>
                      <span className="text-[7px] text-[#444444] float-right mt-1 font-mono">10:42 AM</span>
                    </motion.div>
                  </div>
                </div>

                {/* Floating Badge */}
                <motion.div 
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-4 -left-4 bg-[#111111] border border-[#222222] rounded-xl p-4 flex items-center gap-3 shadow-2xl z-20"
                >
                  <div className="w-2.5 h-2.5 bg-[#C8FF00] rounded-full relative shrink-0">
                    <span className="absolute inset-0 rounded-full bg-[#C8FF00] animate-ping opacity-75" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#EEEEEE]">₹12,450 recovered</p>
                    <p className="text-[#444444] text-xs">just now</p>
                  </div>
                </motion.div>
              </div>
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
          className="min-h-screen flex flex-col justify-center py-20 bg-[#111111] border-t border-b border-[#222222]"
        >
          <div className="max-w-6xl mx-auto px-6 w-full">
            <div className="mb-12">
              <p className="text-xs text-[#888888] uppercase tracking-widest mb-3">How it works</p>
              <h2 className="text-3xl md:text-4xl font-bold text-[#EEEEEE] max-w-xl leading-tight">From invoice to payment, on autopilot.</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              {/* Steps List */}
              <div className="lg:col-span-6 space-y-0 divide-y divide-[#222222]">
                {[
                  { step: "01", title: "Set up your workspace", desc: "Add your org, invite your team. Under 2 minutes." },
                  { step: "02", title: "Add your clients", desc: "Build your client list. Paydrip auto-scores payment risk." },
                  { step: "03", title: "Create & send invoices", desc: "Professional invoices with a secure payment portal. UPI QR included." },
                  { step: "04", title: "AI sequences kick in", desc: "Polite, firm, final — AI writes every follow-up across Email, SMS, and WhatsApp." },
                  { step: "05", title: "Get paid. Generate receipts.", desc: "Client pays, you verify, PDF receipt in one click." }
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className="py-5 flex gap-5 group transition-colors duration-300"
                  >
                    <div className={cn(
                      "text-xs font-mono tabular-nums select-none pt-0.5",
                      i === 0 ? "text-[#C8FF00]" : "text-[#444444] group-hover:text-[#C8FF00] transition-colors"
                    )}>
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#EEEEEE] mb-1">{item.title}</h4>
                      <p className="text-sm text-[#888888] leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Product Live Demo Mockup UI */}
              <div className="lg:col-span-6 lg:sticky lg:top-24">
                <div className="bg-[#080808] border border-[#222222] rounded-xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[#222222]/30 pb-3 mb-4">
                    <p className="text-xs text-[#444444] font-mono">paydrip · live</p>
                  </div>

                  {/* Mini Invoice Card */}
                  <div className="bg-[#111111] border border-[#222222] rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-[#888888] mb-0.5">Active Invoice</p>
                        <span className="text-sm font-semibold text-[#EEEEEE] block">Arjun Bhatia</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded bg-[#1a1a1a] text-[#888888] text-[10px] font-semibold">
                        Sequence Active
                      </span>
                    </div>
                    {/* ONE lime number in this section is the amount ₹12,450 */}
                    <div className="text-xl font-bold text-[#C8FF00] mb-1">
                      ₹12,450
                    </div>
                    <p className="text-[10px] text-[#444444] font-mono">Invoice #INV-204 · Overdue 5 days</p>
                  </div>

                  {/* Status Pills */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-[#111111] border border-[#222222] px-2 py-2 rounded-lg flex flex-col items-center justify-center text-center">
                      <span className="text-base mb-1">📧</span>
                      <span className="text-[9px] font-semibold text-[#888888] uppercase">Email Sent</span>
                    </div>
                    <div className="bg-[#111111] border border-[#222222] px-2 py-2 rounded-lg flex flex-col items-center justify-center text-center">
                      <span className="text-base mb-1">💬</span>
                      <span className="text-[9px] font-semibold text-[#888888] uppercase">SMS Queued</span>
                    </div>
                    <div className="bg-[#111111] border border-[#222222] px-2 py-2 rounded-lg flex flex-col items-center justify-center text-center">
                      <span className="text-base mb-1">✅</span>
                      <span className="text-[9px] font-semibold text-[#888888] uppercase">WA Delivered</span>
                    </div>
                  </div>

                  {/* AI Message Preview Box */}
                  <div className="border border-[#222222] bg-[#111111] rounded-lg p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#888888]">AI-generated · Polite tone</span>
                    </div>
                    <p className="text-xs text-[#888888] leading-relaxed">
                      "We noticed invoice #INV-204 is due today. We kindly request settling payment via the secure portal linked below..."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* SECTION 3: FEATURES */}
        <motion.section 
          id="features"
          whileInView={{ opacity: 1, y: 0 }} 
          initial={{ opacity: 0, y: 24 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: easeExpo }}
          className="min-h-screen flex flex-col justify-center py-20 bg-[#080808] border-b border-[#222222]"
        >
          <div className="max-w-6xl mx-auto px-6 w-full">
            <div className="mb-12">
              <p className="text-xs text-[#888888] uppercase tracking-widest mb-3">Features</p>
              <h2 className="text-3xl md:text-4xl font-bold text-[#EEEEEE] max-w-xl leading-tight">Everything you need to get paid.</h2>
            </div>

            {/* Grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FeatureCard 
                icon={<Zap size={20} />}
                title="AI Recovery Sequences"
                description="Gemini AI writes every follow-up — polite, firm, final. Tone adapts to invoice age."
                badge="Gemini 2.0 Flash"
              />

              <FeatureCard 
                icon={<MessageSquare size={20} />}
                title="Multi-Channel Delivery"
                description="Email, SMS, and WhatsApp in one automated sequence. Nothing falls through the cracks."
              />

              <FeatureCard 
                icon={<BarChart3 size={20} />}
                title="Client Risk Scoring"
                description="Every client gets an auto-calculated risk score. Know who needs attention before they're overdue."
              />

              <FeatureCard 
                icon={<ExternalLink size={20} />}
                title="Payment Portal"
                description="A mobile-first payment page for every invoice. UPI QR, bank transfer, no client login needed."
                badge="UPI · Bank Transfer"
              />

              <FeatureCard 
                icon={<BarChart3 size={20} />}
                title="Analytics Dashboard"
                description="Recovery rates, overdue amounts, sequence performance. Full visibility, always."
              />

              <FeatureCard 
                icon={<Zap size={20} />}
                title="Webhooks & White-label"
                description="Enterprise webhooks, custom domain, white-label portal. Built for agencies."
                badge="Enterprise"
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
          className="min-h-screen flex flex-col justify-center py-20 bg-[#111111] border-b border-[#222222]"
        >
          <div className="max-w-2xl mx-auto px-6 w-full text-center">
            <p className="text-xs text-[#888888] uppercase tracking-widest mb-3">Early access</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#EEEEEE] mb-10">Built in public. Launching soon.</h2>
            
            <div className="bg-[#080808] border border-[#222222] rounded-xl p-10 text-center max-w-xl mx-auto shadow-2xl">
              <div className="flex flex-col items-center">
                {waitlistCount === 0 ? (
                  <span className="text-3xl font-bold text-[#C8FF00] mb-1">Be among the first</span>
                ) : (
                  <span className="text-5xl font-bold text-[#C8FF00]">
                    {waitlistCount === null ? '...' : waitlistCount}
                  </span>
                )}
                <span className="text-sm text-[#888888] mt-1">
                  {waitlistCount === 1 ? 'freelancer on the waitlist' : 'freelancers on the waitlist'}
                </span>
              </div>
              
              <div className="border-b border-[#222222] w-12 mx-auto my-8" />
              
              <p className="text-sm text-[#888888] max-w-sm mx-auto leading-relaxed">
                Paydrip is in active beta. We're onboarding freelancers and agencies for early access. Free plan available now — no credit card.
              </p>
              
              <button 
                onClick={() => user ? navigate('/dashboard') : setShowAuth(true)}
                className="bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] font-semibold text-sm rounded-lg px-6 py-3 mt-6 transition-colors inline-block cursor-pointer"
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
          className="min-h-screen flex flex-col justify-center py-20 bg-[#080808] border-b border-[#222222]"
        >
          <div className="max-w-6xl mx-auto px-6 w-full">
            <div className="mb-10 text-center">
              <p className="text-xs text-[#888888] uppercase tracking-widest mb-3">Pricing</p>
              <h2 className="text-3xl md:text-4xl font-bold text-[#EEEEEE] leading-tight">Start free. Scale when ready.</h2>
              
              <div className="flex justify-center mt-6">
                <div className="flex items-center gap-1 bg-[#111111] border border-[#222222] rounded-lg p-1">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-xs font-semibold transition-all",
                      billingCycle === 'monthly'
                        ? "bg-[#C8FF00] text-[#080808]"
                        : "text-[#888888] hover:text-[#EEEEEE]"
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-xs font-semibold transition-all",
                      billingCycle === 'yearly'
                        ? "bg-[#C8FF00] text-[#080808]"
                        : "text-[#888888] hover:text-[#EEEEEE]"
                    )}
                  >
                    Yearly
                    <span className="ml-1.5 text-[10px] text-emerald-500 font-bold">
                      Save 20%
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Pricing columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mt-10 max-w-6xl mx-auto w-full">
              <PricingCard 
                name="Free"
                price={PRICES[currency]?.free}
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
                price={billingCycle === 'monthly' ? PRICES[currency]?.pro_monthly : PRICES[currency]?.pro_annual}
                yearlyPrice={billingCycle === 'monthly' ? PRICES[currency]?.pro_annual : undefined}
                isPro
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
                onCta={() => handleCheckout('pro', billingCycle)}
              />

              <PricingCard 
                name="Enterprise"
                price={billingCycle === 'monthly' ? PRICES[currency]?.ent_monthly : PRICES[currency]?.ent_annual}
                yearlyPrice={billingCycle === 'monthly' ? PRICES[currency]?.ent_annual : undefined}
                isEnterprise
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
                cta="Start Enterprise"
                onCta={() => handleCheckout('enterprise', billingCycle)}
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
          className="min-h-screen flex flex-col justify-center py-20 bg-[#111111] text-center border-b border-[#222222]"
        >
          <div className="max-w-xl mx-auto px-6 w-full">
            <h2 className="text-3xl md:text-4xl font-bold text-[#EEEEEE] tracking-tight leading-tight">
              Stop chasing payments. <br />
              <span className="text-[#C8FF00]">Start recovering them.</span>
            </h2>
            <p className="text-sm text-[#888888] mt-4 mb-8 max-w-md mx-auto leading-relaxed">
              Join freelancers using Paydrip to automate invoice recovery across Email, SMS, and WhatsApp.
            </p>
            <button 
              onClick={() => user ? navigate('/dashboard') : setShowAuth(true)}
              className="bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] font-semibold text-sm rounded-lg px-8 py-3 transition-colors active:scale-95"
            >
              Create your first invoice — it's free
            </button>
          </div>
        </motion.section>
      </motion.main>

      <PublicFooter />

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
              className="relative z-10 w-full max-w-sm max-h-[95vh] overflow-hidden bg-[#080808] text-[#EEEEEE] border border-[#222222] rounded-3xl shadow-2xl flex flex-col"
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

      <UpgradeModal 
        isOpen={showUpgrade} 
        onClose={() => setShowUpgrade(false)} 
      />
    </div>
  );
}

function FeatureCard({ icon, title, description, badge }: { icon: React.ReactNode, title: string, description: string, badge?: string }) {
  return (
    <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 hover:border-[#333333] transition-colors flex flex-col justify-between text-left min-h-[180px]">
      <div>
        <div className="text-[#EEEEEE]">
          {icon}
        </div>
        <h3 className="text-base font-semibold text-[#EEEEEE] mt-4">{title}</h3>
        <p className="text-sm text-[#888888] mt-2 leading-relaxed">{description}</p>
      </div>
      {badge && (
        <span className="text-xs text-[#444444] mt-4 block">
          {badge}
        </span>
      )}
    </div>
  );
}

function PricingCard({ name, price, yearlyPrice, features, cta, onCta, isPro, isEnterprise }: any) {
  // TODO: Add Lemon Squeezy integration for subscription syncing on checkout completion below

  return (
    <div className="flex flex-col h-full justify-end relative">
      {isPro && (
        <div className="text-xs text-[#C8FF00] font-medium mb-2 tracking-wide block">
          Most popular
        </div>
      )}
      {!isPro && (
        <div className="text-xs text-transparent font-medium mb-2 opacity-0 select-none pointer-events-none block">
          Placeholder
        </div>
      )}
      <div className={cn(
        "relative p-8 rounded-xl flex flex-col justify-between transition-all duration-300 flex-1 bg-[#111111] border text-left",
        isPro ? "border-[#C8FF00] shadow-[0_0_30px_rgba(200,255,0,0.06)]" : "border-[#222222] hover:border-[#333333]"
      )}>
        <div>
          <h3 className="text-xs text-[#888888] uppercase tracking-widest font-medium mb-6">{name}</h3>
          
          <div className="mb-8">
            <div className="text-4xl font-bold text-[#EEEEEE]">
              {price}
            </div>
            {name === 'Free' && (
              <p className="text-xs text-[#444444] mt-1">forever</p>
            )}
            {yearlyPrice && (
              <div className="text-xs text-[#444444] mt-1">
                or {yearlyPrice} / year
              </div>
            )}
          </div>

          <ul className="space-y-3 mb-10">
            {features.map((f: string) => (
              <li key={f} className="flex items-start gap-2 text-sm leading-normal">
                <div className="shrink-0 mt-0.5">
                  <Check size={13} className="text-[#888888]" />
                </div>
                <span className="text-[#888888]">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <button 
          onClick={onCta}
          className={cn(
            "w-full py-2.5 rounded-lg text-sm transition-all active:scale-95 text-center mt-auto",
            isPro 
              ? "bg-[#C8FF00] text-[#080808] font-semibold hover:bg-[#b8ef00]" 
              : "border border-[#222222] text-[#EEEEEE] bg-transparent font-medium hover:border-[#333333]"
          )}
        >
          {cta}
        </button>
      </div>
    </div>
  );
}
