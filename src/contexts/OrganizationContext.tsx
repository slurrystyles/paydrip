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

    const { data: membershipData, error: memError } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (memError) {
      console.error('Error fetching memberships:', memError);
      setLoading(false);
      return;
    }

    if (membershipData && membershipData.length > 0) {
      const orgIds = membershipData.map(m => m.organization_id);
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds);

      if (orgError) {
        console.error('Error fetching organizations:', orgError);
      }

      const combinedData = membershipData.map(m => ({
        ...m,
        organization: orgData?.find(o => o.id === m.organization_id) || null
      }));

      setMemberships(combinedData);
      
      // Select first organization as default if none selected
      if (combinedData.length > 0 && !currentOrganization) {
        const storedOrgId = localStorage.getItem('paydrip_org_id');
        const selected = combinedData.find(m => m.organization_id === storedOrgId) || combinedData[0];
        setCurrentOrganization(selected.organization || null);
      }
    } else {
      setMemberships([]);
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

  const createOrganization = async (
    name: string, 
    type: string = 'standard'
  ) => {
    const { data, error } = await supabase
      .rpc('create_organization', {
        org_name: name,
        org_type: type
      });

    if (error) throw error;

    await fetchMemberships();
    if (data?.id) {
      await setOrganization(data.id);
    }
  };

  const isAdmin = role === 'admin' || role === 'owner';
  const isOwner = role === 'owner';

  // Derived capabilities based on role
  const capabilities = React.useMemo(() => {
    if (!role) return [];
    const base = ['read'];
    if (['owner', 'admin', 'member'].includes(role)) base.push('write', 'recover');
    if (['owner', 'admin', 'member'].includes(role)) base.push('analyze');
    if (['owner', 'admin'].includes(role)) base.push('settings', 'manage_users');
    if (role === 'owner') base.push('billing');
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
