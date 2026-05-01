import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { Save, User, Building, CreditCard, Shield, Zap, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePlan } from '../contexts/PlanContext';
import UpgradeModal from './UpgradeModal';

export default function SettingsView() {
  const { plan, profile, refreshPlanData } = usePlan();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setBusinessName(profile.business_name || '');
      setUpiId(profile.upi_id || '');
      setBankDetails(profile.bank_details || '');
      setLogoUrl(profile.logo_url || '');
      setLoading(false);
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        name,
        business_name: businessName,
        upi_id: upiId,
        bank_details: bankDetails,
        logo_url: logoUrl,
      });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      await refreshPlanData();
    }
    setSaving(false);
  }

  if (loading) return <div className="animate-pulse space-y-4 shadow rounded p-8 bg-white h-96"></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-slate-900 text-white rounded-2xl">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
            <p className="text-gray-500 text-sm">Manage your business profile and payment details.</p>
          </div>
        </div>
        
        <div className={cn(
          "px-4 py-2 rounded-xl border flex items-center gap-3 transition-all",
          plan === 'free' ? "bg-slate-50 border-slate-100" : "bg-indigo-50 border-indigo-100"
        )}>
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">Current Node Tier</p>
            <p className="text-xs font-black uppercase text-slate-900 italic tracking-widest">{plan}</p>
          </div>
          {plan === 'free' && (
            <button 
              onClick={() => setShowUpgradeModal(true)}
              className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-slate-900 transition-all shadow-lg"
            >
              <Zap size={12} className="fill-white" />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 pb-20">
        <div className="card p-8 space-y-8">
          {/* Custom Branding (Gated) */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono border-b border-gray-100 pb-2 flex items-center justify-between">
              Custom Branding
              {plan === 'free' && (
                <span className="flex items-center gap-1 text-[8px] text-indigo-500 font-black tracking-widest">
                  <Shield size={10} /> PRO FEATURE
                </span>
              )}
            </h3>

            <div className={cn("space-y-4 transition-all", plan === 'free' && "opacity-40 grayscale pointer-events-none")}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Business Logo URL</label>
                <div className="relative group">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
                  <input 
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-600 outline-none transition-all text-xs font-mono"
                    placeholder="https://your-server.com/logo.png"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">Shown on public invoice pages and PDFs.</p>
              </div>
            </div>
            
            {plan === 'free' && (
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 flex items-center justify-between">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-loose">Upgrade to unlock custom logos and remove branding.</p>
                <button 
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-[10px] font-black text-indigo-600 hover:text-slate-900 flex items-center gap-1 uppercase tracking-widest"
                >
                  Learn More <ExternalLink size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Profile Section */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono border-b border-gray-100 pb-2">Business Identity</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-black outline-none transition-all"
                    placeholder="Your Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-black outline-none transition-all"
                    placeholder="Acme Solutions"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="space-y-6 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono border-b border-gray-100 pb-2">Payment Details (India-First)</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">UPI ID (VPA)</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-black outline-none transition-all font-mono text-sm"
                    placeholder="user@upi or mobile@bank"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 uppercase font-mono">Used to generate instant payment QR codes on invoices.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Bank Account Details (Optional)</label>
                <textarea 
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-black outline-none transition-all text-sm"
                  placeholder="A/C Number, IFSC Code, Bank Name"
                />
              </div>
            </div>
          </div>

          {message && (
            <div className={cn(
              "p-4 rounded-xl text-sm font-medium",
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
            )}>
              {message.text}
            </div>
          )}

          <div className="pt-4">
            <button 
              disabled={saving}
              type="submit"
              className="w-full bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-900 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save size={18} />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
