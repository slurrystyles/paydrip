import React from 'react';
import InfoPageLayout from './InfoPageLayout';

export default function PrivacyPage() {
  return (
    <InfoPageLayout 
      title="Privacy Policy" 
      subtitle="How we protect your data and identity."
    >
      <div className="space-y-8 text-slate-600 font-medium">
        <section>
          <h2 className="text-2xl font-black text-slate-900 italic tracking-tight mb-4">1. Data Collection</h2>
          <p>
            Paydrip collects minimal information required to provide our service. This includes your email address (via Google Auth), 
            business details you provide in settings, and client information necessary for invoice generation.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-900 italic tracking-tight mb-4">2. Financial Information</h2>
          <p>
            We do not process direct payments on our servers. Paydrip facilitates UPI QR code generation and payment tracking. 
            Your bank details and UPI IDs are stored securely and used only for inclusion in your invoices.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-900 italic tracking-tight mb-4">3. Security</h2>
          <p>
            Your data is stored using industry-standard encryption protocols. We use Supabase and Google Cloud to ensure 
            your ledger remains private and accessible only to you.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-900 italic tracking-tight mb-4">4. WhatsApp Integration</h2>
          <p>
            When you send reminders via WhatsApp, Paydrip generates a message template. We do not have access to your personal 
            WhatsApp chats or contacts.
          </p>
        </section>

        <footer className="pt-8 border-t border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
          Last Updated: May 2026 • Paydrip Protocol
        </footer>
      </div>
    </InfoPageLayout>
  );
}
