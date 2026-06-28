import React from "react";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";
import { Helmet } from "react-helmet-async";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#EEEEEE] flex flex-col justify-between">
      <Helmet>
        <title>Terms of Service — Paydrip</title>
        <meta
          name="description"
          content="Review the terms of service governing your use of Paydrip, the AI-powered invoice recovery platform for freelancers and agencies."
        />
        <link rel="canonical" href="https://paydripapp.com/terms" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      <div>
        <PublicHeader />

        <main className="max-w-3xl mx-auto px-6 py-20">
          <h1 className="text-3xl md:text-4xl font-bold text-[#EEEEEE] mb-2">
            Terms of Service
          </h1>

          <p className="text-xs text-[#444444] mb-12 font-mono uppercase tracking-widest">
            Last updated: June 2026
          </p>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              1. Acceptance of Terms
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p>
                By using Paydrip, you agree to these terms. If you do not agree,
                do not use the service.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              2. Description of Service
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p>
                Paydrip is a SaaS invoice recovery platform that helps
                freelancers and businesses send invoices, automate payment
                reminders, and track payments.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              3. Account Responsibilities
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <ul className="list-disc list-inside space-y-2">
                <li>You must provide accurate information</li>
                <li>You are responsible for maintaining account security</li>
                <li>You must be 18 or older to use the service</li>
                <li>One account per person or business</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              4. Acceptable Use
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p>You agree not to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Use Paydrip for illegal activities</li>
                <li>Send spam or unsolicited messages to clients</li>
                <li>Attempt to hack or disrupt the service</li>
                <li>Resell or sublicense the service without permission</li>
                <li>Upload malicious content</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              5. Subscription and Payments
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <ul className="list-disc list-inside space-y-2">
                <li>Subscriptions are billed in advance</li>
                <li>Prices are listed on our pricing page</li>
                <li>
                  We reserve the right to change pricing with 30 days notice
                </li>
                <li>Refunds are subject to our Cancellation & Refund Policy</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              6. Data and Privacy
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p>
                Your use of the service is subject to our Privacy Policy. You
                retain ownership of your data. We do not claim ownership of
                invoices, client data, or content you create.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              7. Intellectual Property
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p>
                Paydrip's brand, logo, and software are owned by Paydrip. You
                may not copy, modify, or distribute our software or branding.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              8. Limitation of Liability
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p>Paydrip is provided "as is". We are not liable for:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Loss of revenue or business opportunities</li>
                <li>Data loss beyond our reasonable control</li>
                <li>
                  Third-party service outages (payment processors, email
                  providers)
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              9. Termination
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p>
                We reserve the right to suspend or terminate accounts that
                violate these terms. You may terminate your account at any time.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              10. Governing Law
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p>These terms are governed by the laws of India.</p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              11. Contact
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p>For questions about these terms:</p>
              <p>
                Email:{" "}
                <a
                  href="mailto:contact@paydripapp.com"
                  className="text-[#C8FF00] hover:underline"
                >
                  contact@paydripapp.com
                </a>
              </p>
            </div>
          </section>
        </main>
      </div>

      <PublicFooter />
    </div>
  );
}
