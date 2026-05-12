import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Organization, Membership } from '../types';

interface OrganizationContextType {
  currentOrganization: Organization | null;
  memberships: Membership[];
  loading: boolean;
  setOrganization: (orgId: string) => Promise<void>;
  isAdmin: boolean;
  isOwner: boolean;
  capabilities: string[];
  createOrganization: (name: string, type?: string) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMemberships = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('memberships')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching memberships:', error);
    } else {
      setMemberships(data || []);
      
      // Select first organization as default if none selected
      if (data && data.length > 0 && !currentOrganization) {
        // Try to get stored org ID from localStorage
        const storedOrgId = localStorage.getItem('paydrip_org_id');
        const selected = data.find(m => m.organization_id === storedOrgId) || data[0];
        setCurrentOrganization(selected.organization || null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMemberships();
  }, []);

  const setOrganization = async (orgId: string) => {
    const membership = memberships.find(m => m.organization_id === orgId);
    if (membership && membership.organization) {
      setCurrentOrganization(membership.organization);
      localStorage.setItem('paydrip_org_id', orgId);
      // Reload page or re-fetch data to apply new tenant context
      window.location.reload();
    }
  };

  const currentMembership = memberships.find(m => m.organization_id === currentOrganization?.id);
  const role = currentMembership?.role;

  const createOrganization = async (name: string, type: string = 'standard') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 1. Create Organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert([{
        name,
        type,
        is_active: true
      }])
      .select()
      .single();

    if (orgError) throw orgError;

    // 2. Create Membership (as owner)
    const { error: memError } = await supabase
      .from('memberships')
      .insert([{
        organization_id: org.id,
        user_id: user.id,
        role: 'owner',
        is_active: true
      }]);

    if (memError) throw memError;

    // 3. Refresh and select
    await fetchMemberships();
    await setOrganization(org.id);
  };

  const isAdmin = role === 'admin' || role === 'owner';
  const isOwner = role === 'owner';

  // Derived capabilities based on role
  const capabilities = React.useMemo(() => {
    if (!role) return [];
    const base = ['read'];
    if (['owner', 'admin', 'manager', 'operator'].includes(role)) base.push('write', 'recover');
    if (['owner', 'admin', 'manager', 'analyst'].includes(role)) base.push('analyze');
    if (['owner', 'admin'].includes(role)) base.push('billing', 'settings', 'manage_users');
    return base;
  }, [role]);

  return (
    <OrganizationContext.Provider value={{ 
      currentOrganization, 
      memberships, 
      loading, 
      setOrganization,
      isAdmin,
      isOwner,
      capabilities,
      createOrganization
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
