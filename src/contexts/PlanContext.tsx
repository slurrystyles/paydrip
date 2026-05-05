import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

type Plan = 'free' | 'pro';

interface PlanContextType {
  plan: Plan;
  invoiceCount: number;
  loading: boolean;
  isLimitReached: boolean;
  refreshPlanData: () => Promise<void>;
  profile: UserProfile | null;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<Plan>('free');
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const refreshPlanData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch Profile for the plan
    const { data: profileData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileData) {
      setPlan(profileData.plan || 'free');
      setProfile(profileData);
    }

    // Fetch Invoice Count
    const { count, error } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true });
    
    if (!error && count !== null) {
      setInvoiceCount(count);
    }

    setLoading(false);
  };

  useEffect(() => {
    refreshPlanData();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshPlanData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isLimitReached = plan === 'free' && invoiceCount >= 5;

  return (
    <PlanContext.Provider value={{ plan, invoiceCount, loading, isLimitReached, refreshPlanData, profile }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
}
