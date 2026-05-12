import { supabase } from './supabase';
import { securityService } from './securityService';
import { 
  Invoice, 
  RecoveryStage, 
  ReminderTimeline, 
  ClientRiskScore,
  EscalationRule 
} from '../types';
import { GoogleGenAI } from '@google/genai';

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const recoveryService = {
  /**
   * Log an event to the system trail
   */
  async logEvent(event: {
    invoice_id: string;
    user_id: string;
    organization_id: string;
    event_type: 'creation' | 'status_change' | 'reminder' | 'payment' | 'recovery_escalation' | 'legal_action' | 'risk_change' | 'system_note';
    metadata?: any;
  }) {
    const { data, error } = await supabase
      .from('invoice_events')
      .insert([event])
      .select()
      .single();

    if (error) console.error('Failed to log event:', error);
    return data;
  },

  /**
   * Log a reminder to the timeline
   */
  async logReminder(reminder: Omit<ReminderTimeline, 'id' | 'created_at' | 'updated_at'> & { organization_id: string }) {
    const { data, error } = await supabase
      .from('reminder_timeline')
      .insert([reminder])
      .select()
      .single();

    if (error) throw error;

    // Log event
    await this.logEvent({
      invoice_id: reminder.invoice_id,
      user_id: reminder.user_id,
      organization_id: reminder.organization_id,
      event_type: 'reminder',
      metadata: { channel: reminder.channel, tone: reminder.tone, type: reminder.reminder_type }
    });

    return data;
  },

  /**
   * Update invoice recovery stage with event logging
   */
  async updateRecoveryStage(invoiceId: string, stage: RecoveryStage, organizationId: string, escalationLevel?: number) {
    // Security: Log audit
    await securityService.logAudit({
      action: 'stage_update',
      resourceType: 'invoice',
      resourceId: invoiceId,
      organizationId,
      metadata: { stage, level: escalationLevel }
    });

    const updateData: any = { recovery_stage: stage, updated_at: new Date().toISOString() };
    if (escalationLevel !== undefined) {
      updateData.escalation_level = escalationLevel;
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    // Log escalation event
    await this.logEvent({
      invoice_id: invoiceId,
      user_id: data.user_id,
      organization_id: organizationId,
      event_type: 'recovery_escalation',
      metadata: { stage, level: escalationLevel }
    });

    return data;
  },

  /**
   * Calculate and update risk score for a client using Adaptive Intelligence
   */
  async calculateRiskScore(clientId: string, userId: string, organizationId: string) {
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('*, payments(*), reminder_timeline(*)')
      .eq('client_id', clientId)
      .eq('organization_id', organizationId);

    if (invError) throw invError;

    // Behavioral Metrics
    let overdueCount = 0;
    let totalDelayDays = 0;
    let totalRemindersSent = 0;
    let responsiveReminders = 0;
    let ghostingDetected = false;
    let settlementDurations: number[] = [];

    invoices?.forEach(inv => {
      const isOverdue = new Date(inv.due_date) < new Date() && inv.status !== 'paid';
      const reminders = inv.reminder_timeline || [];
      const pays = inv.payments || [];
      
      if (isOverdue) overdueCount++;
      totalRemindersSent += reminders.length;

      // Responsiveness: Did they pay or communicate after a reminder?
      reminders.forEach(rem => {
        const afterRem = pays.filter(p => new Date(p.paid_at) > new Date(rem.sent_at));
        if (afterRem.length > 0) responsiveReminders++;
      });

      // Settlement Duration
      if (inv.status === 'paid' && pays.length > 0) {
        const lastPay = new Date(Math.max(...pays.map((p: any) => new Date(p.paid_at).getTime())));
        const duration = (lastPay.getTime() - new Date(inv.due_date).getTime()) / (1000 * 86400);
        settlementDurations.push(Math.max(0, duration));
        totalDelayDays += Math.max(0, duration);
      }

      // Check for Ghosting
      if (isOverdue && reminders.length > 3 && pays.length === 0) {
        ghostingDetected = true;
      }
    });

    const paidCount = settlementDurations.length;
    const avgDelay = paidCount ? totalDelayDays / paidCount : 15;
    const responsivenessRatio = totalRemindersSent ? (responsiveReminders / totalRemindersSent) * 100 : 50;
    
    // Adaptive Scoring Algorithm (0-100)
    let baseScore = (overdueCount * 12) + (avgDelay * 1.2) + (100 - responsivenessRatio) * 0.4;
    if (ghostingDetected) baseScore += 25;
    
    const score = Math.min(100, Math.max(0, baseScore));
    let riskLevel: 'minimal' | 'low' | 'medium' | 'high' | 'critical' = 'minimal';
    if (score > 85) riskLevel = 'critical';
    else if (score > 65) riskLevel = 'high';
    else if (score > 40) riskLevel = 'medium';
    else if (score > 15) riskLevel = 'low';

    // Predictive Recovery Probability
    let recoveryProbability = 100 - (score * 0.8) - (overdueCount * 2);
    if (avgDelay > 60) recoveryProbability -= 15;
    recoveryProbability = Math.min(98, Math.max(5, recoveryProbability));

    const riskData = {
      client_id: clientId,
      user_id: userId,
      organization_id: organizationId,
      score,
      risk_level: riskLevel,
      metrics: {
        overdue_count: overdueCount,
        avg_delay_days: avgDelay,
        responsiveness_ratio: responsivenessRatio,
        recovery_probability: recoveryProbability,
        ghosting_detected: ghostingDetected
      },
      last_calculated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('client_risk_scores')
      .upsert(riskData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * AI-Powered Strategic Recommendations
   */
  async getStrategicRecommendation(invoice: any, risk: any, organizationId: string) {
    const daysOverdue = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 86400));
    const prob = risk?.metrics?.recovery_probability || 70;
    
    // Plan Enforcement: Check if user can use AI recommendations
    const entitled = await this.checkEntitlement('ai_recommendations', organizationId);
    // if (!entitled) return null; // We can show a simplified version instead of returning null

    let recommendation = {
      action: 'Send Polite Nudge',
      tone: 'polite',
      timing: 'Today',
      strategy: 'Client is relatively new or has low overdue count. Keep it soft.',
      urgency: 'low' as 'low' | 'medium' | 'high' | 'critical'
    };

    if (prob < 40) {
      recommendation = {
        action: 'Legal Escalation',
        tone: 'final',
        timing: 'Immediate',
        strategy: 'Critical high risk detected. Ghosting pattern identified. Move to legal notice.',
        urgency: 'critical'
      };
    } else if (daysOverdue > 30 || risk?.score > 60) {
      recommendation = {
        action: 'Firm WhatsApp',
        tone: 'firm',
        timing: 'Morning (Best Response)',
        strategy: 'Follow-up fatigue detected. Tighter follow-up window required.',
        urgency: 'high'
      };
    } else if (risk?.metrics?.responsiveness_ratio < 30) {
      recommendation = {
        action: 'Variable Tone Nudge',
        tone: 'firm',
        timing: 'Within 48h',
        strategy: 'Client typically unresponsive. Rotate channels or tone.',
        urgency: 'medium'
      };
    }

    return recommendation;
  },

  /**
   * Behavior-Aware AI Reminder Generation
   */
  async generateAIReminder(context: {
    amount: number;
    daysOverdue: number;
    tone: 'polite' | 'firm' | 'final';
    clientName: string;
    businessName: string;
    riskLevel: string;
    organizationId: string;
    previousTone?: string;
    hasPartialPayments?: boolean;
  }) {
    // Security: Rate Limit AI Generation
    const allowed = await securityService.checkRateLimit('ai_reminder_generation', 5, 3600);
    if (!allowed) throw new Error('AI Generation limit exceeded. Please wait or upgrade.');

    // Plan Enforcement
    const entitled = await this.checkEntitlement('ai_generations', context.organizationId);
    if (!entitled) throw new Error('AI Generation quota reached for this organization.');

    if (!process.env.GEMINI_API_KEY) throw new Error('AI Service Unconfigured');

    const prompt = `
      Act as an Adaptive AI Recovery Agent for "${context.businessName}".
      Generate a high-conversion payment nudge for client "${context.clientName}".
      
      Intelligence Context:
      - Amount: ₹${context.amount}
      - Overdue: ${context.daysOverdue} days
      - Risk Level: ${context.riskLevel}
      - Tone: ${context.tone}
      - Last Reminder Tone: ${context.previousTone || 'None'}
      - Partial Payments Made: ${context.hasPartialPayments ? 'Yes' : 'No'}
      
      Requirement:
      - Form: WhatsApp-ready message (Short, Punchy, High-Urgency).
      - Personalization Strike: Use the client's name and acknowledge history (e.g., "following up on our previous chat").
      - Tone Calibration: If "${context.tone}" is final, maintain professional authority. If partial payments exist, leverage the "momentum" of their response.
      - CTA Optimization: Clear, single-click directive. Use "Payment Link: {{link}}".
      - Output Structure: JSON ONLY { "subject": "Brief Meta", "message": "The body", "strategy_node": "Why this message works" }
    `;

    const result = await client.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```json|```/g, '').trim() || '{}';
    return JSON.parse(text);
  },

  /**
   * Get overall recovery analytics
   */
  async getRecoveryStats(organizationId: string) {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*, payments(*)')
      .eq('organization_id', organizationId);

    if (error) throw error;

    const stats = {
      moneyAtRisk: 0,
      overdueCount: 0,
      recoveredRevenue: 0,
      totalInvoices: invoices?.length || 0,
      activeEscalations: 0,
      successRate: 0,
      avgRecoveryDays: 0,
      highRiskClients: 0
    };

    let recoveredCount = 0;
    let totalRecoveryDays = 0;

    invoices?.forEach(inv => {
      const amount = Number(inv.amount);
      if (inv.status === 'paid') {
        stats.recoveredRevenue += amount;
        recoveredCount++;
        
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
   * Usage & Plan Enforcement
   */
  async checkEntitlement(metric: string, organizationId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase.rpc('security.increment_usage', {
      p_org_id: organizationId,
      p_metric: metric,
      p_amount: 1,
      p_user_id: user.id
    });

    if (error) {
      console.error('Usage check failed:', error);
      // Fallback to allow if system error, but log it
      return true;
    }

    return data as boolean;
  },

  async getUsageStats(organizationId: string) {
    const { data, error } = await supabase
      .from('usage_counters')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('period_start', new Date().toISOString().slice(0, 7) + '-01T00:00:00Z'); // Current month

    if (error) throw error;
    return data;
  },

  async recordLegalNotice(invoiceId: string, userId: string, organizationId: string, details: any) {
    // Plan Enforcement: Check if user can send legal notice
    const allowed = await this.checkEntitlement('legal_notices_sent', organizationId);
    if (!allowed) throw new Error('Legal Notice limit reached for your current plan.');

    const { error } = await supabase.from('legal_notices').insert([{
      invoice_id: invoiceId,
      user_id: userId,
      organization_id: organizationId,
      ...details
    }]);

    if (error) throw error;

    // Update invoice stage
    await supabase.from('invoices').update({
       recovery_stage: 'legal_warning',
       escalation_level: 5,
       updated_at: new Date().toISOString()
    }).eq('id', invoiceId).eq('organization_id', organizationId);

    await this.logEvent({
      invoice_id: invoiceId,
      user_id: userId,
      organization_id: organizationId,
      event_type: 'legal_action',
      metadata: { template: details.template }
    });
  },

  /**
   * Bulk Actions
   */
  async bulkProcessInvoices(invoiceIds: string[], action: 'nudge' | 'escalate' | 'pause' | 'resume', organizationId: string) {
    if (action === 'pause' || action === 'resume') {
      const { error } = await supabase
        .from('invoices')
        .update({ automation_paused: action === 'pause' })
        .in('id', invoiceIds)
        .eq('organization_id', organizationId);
      if (error) throw error;
    }

    if (action === 'escalate') {
      // mass escalation logic
    }
  },

  async toggleDispute(invoiceId: string, status: boolean, organizationId: string) {
    const { error } = await supabase
      .from('invoices')
      .update({ is_disputed: status, automation_paused: status })
      .eq('id', invoiceId)
      .eq('organization_id', organizationId);
    if (error) throw error;

    const { data: { user } } = await supabase.auth.getUser();

    await this.logEvent({
      invoice_id: invoiceId,
      user_id: user?.id || '',
      organization_id: organizationId,
      event_type: 'system_note',
      metadata: { action: 'dispute_toggle', status }
    });
  },

  async retryQueueItem(itemId: string, organizationId: string) {
    const { error } = await supabase
      .from('escalation_queue')
      .update({ 
        status: 'pending', 
        attempt_count: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .eq('organization_id', organizationId);
    if (error) throw error;
  }
};
