import React, { useState } from 'react';
import { 
  Shield, 
  Clock, 
  Smartphone, 
  Zap, 
  CheckCircle, 
  ArrowRight,
  Plus,
  ArrowUpRight,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'motion/react';
import AuthView from './AuthView';

export default function LandingPage({ user }: { user: User | null }) {
  const [showAuth, setShowAuth] = useState(false);

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
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-indigo-100 italic"
            >
              P
            </motion.div>
            <span className="text-xl font-black tracking-tighter text-slate-900">Paydrip</span>
          </div>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <a href="#features" className="hover:text-indigo-600 transition-colors">Utility</a>
              <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
            </div>
            {user ? (
              <a 
                href="/dashboard"
                className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-xl shadow-slate-100 flex items-center gap-2"
              >
                Go to Dashboard
                <ArrowUpRight size={14} />
              </a>
            ) : (
              <button 
                onClick={() => setShowAuth(true)}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-100"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section */}
        <section className="pt-32 pb-24 px-6 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-gradient-to-b from-indigo-50/50 to-transparent -z-10 rounded-full blur-3xl opacity-50" />
          
          <div className="max-w-7xl mx-auto text-center">
            <motion.div variants={itemVariants} className="inline-flex items-center gap-3 px-4 py-2 bg-indigo-50/50 border border-indigo-100 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-8 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
              India-First Payment Recovery
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-6xl md:text-8xl font-black tracking-[ -0.04em] text-slate-900 leading-[0.95] mb-10">
              Get paid <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-indigo-400">faster</span>.<br /> No friction.
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
              The lightweight SaaS layer for Indian freelancers. Automate WhatsApp reminders and collect via UPI. 0% fees, 100% recovery.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button 
                onClick={() => setShowAuth(true)}
                className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-2xl text-lg font-black tracking-tight hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200/50 flex items-center justify-center gap-3 group active:scale-95"
              >
                Start Recovering Now
                <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="flex flex-col items-center sm:items-start text-xs font-bold text-slate-400 uppercase tracking-widest space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  Free 3 Invoices/mo
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  UPI Integrated
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section id="features" className="py-32 px-6 bg-slate-900 text-white clip-path-slant overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
              <FeatureCard 
                icon={<Smartphone size={24} />}
                title="WhatsApp Deep-Links"
                description="One-tap pre-filled messages sent directly from your own phone. High conversion, low awkwardness."
              />
              <FeatureCard 
                icon={<Shield size={24} />}
                title="Instant UPI Settlement"
                description="Embed standard UPI QR codes. Funds settle instantly in your bank account. No middleman."
              />
              <FeatureCard 
                icon={<Zap size={24} />}
                title="Ledger Snapshot"
                description="Create immutable records. Even if a client is removed, the invoice data stays exactly as it was issued."
              />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <motion.h2 
                variants={itemVariants}
                className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6"
              >
                Pricing Built for Scale
              </motion.h2>
              <motion.p variants={itemVariants} className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                Pure SaaS model. No percentage cuts.
              </motion.p>
            </div>

            <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
              <PricingCard 
                name="Solo Hack"
                price="0"
                features={[
                  "3 Invoices / Month",
                  "WhatsApp Templates",
                  "UPI QR Generation",
                  "Public Payment Page"
                ]}
                cta="Start Free"
                onCta={() => setShowAuth(true)}
              />
              <PricingCard 
                name="Pro Hustle"
                price="199"
                isPro
                features={[
                  "Unlimited Invoices",
                  "Custom Branding",
                  "Advanced Analytics",
                  "Priority Reminders",
                  "Client Management"
                ]}
                cta="Go Pro"
                onCta={() => setShowAuth(true)}
              />
            </div>
          </div>
        </section>
      </motion.main>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-indigo-100">
              P
            </div>
            <span className="text-lg font-black tracking-tight">Paydrip</span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
            © 2024 Paydrip India. Empowering the Creative Economy.
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
              className="relative z-10 w-full max-w-md"
            >
              <div className="absolute top-6 right-6 z-20">
                <button onClick={() => setShowAuth(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                  <Plus className="rotate-45" size={20} />
                </button>
              </div>
              <AuthView onClose={() => setShowAuth(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      whileHover={{ y: -10 }}
      className="p-10 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all"
    >
      <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg shadow-indigo-500/20">
        {icon}
      </div>
      <h3 className="text-xl font-black mb-4 uppercase tracking-tight">{title}</h3>
      <p className="text-slate-400 leading-relaxed font-medium text-sm">{description}</p>
    </motion.div>
  );
}

function PricingCard({ name, price, features, cta, onCta, isPro }: any) {
  return (
    <div className={cn(
      "p-12 rounded-[2.5rem] flex flex-col justify-between transition-all group",
      isPro ? "bg-indigo-600 text-white shadow-2xl shadow-indigo-100" : "bg-slate-50 border border-slate-200"
    )}>
      <div>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-2 opacity-50">{name}</h3>
            <div className="text-5xl font-black tracking-tighter flex items-end">
              ₹{price} <span className="text-lg opacity-40 mb-1 ml-1">/mo</span>
            </div>
          </div>
          {isPro && (
            <div className="bg-white/20 p-2 rounded-xl">
              <Zap size={20} className="fill-white" />
            </div>
          )}
        </div>
        <ul className="space-y-4 mb-12">
          {features.map((f: string) => (
            <li key={f} className="flex items-center gap-3 text-sm font-bold">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center",
                isPro ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600"
              )}>
                <Check size={12} />
              </div>
              {f}
            </li>
          ))}
        </ul>
      </div>
      <button 
        onClick={onCta}
        className={cn(
          "w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl",
          isPro ? "bg-white text-indigo-600 hover:bg-slate-50" : "bg-slate-900 text-white hover:bg-slate-800"
        )}
      >
        {cta}
      </button>
    </div>
  );
}
