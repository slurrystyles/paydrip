import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserProfile, WebhookEndpoint } from '../types';
import { motion } from 'motion/react';
import { 
  Save, 
  User, 
  Building, 
  CreditCard, 
  FileText,
  Shield, 
  Zap, 
  ExternalLink, 
  Upload, 
  Image as ImageIcon, 
  Loader2, 
  Globe, 
  Activity, 
  Database,
  RefreshCw,
  Key,
  Users as UsersIcon,
  Crown,
  Mail,
  UserPlus,
  Trash2,
  ChevronDown,
  LogOut,
  ArrowRightLeft,
  AlertTriangle,
  Check,
  CheckCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { usePlan } from '../contexts/PlanContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useUserRole } from '../hooks/useUserRole';
import { recoveryService } from '../lib/recoveryService';
import { useUsageLimits } from '../hooks/useUsageLimits';
import { UpgradeModal } from './UpgradeModal';
import imageCompression from 'browser-image-compression';

export default function SettingsView() {
  const { plan, profile, refreshPlanData } = usePlan();
  const { 
    plan: currentPlan, 
    limits, 
    isFreePlan, 
    canAddMember, 
    refresh: refreshUsage 
  } = useUsageLimits();
  const { currentOrganization, memberships, isAdmin, isOwner } = useOrganization();
  const { 
    isOwner: rbacIsOwner, 
    isAdminOrOwner: rbacIsAdminOrOwner, 
    capabilities = { canManageMembers: false, canManageBilling: false, canDeleteOrg: false },
    role: currentUserRole
  } = useUserRole() || {};
  const { canManageMembers, canManageBilling, canDeleteOrg } = capabilities;
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [webhooks, setWebhooks] = useState<any[]>([]);

  // Team management state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [transferringOwnership, setTransferringOwnership] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [templates, setTemplates] = useState<{ polite: string; firm: string; final: string }>({
    polite: '',
    firm: '',
    final: ''
  });

  const [notificationPreferences, setNotificationPreferences] = useState({
    email_delivery: true,
    payments: true,
    invoice_viewed: true
  });

  const fetchSecurityData = async () => {
    if (!currentOrganization) return;
    const { data: webData } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('organization_id', currentOrganization.id)
      .limit(5);
    setWebhooks(webData || []);
  };

  useEffect(() => {
    if (profile && currentOrganization) {
      setName(profile.name || '');
      setBusinessName(currentOrganization.name || '');
      setUpiId(profile.upi_id || '');
      setBankDetails(profile.bank_details || '');
      setLogoUrl(currentOrganization.branding?.logo_url || '');
      setSmsEnabled(currentOrganization.sms_enabled || false);
      setTemplates({
        polite: profile.whatsapp_templates?.polite || '',
        firm: profile.whatsapp_templates?.firm || '',
        final: profile.whatsapp_templates?.final || ''
      });
      setNotificationPreferences(profile.notification_preferences || {
        email_delivery: true,
        payments: true,
        invoice_viewed: true
      });
      fetchSecurityData();
      setLoading(false);
    }
  }, [profile, currentOrganization]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (plan === 'free') {
      setShowUpgradeModal(true);
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const options = {
        maxSizeMB: 0.2, // 200KB limit
        maxWidthOrHeight: 1024,
        useWebWorker: true,
        fileType: 'image/webp' as const
      };

      const compressedFile = await imageCompression(file, options);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrganization) throw new Error('Unauthorized');

      const now = new Date();
      const monthYear = `${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
      const fileName = `${currentOrganization.id}-${Date.now()}.webp`;
      const filePath = `logos/${monthYear}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client')
        .upload(filePath, compressedFile);

      if (uploadError) {
        if (uploadError.message.includes('bucket not found')) {
          throw new Error('Storage bucket "client" not found. Please create it in your Supabase dashboard.');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('client')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      
      await supabase.from('organizations').update({
        branding: { ...currentOrganization.branding, logo_url: publicUrl }
      }).eq('id', currentOrganization.id);

      setMessage({ type: 'success', text: 'Business logo uploaded and applied successfully.' });
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error uploading logo' });
    } finally {
      setUploading(false);
    }
  };

  const updatePreference = async (key: string, value: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newPrefs = { ...notificationPreferences, [key]: value };
    setNotificationPreferences(newPrefs);

    try {
      const { error } = await supabase
        .from('users')
        .update({ notification_preferences: newPrefs })
        .eq('id', user.id);
      
      if (error) throw error;
      setMessage({ type: 'success', text: 'Alert preferences updated.' });
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setNotificationPreferences(notificationPreferences); // Rollback
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !currentOrganization) return;
    
    if (!canAddMember) {
      setShowUpgradeModal(true);
      return;
    }
    
    setIsInviting(true);
    setMessage(null);
    
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', inviteEmail)
        .single();
        
      if (userError) {
        throw new Error('User must register the account first in order to join the organization.');
      }
      
      const { error: inviteError } = await supabase
        .from('memberships')
        .insert([{
          organization_id: currentOrganization.id,
          user_id: userData.id,
          role: inviteRole,
          is_active: true
        }]);
        
      if (inviteError) throw inviteError;
      
      setMessage({ type: 'success', text: `Successfully invited ${inviteEmail} as static ${inviteRole}.` });
      setInviteEmail('');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: any) => {
    if (!currentOrganization) return;
    try {
      const { error } = await supabase
        .from('memberships')
        .update({ role: newRole })
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', userId);
        
      if (error) throw error;
      setMessage({ type: 'success', text: 'User permissions updated successfully.' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentOrganization || !confirm('Permanently remove this member from organization?')) return;
    try {
      const { error } = await supabase
        .from('memberships')
        .delete()
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', userId);
        
      if (error) throw error;
      setMessage({ type: 'success', text: 'Member disconnected successfully.' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleTransferOwnership = async () => {
    if (!currentOrganization || !newOwnerId || !confirm('CAUTION: Transfer ownership of this organization? You will be updated to Administrator.')) return;
    
    setTransferringOwnership(true);
    try {
      const { error: promoError } = await supabase
        .from('memberships')
        .update({ role: 'owner' })
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', newOwnerId);
        
      if (promoError) throw promoError;
      
      const { error: demoteError } = await supabase
        .from('memberships')
        .update({ role: 'admin' })
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', profile?.id);
        
      if (demoteError) throw demoteError;
      
      setMessage({ type: 'success', text: 'Ownership transferred. Access updated.' });
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setTransferringOwnership(false);
    }
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !currentOrganization) return;

    try {
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          name,
          upi_id: upiId,
          bank_details: bankDetails,
          whatsapp_templates: templates,
          notification_preferences: notificationPreferences
        });

      if (userError) throw userError;

      if (isAdmin) {
        const { error: orgError } = await supabase
          .from('organizations')
          .update({
            name: businessName,
            sms_enabled: smsEnabled,
            branding: { ...currentOrganization.branding, logo_url: logoUrl }
          })
          .eq('id', currentOrganization.id);
        
        if (orgError) throw orgError;
      }

      setMessage({ type: 'success', text: 'Settings updated successfully!' });
      await refreshPlanData();
      await refreshUsage();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-8 rounded-xl bg-[#111111] border border-[#222222] min-h-[400px] flex items-center justify-center animate-pulse">
        <div className="w-8 h-8 border-2 border-t-[#C8FF00] border-[#222222] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-1 text-left">
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#111111] border border-[#222222] text-[#C8FF00] rounded-xl shrink-0">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#EEEEEE] leading-none">Settings</h2>
            <p className="text-[#888888] text-[10px] font-semibold uppercase tracking-wider mt-1.5 font-mono">Organization Profile & Config</p>
          </div>
        </div>
        
        <div className={cn(
          "px-3 py-1.5 rounded-lg border flex items-center justify-between sm:justify-start gap-3 self-start sm:self-auto w-full sm:w-auto bg-[#111111]",
          plan === 'free' ? "border-[#222222]" : "border-[#C8FF00]/20"
        )}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#C8FF00] animate-pulse" />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[#888888] leading-none mb-1 font-mono">Current Plan</p>
              <p className="text-xs font-bold text-[#EEEEEE] uppercase tracking-wider leading-none font-mono">{plan}</p>
            </div>
          </div>
          {plan === 'free' && (
            <button 
              onClick={() => setShowUpgradeModal(true)}
              className="p-1 bg-[#C8FF00] text-[#080808] rounded-md hover:bg-[#b8ef00] transition-all ml-4 shrink-0"
              type="button"
            >
              <Zap size={10} className="fill-[#080808]" />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 pb-12">
        <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 space-y-6">
          
          {/* Plan & Usage Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2 flex items-center justify-between">
              Subscription details
              <CreditCard size={12} className="text-[#888888]" />
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Current Plan Card */}
               <div className="p-5 bg-[#161616] border border-[#222222] rounded-xl text-left relative overflow-hidden group">
                  <div className="relative z-10">
                     <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1 font-mono">Plan Profile</p>
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
                           className="w-full py-2 bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] rounded-lg text-xs font-semibold transition-all mt-4"
                        >
                           Upgrade to Professional
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
                  <p className="text-[11px] text-[#888888] italic">Compare paid plans for custom branding, SMS nudges, and unlimited team users.</p>
               </div>
               <Link 
                  to="/pricing"
                  className="px-4 py-2 bg-[#111111] text-[#EEEEEE] hover:text-[#C8FF00] border border-[#222222] rounded-lg text-xs font-semibold transition-all shrink-0 font-mono"
               >
                  Compare Plans
               </Link>
            </div>
          </div>

          {/* Template Management Section */}
          <div className="space-y-4 pt-2 border-t border-[#222222]">
            <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2 flex items-center justify-between">
              Content & Automation Strategy
              <FileText size={12} className="text-[#888888]" />
            </h3>
            
            <div className="p-5 bg-[#161616] border border-[#222222] rounded-xl text-left relative overflow-hidden group">
               <div className="relative z-10">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1 font-mono">Communication Control</p>
                  <h4 className="text-sm font-semibold text-[#EEEEEE] mb-2 font-mono">Escalation Reminders</h4>
                  <p className="text-xs text-[#888888] mb-4 leading-relaxed max-w-xl">Customize emails and text notifications sent during automated collection runs.</p>
                  
                  <Link 
                     to="/templates"
                     className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111111] hover:bg-[#080808] text-[#EEEEEE] hover:text-[#C8FF00] border border-[#222222] rounded-lg text-xs font-semibold transition-all font-mono"
                  >
                     Configure Email Templates <ChevronDown size={14} className="-rotate-90" />
                  </Link>
               </div>
            </div>
          </div>

          {/* Custom Branding (Gated) */}
          <div className="space-y-4 pt-2 border-t border-[#222222]">
            <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2 flex items-center justify-between">
              Custom Branding
              {plan === 'free' && (
                <span className="flex items-center gap-1 text-[9px] text-[#C8FF00] font-semibold tracking-wider font-mono">
                  <Shield size={10} /> PAID ADD-ON
                </span>
              )}
            </h3>

            <div className={cn("space-y-4 transition-all", plan === 'free' && "opacity-40 grayscale pointer-events-none")}>
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
                          className="px-3 py-1.5 bg-[#161616] border border-[#222222] text-[#888888] hover:text-[#EF4444] rounded-lg text-xs font-semibold transition-all"
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
                <div className="relative group">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444444]" size={14} />
                  <input 
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#080808] border border-[#222222] rounded-lg text-[#EEEEEE] outline-none text-xs font-mono"
                    placeholder="https://your-domain.com/logo.png"
                  />
                </div>
              </div>
            </div>
            
            {plan === 'free' && (
              <div className="bg-[#161616] p-4 rounded-xl border border-[#222222] flex items-center justify-between text-left">
                <p className="text-[11px] text-[#888888]">Upgrade to Professional to unlock custom logo uploading.</p>
                <button 
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-xs font-bold text-[#C8FF00] hover:underline flex items-center gap-1"
                >
                  Learn More <ExternalLink size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Profile Section */}
          <div className="space-y-4 pt-2 border-t border-[#222222]">
            <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2">Business Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div>
                <label className="block text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1.5 font-mono">Operator Display Name</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444444]" size={14} />
                  <input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#080808] border border-[#222222] rounded-lg text-[#EEEEEE] outline-none text-sm"
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
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#080808] border border-[#222222] rounded-lg text-[#EEEEEE] outline-none text-sm"
                    placeholder="Acme Inc."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="space-y-4 pt-2 border-[#222222] border-t">
            <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2">Liquidity & Invoicing Settings</h3>
            
            <div className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1.5 font-mono">UPI ID (Electronic VPA for Payment Links)</label>
                <div className="relative group">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444444]" size={14} />
                  <input 
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#080808] border border-[#222222] rounded-lg text-[#EEEEEE] outline-none font-mono text-xs font-semibold"
                    placeholder="username@bank"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1.5 font-mono">Alternative Settlement Details (Bank / IFSC)</label>
                <textarea 
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-[#080808] border border-[#222222] rounded-lg text-[#EEEEEE] outline-none text-xs font-mono"
                  placeholder="Account No / IFSC / Bank details to show on invoice copy"
                />
              </div>
            </div>
          </div>

          {/* Notification Preferences Section */}
          <div className="space-y-4 pt-2 border-[#222222] border-t">
            <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2">Alert Configuration</h3>
            
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
                  onClick={() => updatePreference('email_delivery', !notificationPreferences.email_delivery)}
                  className={cn(
                    "w-9 h-5 rounded-full transition-all relative border border-[#222222]",
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
                    <p className="text-xs font-semibold text-[#EEEEEE] leading-none mb-1">Inbound Payment Signals</p>
                    <p className="text-[10px] text-[#888888]">Get notified when clients report paid settle requests.</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => updatePreference('payments', !notificationPreferences.payments)}
                  className={cn(
                    "w-9 h-5 rounded-full transition-all relative border border-[#222222]",
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
                    <p className="text-xs font-semibold text-[#EEEEEE] leading-none mb-1">Invoice Open Track alerts</p>
                    <p className="text-[10px] text-[#888888]">Instant alerts when a late client views the invoice URL.</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => updatePreference('invoice_viewed', !notificationPreferences.invoice_viewed)}
                  className={cn(
                    "w-9 h-5 rounded-full transition-all relative border border-[#222222]",
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
                    <p className="text-xs font-semibold text-[#EEEEEE] leading-none mb-1">Twilio SMS Gateway integration</p>
                    <p className="text-[10px] text-[#888888]">Enable automated texts for escalations.</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setSmsEnabled(!smsEnabled)}
                  className={cn(
                    "w-9 h-5 rounded-full transition-all relative border border-[#222222]",
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

          {/* WhatsApp Templates Section (Gated) */}
          <div className="space-y-4 pt-2 border-t border-[#222222] text-left">
            <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2 flex items-center justify-between">
              WhatsApp Templates
              {plan === 'free' && (
                <span className="flex items-center gap-1 text-[9px] text-[#C8FF00] font-semibold tracking-wider font-mono">
                  <Shield size={10} /> PAID ADD-ON
                </span>
              )}
            </h3>

            <div className={cn("space-y-4 transition-all", plan === 'free' && "opacity-40 grayscale pointer-events-none")}>
              <div>
                <label className="block text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1.5 font-mono">Standard Nudge Template</label>
                <textarea 
                  value={templates.polite}
                  onChange={(e) => setTemplates(prev => ({ ...prev, polite: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-[#080808] border border-[#222222] rounded-lg text-[#EEEEEE] outline-none text-xs font-mono"
                  placeholder="Defaults to standard friendly reminder code."
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1.5 font-mono">Firm Nudge Asking Template</label>
                <textarea 
                  value={templates.firm}
                  onChange={(e) => setTemplates(prev => ({ ...prev, firm: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-[#080808] border border-[#222222] rounded-lg text-[#EEEEEE] outline-none text-xs font-mono"
                  placeholder="Defaults to firm reminder asking code."
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#888888] uppercase tracking-wider mb-1.5 font-mono">Final Notice Asking Template</label>
                <textarea 
                  value={templates.final}
                  onChange={(e) => setTemplates(prev => ({ ...prev, final: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-[#080808] border border-[#222222] rounded-lg text-[#EEEEEE] outline-none text-xs font-mono"
                  placeholder="Defaults to final collection notice code."
                />
              </div>
            </div>

            {plan === 'free' && (
              <div className="bg-[#161616] p-4 rounded-xl border border-[#222222] flex items-center justify-between text-left">
                <p className="text-[11px] text-[#888888]">Upgrade to Professional to customize WhatsApp reminder copy.</p>
                <button 
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-xs font-bold text-[#C8FF00] hover:underline flex items-center gap-1"
                >
                  Learn More <ExternalLink size={12} />
                </button>
              </div>
            )}
          </div>
          
          {/* Team / Managed Organizations */}
          <div className="space-y-4 pt-2 border-t border-[#222222]">
            <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2 flex items-center justify-between">
              Personnel & Team Access
              {canManageMembers && (
                <div className="flex items-center gap-1 text-[9px] text-[#C8FF00] font-semibold tracking-wider font-mono">
                  <Shield size={10} /> ADMIN CLEARANCE
                </div>
              )}
            </h3>

            {/* Invite Section (Owner/Admin) */}
            {canManageMembers && (
              <div className="p-4 bg-[#161616] border border-[#222222] rounded-xl text-left">
                <p className="text-xs font-semibold text-[#EEEEEE] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <UserPlus size={13} className="text-[#C8FF00]" /> Invite Team Member
                </p>
                <form onSubmit={handleInviteMember} className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444444]" size={14} />
                    <input 
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="operator@email.com"
                      className="w-full pl-9 pr-4 py-2.5 bg-[#080808] border border-[#222222] rounded-lg text-xs outline-none text-[#EEEEEE] focus:border-[#444444]"
                    />
                  </div>
                  <select 
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="px-3 py-2 bg-[#080808] border border-[#222222] text-[#EEEEEE] rounded-lg text-xs outline-none cursor-pointer"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button 
                    disabled={isInviting}
                    type="submit"
                    className="px-4 py-2.5 bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808] rounded-lg text-xs font-semibold transition-all shadow-md disabled:opacity-50 shrink-0"
                  >
                    {isInviting ? 'Sending...' : 'Invite user'}
                  </button>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
               {/* Organization Members */}
               <div className="p-4 bg-[#161616] border border-[#222222] rounded-xl text-left">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-[#080808] border border-[#222222] rounded-lg flex items-center justify-center text-[#C8FF00]">
                          <UsersIcon size={14} />
                       </div>
                       <div>
                          <p className="text-[10px] font-semibold uppercase text-[#888888] tracking-wider leading-none mb-1">Organization Users</p>
                          <p className="text-sm font-semibold text-[#EEEEEE]">{memberships.length} active members</p>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                     {memberships.map((m, i) => (
                       <div key={i} className="flex items-center justify-between p-2 hover:bg-[#080808]/40 rounded-lg transition-all border border-transparent hover:border-[#222222]">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 bg-[#080808] border border-[#222222] text-[#888888] rounded-md flex items-center justify-center text-[10px] font-bold italic relative">
                                {m.role === 'owner' ? <Crown size={12} className="text-amber-400" /> : m.role[0].toUpperCase()}
                                {m.user_id === profile?.id && (
                                   <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#10B981] rounded-full"></div>
                                )}
                             </div>
                             <div>
                                <p className="text-xs font-semibold text-[#EEEEEE] leading-none mb-1">
                                  {m.user_id === profile?.id ? 'System Operator (You)' : `Operator-${m.user_id.slice(0, 4)}`}
                                </p>
                                <p className="text-[9px] text-[#888888] font-mono uppercase">{m.role}</p>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             {canManageMembers && m.user_id !== profile?.id && m.role !== 'owner' && (
                               <select 
                                 defaultValue={m.role}
                                 onChange={(e) => handleUpdateRole(m.user_id, e.target.value)}
                                 className="bg-[#080808] border border-[#222222] text-[#EEEEEE] rounded-lg text-[10px] px-2 py-1 outline-none cursor-pointer"
                               >
                                 <option value="admin">Admin</option>
                                 <option value="member">Member</option>
                                 <option value="viewer">Viewer</option>
                               </select>
                             )}

                             {canManageMembers && m.user_id !== profile?.id && m.role !== 'owner' && (
                               <button 
                                 onClick={() => handleRemoveMember(m.user_id)}
                                 className="p-1 text-[#888888] hover:text-[#EF4444] transition-colors"
                                 type="button"
                               >
                                 <Trash2 size={13} />
                               </button>
                             )}

                             {m.user_id === profile?.id && m.role !== 'owner' && (
                               <button 
                                 onClick={() => handleRemoveMember(m.user_id)}
                                 className="flex items-center gap-1 px-2.5 py-1 bg-[#EF444415] text-[#EF4444] hover:bg-[#EF444425] rounded-lg text-[10px] font-semibold transition-all"
                                 type="button"
                               >
                                 <LogOut size={10} /> Leave
                               </button>
                             )}
                          </div>
                       </div>
                     ))}
                  </div>
               </div>

               {/* Managed Accounts (Agency Only) */}
               {currentOrganization?.type === 'agency' && (
                 <div className="p-4 bg-[#161616] border border-[#222222] border-dashed rounded-xl text-left">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-[#080808] border border-[#222222] rounded-lg flex items-center justify-center text-[#888888]">
                            <Globe size={14} />
                         </div>
                         <div>
                            <p className="text-[10px] font-semibold uppercase text-[#888888] tracking-wider leading-none mb-1 font-mono">Agency Mode</p>
                            <p className="text-xs font-semibold text-[#EEEEEE]">Segregated Client Workspaces</p>
                         </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#888888] leading-relaxed italic">
                       This organization operates under agency rules. Segmented client recovery flows are active under custom permissions.
                    </p>
                 </div>
               )}
            </div>

            {/* Danger Zone: Ownership Transfer (Owner Only) */}
            {isOwner && memberships.length > 1 && (
              <div className="p-4 bg-[#EF444410] border border-[#EF444430] rounded-xl text-left mt-2">
                 <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-[#EF444415] rounded-lg flex items-center justify-center text-[#EF4444]">
                       <AlertTriangle size={14} />
                    </div>
                    <div>
                       <p className="text-[10px] font-semibold uppercase text-[#EF4444] tracking-wider leading-none mb-1 font-mono font-bold">Danger Zone</p>
                       <p className="text-xs font-semibold text-[#EEEEEE]">Transfer Ownership</p>
                    </div>
                 </div>
                 
                 <div className="space-y-3">
                    <p className="text-[11px] text-[#888888] italic">
                       Relinquish full administrative organization ownership. This action will demote your role to Administrator.
                    </p>
                    <div className="flex gap-2">
                      <select 
                        value={newOwnerId}
                        onChange={(e) => setNewOwnerId(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-[#080808] border border-[#222222] text-[#EEEEEE] rounded-lg text-xs outline-none cursor-pointer"
                      >
                        <option value="">Select recipient...</option>
                        {memberships
                          .filter(m => m.user_id !== profile?.id)
                          .map(m => (
                            <option key={m.user_id} value={m.user_id}>Operator-{m.user_id.slice(0, 8)}</option>
                          ))
                        }
                      </select>
                      <button 
                        onClick={handleTransferOwnership}
                        disabled={!newOwnerId || transferringOwnership}
                        className="px-3 py-1.5 bg-[#EF4444] hover:bg-[#ef4444eb] text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50 shrink-0"
                        type="button"
                      >
                        <ArrowRightLeft size={12} /> Transfer
                      </button>
                    </div>
                 </div>
              </div>
            )}
          </div>

          {/* AI Engine Protocol */}
          <div className="space-y-4 pt-2 border-t border-[#222222] text-left">
            <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2 flex items-center justify-between">
              AI Engine
              <Zap size={12} className="text-[#C8FF00]" />
            </h3>
            
            <div className="p-4 bg-[#161616] border border-[#222222] rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-[#888888] tracking-wider leading-none mb-1 font-mono">Model Configuration</p>
                  <p className="text-xs font-semibold text-[#EEEEEE]">Gemini Smart Engine (Activated)</p>
                </div>
                <button 
                  type="button"
                  onClick={async () => {
                    const result = await recoveryService.testAIConnection();
                    if (result.success) {
                      setMessage({ type: 'success', text: `AI Connection Verified: ${result.text}` });
                    } else {
                      setMessage({ type: 'error', text: `AI Connection Failed: ${result.error}` });
                    }
                  }}
                  className="px-3 py-1.5 bg-[#111111] hover:bg-[#080808] border border-[#222222] text-[#EEEEEE] rounded-lg text-xs font-medium transition-all"
                >
                  Test Connection
                </button>
              </div>
              <p className="text-[11px] text-[#888888] leading-relaxed italic">
                 The AI Strategy Engine accesses process context parameters automatically using your workspace keys securely.
              </p>
            </div>
          </div>

          {/* Developer Protocol (Gated) */}
          <div className="space-y-4 pt-2 border-t border-[#222222] text-left">
            <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2 flex items-center justify-between">
              Integrations & Webhooks
              {plan === 'free' && (
                <span className="flex items-center gap-1 text-[9px] text-[#C8FF00] font-semibold tracking-wider font-mono">
                  <Shield size={10} /> ENTERPRISE ONLY
                </span>
              )}
            </h3>

            <div className={cn("space-y-4 transition-all", plan !== 'enterprise' && "opacity-40 grayscale pointer-events-none")}>
              <div className="p-4 bg-[#161616] border border-[#222222] rounded-xl">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                       <h4 className="text-[11px] font-semibold uppercase tracking-wider leading-none flex items-center gap-1.5 text-[#EEEEEE] font-mono">
                          <Globe size={13} className="text-[#3B82F6]" /> Webhook Endpoints
                       </h4>
                       <p className="text-[10px] text-[#888888] mt-1 font-mono uppercase">Triggers: invoice.payment_reported, reminder.sent</p>
                    </div>
                    <button type="button" className="text-xs font-semibold text-[#C8FF00] hover:underline self-start sm:self-auto uppercase font-mono">Add Endpoint</button>
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
                    <p className="text-xs font-semibold text-[#EEEEEE]">Secret Signature Key</p>
                    <p className="text-[10px] font-mono text-[#444444] mt-0.5">********************************</p>
                  </div>
                  <button type="button" className="p-1.5 transition-all bg-[#080808] border border-[#222222] hover:border-[#444444] text-[#888888] rounded-lg">
                    <RefreshCw size={12} />
                  </button>
               </div>
            </div>
          </div>

          {/* Infrastructure */}
          <div className="space-y-4 pt-2 border-t border-[#222222] text-left">
            <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-widest font-mono border-b border-[#222222] pb-2 italic">
              Infrastructure Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="p-4 bg-[#161616] border border-[#222222] border-dashed rounded-xl">
                  <div className="flex items-center gap-2 text-[#888888] mb-1">
                     <Database size={12} />
                     <span className="text-[10px] font-semibold uppercase tracking-wider font-mono">Backup Recovery</span>
                  </div>
                  <p className="text-xs font-bold text-[#10B981]">Continuous PITR (60s snapshot interval)</p>
               </div>
               <div className="p-4 bg-[#161616] border border-[#222222] border-dashed rounded-xl">
                  <div className="flex items-center gap-2 text-[#888888] mb-1">
                     <Activity size={12} />
                     <span className="text-[10px] font-semibold uppercase tracking-wider font-mono">Service Availability</span>
                  </div>
                  <p className="text-xs font-bold text-[#EEEEEE]">99.99% Cloud Architecture</p>
               </div>
            </div>
          </div>

          {message && (
            <div className={cn(
              "p-4 rounded-lg text-xs font-semibold",
              message.type === 'success' ? 'bg-[#10B98115] text-[#10B981] border border-[#10B98125]' : 'bg-[#EF444415] text-[#EF4444] border border-[#EF444425]'
            )}>
              {message.text}
            </div>
          )}

          <div className="pt-2">
            <button 
              disabled={saving}
              type="submit"
              className={cn(
                "w-full py-3 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all",
                saving ? "bg-[#161616] border border-[#222222] text-[#444444]" : "bg-[#C8FF00] hover:bg-[#b8ef00] text-[#080808]"
              )}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-[#444444] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
