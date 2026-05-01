export interface UserProfile {
  id: string;
  email: string;
  name: string;
  business_name: string;
  upi_id?: string;
  bank_details?: string;
  plan?: 'free' | 'pro' | 'unlimited';
  logo_url?: string;
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

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string | null;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: InvoiceStatus;
  notes?: string;
  snapshot_json?: any;
  public_token: string;
  created_at: string;
  client?: Client;
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
