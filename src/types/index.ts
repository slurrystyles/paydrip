export interface WhatsAppTemplates {
  polite?: string;
  firm?: string;
  final?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  business_name: string;
  upi_id?: string;
  bank_details?: string;
  plan?: 'free' | 'pro';
  logo_url?: string;
  whatsapp_templates?: WhatsAppTemplates;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export type RecoveryStage = 
  | 'pending' 
  | 'due_today' 
  | 'gentle_followup' 
  | 'firm_followup' 
  | 'final_notice' 
  | 'legal_warning' 
  | 'recovered' 
  | 'failed';

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string | null;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: InvoiceStatus;
  recovery_stage: RecoveryStage;
  escalation_level: number;
  next_action_at?: string;
  notes?: string;
  snapshot_json?: any;
  public_token: string;
  is_disputed: boolean;
  automation_paused: boolean;
  created_at: string;
  client?: Client;
}

export interface ReminderTimeline {
  id: string;
  invoice_id: string;
  user_id: string;
  sent_at: string;
  channel: 'whatsapp' | 'email' | 'sms';
  tone: 'polite' | 'firm' | 'final' | 'legal';
  delivery_status: 'pending' | 'sent' | 'failed';
  reminder_type: 'automated' | 'manual';
  message_content?: string;
  user_edits?: any;
  created_at: string;
}

export interface EscalationRule {
  id: string;
  user_id: string;
  days_after_due: number;
  target_stage: RecoveryStage;
  is_auto_escalate: boolean;
  reminder_tone: string;
  created_at: string;
}

export interface ClientRiskScore {
  client_id: string;
  user_id: string;
  score: number;
  risk_level: 'minimal' | 'low' | 'medium' | 'high' | 'critical';
  metrics: {
    overdue_count: number;
    avg_delay_days: number;
    ignored_reminders: number;
    partial_payments: number;
    recovery_failures: number;
  };
  last_calculated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  actor_type: 'user' | 'system' | 'worker' | 'anonymous';
  action: string;
  resource_type: string;
  resource_id?: string;
  severity: string;
  ip_address: string;
  user_agent?: string;
  payload_snapshot?: any;
  created_at: string;
}

export interface SecurityAbuseFlag {
  id: string;
  user_id?: string;
  ip_address?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
}

export interface DeadLetterJob {
  id: string;
  original_queue_id?: string;
  user_id: string;
  action_type: string;
  payload: any;
  last_error?: string;
  failure_reason: 'poison_job' | 'max_retries' | 'quota_exceeded' | 'invalid_payload' | 'system_error';
  quarantined_at: string;
  resolved_at?: string;
  resolution_note?: string;
}

export interface UsageCounter {
  id: string;
  user_id: string;
  metric: string;
  count: number;
  period_start: string;
  period_end: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  limits: {
    ai_generations: number;
    invoices_month: number;
    automations_active: number;
    team_seats: number;
    retention_days: number;
  };
}

export interface InvoiceEvent {
  id: string;
  invoice_id: string;
  user_id: string;
  event_type: 'creation' | 'status_change' | 'reminder' | 'payment' | 'recovery_escalation' | 'legal_action' | 'risk_change' | 'system_note';
  metadata: any;
  created_at: string;
}

export type QueueStatus = 'pending' | 'processing' | 'processed' | 'cancelled' | 'failed';

export interface EscalationQueueItem {
  id: string;
  invoice_id: string;
  user_id: string;
  scheduled_at: string;
  action_type: string;
  action_data: any;
  status: QueueStatus;
  attempt_count: number;
  last_error?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LegalNotice {
  id: string;
  invoice_id: string;
  user_id: string;
  notice_type: string;
  dispatched_at?: string;
  tracking_number?: string;
  content?: string;
  status: 'draft' | 'dispatched' | 'delivered' | 'cancelled';
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  method: 'upi' | 'cash' | 'bank';
  paid_at: string;
}

export interface ReminderLog {
  id: string;
  invoice_id: string;
  type: 'polite' | 'firm' | 'final';
  sent_at: string;
}

export interface InvoiceView {
  id: string;
  invoice_id: string;
  viewed_at: string;
  ip_address?: string;
}

export interface AuditEvent {
  id: string;
  user_id: string;
  type: string;
  meta: any;
  created_at: string;
}
