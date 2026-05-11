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
  risk_level: 'low' | 'medium' | 'high';
  metrics: {
    overdue_count: number;
    avg_delay_days: number;
    ignored_reminders: number;
    partial_payments: number;
    recovery_failures: number;
  };
  last_calculated_at: string;
}

export interface EscalationQueueItem {
  id: string;
  invoice_id: string;
  user_id: string;
  scheduled_at: string;
  action_type: 'send_reminder' | 'change_stage';
  action_data: any;
  status: 'pending' | 'processed' | 'cancelled' | 'failed';
  processed_at?: string;
  created_at: string;
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
