import React from 'react';
import { Shield, Upload, Loader2, Image as ImageIcon, Building } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BrandingTabProps {
  plan: string;
  logoUrl: string;
  setLogoUrl: (v: string) => void;
  uploading: boolean;
  saving: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveBranding: () => void;
  setShowUpgradeModal: (b: boolean) => void;
}

export function BrandingTab({
  plan,
  logoUrl,
  setLogoUrl,
  uploading,
  saving,
  message,
  handleLogoUpload,
  handleSaveBranding,
  setShowUpgradeModal,
}: BrandingTabProps) {
  return (
    <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 space-y-6 relative overflow-hidden">
      {plan === 'free' && (
        <div className="absolute inset-0 bg-[#080808]/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center">
          <Shield className="text-[#C8FF00] mb-3" size={32} />
          <h4 className="text-sm font-bold text-[#EEEEEE] uppercase tracking-wider mb-2">Professional feature</h4>
          <p className="text-xs text-[#888888] max-w-sm mb-4">Upgrade to Professional to unlock custom logo uploading and organizational branding details.</p>
          <button 
            type="button"
            onClick={() => setShowUpgradeModal(true)}
            className="px-4 py-2 bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] rounded-lg text-xs font-semibold transition-all font-mono cursor-pointer"
          >
            Upgrade Plan
          </button>
        </div>
      )}

      <div className={cn("space-y-6 text-left", plan === 'free' && "opacity-20 pointer-events-none select-none")}>
        <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2">Custom Branding</h3>
        
        <div>
          <label className="block text-xs font-semibold text-[#888888] mb-2 font-mono">Business Logo</label>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-[#161616] border border-[#222222] rounded-xl">
            <div className="relative group shrink-0">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="w-16 h-16 rounded-xl object-cover border border-[#222222]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#080808] flex items-center justify-center text-[#444444] border border-dashed border-[#222222]">
                  <ImageIcon size={20} />
                </div>
              )}
              
              {uploading && (
                <div className="absolute inset-0 bg-[#080808]/80 rounded-xl flex items-center justify-center">
                  <Loader2 className="animate-spin text-[#C8FF00]" size={16} />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2 w-full text-left">
              <div className="flex flex-wrap gap-2">
                <label className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 bg-[#111111] border border-[#222222] hover:border-[#444444] text-[#EEEEEE] rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50",
                  uploading && "opacity-50 cursor-not-allowed"
                )}>
                  <Upload size={13} />
                  {uploading ? 'Processing...' : 'Upload Logo'}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoUpload} 
                    className="hidden" 
                    disabled={uploading}
                  />
                </label>
                {logoUrl && (
                  <button 
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="px-3 py-1.5 bg-[#161616] border border-[#222222] text-[#888888] hover:text-[#EF4444] rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[10px] text-[#444444] font-mono">WebP preferred. Compressed under 200KB limit.</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#888888] mb-2 font-mono">Logo Image URL</label>
          <div className="relative group mb-3">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444444]" size={14} />
            <input 
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#080808] border border-[#222222] rounded-lg text-[#EEEEEE] outline-none text-xs font-mono focus:border-[#444444]"
              placeholder="https://your-domain.com/logo.png"
            />
          </div>
          
          {/* Messages */}
          {message && (
            <div className={cn(
              "p-4 rounded-lg text-xs font-semibold mb-3",
              message.type === 'success' ? 'bg-[#10B98115] text-[#10B981] border border-[#10B98125]' : 'bg-[#EF444415] text-[#EF4444] border border-[#EF444425]'
            )}>
              {message.text}
            </div>
          )}

          <button 
            type="button"
            onClick={handleSaveBranding}
            disabled={saving}
            className="px-4 py-2 bg-[#111111] hover:bg-[#161616] text-[#C8FF00] border border-[#222222] rounded-lg text-xs font-semibold transition-all font-mono cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Logo URL'}
          </button>
        </div>
      </div>
    </div>
  );
}
