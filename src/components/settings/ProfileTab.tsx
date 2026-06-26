import React from 'react';
import { User, Building, CreditCard, Zap, Save } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ProfileTabProps {
  name: string;
  setName: (v: string) => void;
  businessName: string;
  setBusinessName: (v: string) => void;
  isAdmin: boolean;
  upiId: string;
  setUpiId: (v: string) => void;
  bankDetails: string;
  setBankDetails: (v: string) => void;
  handleSaveProfile: (e: React.FormEvent) => void;
  saving: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
  onTestAIConnection: () => void;
}

export function ProfileTab({
  name,
  setName,
  businessName,
  setBusinessName,
  isAdmin,
  upiId,
  setUpiId,
  bankDetails,
  setBankDetails,
  handleSaveProfile,
  saving,
  message,
  onTestAIConnection,
}: ProfileTabProps) {
  return (
    <form onSubmit={handleSaveProfile} className="space-y-6">
      <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 space-y-6">
        {/* Profile Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2">Account Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div>
              <label className="block text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1.5 font-mono">Your Name</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444444]" size={14} />
                <input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#080808] border border-[#222222] rounded-lg text-[#EEEEEE] outline-none text-sm focus:border-[#444444]"
                  placeholder="Operator Name"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1.5 font-mono">Business Name</label>
              <div className="relative group">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444444]" size={14} />
                <input 
                  value={businessName}
                  disabled={!isAdmin}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#080808] border border-[#222222] rounded-lg text-[#EEEEEE] outline-none text-sm focus:border-[#444444]"
                  placeholder="Acme Inc."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Settings Section */}
        <div className="space-y-4 pt-2 border-[#222222] border-t">
          <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2">Payment Settings</h3>
          
          <div className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1.5 font-mono">UPI ID</label>
              <div className="relative group">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444444]" size={14} />
                <input 
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#080808] border border-[#222222] rounded-lg text-[#EEEEEE] outline-none font-mono text-xs font-semibold focus:border-[#444444]"
                  placeholder="username@bank"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1.5 font-mono">Bank Details</label>
              <textarea 
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 bg-[#080808] border border-[#222222] rounded-lg text-[#EEEEEE] outline-none text-xs font-mono focus:border-[#444444]"
                placeholder="Account No / IFSC / Bank details to show on invoice copy"
              />
            </div>
          </div>
        </div>

        {/* AI Section */}
        <div className="space-y-4 pt-2 border-[#222222] border-t text-left">
          <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2 flex items-center justify-between">
            AI
            <Zap size={12} className="text-[#C8FF00]" />
          </h3>
          
          <div className="p-4 bg-[#161616] border border-[#222222] rounded-xl flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase text-[#888888] tracking-wider leading-none mb-1 font-mono">AI Model</p>
              <p className="text-xs font-semibold text-[#EEEEEE]">Gemini 2.0 Flash</p>
            </div>
            <button 
              type="button"
              onClick={onTestAIConnection}
              className="px-3 py-1.5 bg-[#111111] hover:bg-[#080808] border border-[#222222] text-[#EEEEEE] rounded-lg text-xs font-medium transition-all cursor-pointer"
            >
              Test Connection
            </button>
          </div>
        </div>

        {/* Local messages display */}
        {message && (
          <div className={cn(
            "p-4 rounded-lg text-xs font-semibold",
            message.type === 'success' ? 'bg-[#10B98115] text-[#10B981] border border-[#10B98125]' : 'bg-[#EF444415] text-[#EF4444] border border-[#EF444425]'
          )}>
            {message.text}
          </div>
        )}

        {/* Submit */}
        <div className="pt-2">
          <button 
            disabled={saving}
            type="submit"
            className={cn(
              "w-full py-3 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer",
              saving ? "bg-[#161616] border border-[#222222] text-[#444444] cursor-not-allowed" : "bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808]"
            )}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-[#444444] border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Save size={16} />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
