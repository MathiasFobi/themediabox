"use client";

import { useState } from "react";
import Link from "next/link";
import type { Service } from "../../types";

export default function ServiceDetailClient({ service }: { service: Service }) {
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const total = (service.price * quantity).toFixed(2);

  const handlePayPal = () => {
    window.open(
      `https://paypal.me/themediabox/${total}`,
      "_blank",
      "noopener,noreferrer"
    );
    setShowModal(false);
  };

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
                PayPal checkout. Email us your reference photos after payment.
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/40 backdrop-blur-sm animate-fade-up"
          onClick={() => setShowModal(false)}
        >
          <div
            className="glass-panel max-w-lg w-full p-6 sm:p-8 gold-border max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="text-4xl mb-2">{service.emoji}</div>
                <h3 className="font-display font-bold text-2xl text-text-primary">
                  {service.title}
                </h3>
                <p className="text-text-secondary text-sm mt-1">
                  ${service.price} per person
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-9 h-9 rounded-full bg-bg-glass hover:bg-bg-glass-hover border border-border-glass flex items-center justify-center text-text-tertiary text-lg leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-tertiary mb-2">
                  Your email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="glass-input w-full px-4 py-3 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-tertiary mb-2">
                  Style notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Outfits, backgrounds, mood, references..."
                  rows={3}
                  className="glass-input w-full px-4 py-3 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-tertiary mb-2">
                  How many people?
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-full bg-bg-glass hover:bg-bg-glass-hover border border-border-glass font-bold text-text-primary"
                  >
                    −
                  </button>
                  <div className="font-display font-bold text-2xl text-text-primary w-12 text-center tabular-nums">
                    {quantity}
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-10 h-10 rounded-full bg-bg-glass hover:bg-bg-glass-hover border border-border-glass font-bold text-text-primary"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-border-glass pt-4 mb-4">
              <div className="flex items-baseline justify-between">
                <span className="text-text-tertiary text-sm font-semibold uppercase tracking-wider">
                  Total
                </span>
                <span className="font-display font-bold text-3xl text-gold-deep tabular-nums">
                  ${total}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePayPal}
              className="w-full bg-[#0070ba] hover:bg-[#005ea6] text-white font-semibold py-4 rounded-full transition flex items-center justify-center gap-2 text-base"
            >
              <span className="italic font-bold">Pay</span>
              <span className="italic font-bold">Pal</span>
              <span className="font-semibold">· Pay ${total}</span>
            </button>
            <p className="text-text-muted text-[10px] text-center mt-3">
              You'll be redirected to PayPal. After payment, email hello@themediabox.store with your reference photos and we'll start within an hour.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
