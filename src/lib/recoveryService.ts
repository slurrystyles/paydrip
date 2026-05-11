import { supabase } from './supabase';
import { 
  Invoice, 
  RecoveryStage, 
  ReminderTimeline, 
  ClientRiskScore,
  EscalationRule 
} from '../types';
import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const recoveryService = {
  /**
   * Log an event to the system trail
   */
  async logEvent(event: {
    invoice_id: string;
    user_id: string;
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
  async logReminder(reminder: Omit<ReminderTimeline, 'id' | 'created_at' | 'updated_at'>) {
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
      event_type: 'reminder',
      metadata: { channel: reminder.channel, tone: reminder.tone, type: reminder.reminder_type }
    });

    return data;
  },

  /**
   * Update invoice recovery stage with event logging
   */
  async updateRecoveryStage(invoiceId: string, stage: RecoveryStage, escalationLevel?: number) {
    const updateData: any = { recovery_stage: stage, updated_at: new Date().toISOString() };
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

    // Log escalation event
    await this.logEvent({
      invoice_id: invoiceId,
      user_id: data.user_id,
      event_type: 'recovery_escalation',
      metadata: { stage, level: escalationLevel }
    });

    return data;
  },

  /**
   * Calculate and update risk score for a client using production-grade logic
   */
  async calculateRiskScore(clientId: string, userId: string) {
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('*, payments(*), reminder_timeline(*)')
      .eq('client_id', clientId);

    if (invError) throw invError;

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
      const hasPayments = (inv.payments?.length || 0) > 0;
      
      if (reminders.length > 2 && !hasPayments && isOverdue) {
        ignoredReminders += reminders.length;
      }

      const totalPaid = inv.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
      if (totalPaid > 0 && totalPaid < Number(inv.amount)) {
        partialPayments++;
      }

      if (inv.status === 'paid' && hasPayments) {
        const lastPayment = new Date(Math.max(...inv.payments.map((p: any) => new Date(p.paid_at).getTime())));
        const dueDate = new Date(inv.due_date);
        if (lastPayment > dueDate) {
          totalDelayDays += Math.floor((lastPayment.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
    });

    const paidCount = invoices?.filter(i => i.status === 'paid').length || 0;
    const avgDelayDays = paidCount ? totalDelayDays / paidCount : 0;
    
    // Advanced Scoring Algorithm (0-100)
    let score = (overdueCount * 15) + (avgDelayDays * 1.5) + (ignoredReminders * 8) + (recoveryFailures * 30);
    score = Math.min(100, Math.max(0, score));

    let riskLevel: 'minimal' | 'low' | 'medium' | 'high' | 'critical' = 'minimal';
    if (score > 80) riskLevel = 'critical';
    else if (score > 60) riskLevel = 'high';
    else if (score > 40) riskLevel = 'medium';
    else if (score > 15) riskLevel = 'low';

    const riskData = {
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
      },
      last_calculated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('client_risk_scores')
      .upsert(riskData)
      .select()
      .single();

    if (error) throw error;

    await this.logEvent({
      invoice_id: invoices?.[0]?.id || '',
      user_id: userId,
      event_type: 'risk_change',
      metadata: { clientId, level: riskLevel, score }
    });

    return data;
  },

  /**
   * AI-Powered Reminder Generation
   */
  async generateAIReminder(context: {
    amount: number;
    daysOverdue: number;
    tone: 'polite' | 'firm' | 'final';
    clientName: string;
    businessName: string;
    riskLevel: string;
  }) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('AI Service Unconfigured');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      Act as a professional payment recovery expert for a business named "${context.businessName}".
      Generate a WhatsApp reminder message for client "${context.clientName}" regarding overdue invoice of ₹${context.amount}.
      Days overdue: ${context.daysOverdue}.
      Client Risk Level: ${context.riskLevel}.
      Requested Tone: ${context.tone}.
      
      Requirements:
      - Short, punchy, and effective for WhatsApp.
      - Include a clear call to action.
      - If tone is "final", mention potential legal escalation.
      - Do not include placeholders like [Link], use the phrase "Payment Link: {{link}}".
      - Output JSON format: { "subject": "...", "message": "...", "nextStep": "..." }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, '').trim();
    
    return JSON.parse(text);
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
  }
};
