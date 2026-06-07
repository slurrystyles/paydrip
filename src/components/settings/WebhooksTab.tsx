import React from 'react';
import { Shield, Globe, Key, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface WebhooksTabProps {
  plan: string;
  webhooks: any[];
  setShowUpgradeModal: (b: boolean) => void;
}

export function WebhooksTab({
  plan,
  webhooks,
  setShowUpgradeModal,
}: WebhooksTabProps) {
  return (
    <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 space-y-6 relative overflow-hidden">
      {plan !== 'enterprise' && (
        <div className="absolute inset-0 bg-[#080808]/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center">
          <Shield className="text-[#C8FF00] mb-3" size={32} />
          <h4 className="text-sm font-bold text-[#EEEEEE] uppercase tracking-wider mb-2">Enterprise Feature</h4>
          <p className="text-xs text-[#888888] max-w-sm mb-4">Upgrade to Enterprise to setup outbound webhooks, secure developer endpoints, and integrations.</p>
          <button 
            type="button"
            onClick={() => setShowUpgradeModal(true)}
            className="px-4 py-2 bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] rounded-lg text-xs font-semibold transition-all font-mono cursor-pointer"
          >
            Upgrade Plan
          </button>
        </div>
      )}

      <div className={cn("space-y-4 text-left", plan !== 'enterprise' && "opacity-20 pointer-events-none select-none")}>
        <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2 flex items-center justify-between">
          Webhooks & Integrations
        </h3>

        <div className="p-4 bg-[#161616] border border-[#222222] rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider leading-none flex items-center gap-1.5 text-[#EEEEEE] font-mono">
                <Globe size={13} className="text-[#3B82F6]" /> Webhook Endpoints
              </h4>
              <p className="text-[10px] text-[#888888] mt-1 font-mono uppercase">Triggers: invoice.payment_reported, reminder.sent</p>
            </div>
            <button type="button" className="text-xs font-semibold text-[#C8FF00] hover:underline self-start sm:self-auto uppercase font-mono cursor-pointer">Add Endpoint</button>
          </div>
          {webhooks.length > 0 ? (
            <div className="space-y-2">
              {webhooks.map((w, i) => (
                <div key={i} className="p-2.5 bg-[#080808] border border-[#222222] rounded-xl flex items-center justify-between gap-3">
                  <span className="text-[10px] font-mono text-[#888888] truncate flex-1">{w.url}</span>
                  <span className="text-[8px] font-semibold px-2 py-0.5 rounded-full bg-[#10B98115] text-[#10B981] border border-[#10B98125] shrink-0">ACTIVE</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-[#444444] font-mono italic">No webhooks registered.</p>
          )}
        </div>

        <div className="p-4 bg-[#161616] border border-[#222222] rounded-xl flex items-center gap-4">
          <div className="w-8 h-8 bg-[#080808] border border-[#222222] rounded-lg flex items-center justify-center text-[#888888]">
            <Key size={14} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold text-[#EEEEEE]">Webhook Signing Secret</p>
            <p className="text-[10px] font-mono text-[#444444] mt-0.5">********************************</p>
          </div>
          <button type="button" className="p-1.5 transition-all bg-[#080808] border border-[#222222] hover:border-[#444444] text-[#888888] rounded-lg cursor-pointer">
            <RefreshCw size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
