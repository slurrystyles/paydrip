import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, Check, CheckCircle, Archive, Trash2, ExternalLink, Mail, Zap, FileText, User as UserIcon, CreditCard, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import { Notification } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<any>(null);
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!currentOrganization) return;
    
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch preferences first to filter
    const { data: profile } = await supabase.from('users').select('notification_preferences').eq('id', user.id).single();
    if (profile) setPreferences(profile.notification_preferences);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', currentOrganization.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
    } else {
      const prefs = profile?.notification_preferences || {};
      const filtered = (data || []).filter(n => {
          if (n.type === 'email_delivery' && prefs.email_delivery === false) return false;
          if (n.type === 'payments' && prefs.payments === false) return false;
          if (n.type === 'invoice_viewed' && prefs.invoice_viewed === false) return false;
          return true;
      });
      setNotifications(filtered);
      setUnreadCount(filtered.filter(n => !n.is_read).length);
    }
    setLoading(false);
  }, [currentOrganization]);

  useEffect(() => {
    fetchNotifications();

    // Set up real-time subscription
    let channel: any = null;

    const setupSubscription = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !currentOrganization) return;

        channel = supabase
            .channel(`notifications-${user.id}-${currentOrganization.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all events: INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newNotif = payload.new as Notification;
                        
                        // Client-side preference check for immediate impact
                        const currentPrefs = preferences || {};
                        if (newNotif.type === 'email_delivery' && currentPrefs.email_delivery === false) return;
                        if (newNotif.type === 'payments' && currentPrefs.payments === false) return;
                        if (newNotif.type === 'invoice_viewed' && currentPrefs.invoice_viewed === false) return;

                        if (newNotif.organization_id === currentOrganization.id) {
                            setNotifications(prev => [newNotif, ...prev]);
                            setUnreadCount(prev => prev + 1);
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedNotif = payload.new as Notification;
                        setNotifications(prev => prev.map(n => n.id === updatedNotif.id ? updatedNotif : n));
                        
                        // Re-calculate unread count or refresh
                        fetchNotifications();
                    } else if (payload.eventType === 'DELETE') {
                        const oldId = (payload.old as any).id;
                        setNotifications(prev => prev.filter(n => n.id !== oldId));
                        fetchNotifications(); // Refresh to get counts right
                    }
                }
            )
            .subscribe((status: any) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to Signal Center');
                }
            });
    };

    setupSubscription();

    return () => {
        if (channel) {
            supabase.removeChannel(channel);
        }
    };
  }, [currentOrganization, fetchNotifications]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    if (!currentOrganization || notifications.length === 0) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('organization_id', currentOrganization.id)
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      const deletedNotif = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (deletedNotif && !deletedNotif.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'email_sent': return <Mail size={14} className="text-blue-500" />;
      case 'invoice_sent': return <ExternalLink size={14} className="text-indigo-500" />;
      case 'invoice_viewed': return <Zap size={14} className="text-yellow-500" />;
      case 'payment_reported': return <CreditCard size={14} className="text-amber-500" />;
      case 'payment_confirmed': return <CheckCircle size={14} className="text-green-500" />;
      case 'payment_rejected': return <AlertTriangle size={14} className="text-red-500" />;
      case 'invoice_paid': return <CheckCircle size={14} className="text-green-600" />;
      case 'email_cap_reached': return <AlertTriangle size={14} className="text-orange-500" />;
      default: return <Bell size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 bg-white border rounded-lg transition-all shadow-sm relative group",
          isOpen ? "border-indigo-200 bg-indigo-50 text-indigo-600" : "border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100"
        )}
      >
        <Bell size={14} className={cn(unreadCount > 0 && "animate-wiggle")} />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border border-white px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="fixed inset-x-0 bottom-0 top-[56px] sm:absolute sm:inset-auto sm:top-full sm:right-0 sm:mt-4 sm:w-96 bg-white sm:rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] border-t sm:border border-slate-100 overflow-hidden z-50 flex flex-col max-h-screen sm:max-h-[600px]"
            >
              <div className="p-4 sm:p-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-20">
                <div className="flex flex-col">
                    <h3 className="text-sm font-black text-slate-900 tracking-tight">Signal Center</h3>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Real-time Operations Trail</p>
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button 
                            onClick={markAllAsRead}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all sm:p-1.5 sm:text-slate-400 sm:hover:text-indigo-600"
                            title="Mark all as read"
                        >
                            <span className="hidden sm:inline"><Check size={14} /></span>
                            <span className="sm:hidden text-[10px] font-black uppercase tracking-widest">Mark All Read</span>
                        </button>
                    )}
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all sm:p-1.5"
                    >
                        <X size={18} className="sm:w-[14px] sm:h-[14px]" />
                    </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {loading ? (
                    <div className="p-10 flex flex-col items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Syncing Node...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
                            <Bell size={20} />
                        </div>
                        <p className="text-xs font-black text-slate-900 mb-1">Clear Horizon</p>
                        <p className="text-[10px] text-slate-400 font-medium">No operational signals detected in this cycle.</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {notifications.map((notif) => (
                            <motion.div 
                                key={notif.id}
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={cn(
                                    "p-4 min-h-[64px] rounded-2xl transition-all group flex items-start gap-4 hover:bg-slate-50 relative",
                                    !notif.is_read && "bg-indigo-50/30 border border-indigo-50 shadow-sm"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border",
                                    !notif.is_read ? "bg-white border-indigo-100" : "bg-white border-slate-100 opacity-60"
                                )}>
                                    {getIcon(notif.type)}
                                </div>
                                
                                <div className="flex-1 min-w-0 pr-8">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className={cn(
                                            "text-[11px] sm:text-[10px] font-black tracking-tight truncate",
                                            !notif.is_read ? "text-slate-900" : "text-slate-500"
                                        )}>
                                            {notif.title}
                                        </h4>
                                        <span className="text-[8px] font-mono text-slate-300">
                                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className={cn(
                                        "text-[10px] leading-relaxed font-medium line-clamp-2",
                                        !notif.is_read ? "text-slate-600" : "text-slate-400"
                                    )}>
                                        {notif.body}
                                    </p>
                                </div>

                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    {!notif.is_read && (
                                        <button 
                                            onClick={() => markAsRead(notif.id)}
                                            className="p-2 sm:p-1.5 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-green-600 hover:border-green-100 shadow-sm"
                                            title="Mark as read"
                                        >
                                            <Check size={14} className="sm:w-3 sm:h-3" />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => deleteNotification(notif.id)}
                                        className="p-2 sm:p-1.5 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-red-600 hover:border-red-100 shadow-sm"
                                        title="Delete"
                                    >
                                        <Trash2 size={14} className="sm:w-3 sm:h-3" />
                                    </button>
                                </div>

                                {!notif.is_read && (
                                    <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-indigo-500 rounded-full group-hover:opacity-0 transition-all" />
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-4 sm:p-6 bg-slate-50/50 border-t border-slate-50 flex items-center justify-center sticky bottom-0 z-20">
                    <button 
                        onClick={() => {/* Navigate to full log if exists */}}
                        className="w-full sm:w-auto text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 bg-white sm:bg-transparent py-3 sm:py-0 border sm:border-0 border-slate-100 rounded-xl hover:text-indigo-600 transition-colors"
                    >
                        View Full Operational Trail
                    </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
