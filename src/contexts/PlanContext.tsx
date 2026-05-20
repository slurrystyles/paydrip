import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

type Plan = 'free' | 'pro' | 'enterprise';

// Shared module-level cache for plan data to prevent redundant fetches
let cachedPlan: 'free' | 'pro' | 'enterprise' = 'free';
let cachedProfile: UserProfile | null = null;
let cachedInvoiceCount = 0;
let lastPlanFetchedTime = 0;
const PLAN_CACHE_TTL = 30 * 1000; // Cache valid for 30 seconds

interface PlanContextType {
  plan: Plan;
  invoiceCount: number;
  loading: boolean;
  isLimitReached: boolean;
  refreshPlanData: (force?: boolean) => Promise<void>;
  profile: UserProfile | null;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<Plan>(cachedPlan);
  const [invoiceCount, setInvoiceCount] = useState(cachedInvoiceCount);
  const [loading, setLoading] = useState(lastPlanFetchedTime === 0);
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile);

  const refreshPlanData = async (force = false) => {
    const now = Date.now();
    if (!force && lastPlanFetchedTime > 0 && (now - lastPlanFetchedTime < PLAN_CACHE_TTL)) {
      setPlan(cachedPlan);
      setProfile(cachedProfile);
      setInvoiceCount(cachedInvoiceCount);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch Profile for the plan and Invoice Count in parallel
      const [profileRes, invoicesRes] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
      ]);
      
      if (profileRes.data) {
        const profileData = profileRes.data;
        const fallbackPlan = profileData.plan || 'free';
        setPlan(fallbackPlan);
        setProfile(profileData);
        cachedPlan = fallbackPlan;
        cachedProfile = profileData;
      }

      if (!invoicesRes.error && invoicesRes.count !== null) {
        setInvoiceCount(invoicesRes.count);
        cachedInvoiceCount = invoicesRes.count;
      }
      
      lastPlanFetchedTime = Date.now();
    } catch (e) {
      console.error('Error in refreshPlanData:', e);
    } finally {
      setLoading(false);
    }
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

  const isLimitReached = plan === 'free' && invoiceCount >= 10;

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
