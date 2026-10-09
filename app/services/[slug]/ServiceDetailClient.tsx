"use client";

import { useState } from "react";
import Link from "next/link";
import type { Service } from "../../types";
import { StripeCheckoutModal } from "../../components/StripeCheckoutModal";

export default function ServiceDetailClient({ service }: { service: Service }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8 sm:py-12 max-w-5xl mx-auto w-full">
      <div className="text-sm text-text-tertiary mb-6 animate-fade-up">
        <Link href="/" className="hover:text-gold-deep">Home</Link>
        <span className="mx-2 text-text-muted">/</span>
        <Link href="/services" className="hover:text-gold-deep">Services</Link>
        <span className="mx-2 text-text-muted">/</span>
        <span className="text-text-primary font-semibold">{service.title}</span>
      </div>

      <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
        <div className="lg:col-span-3 animate-fade-up">
          <div className="text-7xl mb-4">{service.emoji}</div>
          <div className="flex items-center gap-2 mb-4">
            {service.tag && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/15 border border-border-gold text-gold-deep text-[10px] font-bold uppercase tracking-[0.18em]">
                ✦ {service.tag}
              </div>
            )}
          </div>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-text-primary leading-[1.05] mb-4">
            {service.title}
          </h1>
          <p className="text-text-secondary text-lg leading-relaxed mb-6">
            {service.shortDescription}
          </p>
          <p className="text-text-secondary text-base leading-relaxed mb-8">
            {service.longDescription}
          </p>

          <div className="glass-panel p-6 mb-6">
            <h2 className="font-display font-bold text-lg text-text-primary mb-4">
              What you get
            </h2>
            <ul className="space-y-2">
              {service.whatYouGet.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-text-secondary">
                  <span className="text-gold mt-0.5">✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-panel p-6">
            <h2 className="font-display font-bold text-lg text-text-primary mb-3">
              Best for
            </h2>
            <p className="text-text-secondary">{service.bestFor}</p>
          </div>
        </div>

        <div className="lg:col-span-2 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="sticky top-24">
            <div className="glass-panel p-6 sm:p-8 gold-border">
              <div className="text-text-tertiary text-xs font-semibold uppercase tracking-wider mb-1">
                Starting at
              </div>
              <div className="font-display font-bold text-5xl text-gold-deep tabular-nums mb-1">
                ${service.price}
              </div>
              <div className="text-text-tertiary text-sm mb-6">per person</div>

              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="btn-primary w-full justify-center text-base py-4 mb-3"
              >
                Order Now →
              </button>
              <p className="text-text-muted text-xs text-center">
                Secure Stripe checkout. After payment, email hello@themediabox.store with your reference photos and we&apos;ll start within an hour.
              </p>

              <div className="mt-6 pt-6 border-t border-border-glass space-y-2 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <span className="text-gold">✦</span>
                  Delivered in under 1 hour
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gold">✦</span>
                  100% your face, just better
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gold">✦</span>
                  Unlimited revisions on style
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <StripeCheckoutModal
          emoji={service.emoji}
          title={service.title}
          priceDisplay={`$${service.price}`}
          priceCaption="per person"
          checkoutNote="Set your headcount, add style notes, and check out on the secure Stripe page — your email is collected there so we can deliver your photos. After payment, email hello@themediabox.store with your reference photos and we’ll start within an hour."
          stripeLink={service.stripeLink}
          onClose={() => setShowModal(false)}
        />
      )}
    </main>
  );
}
