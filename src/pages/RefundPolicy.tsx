import React from "react";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";
import { Helmet } from "react-helmet-async";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#EEEEEE] flex flex-col justify-between">
      <Helmet>
        <title>Cancellation & Refund Policy — Paydrip</title>
        <meta
          name="description"
          content="Paydrip's cancellation and refund policy. Understand how to cancel your subscription and when refunds apply for monthly and annual plans."
        />
        <link rel="canonical" href="https://paydripapp.com/refund-policy" />
        <meta name="robots" content="index, follow" />
      </Helmet>
      <div>
        <PublicHeader />

        <main className="max-w-3xl mx-auto px-6 py-20">
          <h1 className="text-3xl md:text-4xl font-bold text-[#EEEEEE] mb-2">
            Cancellation & Refund Policy
          </h1>

          <p className="text-xs text-[#444444] mb-12 font-mono uppercase tracking-widest">
            Last updated: June 2026
          </p>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              1. Overview
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p>
                Paydrip is a subscription-based SaaS product. We want you to be
                satisfied with your purchase. This policy explains how
                cancellations and refunds work.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              2. Cancellation
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <ul className="list-disc list-inside space-y-2">
                <li>
                  You can cancel your subscription at any time from your account
                  settings
                </li>
                <li>
                  After cancellation, your access continues until the end of
                  your current billing period
                </li>
                <li>You will not be charged again after cancellation</li>
                <li>Cancelling does not automatically trigger a refund</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              3. Refund Policy
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p className="text-xs font-semibold text-[#EEEEEE] uppercase tracking-wider mb-1">
                Monthly plans:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4">
                <li>Monthly subscriptions are non-refundable</li>
                <li>
                  You can cancel anytime and retain access until the billing
                  period ends
                </li>
              </ul>

              <p className="text-xs font-semibold text-[#EEEEEE] uppercase tracking-wider mb-1">
                Annual plans:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  Annual subscriptions are eligible for a full refund if
                  requested within 15 days of the original purchase date
                </li>
                <li>After 15 days, annual subscriptions are non-refundable</li>
                <li>
                  To request a refund, email{" "}
                  <a
                    href="mailto:contact@paydripapp.com"
                    className="text-[#C8FF00] hover:underline"
                  >
                    contact@paydripapp.com
                  </a>{" "}
                  with your account email and payment reference
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              4. How Refunds Are Processed
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <ul className="list-disc list-inside space-y-2">
                <li>
                  Approved refunds are returned to the original payment method
                </li>
                <li>
                  Lemon Squeezy payments (USD): processed within 5-10 business
                  days
                </li>
                <li>
                  Razorpay payments (INR): processed within 5-7 business days
                </li>
                <li>Paydrip does not charge any cancellation or refund fees</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              5. Exceptions
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p>We may consider refunds outside this policy in cases of:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Duplicate charges</li>
                <li>
                  Technical issues that prevented access to the service for an
                  extended period
                </li>
                <li>Billing errors on our part</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-lg font-semibold text-[#EEEEEE] mb-4">
              6. Contact
            </h2>
            <div className="text-sm text-[#888888] leading-relaxed space-y-3">
              <p>For cancellation or refund requests:</p>
              <p>
                Email:{" "}
                <a
                  href="mailto:contact@paydripapp.com"
                  className="text-[#C8FF00] hover:underline"
                >
                  contact@paydripapp.com
                </a>
              </p>
              <p>We respond within 2 business days.</p>
            </div>
          </section>
        </main>
      </div>

      <PublicFooter />
    </div>
  );
}
