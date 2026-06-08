import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Globe, Key, RefreshCw, Trash2, 
  Plus, X, Check, Shield
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface WebhooksTabProps {
  plan: string;
  webhooks: any[];
  setShowUpgradeModal: (b: boolean) => void;
  organizationId: string | null;
  onRefresh: () => void;
}

const AVAILABLE_EVENTS = [
  'invoice.created',
  'invoice.sent',
  'invoice.paid',
  'invoice.overdue',
  'payment.verified',
  'sequence.started',
  'sequence.completed',
  'client.created'
];

export function WebhooksTab({
  plan,
  webhooks,
  setShowUpgradeModal,
  organizationId,
  onRefresh
}: WebhooksTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Helper safe UUID generator for fallback
  const generateUuid = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'whsec_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  async function handleAddEndpoint() {
    if (!newUrl || newEvents.length === 0 || !organizationId) return;
    
    // Validate URL
    try { 
      new URL(newUrl); 
    } catch { 
      setError('Invalid URL'); 
      return; 
    }

    setSaving(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from('webhook_endpoints')
        .insert({
          organization_id: organizationId,
          created_by: session?.user?.id || null,
          url: newUrl,
          events: newEvents,
          is_active: true,
          secret_hash: generateUuid()
        });
      
      if (error) throw error;
      
      setNewUrl('');
      setNewEvents([]);
      setShowAddForm(false);
      setSuccessMsg('Webhook endpoint added.');
      setTimeout(() => setSuccessMsg(null), 3000);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    const { error } = await supabase
      .from('webhook_endpoints')
      .update({ is_active: !current })
      .eq('id', id);
    
    if (error) {
      setError(error.message);
    } else {
      onRefresh();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this webhook endpoint?')) return;
    
    const { error } = await supabase
      .from('webhook_endpoints')
      .delete()
      .eq('id', id);
    
    if (error) {
      setError(error.message);
    } else {
      if (selectedEndpoint === id) {
        setSelectedEndpoint(null);
        setLogs([]);
      }
      onRefresh();
    }
  }

  async function loadLogs(endpointId: string) {
    setSelectedEndpoint(endpointId);
    setLoadingLogs(true);
    
    const { data, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('endpoint_id', endpointId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (!error && data) {
      setLogs(data);
    }
    setLoadingLogs(false);
  }

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString() + ' ' + d.toLocaleDateString();
    } catch (e) {
      return dateStr;
    }
  };

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

      <div className={cn("space-y-6 text-left", plan !== 'enterprise' && "opacity-20 pointer-events-none select-none")}>
        
        {/* Section Header Row */}
        <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
          <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono">
            Webhook Endpoints
          </h3>
          <button 
            type="button"
            onClick={() => setShowAddForm(true)}
            className="text-xs text-[#C8FF00] font-semibold hover:underline bg-transparent border-none outline-none cursor-pointer"
          >
            Add Endpoint
          </button>
        </div>

        {/* Success/Error Alerts */}
        {successMsg && (
          <div className="text-xs text-[#10B981] font-semibold font-mono">
            {successMsg}
          </div>
        )}
        {error && (
          <div className="text-xs text-[#EF4444] font-semibold font-mono">
            {error}
          </div>
        )}

        {/* Add Endpoint Form */}
        {showAddForm && (
          <div className="bg-[#161616] border border-[#222222] rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-2 font-mono">
                Endpoint URL
              </label>
              <input 
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="w-full px-4 py-2 bg-[#080808] border border-[#222222] rounded-lg text-[#EEEEEE] outline-none text-sm focus:border-[#444444] font-mono"
                placeholder="https://your-server.com/webhook"
              />
            </div>

            {/* Events selection with checkboxes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-semibold text-[#888888] uppercase tracking-wider font-mono">
                  Events to subscribe
                </label>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setNewEvents(AVAILABLE_EVENTS)}
                    className="text-[#C8FF00] hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-[#222222]">|</span>
                  <button
                    type="button"
                    onClick={() => setNewEvents([])}
                    className="text-[#888888] hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_EVENTS.map(event => {
                  const isChecked = newEvents.includes(event);
                  return (
                    <button
                      key={event}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setNewEvents(newEvents.filter(e => e !== event));
                        } else {
                          setNewEvents([...newEvents, event]);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs font-mono transition-all cursor-pointer",
                        isChecked 
                          ? "border-[#C8FF00] text-[#C8FF00] bg-[#C8FF00]/5" 
                          : "bg-[#080808] border-[#222222] text-[#888888]"
                      )}
                    >
                      <div className={cn(
                        "w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0",
                        isChecked ? "border-[#C8FF00] bg-[#C8FF00]/10 text-[#C8FF00]" : "border-[#222222] bg-[#111111]"
                      )}>
                        {isChecked && <Check size={10} strokeWidth={3} />}
                      </div>
                      <span className="truncate">{event}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewUrl('');
                  setNewEvents([]);
                  setError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-[#888888] hover:text-[#EEEEEE] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !newUrl || newEvents.length === 0}
                onClick={handleAddEndpoint}
                className="px-4 py-2 bg-[#C8FF00] hover:bg-[#b8ef00] disabled:opacity-50 disabled:hover:bg-[#C8FF00] text-[#080808] rounded-lg text-xs font-semibold transition-all font-mono cursor-pointer"
              >
                {saving ? 'Saving...' : 'Add Endpoint'}
              </button>
            </div>
          </div>
        )}

        {/* Webhooks list */}
        <div className="space-y-4">
          {webhooks.length > 0 ? (
            webhooks.map((w) => (
              <div key={w.id} className="space-y-2">
                <div className="bg-[#161616] border border-[#222222] rounded-xl p-4">
                  {/* Row 1: URL + toggle + delete */}
                  <div className="flex items-center justify-between gap-4">
                    <span 
                      className="text-xs font-mono text-[#EEEEEE] truncate flex-1" 
                      title={w.url}
                    >
                      {w.url}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggle(w.id, w.is_active)}
                        className={cn(
                          "px-2.5 py-1 rounded text-[10px] font-mono font-semibold cursor-pointer transition-all",
                          w.is_active 
                            ? "bg-[#C8FF00]/20 text-[#C8FF00]" 
                            : "bg-[#222222] text-[#888888]"
                        )}
                      >
                        {w.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(w.id)}
                        className="text-[#888888] hover:text-[#EF4444] transition-all cursor-pointer p-0.5"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Events pills */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5 mb-3">
                    {w.events && w.events.map((evt: string) => (
                      <span 
                        key={evt} 
                        className="bg-[#111111] border border-[#222222] text-[#888888] text-[9px] px-2 py-0.5 rounded font-mono"
                      >
                        {evt}
                      </span>
                    ))}
                  </div>

                  {/* Row 3: View logs / Hide logs toggle */}
                  <div className="flex items-center justify-between border-t border-[#222222]/50 pt-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedEndpoint === w.id) {
                          setSelectedEndpoint(null);
                          setLogs([]);
                        } else {
                          loadLogs(w.id);
                        }
                      }}
                      className="text-xs text-[#888888] hover:text-[#C8FF00] transition-all cursor-pointer font-bold font-mono tracking-wider"
                    >
                      {selectedEndpoint === w.id ? 'HIDE LOGS' : 'VIEW LOGS'}
                    </button>
                  </div>
                </div>

                {/* Logs panel shown below selected endpoint */}
                {selectedEndpoint === w.id && (
                  <div className="bg-[#080808] border border-[#222222] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#222222] pb-2">
                      <span className="text-[10px] font-mono font-semibold text-[#888888] uppercase">
                        Delivery History
                      </span>
                      {loadingLogs && (
                        <div className="w-3.5 h-3.5 border-2 border-t-[#C8FF00] border-[#222222] rounded-full animate-spin"></div>
                      )}
                    </div>

                    {loadingLogs ? (
                      <div className="py-6 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-t-[#C8FF00] border-[#222222] rounded-full animate-spin"></div>
                      </div>
                    ) : logs.length > 0 ? (
                      <div className="divide-y divide-[#222222]/30 max-h-[220px] overflow-y-auto pr-1 space-y-1.5">
                        {logs.map((log) => {
                          const is2xx = log.response_status && log.response_status >= 200 && log.response_status < 300;
                          return (
                            <div key={log.id} className="pt-1.5 pb-2 flex items-center justify-between gap-3 text-left">
                              <div className="min-w-0">
                                <span className="block text-[10px] font-mono text-[#888888] truncate font-semibold">
                                  {log.event_type}
                                </span>
                                <span className="block text-[9px] font-mono text-[#444444] mt-0.5">
                                  {formatTimestamp(log.created_at)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-[9px] font-mono text-[#444444]">
                                  {log.duration_ms ? `${log.duration_ms}ms` : '—'}
                                </span>
                                <span className={cn(
                                  "text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold",
                                  is2xx 
                                    ? "bg-[#10B98115] text-[#10B981]" 
                                    : log.response_status 
                                      ? "bg-[#EF444415] text-[#EF4444]" 
                                      : "bg-[#222222] text-[#888888]"
                                )}>
                                  {log.response_status || 'Pending'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#444444] font-mono italic text-center py-2">
                        No deliveries yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-4 bg-[#161616] border border-[#222222] rounded-xl text-center">
              <p className="text-[10px] text-[#444444] font-mono italic">No webhooks registered.</p>
            </div>
          )}
        </div>

        {/* Signing Secret card */}
        <div className="p-4 bg-[#161616] border border-[#222222] rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-[#080808] border border-[#222222] rounded-lg flex items-center justify-center text-[#888888]">
              <Key size={14} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#EEEEEE]">Webhook Signing Secret</p>
              <p className="text-[10px] font-mono text-[#444444] mt-0.5">••••••••••••••••</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => alert('Contact support to regenerate your signing secret.')}
            className="p-1.5 transition-all bg-[#080808] border border-[#222222] hover:border-[#444444] text-[#888888] rounded-lg cursor-pointer"
          >
            <RefreshCw size={12} />
          </button>
        </div>

      </div>
    </div>
  );
}
