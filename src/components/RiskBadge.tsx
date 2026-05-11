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
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      label: 'SAFE',
      icon: <CheckCircle2 size={10} />
    },
    low: {
      color: 'bg-blue-50 text-blue-600 border-blue-100',
      label: 'LOW',
      icon: <ShieldAlert size={10} />
    },
    medium: {
      color: 'bg-amber-50 text-amber-600 border-amber-100',
      label: 'MID',
      icon: <AlertCircle size={10} />
    },
    high: {
      color: 'bg-orange-50 text-orange-600 border-orange-100',
      label: 'HIGH',
      icon: <AlertTriangle size={10} />
    },
    critical: {
      color: 'bg-red-50 text-red-600 border-red-100 animate-pulse',
      label: 'CRITICAL',
      icon: <ShieldAlert size={10} />
    }
  };

  const config = configs[level] || configs.low;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-sm transition-all",
      config.color,
      className
    )}>
      {showIcon && config.icon}
      {config.label}
    </div>
  );
};
