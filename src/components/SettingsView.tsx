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
      
      // Also update org branding immediately
      await supabase.from('organizations').update({
        branding: { ...currentOrganization.branding, logo_url: publicUrl }
      }).eq('id', currentOrganization.id);

      setMessage({ type: 'success', text: 'Identity token (logo) optimized and stored.' });
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
      setMessage({ type: 'success', text: 'Notification preferences synced.' });
      setTimeout(() => setMessage(null), 3000);
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
      // 1. Check if user exists
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', inviteEmail)
        .single();
        
      if (userError) {
        throw new Error('User must sign up first before being added to organization.');
      }
      
      // 2. Add as member
      const { error: inviteError } = await supabase
        .from('memberships')
        .insert([{
          organization_id: currentOrganization.id,
          user_id: userData.id,
          role: inviteRole,
          is_active: true
        }]);
        
      if (inviteError) throw inviteError;
      
      // 3. Log audit event
      await supabase.from('audit_logs').insert([{
        organization_id: currentOrganization.id,
        actor_id: profile?.id,
        action: 'member_invited',
        resource_type: 'membership',
        resource_id: userData.id,
        severity: 'info',
        payload_snapshot: { email: inviteEmail, role: inviteRole },
        ip_address: '127.0.0.1'
      }]);
      
      setMessage({ type: 'success', text: `Node ${inviteEmail} initialized as ${inviteRole}.` });
      setInviteEmail('');
      // Force reload to refresh memberships
      window.location.reload();
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
      setMessage({ type: 'success', text: 'Authorization tier updated.' });
      window.location.reload();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentOrganization || !confirm('Permanently decommission this member node?')) return;
    try {
      const { error } = await supabase
        .from('memberships')
        .delete()
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', userId);
        
      if (error) throw error;
      setMessage({ type: 'success', text: 'Member node decommissioned.' });
      window.location.reload();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleTransferOwnership = async () => {
    if (!currentOrganization || !newOwnerId || !confirm('DANGER: Transfer ultimate control of this organization? You will be demoted to Administrator.')) return;
    
    setTransferringOwnership(true);
    try {
      // 1. Promote new owner
      const { error: promoError } = await supabase
        .from('memberships')
        .update({ role: 'owner' })
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', newOwnerId);
        
      if (promoError) throw promoError;
      
      // 2. Demote current owner (you)
      const { error: demoteError } = await supabase
        .from('memberships')
        .update({ role: 'admin' })
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', profile?.id);
        
      if (demoteError) throw demoteError;

      // 3. Log audit event
      await supabase.from('audit_logs').insert([{
        organization_id: currentOrganization.id,
        actor_id: profile?.id,
        action: 'ownership_transferred',
        resource_type: 'organization',
        resource_id: currentOrganization.id,
        severity: 'critical',
        payload_snapshot: { new_owner_id: newOwnerId },
        ip_address: '127.0.0.1'
      }]);
      
      setMessage({ type: 'success', text: 'Sovereignty transferred. Session demoted.' });
      window.location.reload();
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
      // Update User Profile
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

      // Update Organization (if admin)
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

      setMessage({ type: 'success', text: 'Configuration synced successfully!' });
      await refreshPlanData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="animate-pulse space-y-4 shadow rounded p-8 bg-white h-96"></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5 px-1 sm:px-0">
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-slate-900 text-white rounded-xl shrink-0">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black tracking-tighter italic leading-tight">System Settings</h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Business Protocol Node</p>
          </div>
        </div>
        
        <div className={cn(
          "px-3 py-1.5 rounded-xl border flex items-center justify-between sm:justify-start gap-2.5 transition-all shadow-sm self-start sm:self-auto w-full sm:w-auto",
          plan === 'free' ? "bg-slate-50 border-slate-100" : "bg-indigo-50 border-indigo-100"
        )}>
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <div>
              <p className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400 leading-none mb-1">Node Level</p>
              <p className="text-[10px] font-black uppercase text-slate-900 italic tracking-widest leading-none">{plan}</p>
            </div>
          </div>
          {plan === 'free' && (
            <button 
              onClick={() => setShowUpgradeModal(true)}
              className="p-1 bg-indigo-600 text-white rounded-md hover:bg-slate-900 transition-all shadow-md ml-4"
            >
              <Zap size={10} className="fill-white" />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4 pb-12">
        <div className="bento-card p-6 space-y-6">
          {/* Plan & Usage Section */}
          <div className="space-y-6 pt-2 border-t border-slate-50">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono border-b border-gray-100 pb-2 flex items-center justify-between">
              Plan & Usage
              <CreditCard size={10} className="text-indigo-500" />
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Current Plan Card */}
               <div className="p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-16 bg-indigo-500/10 blur-[60px] rounded-full -mr-8 -mt-8 group-hover:bg-indigo-500/20 transition-all duration-500" />
                  
                  <div className="relative z-10">
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Active Plan</p>
                     <h4 className="text-2xl font-black italic uppercase tracking-tight mb-4">{currentPlan}</h4>
                     
                     <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300">
                           <Check size={12} className="text-indigo-400" />
                           {isFreePlan ? 'Standard Collection Tools' : 'Advanced Operations Suite'}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300">
                           <Check size={12} className="text-indigo-400" />
                           {isFreePlan ? 'Email Reminders' : 'Multi-Channel Recovery (Email, SMS, WA)'}
                        </div>
                     </div>

                     {isFreePlan && (
                        <button 
                           type="button"
                           onClick={() => setShowUpgradeModal(true)}
                           className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all shadow-lg shadow-black/20"
                        >
                           Upgrade to Pro
                        </button>
                     )}
                  </div>
               </div>

               {/* Usage Grid */}
               <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4">
                  {[
                     { label: 'Invoices this month', key: 'invoices_month' as const },
                     { label: 'Team Seats', key: 'team_seats' as const },
                     { label: 'Active Automations', key: 'automations_active' as const },
                     { label: 'AI Operations', key: 'ai_generations' as const }
                  ].map((item) => {
                     const limitData = limits[item.key];
                     return (
                        <div key={item.key} className="space-y-1.5">
                           <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</span>
                              <span className="text-[10px] font-black text-slate-900">
                                 {limitData.current} / {limitData.limit === -1 ? '∞' : limitData.limit}
                              </span>
                           </div>
                           <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                              <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${limitData.percentage}%` }}
                                 className={cn(
                                    "h-full rounded-full transition-colors",
                                    limitData.percentage > 90 ? "bg-red-500" : limitData.percentage > 70 ? "bg-amber-400" : "bg-indigo-500"
                                 )}
                              />
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>

            {/* Plan Comparison CTA */}
            <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 border-dashed flex flex-col sm:flex-row items-center justify-between gap-4">
               <div>
                  <h5 className="text-[11px] font-black uppercase text-indigo-900 mb-1">Need more capacity?</h5>
                  <p className="text-[10px] font-medium text-indigo-600/80 italic">Pro plans start at $12/mo for unlimited invoices and multi-channel automation.</p>
               </div>
               <Link 
                  to="/pricing"
                  className="px-6 py-3 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 shadow-sm hover:shadow-md transition-all shrink-0"
               >
                  Compare Plans
               </Link>
            </div>
          </div>

          {/* Template Management Section */}
          <div className="space-y-6 pt-2 border-t border-slate-50">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono border-b border-gray-100 pb-2 flex items-center justify-between">
              Content Strategy
              <FileText size={10} className="text-indigo-500" />
            </h3>
            
            <div className="p-6 bg-slate-900 rounded-[2rem] text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-16 bg-indigo-500/10 blur-[60px] rounded-full -mr-8 -mt-8 group-hover:bg-indigo-500/20 transition-all duration-500" />
               
               <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Communication Node</p>
                  <h4 className="text-lg font-black italic uppercase tracking-tight mb-2">Email Templates</h4>
                  <p className="text-[10px] font-medium text-slate-400 mb-6 leading-relaxed max-w-sm">Manage, customize, and AI-generate the emails sent during your recovery sequences. Ensure your brand voice is consistent across all client touchpoints.</p>
                  
                  <Link 
                     to="/templates"
                     className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-lg shadow-black/20"
                  >
                     Configure Templates <ChevronDown size={14} className="-rotate-90" />
                  </Link>
               </div>
            </div>
          </div>

          {/* Custom Branding (Gated) */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono border-b border-gray-100 pb-2 flex items-center justify-between">
              Custom Branding
              {plan === 'free' && (
                <span className="flex items-center gap-1 text-[8px] text-indigo-500 font-black tracking-widest">
                  <Shield size={10} /> PRO FEATURE
                </span>
              )}
            </h3>

            <div className={cn("space-y-4 transition-all", plan === 'free' && "opacity-40 grayscale pointer-events-none")}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4">Business Logo</label>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <div className="relative group shrink-0">
                    {logoUrl ? (
                      <img 
                        src={logoUrl} 
                        alt="Logo" 
                        className="w-24 h-24 rounded-2xl object-cover shadow-lg border-2 border-white ring-8 ring-slate-100"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-2xl bg-white flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 ring-8 ring-slate-100">
                        <ImageIcon size={32} />
                      </div>
                    )}
                    
                    {uploading && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] rounded-2xl flex items-center justify-center">
                        <Loader2 className="animate-spin text-indigo-600" size={24} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3 w-full">
                    <div className="flex flex-wrap gap-2">
                      <label className={cn(
                        "flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-900 transition-all shadow-lg active:scale-95 disabled:opacity-50",
                        uploading && "opacity-50 cursor-not-allowed"
                      )}>
                        <Upload size={14} />
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
                          className="px-6 py-3 bg-white text-slate-400 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-red-500 hover:border-red-100 transition-all"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">WebP preferred. Auto-compressed to max 200KB.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Logo Remote URL (Fallback)</label>
                <div className="relative group">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
                  <input 
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-600 outline-none transition-all text-xs font-mono"
                    placeholder="https://your-server.com/logo.png"
                  />
                </div>
              </div>
            </div>
            
            {plan === 'free' && (
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 flex items-center justify-between">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-loose">Upgrade to unlock custom logos and remove branding.</p>
                <button 
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-[10px] font-black text-indigo-600 hover:text-slate-900 flex items-center gap-1 uppercase tracking-widest"
                >
                  Learn More <ExternalLink size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Profile Section */}
          <div className="space-y-4">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono border-b border-slate-50 pb-1.5 italic">Identity</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Display Name</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={14} />
                  <input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg focus:border-indigo-600 outline-none transition-all text-sm font-medium"
                    placeholder="Your Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Business Name</label>
                <div className="relative group">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={14} />
                  <input 
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg focus:border-indigo-600 outline-none transition-all text-sm font-medium"
                    placeholder="Acme Solutions"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="space-y-4 pt-2 border-t border-slate-50">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono border-b border-slate-50 pb-1.5 italic">Liquidity Protocol</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">UPI ID (VPA)</label>
                <div className="relative group">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={14} />
                  <input 
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg focus:border-indigo-600 outline-none transition-all font-mono text-xs font-bold"
                    placeholder="user@upi"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Settlement Memo (Optional)</label>
                <textarea 
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:border-indigo-600 outline-none transition-all text-[11px] font-medium leading-relaxed"
                  placeholder="IFSC Node / Account Number"
                />
              </div>
            </div>
          </div>

          {/* Notification Preferences Section */}
          <div className="space-y-4 pt-2 border-t border-slate-50">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono border-b border-slate-50 pb-1.5 italic">Signal Preferences</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-blue-500 border border-slate-100 shadow-sm">
                    <Mail size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-900 leading-none mb-1">Email Delivery Alerts</p>
                    <p className="text-[9px] text-slate-400 font-medium">Notifications for sent, failed, or capped emails.</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => updatePreference('email_delivery', !notificationPreferences.email_delivery)}
                  className={cn(
                    "w-10 h-6 rounded-full transition-all relative",
                    notificationPreferences.email_delivery ? "bg-indigo-600" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    notificationPreferences.email_delivery ? "left-5" : "left-1"
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-amber-500 border border-slate-100 shadow-sm">
                    <CreditCard size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-900 leading-none mb-1">Payment Notifications</p>
                    <p className="text-[9px] text-slate-400 font-medium">Reported, confirmed, or rejected payment signals.</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => updatePreference('payments', !notificationPreferences.payments)}
                  className={cn(
                    "w-10 h-6 rounded-full transition-all relative",
                    notificationPreferences.payments ? "bg-indigo-600" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    notificationPreferences.payments ? "left-5" : "left-1"
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-indigo-500 border border-slate-100 shadow-sm">
                    <Zap size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-900 leading-none mb-1">Invoice Viewed Alerts</p>
                    <p className="text-[9px] text-slate-400 font-medium">Get notified immediately when a client views an invoice.</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => updatePreference('invoice_viewed', !notificationPreferences.invoice_viewed)}
                  className={cn(
                    "w-10 h-6 rounded-full transition-all relative",
                    notificationPreferences.invoice_viewed ? "bg-indigo-600" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    notificationPreferences.invoice_viewed ? "left-5" : "left-1"
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
                    <Shield size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-indigo-900 leading-none mb-1">Enable SMS Delivery</p>
                    <p className="text-[9px] text-indigo-400 font-medium italic">Required for Twilio SMS automated notifications.</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setSmsEnabled(!smsEnabled)}
                  className={cn(
                    "w-10 h-6 rounded-full transition-all relative",
                    smsEnabled ? "bg-indigo-600" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    smsEnabled ? "left-5" : "left-1"
                  )} />
                </button>
              </div>
            </div>
          </div>

          {/* WhatsApp Templates Section (Gated) */}
          <div className="space-y-4 pt-2 border-t border-slate-50">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono border-b border-gray-100 pb-2 flex items-center justify-between">
              WhatsApp Templates
              {plan === 'free' && (
                <span className="flex items-center gap-1 text-[8px] text-indigo-500 font-black tracking-widest">
                  <Shield size={10} /> PRO FEATURE
                </span>
              )}
            </h3>

            <div className={cn("space-y-5 transition-all", plan === 'free' && "opacity-40 grayscale pointer-events-none")}>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Polite Nudge</label>
                <textarea 
                  value={templates.polite}
                  onChange={(e) => setTemplates(prev => ({ ...prev, polite: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:border-indigo-600 outline-none transition-all text-[11px] font-medium leading-relaxed"
                  placeholder="The system will use default if left empty."
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Firm Ask</label>
                <textarea 
                  value={templates.firm}
                  onChange={(e) => setTemplates(prev => ({ ...prev, firm: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:border-indigo-600 outline-none transition-all text-[11px] font-medium leading-relaxed"
                  placeholder="The system will use default if left empty."
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Final Notice</label>
                <textarea 
                  value={templates.final}
                  onChange={(e) => setTemplates(prev => ({ ...prev, final: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:border-indigo-600 outline-none transition-all text-[11px] font-medium leading-relaxed"
                  placeholder="The system will use default if left empty."
                />
              </div>
            </div>

            {plan === 'free' && (
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 flex items-center justify-between">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-loose">Upgrade to customize WhatsApp reminder templates.</p>
                <button 
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-[10px] font-black text-indigo-600 hover:text-slate-900 flex items-center gap-1 uppercase tracking-widest"
                >
                  Learn More <ExternalLink size={12} />
                </button>
              </div>
            )}
          </div>
          
          {/* Team / Managed Organizations */}
          <div className="space-y-6 pt-2 border-t border-slate-50">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono border-b border-gray-100 pb-2 flex items-center justify-between">
              Team & Access
              {canManageMembers && (
                <div className="flex items-center gap-1 text-[8px] text-indigo-600 font-black tracking-widest">
                  <Shield size={10} /> {currentUserRole?.toUpperCase()} CLEARANCE
                </div>
              )}
            </h3>

            {/* Invite Section (Owner/Admin) */}
            {canManageMembers && (
              <div className="p-5 bg-indigo-50/30 border border-indigo-100/50 rounded-3xl">
                <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-4 flex items-center gap-2">
                  <UserPlus size={12} /> Sync New Node
                </p>
                <form onSubmit={handleInviteMember} className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400/50" size={14} />
                    <input 
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="operator@email.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-xs font-medium focus:ring-1 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                  <select 
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="px-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button 
                    disabled={isInviting}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isInviting ? 'Pending...' : 'Sync Node'}
                  </button>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
               {/* Organization Members */}
               <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                          <UsersIcon size={18} />
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Active Personnel</p>
                          <p className="text-sm font-black text-slate-900 tracking-tight">{memberships.length} Users Enlisted</p>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                     {memberships.map((m, i) => (
                       <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100 group">
                          <div className="flex items-center gap-3">
                             <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white text-[10px] font-black italic relative">
                                {m.role === 'owner' ? <Crown size={14} className="text-amber-400" /> : m.role[0].toUpperCase()}
                                {m.user_id === profile?.id && (
                                   <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                                )}
                             </div>
                             <div>
                                <p className="text-[11px] font-bold text-slate-900 leading-none mb-1">
                                  {m.user_id === profile?.id ? 'System User (You)' : `Node-${m.user_id.slice(0, 4)}`}
                                </p>
                                <p className="text-[9px] text-slate-400 font-mono italic uppercase tracking-wider">{m.role}</p>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             {/* Role Update (Owners/Admins only) */}
                             {canManageMembers && m.user_id !== profile?.id && m.role !== 'owner' && (
                               <select 
                                 defaultValue={m.role}
                                 onChange={(e) => handleUpdateRole(m.user_id, e.target.value)}
                                 className="opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest px-2 py-1 outline-none cursor-pointer"
                               >
                                 <option value="admin">Admin</option>
                                 <option value="member">Member</option>
                                 <option value="viewer">Viewer</option>
                               </select>
                             )}

                             {/* Remove Member */}
                             {canManageMembers && m.user_id !== profile?.id && m.role !== 'owner' && (
                               <button 
                                 onClick={() => handleRemoveMember(m.user_id)}
                                 className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                               >
                                 <Trash2 size={14} />
                               </button>
                             )}

                             {/* Leave Organization */}
                             {m.user_id === profile?.id && m.role !== 'owner' && (
                               <button 
                                 onClick={() => handleRemoveMember(m.user_id)}
                                 className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                               >
                                 <LogOut size={12} /> Leave
                               </button>
                             )}
                          </div>
                       </div>
                     ))}
                  </div>
               </div>

               {/* Managed Accounts (Agency Only) */}
               {currentOrganization?.type === 'agency' && (
                 <div className="p-5 bg-slate-50 border border-slate-100 border-dashed rounded-3xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
                            <Globe size={18} />
                         </div>
                         <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Agency Management</p>
                            <p className="text-sm font-black text-slate-900 tracking-tight">Managed Client Accounts</p>
                         </div>
                      </div>
                      <button type="button" className="text-[9px] font-black uppercase text-indigo-600 hover:underline">Link Account</button>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed italic px-2">
                       This organization is registered as an Agency Node. You can link and manage isolated client accounts with segregated recovery engines and autonomous RLS.
                    </p>
                 </div>
               )}
            </div>

               {/* Danger Zone: Ownership Transfer (Owner Only) */}
               {isOwner && memberships.length > 1 && (
                 <div className="p-5 bg-red-50/50 border border-red-100 border-dashed rounded-3xl mt-4">
                    <div className="flex items-center gap-3 mb-4">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-500 border border-red-100 shadow-sm">
                          <AlertTriangle size={18} />
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase text-red-600 tracking-widest leading-none mb-1">Danger Zone</p>
                          <p className="text-sm font-black text-slate-900 tracking-tight">System Transfer Protocol</p>
                       </div>
                    </div>
                    
                    <div className="space-y-3">
                       <p className="text-[10px] text-slate-500 leading-relaxed italic mb-4">
                          Relinquish ultimate node control to another operator. This action will demote your level to Administrator.
                       </p>
                       <div className="flex gap-2">
                         <select 
                           value={newOwnerId}
                           onChange={(e) => setNewOwnerId(e.target.value)}
                           className="flex-1 px-4 py-2 bg-white border border-red-100 rounded-xl text-xs font-medium outline-none"
                         >
                           <option value="">Select New Sovereign...</option>
                           {memberships
                             .filter(m => m.user_id !== profile?.id)
                             .map(m => (
                               <option key={m.user_id} value={m.user_id}>Node-{m.user_id.slice(0, 8)}</option>
                             ))
                           }
                         </select>
                         <button 
                           onClick={handleTransferOwnership}
                           disabled={!newOwnerId || transferringOwnership}
                           className="px-4 py-2 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-100 flex items-center gap-2 hover:bg-slate-900 transition-all disabled:opacity-50"
                         >
                           <ArrowRightLeft size={12} /> Transfer
                         </button>
                       </div>
                    </div>
                 </div>
               )}
          </div>

          {/* AI Engine Protocol */}
          <div className="space-y-4 pt-2 border-t border-slate-50">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono border-b border-gray-100 pb-2 flex items-center justify-between">
              AI Strategy Engine
              <Zap size={10} className="text-indigo-500" />
            </h3>
            
            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Model Status</p>
                  <p className="text-sm font-black text-slate-900 tracking-tight">Gemini 3 Flash Preview</p>
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
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                >
                  Test Connection
                </button>
              </div>
              <p className="text-[9px] text-slate-400 leading-relaxed italic">
                The Strategic Engine requires a <strong>GEMINI_API_KEY</strong> set in the <strong>AI Studio Settings &gt; Secrets</strong> panel. 
                Supabase Secrets are reserved for background Edge Functions.
              </p>
            </div>
          </div>

          {/* Developer & Hooks (Gated) */}
          <div className="space-y-4 pt-2 border-t border-slate-50">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono border-b border-gray-100 pb-2 flex items-center justify-between">
              Developer Protocol
              {plan === 'free' && (
                <span className="flex items-center gap-1 text-[8px] text-indigo-500 font-black tracking-widest">
                  <Shield size={10} /> ENTERPRISE ONLY
                </span>
              )}
            </h3>

            <div className={cn("space-y-5 transition-all", plan !== 'enterprise' && "opacity-40 grayscale pointer-events-none")}>
            <div className="p-4 sm:p-6 bg-slate-900 rounded-[2rem] text-white">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                     <h4 className="text-[10px] font-black uppercase tracking-widest leading-none flex items-center gap-2">
                        <Globe size={14} className="text-indigo-400" /> Webhook Endpoints
                     </h4>
                     <p className="text-[8px] text-slate-400 mt-1 uppercase tracking-wider">Triggers: invoice.updated, reminder.sent</p>
                  </div>
                  <button type="button" className="text-[9px] font-black uppercase text-indigo-400 hover:text-white transition-colors underline self-start sm:self-auto">Add Hook</button>
               </div>
               {webhooks.length > 0 ? (
                 <div className="space-y-3">
                    {webhooks.map((w, i) => (
                      <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between gap-3">
                         <span className="text-[10px] font-mono opacity-60 truncate flex-1">{w.url}</span>
                         <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 shrink-0">ACTIVE</span>
                      </div>
                    ))}
                 </div>
               ) : (
                 <p className="text-[10px] text-white/30 italic">No webhooks registered.</p>
               )}
            </div>

               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
                    <Key size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase text-slate-600">Signing Secret</p>
                    <p className="text-[9px] font-mono text-slate-400 mt-0.5">********************************</p>
                  </div>
                  <button type="button" className="p-2 transition-all hover:bg-white rounded-lg text-slate-400">
                    <RefreshCw size={14} />
                  </button>
               </div>
            </div>
          </div>

          {/* Recovery & Infrastructure */}
          <div className="space-y-4 pt-2 border-t border-slate-50">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono border-b border-gray-100 pb-2 flex items-center justify-between italic">
              Infrastructure
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                     <Database size={12} />
                     <span className="text-[9px] font-black uppercase tracking-widest">Backup Status</span>
                  </div>
                  <p className="text-[11px] font-bold text-green-600">Continuous (PITR)</p>
               </div>
               <div className="p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                     <Activity size={12} />
                     <span className="text-[9px] font-black uppercase tracking-widest">Service Level</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-900">99.9% Uptime</p>
               </div>
            </div>
            <p className="text-[9px] text-slate-400 leading-relaxed italic">
              Commercial data is encrypted at rest and backed up every 60 seconds. Restores can be initiated via Enterprise Support Node.
            </p>
          </div>

          {message && (
            <div className={cn(
              "p-4 rounded-xl text-sm font-medium",
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
            )}>
              {message.text}
            </div>
          )}

          <div className="pt-4">
            <button 
              disabled={saving}
              type="submit"
              className="w-full bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-900 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save size={18} />
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
