export function getEmailTemplate(type: string, data: {
  businessName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  publicLink: string;
  clientName: string;
  customMessage?: string;
}) {
  const { businessName, invoiceNumber, amount, dueDate, publicLink, clientName, customMessage } = data;

  const templates: Record<string, { subject: string, title: string, body: string, cta: string }> = {
    'invoice_created': {
      subject: `New Invoice #${invoiceNumber} from ${businessName}`,
      title: 'Invoice Ready',
      body: `Your invoice for <strong>₹${amount}</strong> from ${businessName} has been generated and is ready for payment.`,
      cta: 'View & Pay Invoice'
    },
    'reminder_polite': {
      subject: `Reminder: Invoice #${invoiceNumber} from ${businessName}`,
      title: 'Friendly Reminder',
      body: customMessage || `This is a friendly reminder that invoice <strong>#${invoiceNumber}</strong> for <strong>₹${amount}</strong> is due on ${dueDate}.`,
      cta: 'Settlement Link'
    },
    'reminder_firm': {
      subject: `URGENT: Invoice #${invoiceNumber} is Overdue`,
      title: 'Action Required',
      body: customMessage || `Invoice <strong>#${invoiceNumber}</strong> is now overdue. Please settle the outstanding balance of <strong>₹${amount}</strong> to avoid further escalations.`,
      cta: 'Pay Now'
    },
    'reminder_final': {
      subject: `FINAL NOTICE: Overdue Invoice #${invoiceNumber}`,
      title: 'Final Notice',
      body: customMessage || `This is the final notice regarding your outstanding balance of <strong>₹${amount}</strong>. Failure to settle this today may result in service suspension or legal escalation.`,
      cta: 'Immediate Settlement'
    },
    'invoice_paid': {
      subject: `Receipt for Invoice #${invoiceNumber}`,
      title: 'Payment Successful',
      body: `Thank you for your payment of <strong>₹${amount}</strong> for invoice <strong>#${invoiceNumber}</strong>. Your account has been updated.`,
      cta: 'View Receipt'
    }
  };

  const template = templates[type] || templates['invoice_created'];

  return {
    subject: template.subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
        <div style="padding: 40px 20px; background: #f8fafc; border-radius: 24px;">
          <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">${template.title}</h1>
          <p style="font-size: 16px; margin-bottom: 24px;">Hi ${clientName},</p>
          <div style="background: white; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 15px;">${template.body}</p>
          </div>
          <a href="${publicLink}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            ${template.cta}
          </a>
        </div>
        <div style="padding: 20px; text-align: center;">
          <p style="font-size: 12px; color: #64748b; margin-bottom: 4px;">&copy; ${new Date().getFullYear()} ${businessName}</p>
          <p style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">Securely processed via Paydrip</p>
        </div>
      </div>
    `
  };
}
