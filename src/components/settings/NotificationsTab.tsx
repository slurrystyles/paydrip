import React from 'react';
import { Mail, CreditCard, Zap, Shield } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NotificationsTabProps {
  notificationPreferences: {
    email_delivery: boolean;
    payments: boolean;
    invoice_viewed: boolean;
  };
  onChangePreference: (key: string, value: boolean) => void;
  smsEnabled: boolean;
  onSmsToggle: (value: boolean) => void;
}

export function NotificationsTab({
  notificationPreferences,
  onChangePreference,
  smsEnabled,
  onSmsToggle,
}: NotificationsTabProps) {
  return (
    <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 space-y-6 text-left">
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2">Notifications</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-[#161616] border border-[#222222] rounded-xl text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#080808] border border-[#222222] rounded-lg flex items-center justify-center text-[#3B82F6]">
                <Mail size={13} />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#EEEEEE] leading-none mb-1">Email Delivery Alerts</p>
                <p className="text-[10px] text-[#888888]">Get alerted on failed, blocked, or bounced letters.</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => onChangePreference('email_delivery', !notificationPreferences.email_delivery)}
              className={cn(
                "w-9 h-5 rounded-full transition-all relative border border-[#222222] cursor-pointer",
                notificationPreferences.email_delivery ? "bg-[#C8FF00]" : "bg-[#111111]"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all",
                notificationPreferences.email_delivery ? "left-4.5 bg-[#080808]" : "left-0.5 bg-[#888888]"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#161616] border border-[#222222] rounded-xl text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#080808] border border-[#222222] rounded-lg flex items-center justify-center text-[#F59E0B]">
                <CreditCard size={13} />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#EEEEEE] leading-none mb-1">Payment Notifications</p>
                <p className="text-[10px] text-[#888888]">Get notified when clients report paid settle requests.</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => onChangePreference('payments', !notificationPreferences.payments)}
              className={cn(
                "w-9 h-5 rounded-full transition-all relative border border-[#222222] cursor-pointer",
                notificationPreferences.payments ? "bg-[#C8FF00]" : "bg-[#111111]"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all",
                notificationPreferences.payments ? "left-4.5 bg-[#080808]" : "left-0.5 bg-[#888888]"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#161616] border border-[#222222] rounded-xl text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#080808] border border-[#222222] rounded-lg flex items-center justify-center text-[#C8FF00]">
                <Zap size={13} />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#EEEEEE] leading-none mb-1">Invoice Viewed Alerts</p>
                <p className="text-[10px] text-[#888888]">Instant alerts when a late client views the invoice URL.</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => onChangePreference('invoice_viewed', !notificationPreferences.invoice_viewed)}
              className={cn(
                "w-9 h-5 rounded-full transition-all relative border border-[#222222] cursor-pointer",
                notificationPreferences.invoice_viewed ? "bg-[#C8FF00]" : "bg-[#111111]"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all",
                notificationPreferences.invoice_viewed ? "left-4.5 bg-[#080808]" : "left-0.5 bg-[#888888]"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#161616] border border-[#222222] rounded-xl text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#080808] border border-[#222222] rounded-lg flex items-center justify-center text-[#EEEEEE]">
                <Shield size={13} />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#EEEEEE] leading-none mb-1">SMS Notifications</p>
                <p className="text-[10px] text-[#888888]">Enable automated texts for escalations.</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => onSmsToggle(!smsEnabled)}
              className={cn(
                "w-9 h-5 rounded-full transition-all relative border border-[#222222] cursor-pointer",
                smsEnabled ? "bg-[#C8FF00]" : "bg-[#111111]"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all",
                smsEnabled ? "left-4.5 bg-[#080808]" : "left-0.5 bg-[#888888]"
              )} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
