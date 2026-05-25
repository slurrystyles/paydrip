import React from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface RiskBadgeProps {
  level: 'low' | 'medium' | 'high' | 'critical' | 'minimal';
  className?: string;
  showIcon?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, className, showIcon = true }) => {
  const configs = {
    minimal: {
      color: 'bg-[#10B9810B] text-[#10B981] border-[#10B98125]',
      label: 'SAFE',
      icon: <CheckCircle2 size={10} />
    },
    low: {
      color: 'bg-[#3B82F60B] text-[#3B82F6] border-[#3B82F625]',
      label: 'LOW',
      icon: <ShieldAlert size={10} />
    },
    medium: {
      color: 'bg-[#F59E0B0B] text-[#F59E0B] border-[#F59E0B25]',
      label: 'MID',
      icon: <AlertCircle size={10} />
    },
    high: {
      color: 'bg-[#F973160B] text-[#F97316] border-[#F9731625]',
      label: 'HIGH',
      icon: <AlertTriangle size={10} />
    },
    critical: {
      color: 'bg-[#EF44440B] text-[#EF4444] border-[#EF444425] animate-pulse',
      label: 'CRITICAL',
      icon: <ShieldAlert size={10} />
    }
  };

  const config = configs[level] || configs.low;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border transition-all",
      config.color,
      className
    )}>
      {showIcon && config.icon}
      {config.label}
    </div>
  );
};
