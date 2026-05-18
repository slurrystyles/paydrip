import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';

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

export function useUsageLimits() {
  const { currentOrganization } = useOrganization();
  const [usage, setUsage] = useState<OrganizationUsage>(DEFAULT_USAGE);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    if (!currentOrganization) {
      setUsage({ ...DEFAULT_USAGE, isLoading: false });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const limitKeys = ['invoices_month', 'team_seats', 'ai_generations', 'automations_active'];
      const results: Record<string, any> = {};

      // Fetch each limit using the RPC function we created
      const fetchPromises = limitKeys.map(async (key) => {
        const { data, error } = await supabase.rpc('check_usage_limit', {
          p_org_id: currentOrganization.id,
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

      setUsage(newUsage);
    } catch (error) {
      console.error('Error fetching usage limits:', error);
      // Safe defaults if something fails
      setUsage({ ...DEFAULT_USAGE, isLoading: false });
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization]);

  useEffect(() => {
    fetchUsage();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchUsage, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  return {
    ...usage,
    refresh: fetchUsage,
    isLoading
  };
}
