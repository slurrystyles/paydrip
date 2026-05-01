import React from 'react';
import InfoPageLayout from './InfoPageLayout';

export default function TermsPage() {
  return (
    <InfoPageLayout 
      title="Terms of Service" 
      subtitle="The rules of the Paydrip network."
    >
      <div className="space-y-8 text-slate-600 font-medium">
        <section>
          <h2 className="text-2xl font-black text-slate-900 italic tracking-tight mb-4">1. Acceptance</h2>
          <p>
            By using Paydrip, you agree to these terms. Paydrip is a tool for freelancers to manage their invoices and 
            is provided "as is" without warranties of any kind.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-900 italic tracking-tight mb-4">2. Usage Limits</h2>
          <p>
            Free accounts are limited to 3 invoices per month. Pro and Pro+ plans unlock higher volumes and additional 
            features as described in our pricing section.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-900 italic tracking-tight mb-4">3. Responsibility</h2>
          <p>
            You are solely responsible for the accuracy of your invoices and the taxes associated with your payments. 
            Paydrip is not a tax advisor or a payment processor.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black text-slate-900 italic tracking-tight mb-4">4. Fair Use</h2>
          <p>
            WhatsApp reminders must be used professionally and politely. Spamming or harassing clients is a violation 
            of these terms and may result in account termination.
          </p>
        </section>

        <footer className="pt-8 border-t border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
          Paydrip Operating Agreement • v1.0
        </footer>
      </div>
    </InfoPageLayout>
  );
}
