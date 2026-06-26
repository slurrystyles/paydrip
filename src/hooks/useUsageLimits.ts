import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import { usePlan } from '../contexts/PlanContext';

export interface UsageLimit {
  current: number;
  limit: number;
  allowed: boolean;
  percentage: number;
}

export interface OrganizationUsage {
  plan: 'free' | 'pro' | 'enterprise';
  limits: {
    invoices_month: UsageLimit;
    team_seats: UsageLimit;
    ai_generations: UsageLimit;
    automations_active: UsageLimit;
  };
  isFreePlan: boolean;
  isProPlan: boolean;
  isEnterprise: boolean;
  canCreateInvoice: boolean;
  canAddMember: boolean;
  canCreateAutomation: boolean;
  isLoading: boolean;
}

const DEFAULT_LIMIT: UsageLimit = { current: 0, limit: -1, allowed: true, percentage: 0 };

const DEFAULT_USAGE: OrganizationUsage = {
  plan: 'free',
  limits: {
    invoices_month: DEFAULT_LIMIT,
    team_seats: DEFAULT_LIMIT,
    ai_generations: DEFAULT_LIMIT,
    automations_active: DEFAULT_LIMIT,
  },
  isFreePlan: true,
  isProPlan: false,
  isEnterprise: false,
  canCreateInvoice: true,
  canAddMember: true,
  canCreateAutomation: true,
  isLoading: true,
};

// Global shared cache and state to avoid multiple concurrent RPC calls
let globalUsage: OrganizationUsage = DEFAULT_USAGE;
let activeFetchPromise: Promise<OrganizationUsage> | null = null;
let lastFetchedOrgId: string | null = null;
let lastFetchedTime = 0;
const CACHE_TTL = 30 * 1000; // Cache valid for 30 seconds

const listeners = new Set<(usage: OrganizationUsage) => void>();

function notifyListeners() {
  listeners.forEach(listener => {
    try {
      listener(globalUsage);
    } catch (e) {
      console.error('Error propagating usage limit change to listener:', e);
    }
  });
}

export function useUsageLimits() {
  const { currentOrganization } = useOrganization();
  const { plan: userPlan } = usePlan();
  const [usage, setUsage] = useState<OrganizationUsage>(globalUsage);

  const fetchUsage = useCallback(async (force = false) => {
    if (!currentOrganization) {
      globalUsage = { ...DEFAULT_USAGE, isLoading: false };
      notifyListeners();
      return;
    }

    const orgId = currentOrganization.id;
    const now = Date.now();
    
    // Check if cache is still fresh and Org hasn't changed.
    if (!force && 
        lastFetchedOrgId === orgId && 
        (now - lastFetchedTime < CACHE_TTL) &&
        !globalUsage.isLoading) {
      // Set local state to the current global state immediately and skip fetch
      setUsage(globalUsage);
      return;
    }

    // Deduplicate concurrent active requests
    if (activeFetchPromise && lastFetchedOrgId === orgId) {
      await activeFetchPromise;
      return;
    }

    activeFetchPromise = (async () => {
      try {
        const limitKeys = ['invoices_month', 'team_seats', 'ai_generations', 'automations_active'];
        const results: Record<string, any> = {};

        // Fetch each limit using the RPC function we created in parallel
        const fetchPromises = limitKeys.map(async (key) => {
          const { data, error } = await supabase.rpc('check_usage_limit', {
            p_org_id: orgId,
            p_limit_key: key
          });
          
          if (error) {
            console.error(`Error checking limit ${key}:`, error);
            return { key, data: { allowed: true, current: 0, limit: -1, plan: 'free' } };
          }
          
          return { key, data };
        });

        const responses = await Promise.all(fetchPromises);
        responses.forEach(res => {
          results[res.key] = res.data;
        });

        const plan: OrganizationUsage['plan'] = results.invoices_month.plan || 'free';

        const calculateLimit = (data: any): UsageLimit => {
          const current = data.current || 0;
          const limit = data.limit;
          const percentage = limit === -1 ? 0 : Math.min(100, (current / limit) * 100);
          return {
            current,
            limit,
            allowed: data.allowed,
            percentage
          };
        };

        const newUsage: OrganizationUsage = {
          plan,
          limits: {
            invoices_month: calculateLimit(results.invoices_month),
            team_seats: calculateLimit(results.team_seats),
            ai_generations: calculateLimit(results.ai_generations),
            automations_active: calculateLimit(results.automations_active),
          },
          isFreePlan: plan === 'free',
          isProPlan: plan === 'pro',
          isEnterprise: plan === 'enterprise',
          canCreateInvoice: results.invoices_month.allowed,
          canAddMember: results.team_seats.allowed,
          canCreateAutomation: results.automations_active.allowed,
          isLoading: false,
        };

        globalUsage = newUsage;
        lastFetchedOrgId = orgId;
        lastFetchedTime = Date.now();
        notifyListeners();
        return newUsage;
      } catch (error) {
        console.error('Error fetching usage limits:', error);
        globalUsage = { ...DEFAULT_USAGE, isLoading: false };
        notifyListeners();
        return globalUsage;
      } finally {
        activeFetchPromise = null;
      }
    })();

    await activeFetchPromise;
  }, [currentOrganization]);

  useEffect(() => {
    // Sync current listener state immediately with the dynamic globalCache
    setUsage(globalUsage);
    
    listeners.add(setUsage);
    
    // Trigger pull
    fetchUsage();

    return () => {
      listeners.delete(setUsage);
    };
  }, [fetchUsage]);

  // Periodic background refresh if any instance is alive
  useEffect(() => {
    if (!currentOrganization) return;
    const interval = setInterval(() => {
      fetchUsage(true);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchUsage, currentOrganization]);

  const effectivePlan = (userPlan && userPlan !== 'free') ? userPlan : usage.plan;
  const isFreePlan = effectivePlan === 'free';
  const isProPlan = effectivePlan === 'pro';
  const isEnterprise = effectivePlan === 'enterprise';

  const modifiedLimits = { ...usage.limits };
  
  if (effectivePlan !== usage.plan) {
    if (effectivePlan === 'pro') {
      modifiedLimits.invoices_month = {
        current: usage.limits.invoices_month?.current || 0,
        limit: 500,
        allowed: (usage.limits.invoices_month?.current || 0) < 500,
        percentage: Math.min(100, ((usage.limits.invoices_month?.current || 0) / 500) * 100)
      };
      modifiedLimits.team_seats = {
        current: usage.limits.team_seats?.current || 0,
        limit: 3,
        allowed: (usage.limits.team_seats?.current || 0) < 3,
        percentage: Math.min(100, ((usage.limits.team_seats?.current || 0) / 3) * 100)
      };
      modifiedLimits.ai_generations = {
        current: usage.limits.ai_generations?.current || 0,
        limit: 100,
        allowed: (usage.limits.ai_generations?.current || 0) < 100,
        percentage: Math.min(100, ((usage.limits.ai_generations?.current || 0) / 100) * 100)
      };
      modifiedLimits.automations_active = {
        current: usage.limits.automations_active?.current || 0,
        limit: 50,
        allowed: (usage.limits.automations_active?.current || 0) < 50,
        percentage: Math.min(100, ((usage.limits.automations_active?.current || 0) / 50) * 100)
      };
    } else if (effectivePlan === 'enterprise') {
      modifiedLimits.invoices_month = {
        current: usage.limits.invoices_month?.current || 0,
        limit: -1,
        allowed: true,
        percentage: 0
      };
      modifiedLimits.team_seats = {
        current: usage.limits.team_seats?.current || 0,
        limit: -1,
        allowed: true,
        percentage: 0
      };
      modifiedLimits.ai_generations = {
        current: usage.limits.ai_generations?.current || 0,
        limit: -1,
        allowed: true,
        percentage: 0
      };
      modifiedLimits.automations_active = {
        current: usage.limits.automations_active?.current || 0,
        limit: -1,
        allowed: true,
        percentage: 0
      };
    }
  }

  const finalUsage = {
    ...usage,
    plan: effectivePlan,
    limits: modifiedLimits,
    isFreePlan,
    isProPlan,
    isEnterprise,
    canCreateInvoice: !isFreePlan || modifiedLimits.invoices_month.allowed,
    canAddMember: !isFreePlan || modifiedLimits.team_seats.allowed,
    canCreateAutomation: !isFreePlan || modifiedLimits.automations_active.allowed,
  };

  return {
    ...finalUsage,
    refresh: () => fetchUsage(true),
  };
}
