import React from 'react';
import InfoPageLayout from './InfoPageLayout';

export default function TermsPage() {
  return (
    <InfoPageLayout 
      title="Terms of Service" 
      subtitle="The digital agreement governing the Paydrip network and billing framework."
    >
      <div className="space-y-8 text-[#CCCCCC] font-normal leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-[#C8FF00] mb-3 uppercase tracking-wide">1. Acceptance of Terms</h2>
          <p>
            By initializing a user login session, connecting via Google Authentication, registering a business profile, or generating an invoice ledger with Paydrip, you agree to bind yourself to our Terms of Service. These terms constitute a legally binding service-level agreement between you (the "Operator") and the Paydrip Protocol.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#C8FF00] mb-3 uppercase tracking-wide">2. Scope of Service & Operational Limits</h2>
          <p className="mb-4">
            Paydrip provides an India-first ledger recovery tool, assisting operators with local invoice dispatch, UPI-based quick-remittance, automated escalation queues, and communication alerts. Usage tiers are partitioned as follows:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-[#AAAAAA]">
            <li><strong>Free Accounts:</strong> Restricted to 5 client files, 10 generated invoice items per calendar month, and manual email reminder triggers.</li>
            <li><strong>Pro & Enterprise Tiers:</strong> Entitled to unlimited clients, unlimited ledger records, multi-frequency automated sequences, white-label client-facing pay links, and native SMS/WhatsApp integration pipelines.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#C8FF00] mb-3 uppercase tracking-wide">3. Commercial Responsibility & Compliance</h2>
          <p>
            You retain absolute, sole responsibility for the financial accuracy, rate of calculations, and tax liabilities associated with payments you solicit or collect through Paydrip. Paydrip is strictly an informational tool; we are not a financial intermediary, nor do we act as a formal merchant of record (MoR) or licensed banking service. Operators are instructed to verify all customer UPI references prior to finalizing contracts.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#C8FF00] mb-3 uppercase tracking-wide">4. Prohibited Uses & Automated Alert Rules</h2>
          <p>
            Any distribution of abusive, predatory, or high-volume spam communication is strictly prohibited. Sending repeated or threatening WhatsApp prompts or spoofed legal notices to clients is grounds for immediate, permanent service shutdown and deletion of all access tokens. Paydrip reserves the right to rate-limit or pause any escalation pipelines that breach standard fair-use thresholds.
          </p>
        </section>

        <footer className="pt-8 border-t border-[#222222] text-[10px] font-bold uppercase tracking-widest text-[#888888] font-mono">
          Paydrip Core Operations Terms of Service • v1.1 Active Schema
        </footer>
      </div>
    </InfoPageLayout>
  );
}
