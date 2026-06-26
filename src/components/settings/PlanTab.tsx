import React from 'react';
import { CreditCard, Check, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface PlanTabProps {
  currentPlan: string;
  isFreePlan: boolean;
  limits: any;
  setShowUpgradeModal: (b: boolean) => void;
}

export function PlanTab({
  currentPlan,
  isFreePlan,
  limits,
  setShowUpgradeModal,
}: PlanTabProps) {
  return (
    <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 space-y-6 text-left">
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2 flex items-center justify-between">
          Subscription details
          <CreditCard size={12} className="text-[#888888]" />
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Plan Card */}
          <div className="p-5 bg-[#161616] border border-[#222222] rounded-xl text-left relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1 font-mono">Current Plan</p>
              <h4 className="text-lg font-bold text-[#EEEEEE] uppercase tracking-wider font-mono">{currentPlan}</h4>
              
              <div className="space-y-2 mt-4 mb-4">
                <div className="flex items-center gap-2 text-[11px] text-[#888888]">
                  <Check size={12} className="text-[#C8FF00]" />
                  {isFreePlan ? 'Standard features' : 'Advanced Operations Suite'}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#888888]">
                  <Check size={12} className="text-[#C8FF00]" />
                  {isFreePlan ? 'Email Reminders' : 'Multi-Channel (Email, SMS & WhatsApp)'}
                </div>
              </div>

              {isFreePlan && (
                <button 
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="w-full py-2 bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] rounded-lg text-xs font-semibold transition-all mt-4 cursor-pointer"
                >
                  Upgrade Plan
                </button>
              )}
            </div>
          </div>

          {/* Usage Grid */}
          <div className="p-5 bg-[#161616] border border-[#222222] rounded-xl space-y-4 text-left">
            {[
              { label: 'Invoices monthly limit', key: 'invoices_month' as const },
              { label: 'Team Seats', key: 'team_seats' as const },
              { label: 'Active Reminders', key: 'automations_active' as const },
              { label: 'AI Operations', key: 'ai_generations' as const }
            ].map((item) => {
              const limitData = limits[item.key] || { current: 0, limit: 10, percentage: 0 };
              return (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#888888] font-mono">{item.label}</span>
                    <span className="font-bold text-[#EEEEEE] font-mono">
                      {limitData.current} / {limitData.limit === -1 ? '∞' : limitData.limit}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#080808] rounded-full overflow-hidden border border-[#222222]">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${limitData.percentage || 0}%` }}
                      className={cn(
                        "h-full rounded-full transition-all",
                        limitData.percentage > 90 ? "bg-[#EF4444]" : limitData.percentage > 70 ? "bg-[#F59E0B]" : "bg-[#C8FF00]"
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plan Comparison CTA */}
        <div className="p-5 bg-[#161616] rounded-xl border border-[#222222] border-dashed flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h5 className="text-xs font-semibold text-[#EEEEEE]">Need higher limits?</h5>
            <p className="text-[11px] text-[#888888] italic">Upgrade for unlimited invoices, team seats, and advanced automation.</p>
          </div>
          <Link 
            to="/pricing"
            className="px-4 py-2 bg-[#111111] text-[#EEEEEE] hover:text-[#C8FF00] border border-[#222222] rounded-lg text-xs font-semibold transition-all shrink-0 font-mono"
          >
            Compare Plans
          </Link>
        </div>
      </div>
    </div>
  );
}
