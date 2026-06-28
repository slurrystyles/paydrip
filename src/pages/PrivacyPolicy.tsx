import React from "react";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";
import { Helmet } from "react-helmet-async";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#EEEEEE] flex flex-col justify-between">
      <Helmet>
        <title>Privacy Policy — Paydrip</title>
        <meta
          name="description"
          content="Read Paydrip's privacy policy to understand how we collect, use, and protect your personal data as a freelancer using our invoice recovery platform."
        />
        <link rel="canonical" href="https://paydripapp.com/privacy" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      <div>
        <PublicHeader />

        <main className="max-w-3xl mx-auto px-6 py-20">
          <h1 className="text-3xl md:text-4xl font-bold text-[#EEEEEE] mb-2">
            Privacy Policy
          </h1>

          <p className="text-xs text-[#444444] mb-12 font-mono uppercase tracking-widest">
            Last updated: June 2026
          </p>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              1. Introduction
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p>
                Paydrip ("we", "us", "our") operates{" "}
                <a
                  href="https://paydripapp.com"
                  className="text-[#C8FF00] hover:underline"
                >
                  paydripapp.com
                </a>
                . This policy explains how we collect, use, and protect your
                personal information.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              2. Information We Collect
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <ul className="list-disc list-inside space-y-2">
                <li>
                  Account information: name, email, business name when you
                  register
                </li>
                <li>
                  Payment information: processed securely by Lemon Squeezy (USD)
                  and Razorpay (INR). We do not store card details
                </li>
                <li>
                  Invoice data: client names, emails, invoice amounts you create
                </li>
                <li>
                  Usage data: how you interact with the platform, feature usage
                </li>
                <li>
                  Device data: browser type, IP address, device information
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              3. How We Use Your Information
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <ul className="list-disc list-inside space-y-2">
                <li>To provide and operate the Paydrip service</li>
                <li>To process payments and manage subscriptions</li>
                <li>
                  To send transactional emails (invoice delivery, payment
                  reminders)
                </li>
                <li>To provide customer support</li>
                <li>To improve the platform</li>
                <li>We do not sell your data to third parties</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              4. Data Storage
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <ul className="list-disc list-inside space-y-2">
                <li>
                  Data is stored on Supabase (PostgreSQL) with encryption at
                  rest
                </li>
                <li>
                  We use industry-standard security measures including RLS
                  policies
                </li>
                <li>Backups are maintained with point-in-time recovery</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              5. Third Party Services
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p>We use the following services:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Supabase — database and authentication</li>
                <li>Resend — transactional email delivery</li>
                <li>Twilio — SMS delivery</li>
                <li>Lemon Squeezy — payment processing (USD)</li>
                <li>Razorpay — payment processing (INR)</li>
                <li>Google (OAuth) — optional sign-in</li>
                <li>Vercel — hosting and deployment</li>
                <li>Gemini AI — AI message generation</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              6. Your Rights
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and data</li>
                <li>Export your data</li>
              </ul>
              <p>
                To exercise these rights, email{" "}
                <a
                  href="mailto:contact@paydripapp.com"
                  className="text-[#C8FF00] hover:underline"
                >
                  contact@paydripapp.com
                </a>
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              7. Cookies
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p>We use minimal cookies for:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Authentication session management</li>
                <li>User preferences</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              8. Children's Privacy
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p>Paydrip is not intended for users under 18 years of age.</p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              9. Changes to This Policy
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p>
                We may update this policy and will notify users of significant
                changes via email.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              10. Contact
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
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
