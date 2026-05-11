import { supabase } from './supabase';
import { 
  Invoice, 
  RecoveryStage, 
  ReminderTimeline, 
  ClientRiskScore,
  EscalationRule 
} from '../types';

export const recoveryService = {
  /**
   * Log a reminder to the timeline
   */
  async logReminder(reminder: Omit<ReminderTimeline, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('reminder_timeline')
      .insert([reminder])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update invoice recovery stage
   */
  async updateRecoveryStage(invoiceId: string, stage: RecoveryStage, escalationLevel?: number) {
    const updateData: any = { recovery_stage: stage };
    if (escalationLevel !== undefined) {
      updateData.escalation_level = escalationLevel;
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Calculate and update risk score for a client
   */
  async calculateRiskScore(clientId: string, userId: string) {
    // 1. Fetch client history
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('*, payments(*), reminder_timeline(*)')
      .eq('client_id', clientId);

    if (invError) throw invError;

    // 2. Compute metrics
    let overdueCount = 0;
    let totalDelayDays = 0;
    let ignoredReminders = 0;
    let partialPayments = 0;
    let recoveryFailures = 0;

    invoices?.forEach(inv => {
      const isOverdue = new Date(inv.due_date) < new Date() && inv.status !== 'paid';
      if (isOverdue) overdueCount++;
      
      if (inv.recovery_stage === 'failed') recoveryFailures++;
      
      const reminders = inv.reminder_timeline || [];
      const hasPayments = inv.payments && inv.payments.length > 0;
      
      if (reminders.length > 2 && !hasPayments && isOverdue) {
        ignoredReminders += reminders.length;
      }

      if (hasPayments && inv.status !== 'paid') {
        partialPayments++;
      }

      if (inv.status === 'paid' && inv.payments && inv.payments.length > 0) {
        const lastPayment = new Date(Math.max(...inv.payments.map((p: any) => new Date(p.paid_at).getTime())));
        const dueDate = new Date(inv.due_date);
        if (lastPayment > dueDate) {
          totalDelayDays += Math.floor((lastPayment.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
    });

    const avgDelayDays = invoices?.length ? totalDelayDays / invoices.length : 0;
    
    // Simple scoring algorithm
    let score = (overdueCount * 10) + (avgDelayDays * 2) + (ignoredReminders * 5) + (recoveryFailures * 20);
    score = Math.min(100, Math.max(0, score));

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (score > 60) riskLevel = 'high';
    else if (score > 30) riskLevel = 'medium';

    const riskScore: Omit<ClientRiskScore, 'last_calculated_at'> = {
      client_id: clientId,
      user_id: userId,
      score,
      risk_level: riskLevel,
      metrics: {
        overdue_count: overdueCount,
        avg_delay_days: avgDelayDays,
        ignored_reminders: ignoredReminders,
        partial_payments: partialPayments,
        recovery_failures: recoveryFailures
      }
    };

    const { data, error } = await supabase
      .from('client_risk_scores')
      .upsert(riskScore)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get overall recovery analytics
   */
  async getRecoveryStats(userId: string) {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*, payments(*)')
      .eq('user_id', userId);

    if (error) throw error;

    const stats = {
      moneyAtRisk: 0,
      overdueCount: 0,
      recoveredRevenue: 0,
      totalInvoices: invoices?.length || 0,
      activeEscalations: 0,
      successRate: 0,
      avgRecoveryDays: 0
    };

    let recoveredCount = 0;
    let totalRecoveryDays = 0;

    invoices?.forEach(inv => {
      const amount = Number(inv.amount);
      if (inv.status === 'paid') {
        stats.recoveredRevenue += amount;
        recoveredCount++;
        
        // Calculate recovery days
        const createdAt = new Date(inv.created_at);
        const lastPayment = inv.payments?.length 
          ? new Date(Math.max(...inv.payments.map((p: any) => new Date(p.paid_at).getTime())))
          : null;
        
        if (lastPayment) {
          totalRecoveryDays += Math.floor((lastPayment.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        }
      } else {
        const isOverdue = new Date(inv.due_date) < new Date();
        if (isOverdue) {
          stats.moneyAtRisk += amount;
          stats.overdueCount++;
        }
        if (inv.escalation_level > 0) {
          stats.activeEscalations++;
        }
      }
    });

    stats.successRate = stats.totalInvoices ? (recoveredCount / stats.totalInvoices) * 100 : 0;
    stats.avgRecoveryDays = recoveredCount ? totalRecoveryDays / recoveredCount : 0;

    return stats;
  },

  /**
   * Schedule a reminder in the automated queue
   */
  async scheduleReminder(item: any) {
    const { data, error } = await supabase
      .from('escalation_queue')
      .insert([{
        ...item,
        status: 'pending',
        retry_count: 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Process pending items in the escalation queue
   */
  async processQueue() {
    const { data: items, error } = await supabase
      .from('escalation_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString());

    if (error) throw error;

    for (const item of (items || [])) {
      try {
        // Log to timeline
        await this.logReminder({
          invoice_id: item.invoice_id,
          user_id: item.user_id,
          sent_at: new Date().toISOString(),
          channel: item.channel,
          tone: 'firm',
          delivery_status: 'delivered',
          reminder_type: 'automatic',
          message_content: `Automated ${item.channel} reminder processed.`
        });

        await supabase
          .from('escalation_queue')
          .update({ status: 'completed' })
          .eq('id', item.id);
      } catch (err) {
        await supabase
          .from('escalation_queue')
          .update({ 
            status: 'failed',
            retry_count: (item.retry_count || 0) + 1
          })
          .eq('id', item.id);
      }
    }
  },

  /**
   * Record a legal notice for an invoice
   */
  async recordLegalNotice(invoiceId: string, userId: string, details: any) {
    const { data: notice, error: noticeError } = await supabase
      .from('legal_notices')
      .insert([{
        invoice_id: invoiceId,
        user_id: userId,
        status: 'draft',
        notice_type: details.notice_type || 'first_warning',
        content_snapshot: details
      }])
      .select()
      .single();

    if (noticeError) throw noticeError;

    // Transition invoice to legal_warning
    await this.updateRecoveryStage(invoiceId, 'legal_warning', 5);

    return notice;
  }
};
