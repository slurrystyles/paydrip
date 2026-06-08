import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePlan } from '../contexts/PlanContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useUserRole } from '../hooks/useUserRole';
import { recoveryService } from '../lib/recoveryService';
import { useUsageLimits } from '../hooks/useUsageLimits';
import { UpgradeModal } from './UpgradeModal';
import imageCompression from 'browser-image-compression';

// Import our modular tab subcomponents
import { ProfileTab } from './settings/ProfileTab';
import { NotificationsTab } from './settings/NotificationsTab';
import { TeamTab } from './settings/TeamTab';
import { BrandingTab } from './settings/BrandingTab';
import { TemplatesTab } from './settings/TemplatesTab';
import { WebhooksTab } from './settings/WebhooksTab';
import { PlanTab } from './settings/PlanTab';

type SettingsTabType = 'profile' | 'notifications' | 'team' | 'branding' | 'templates' | 'webhooks' | 'plan';

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

  // Tab State
  const [activeTab, setActiveTab] = useState<SettingsTabType>('profile');

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
      
      if (!profile || !currentOrganization) throw new Error('Unauthorized');

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
    if (!profile) return;

    const newPrefs = { ...notificationPreferences, [key]: value };
    setNotificationPreferences(newPrefs);

    try {
      const { error } = await supabase
        .from('users')
        .update({ notification_preferences: newPrefs })
        .eq('id', profile.id);
      
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
      
      setMessage({ type: 'success', text: `Successfully invited ${inviteEmail} as member.` });
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

  // Refactored Tab Saving Handlers
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    if (!profile || !currentOrganization) return;
    try {
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: profile.id,
          email: profile.email,
          name,
          upi_id: upiId,
          bank_details: bankDetails,
        });
      if (userError) throw userError;

      if (isAdmin) {
        const { error: orgError } = await supabase
          .from('organizations')
          .update({ name: businessName })
          .eq('id', currentOrganization.id);
        if (orgError) throw orgError;
      }
      setMessage({ 
        type: 'success', 
        text: 'Profile saved.' 
      });
      await refreshPlanData();
      await refreshUsage();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTemplates(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    if (!profile) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ whatsapp_templates: templates })
        .eq('id', profile.id);
      if (error) throw error;
      setMessage({ 
        type: 'success', 
        text: 'Templates saved.' 
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleSmsToggle(value: boolean) {
    setSmsEnabled(value);
    if (!currentOrganization) return;
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ sms_enabled: value })
        .eq('id', currentOrganization.id);
      if (error) throw error;
      setMessage({ 
        type: 'success', 
        text: 'SMS preference updated.' 
      });
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setSmsEnabled(!value); // rollback
    }
  }

  async function handleSaveBranding() {
    if (!currentOrganization) return;
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          branding: { 
            ...currentOrganization.branding, 
            logo_url: logoUrl 
          }
        })
        .eq('id', currentOrganization.id);
      if (error) throw error;
      setMessage({ 
        type: 'success', 
        text: 'Branding saved.' 
      });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message 
      });
    } finally {
      setSaving(false);
    }
  }

  const handleTestAIConnection = async () => {
    setMessage(null);
    const result = await recoveryService.testAIConnection();
    if (result.success) {
      setMessage({ type: 'success', text: `AI Connection Verified: ${result.text}` });
    } else {
      setMessage({ type: 'error', text: `AI Connection Failed: ${result.error}` });
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-8 rounded-xl bg-[#111111] border border-[#222222] min-h-[400px] flex items-center justify-center animate-pulse">
        <div className="w-8 h-8 border-2 border-t-[#C8FF00] border-[#222222] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Tabs layout navigation properties
  const tabs: { 
    id: SettingsTabType; 
    label: string;
    planRequired?: 'pro' | 'enterprise'
  }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'team', label: 'Team' },
    { 
      id: 'branding', 
      label: 'Branding',
      planRequired: 'pro'
    },
    { 
      id: 'templates', 
      label: 'Templates',
      planRequired: 'pro'
    },
    { 
      id: 'webhooks', 
      label: 'Webhooks',
      planRequired: 'enterprise'
    },
    { id: 'plan', label: 'Plan' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-1 text-left">
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      
      {/* Settings Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#111111] border border-[#222222] text-[#C8FF00] rounded-xl shrink-0">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#EEEEEE] leading-none">Settings</h2>
            <p className="text-[#888888] text-[10px] font-semibold uppercase tracking-wider mt-1.5 font-mono">Account Settings</p>
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
              className="p-1 bg-[#C8FF00] text-[#080808] rounded-md hover:bg-[#b8ef00] transition-all ml-4 shrink-0 cursor-pointer"
              type="button"
            >
              <Zap size={10} className="fill-[#080808]" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide border-b border-[#222222] mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setMessage(null);
            }}
            className={cn(
              "px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-px relative cursor-pointer",
              activeTab === tab.id
                ? "border-[#C8FF00] text-[#C8FF00]"
                : "border-transparent text-[#888888] hover:text-[#EEEEEE]"
            )}
          >
            {tab.label}
            {tab.planRequired && 
             ((tab.planRequired === 'pro' && plan === 'free') ||
              (tab.planRequired === 'enterprise' && plan !== 'enterprise')) && (
              <span className="ml-1.5 text-[8px] bg-[#C8FF00]/10 text-[#C8FF00] border border-[#C8FF00]/20 px-1 py-0.5 rounded font-bold uppercase tracking-wider">
                {tab.planRequired === 'enterprise' ? 'ENT' : 'PRO'}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Render selected Tab Content with state & handlers */}
      <div>
        {activeTab === 'profile' && (
          <ProfileTab
            name={name}
            setName={setName}
            businessName={businessName}
            setBusinessName={setBusinessName}
            isAdmin={isAdmin}
            upiId={upiId}
            setUpiId={setUpiId}
            bankDetails={bankDetails}
            setBankDetails={setBankDetails}
            handleSaveProfile={handleSaveProfile}
            saving={saving}
            message={message}
            onTestAIConnection={handleTestAIConnection}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsTab
            notificationPreferences={notificationPreferences}
            onChangePreference={updatePreference}
            smsEnabled={smsEnabled}
            onSmsToggle={handleSmsToggle}
          />
        )}

        {activeTab === 'team' && (
          <TeamTab
            canManageMembers={canManageMembers}
            inviteEmail={inviteEmail}
            setInviteEmail={setInviteEmail}
            inviteRole={inviteRole}
            setInviteRole={setInviteRole}
            isInviting={isInviting}
            handleInviteMember={handleInviteMember}
            memberships={memberships}
            profile={profile}
            handleUpdateRole={handleUpdateRole}
            handleRemoveMember={handleRemoveMember}
            isOwner={isOwner}
            newOwnerId={newOwnerId}
            setNewOwnerId={setNewOwnerId}
            transferringOwnership={transferringOwnership}
            handleTransferOwnership={handleTransferOwnership}
            currentOrganization={currentOrganization}
          />
        )}

        {activeTab === 'branding' && (
          <BrandingTab
            plan={plan}
            logoUrl={logoUrl}
            setLogoUrl={setLogoUrl}
            uploading={uploading}
            saving={saving}
            message={message}
            handleLogoUpload={handleLogoUpload}
            handleSaveBranding={handleSaveBranding}
            setShowUpgradeModal={setShowUpgradeModal}
          />
        )}

        {activeTab === 'templates' && (
          <TemplatesTab
            plan={plan}
            templates={templates}
            setTemplates={setTemplates}
            handleSaveTemplates={handleSaveTemplates}
            saving={saving}
            message={message}
            setShowUpgradeModal={setShowUpgradeModal}
          />
        )}

        {activeTab === 'webhooks' && (
          <WebhooksTab
            plan={plan}
            webhooks={webhooks}
            setShowUpgradeModal={setShowUpgradeModal}
            organizationId={currentOrganization?.id || null}
            onRefresh={fetchSecurityData}
          />
        )}

        {activeTab === 'plan' && (
          <PlanTab
            currentPlan={currentPlan}
            isFreePlan={isFreePlan}
            limits={limits}
            setShowUpgradeModal={setShowUpgradeModal}
          />
        )}
      </div>

      {/* Message Notifications (Fixed Toast) for non-saving tabs */}
      {message && ['notifications', 'team', 'plan'].includes(activeTab) && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-xs font-semibold border shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{
            background: message.type === 'success' ? '#10B98115' : '#EF444415',
            borderColor: message.type === 'success' ? '#10B98125' : '#EF444425',
            color: message.type === 'success' ? '#10B981' : '#EF4444'
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
