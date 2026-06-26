import React from 'react';
import { Shield, Save } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TemplatesTabProps {
  plan: string;
  templates: { polite: string; firm: string; final: string };
  setTemplates: React.Dispatch<React.SetStateAction<{ polite: string; firm: string; final: string }>>;
  handleSaveTemplates: (e: React.FormEvent) => void;
  saving: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
  setShowUpgradeModal: (b: boolean) => void;
}

export function TemplatesTab({
  plan,
  templates,
  setTemplates,
  handleSaveTemplates,
  saving,
  message,
  setShowUpgradeModal,
}: TemplatesTabProps) {
  return (
    <form onSubmit={handleSaveTemplates} className="space-y-6">
      <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 space-y-6 relative overflow-hidden">
        {plan === 'free' && (
          <div className="absolute inset-0 bg-[#080808]/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center">
            <Shield className="text-[#C8FF00] mb-3" size={32} />
            <h4 className="text-sm font-bold text-[#EEEEEE] uppercase tracking-wider mb-2">Professional feature</h4>
            <p className="text-xs text-[#888888] max-w-sm mb-4">Upgrade to Professional to modify templates or setup automated custom reminders.</p>
            <button 
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              className="px-4 py-2 bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] rounded-lg text-xs font-semibold transition-all font-mono cursor-pointer"
            >
              Upgrade Plan
            </button>
          </div>
        )}

        <div className={cn("space-y-4 text-left", plan === 'free' && "opacity-20 pointer-events-none select-none")}>
          <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2">Message Templates</h3>
          
          <div>
            <label className="block text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1.5 font-mono font-bold">Polite Reminder</label>
            <textarea 
              value={templates.polite}
              onChange={(e) => setTemplates(prev => ({ ...prev, polite: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2.5 bg-[#080808] border border-[#222222] rounded-lg text-[#EEEEEE] outline-none text-xs font-mono focus:border-[#444444]"
              placeholder="Defaults to standard friendly reminder code."
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1.5 font-mono font-bold">Firm Reminder</label>
            <textarea 
              value={templates.firm}
              onChange={(e) => setTemplates(prev => ({ ...prev, firm: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2.5 bg-[#080808] border border-[#222222] rounded-lg text-[#EEEEEE] outline-none text-xs font-mono focus:border-[#444444]"
              placeholder="Defaults to firm reminder asking code."
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1.5 font-mono font-bold">Final Notice</label>
            <textarea 
              value={templates.final}
              onChange={(e) => setTemplates(prev => ({ ...prev, final: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2.5 bg-[#080808] border border-[#222222] rounded-lg text-[#EEEEEE] outline-none text-xs font-mono focus:border-[#444444]"
              placeholder="Defaults to final collection notice code."
            />
          </div>
        </div>

        {/* Alert / messages */}
        {message && plan !== 'free' && (
          <div className={cn(
            "p-4 rounded-lg text-xs font-semibold",
            message.type === 'success' ? 'bg-[#10B98115] text-[#10B981] border border-[#10B98125]' : 'bg-[#EF444415] text-[#EF4444] border border-[#EF444425]'
          )}>
            {message.text}
          </div>
        )}

        {plan !== 'free' && (
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
                  <span>Save Templates</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
