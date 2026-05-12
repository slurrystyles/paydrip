import { supabase } from './supabase';

export const securityService = {
  /**
   * Check rate limit for a specific action
   */
  async checkRateLimit(action: string, limit: number = 10, windowSeconds: number = 60) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // In a real browser environment, IP might be hard to get reliably without a shim,
    // but we use 0.0.0.0 or a placeholder for client-side call if needed, 
    // or let the RPC handle it via connection info.
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_id: user?.id,
      p_ip: '0.0.0.0', // RPC could potentially detect this or we pass it
      p_action: action,
      p_limit: limit,
      p_window_seconds: windowSeconds
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      return true; // Soft fail - allow if security system has an error
    }

    return data as boolean;
  },

  /**
   * Enterprise Audit Logging
   */
  async logAudit(params: {
    action: string;
    resourceType: string;
    resourceId?: string;
    organizationId?: string;
    severity?: 'notice' | 'warning' | 'alert' | 'critical';
    metadata?: any;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        actor_id: user?.id,
        actor_type: user ? 'user' : 'anonymous',
        organization_id: params.organizationId,
        action: params.action,
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        severity: params.severity || 'notice',
        ip_address: '0.0.0.0',
        user_agent: navigator.userAgent,
        payload_snapshot: params.metadata
      }]);

    if (error) console.error('Audit log failed:', error);
  },

  /**
   * Verify Worker Pulse
   */
  async logWorkerPulse(workerName: string, status: string, metadata?: any) {
    const { error } = await supabase
      .from('worker_execution_logs')
      .insert([{
        worker_name: workerName,
        execution_id: crypto.randomUUID(),
        status: status,
        metadata: metadata
      }]);
      
    if (error) console.error('Worker pulse log failed:', error);
  }
};
