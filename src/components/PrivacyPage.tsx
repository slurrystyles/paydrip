import React from 'react';
import InfoPageLayout from './InfoPageLayout';

export default function PrivacyPage() {
  return (
    <InfoPageLayout 
      title="Privacy Policy" 
      subtitle="How we protect your data, financial info, and operational identity."
    >
      <div className="space-y-8 text-[#CCCCCC] font-normal leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-[#C8FF00] mb-3 uppercase tracking-wide">1. Data Collected & Received</h2>
          <p className="mb-4">
            Paydrip collects and processes minimal information required to execute our India-first payment recovery framework. We receive the following types of information when you interact with our services:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-[#AAAAAA]">
            <li><strong>Identity & Credentials:</strong> Email address, avatar url, and access metadata provided via Google Authentication.</li>
            <li><strong>Business Profiles:</strong> Your business/freelance name, company identifiers, GST registration references (optional), and payment collection endpoints (e.g., UPI IDs, VPA, bank IFSC codes).</li>
            <li><strong>Client Operational Records:</strong> Client contact details (name, email addresses, phone/WhatsApp numbers) strictly to dispatch invoice notifications.</li>
            <li><strong>Invoice Structures:</strong> Financial amounts, due dates, receipt status, and ledger reference numbers.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#C8FF00] mb-3 uppercase tracking-wide">2. Financial Integrity & Storage</h2>
          <p>
            We enforce secure encryption standards. Processing files, tokens, and ledger entries are stored with strict Row-Level Security (RLS) on our database clusters. All sensitive payloads—such as bank accounts, UPI configurations, and collection links—are encrypted in transit and in storage, ensuring that unauthorized actors cannot access or spoof your ledger.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#C8FF00] mb-3 uppercase tracking-wide">3. Third-Party Integrations & Data Sub-processors</h2>
          <p className="mb-4">
            To coordinate automated sequences and notification dispatches, Paydrip transfers limited payloads to verified sub-processors under secure APIs:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-[#AAAAAA]">
            <li><strong>Supabase:</strong> For identity auth, backend database clusters, and persistence structure.</li>
            <li><strong>WhatsApp Business Platform / Twilio:</strong> To transmit verified customer payment links.</li>
            <li><strong>Resend / SendGrid:</strong> To coordinate multi-step email notification sequences.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#C8FF00] mb-3 uppercase tracking-wide">4. Rerouting & Verification (No Spam Policy)</h2>
          <p>
            Paydrip has an absolute zero-tolerance policy for harassment, spam, and unsolicited communications. Invoices, reminders, and escalation logs must only be dispatched to legitimate clients who have prior commercial relationships. We actively log delivery statistics and rate levels to comply with international anti-spam standards.
          </p>
        </section>

        <footer className="pt-8 border-t border-[#222222] text-[10px] font-bold uppercase tracking-widest text-[#888888] font-mono">
          Last Updated: May 2026 • Paydrip Protocol Security Group • Active Node Verified
        </footer>
      </div>
    </InfoPageLayout>
  );
}
