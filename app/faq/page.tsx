"use client";

import { useState } from "react";
import Link from "next/link";

const FAQS = [
  {
    q: "How long does it take to receive my order?",
    a: "All keepsakes are custom-made. Production takes 3–5 business days. Shipping is 2–3 business days standard. Most orders arrive within 5–7 business days from the date you place them. Rush orders are available — email us at hello@themediabox.store to discuss.",
  },
  {
    q: "Do you ship internationally?",
    a: "We currently ship anywhere in the United States. International shipping is available on request — please email us with your country and the products you'd like to order, and we'll get you a quote within 24 hours.",
  },
  {
    q: "How does the video guest book work?",
    a: "We send you a set of display cards with unique QR codes. Place one at each table (or hand one to each guest). They scan the QR code with their phone, record a short video message, and submit. We collect all the videos and send you a private link to view and download everything. No app download required for your guests.",
  },
  {
    q: "Can I customize the design?",
    a: "Absolutely. Every product is custom. After you place your order, we'll email you a design form to fill out — names, dates, inscriptions, photos, color choices. We'll send a digital proof for your approval before we go to production.",
  },
  {
    q: "What's your return policy?",
    a: "Because every product is custom-made, we don't accept returns. But we want you to love it. If something arrives damaged or not as designed, we'll replace it free of charge. If you change your mind before production starts, we'll refund you in full.",
  },
  {
    q: "What payment methods do you accept?",
    a: "PayPal — including PayPal balance, credit card, debit card, and Pay in 4. Apple Pay and Google Pay are also supported through PayPal's checkout.",
  },
  {
    q: "Can I order in bulk for an event planner, wedding planner, or corporate client?",
    a: "Yes! We offer bulk pricing for wedding planners, event planners, and corporate clients. Email us at hello@themediabox.store with your event date and the products you're interested in, and we'll send you a custom quote.",
  },
  {
    q: "Do you do custom designs I don't see on the site?",
    a: "Yes. If you can dream it, we can probably make it. Custom projects start at $150 and take 2–3 weeks. Email us with your idea.",
  },
  {
    q: "Is the Forever Voice Magnet really a video?",
    a: "Yes! The magnet has a QR code on the back. Anyone who scans it (with a phone) can play the voice memo, the video, or both. The magnet itself is a high-quality, fridge-grade piece — printed with the photo of your choice and a custom message.",
  },
  {
    q: "How do I contact you?",
    a: "Email is best: hello@themediabox.store. We respond within 24 hours, Monday through Saturday.",
  },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-10 py-12 sm:py-16 max-w-4xl mx-auto w-full">
      <div className="text-sm text-text-tertiary mb-6 animate-fade-up">
        <Link href="/" className="hover:text-gold-deep">Home</Link>
        <span className="mx-2 text-text-muted">/</span>
        <span className="text-text-primary font-semibold">FAQ</span>
      </div>

      <header className="mb-12 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/15 border border-border-gold text-gold-deep text-[10px] font-bold uppercase tracking-[0.18em] mb-4">
          ✦ Frequently Asked Questions
        </div>
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-text-primary leading-[1.05] mb-4">
          Got <span className="shimmer-text">questions?</span>
        </h1>
        <p className="text-text-secondary text-lg">
          We've got answers. If you don't see what you're looking for, email us at{" "}
          <a href="mailto:hello@themediabox.store" className="text-gold-deep font-semibold hover:underline">
            hello@themediabox.store
          </a>.
        </p>
      </header>

      <section className="space-y-3">
        {FAQS.map((f, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={i}
              className="glass-card overflow-hidden animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4"
                aria-expanded={isOpen}
              >
                <h2 className="font-display font-bold text-base sm:text-lg text-text-primary">
                  {f.q}
                </h2>
                <span
                  className={`text-gold-deep text-2xl font-bold transition-transform flex-shrink-0 ${
                    isOpen ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
              </button>
              {isOpen && (
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-text-secondary leading-relaxed border-t border-border-glass pt-4">
                  {f.a}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="mt-16 text-center animate-fade-up">
        <h2 className="font-display font-bold text-2xl text-text-primary mb-3">
          Still have questions?
        </h2>
        <a href="mailto:hello@themediabox.store" className="btn-primary">
          Email hello@themediabox.store →
        </a>
      </section>
    </main>
  );
}
