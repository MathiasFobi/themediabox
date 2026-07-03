"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import services from "@/data/services.json";
import type { Service } from "../types";
import { SERVICE_CATEGORIES } from "../types";
import { PayPalModal } from "../components/PayPalModal";

const allServices = services as unknown as Service[];

export default function ServicesPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const filtered = useMemo(() => {
    if (!activeCategory) return allServices;
    const cat = SERVICE_CATEGORIES[activeCategory];
    return allServices.filter((s) => cat.services.includes(s.slug));
  }, [activeCategory]);

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8 sm:py-12 max-w-7xl mx-auto w-full">
      <header className="mb-10 animate-fade-up">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl sm:text-4xl">✨</span>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight">
            <span className="shimmer-text">AI Photo Services</span>
          </h1>
        </div>
        <p className="text-text-secondary text-base sm:text-lg max-w-3xl">
          See yourself in any style, any setting, any outfit. 16 AI-powered services that turn
          your photos into professional headshots, dating profiles, family portraits, art-style
          renderings, and celebration invitations. No photographer, no studio, no waiting.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">
          <span className="px-2.5 py-1 rounded-md border border-border-glass bg-bg-glass">
            {allServices.length} services
          </span>
          <span className="px-2.5 py-1 rounded-md border border-border-glass bg-bg-glass">
            Delivered in under 1 hour
          </span>
          <span className="px-2.5 py-1 rounded-md border border-border-glass bg-bg-glass">
            PayPal checkout
          </span>
          <Link
            href="/products"
            className="px-2.5 py-1 rounded-md border border-border-glass bg-bg-glass hover:bg-bg-glass-hover transition"
          >
            📦 Shop Keepsakes →
          </Link>
        </div>
      </header>

      <section className="mb-8 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`pill px-5 py-2.5 text-xs font-semibold whitespace-nowrap ${
              activeCategory === null ? "pill-active" : "text-text-secondary"
            }`}
          >
            All <span className="ml-1 text-[10px] opacity-70">{allServices.length}</span>
          </button>
          {Object.entries(SERVICE_CATEGORIES).map(([key, cat]) => {
            const isActive = activeCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveCategory(key)}
                className={`pill px-5 py-2.5 text-xs font-semibold whitespace-nowrap ${
                  isActive ? "pill-active" : "text-text-secondary"
                }`}
              >
                <span className="mr-1">{cat.emoji}</span>
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((s, idx) => (
          <div
            key={s.slug}
            className="glass-card p-6 flex flex-col group animate-fade-up"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <Link href={`/services/${s.slug}`} className="block">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="text-5xl group-hover:scale-110 transition-transform">
                  {s.emoji}
                </div>
                {s.tag && (
                  <div className="px-2.5 py-1 rounded-full bg-gold/15 border border-border-gold text-gold-deep text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                    {s.tag}
                  </div>
                )}
              </div>
              <h3 className="font-display font-bold text-lg text-text-primary leading-tight mb-2 group-hover:text-gold-deep transition">
                {s.title}
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed mb-4 flex-1">
                {s.shortDescription}
              </p>
            </Link>
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-border-glass">
              <div className="font-display font-bold text-2xl text-gold-deep tabular-nums">
                ${s.price}
              </div>
              <button
                type="button"
                onClick={() => setSelectedService(s)}
                className="btn-primary text-xs py-2 px-4"
              >
                Order →
              </button>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-20 glass-panel p-8 sm:p-12 gold-border">
        <div className="text-center mb-10">
          <div className="inline-block px-3 py-1 rounded-full bg-gold/15 border border-border-gold text-gold-deep text-[10px] font-bold uppercase tracking-[0.2em] mb-3">
            How It Works
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-text-primary">
            Three steps to photos you'll love
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { n: "01", t: "Pick a service", d: "Choose from 16 AI services. Tell us about the style, mood, and any specific details you want." },
            { n: "02", t: "Upload your photos", d: "Send 10–15 selfies or reference photos after checkout. We confirm and start working within an hour." },
            { n: "03", t: "Get your gallery", d: "Receive 15–50 AI-generated photos in your inbox, ready to download, print, or share." },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="font-display font-bold text-5xl text-gold/30 mb-3">{s.n}</div>
              <h3 className="font-display font-bold text-lg text-text-primary mb-2">{s.t}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 glass-panel p-8 sm:p-10 gold-border text-center">
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-text-primary mb-3">
          Not sure which service fits?
        </h2>
        <p className="text-text-secondary mb-6 max-w-xl mx-auto">
          Tell us what you're looking for — a headshot, a gift, a vibe — and we'll
          recommend the right service.
        </p>
        <a href="mailto:hello@themediabox.store" className="btn-primary">
          Email hello@themediabox.store →
        </a>
      </section>

      {selectedService && (
        <ServicePayPalModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
        />
      )}
    </main>
  );
}

function ServicePayPalModal({
  service,
  onClose,
}: {
  service: Service;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);

  const total = (service.price * quantity).toFixed(2);

  const handlePayPal = () => {
    window.open(
      `https://paypal.me/themediabox/${total}`,
      "_blank",
      "noopener,noreferrer"
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/40 backdrop-blur-sm animate-fade-up"
      onClick={onClose}
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
            onClick={onClose}
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
              placeholder="Anything specific? Outfits, backgrounds, mood, references..."
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
                aria-label="Decrease quantity"
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
                aria-label="Increase quantity"
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
          You'll be redirected to PayPal. After payment, email us at hello@themediabox.store with your reference photos and we'll get started within an hour.
        </p>
      </div>
    </div>
  );
}
