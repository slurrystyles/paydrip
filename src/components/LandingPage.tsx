import React, { useState } from 'react';
import { 
  Shield, 
  Clock, 
  Smartphone, 
  Zap, 
  CheckCircle, 
  ArrowRight,
  Lock,
  ZapOff,
  Users,
  Check
} from 'lucide-react';
import AuthView from './AuthView';
import { cn } from '../lib/utils';

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);

  if (showAuth) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-100 italic">
              P
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Paydrip</span>
          </div>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-500">
              <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
              <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
            </div>
            <button 
              onClick={() => setShowAuth(true)}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 animate-fade-in">
            <Zap size={12} className="fill-indigo-700" />
            Beta Access: 3 Free Invoices Monthly
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-slate-900 leading-[1.1] mb-8">
            Get paid <span className="text-indigo-600">faster</span>.<br className="hidden md:block" /> Without the awkwardness.
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            The India-first payment recovery tool for freelancers. Track invoices, send polite WhatsApp reminders, and collect 100% via UPI in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => setShowAuth(true)}
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl text-lg font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 group active:scale-95"
            >
              Start Free Trial
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle size={14} className="text-green-500" />
              No Credit Card Required
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 bento-card p-10 bg-indigo-900 border-none text-white overflow-hidden relative group">
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                  <Smartphone size={24} />
                </div>
                <h3 className="text-3xl font-bold mb-4">WhatsApp Recovery Engine</h3>
                <p className="text-indigo-100 text-lg max-w-md">
                  Send polite, firm, or final notices with one tap. No more copying links or crafting awkward messages.
                </p>
              </div>
              <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Smartphone size={400} />
              </div>
            </div>

            <div className="col-span-12 md:col-span-6 lg:col-span-4 bento-card p-10 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-6">
                  <Shield size={24} />
                </div>
                <h3 className="text-xl font-bold mb-2">Instant UPI Settlement</h3>
                <p className="text-slate-500 text-sm">
                  Embed QR codes directly in your invoices. Clients scan and pay. No transaction fees, ever.
                </p>
              </div>
            </div>

            <div className="col-span-12 md:col-span-6 lg:col-span-4 bento-card p-10 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-6">
                  <Clock size={24} />
                </div>
                <h3 className="text-xl font-bold mb-2">Smart Reminders</h3>
                <p className="text-slate-500 text-sm">
                  Auto-flag overdue invoices. Know exactly who owes you and how many days it's been.
                </p>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8 bento-card p-10 flex flex-col lg:flex-row items-center gap-10">
              <div className="flex-1">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 mb-6 font-mono text-xl font-bold italic">
                  P
                </div>
                <h3 className="text-2xl font-bold mb-4">India-First PDF Engine</h3>
                <p className="text-slate-500">
                  Generate professional, GST-ready (optional) invoices that look stunning on desktop and mobile. 
                </p>
              </div>
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-inner">
                <div className="space-y-3">
                  <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-20 w-full bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-mono uppercase tracking-widest font-bold">
                    Invoice Preview
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Simple, Transparent Pricing</h2>
          <p className="text-slate-400">Whatever your scale, we keep your payments flowing.</p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-10 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Free Forever</h3>
              <p className="text-slate-500 text-sm mb-6 uppercase tracking-widest font-mono">For Solo Hustlers</p>
              <div className="text-4xl font-bold mb-8">₹0 <span className="text-lg font-normal text-slate-500">/mo</span></div>
              <ul className="space-y-4 mb-10">
                <PricingItem text="3 Invoices / Month" />
                <PricingItem text="UPI QR Integration" />
                <PricingItem text="WhatsApp Templates" />
                <PricingItem text="Basic Dashboard" />
              </ul>
            </div>
            <button 
              onClick={() => setShowAuth(true)}
              className="w-full py-4 border border-white/20 rounded-2xl font-bold hover:bg-white/10 transition-all"
            >
              Get Started
            </button>
          </div>

          <div className="bg-indigo-600 rounded-3xl p-10 flex flex-col justify-between shadow-2xl shadow-indigo-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Popular</span>
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">Pro Plan</h3>
              <p className="text-indigo-200 text-sm mb-6 uppercase tracking-widest font-mono">For Full-Time Pros</p>
              <div className="text-4xl font-bold mb-8">₹199 <span className="text-lg font-normal text-indigo-200">/mo</span></div>
              <ul className="space-y-4 mb-10">
                <PricingItem text="Unlimited Invoices" />
                <PricingItem text="Custom Branding" />
                <PricingItem text="Auto-Email Reminders" />
                <PricingItem text="Advanced Analytics" />
                <PricingItem text="Priority Support" />
              </ul>
            </div>
            <button 
              onClick={() => setShowAuth(true)}
              className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-xl active:scale-95"
            >
              Go Unlimited
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg italic">
              P
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">Paydrip</span>
          </div>
          <div className="flex items-center gap-8 text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
            <span>© 2024 Paydrip India</span>
            <a href="#" className="hover:text-indigo-600">Privacy</a>
            <a href="#" className="hover:text-indigo-600">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PricingItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
        <Check size={14} />
      </div>
      <span className="text-sm font-medium">{text}</span>
    </li>
  );
}
