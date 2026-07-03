"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import products from "@/data/products.json";
import collections from "@/data/collections.json";
import occasions from "@/data/occasions.json";
import testimonials from "@/data/testimonials.json";
import type { Product } from "./types";
import { ProductCard } from "./components/ProductCard";
import { PayPalModal } from "./components/PayPalModal";

const allProducts = products as unknown as Product[];

const FEATURED_SLUGS = [
  "video-guest-book-display",
  "forever-voice-magnet",
  "custom-photo-booth-props",
  "graduation-frame-standee",
  "wedding-memory-album",
  "kente-keepsake-box",
];

export default function Home() {
  const featured = useMemo(
    () => FEATURED_SLUGS.map((s) => allProducts.find((p) => p.slug === s)).filter(Boolean) as Product[],
    []
  );

  const [paypalProduct, setPaypalProduct] = useState<Product | null>(null);

  return (
    <main className="flex-1">
      {/* ───────────────────── HERO ───────────────────── */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-24">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 animate-fade-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/15 border border-border-gold text-gold-deep text-xs font-semibold uppercase tracking-wider mb-6">
                ✦ Built for Black Celebrations
              </div>
              <h1 className="font-display font-extrabold text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.05] mb-6">
                <span className="shimmer-text">Personalized</span>
                <br />
                Keepsakes for the
                <br />
                Moments That <span className="italic">Matter</span>
              </h1>
              <p className="text-text-secondary text-lg sm:text-xl leading-relaxed max-w-2xl mb-8">
                Video guest books. Voice magnets. Custom photo props. Heirloom
                memory chests. Every product is built to capture the love,
                laughter, and legacy of your celebration — and last forever.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/products" className="btn-primary">
                  Shop All Keepsakes →
                </Link>
                <Link href="/collections/weddings" className="btn-secondary">
                  Shop Weddings
                </Link>
              </div>

              <div className="mt-10 flex items-center gap-6 text-sm text-text-tertiary">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                  Ships in 5–7 business days
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                  PayPal checkout
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 animate-fade-up" style={{ animationDelay: "120ms" }}>
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-gold/30 via-terracotta/20 to-emerald-deep/20 rounded-3xl blur-2xl" />
                <div className="relative glass-panel p-8 gold-border">
                  <div className="text-7xl mb-4 text-center">🎥</div>
                  <h3 className="font-display font-bold text-2xl text-text-primary text-center mb-2">
                    Video Guest Book
                  </h3>
                  <p className="text-text-secondary text-center mb-6">
                    From <span className="font-display font-bold text-gold-deep text-2xl">$25</span> · 5 Pack
                  </p>
                  <div className="space-y-3">
                    {[
                      "QR code scan, no app needed",
                      "Weddings, graduations, sweet 16s",
                      "Every message in one place",
                      "Premium gold-accented display",
                    ].map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                        <span className="text-gold mt-0.5">✦</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/products/video-guest-book-display"
                    className="btn-primary w-full justify-center mt-6"
                  >
                    Shop the Video Guest Book →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────── SHOP BY OCCASION ───────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-20">
        <div className="text-center mb-10 animate-fade-up">
          <div className="inline-block px-3 py-1 rounded-full bg-bg-glass border border-border-glass text-text-tertiary text-[10px] font-bold uppercase tracking-[0.2em] mb-3">
            Shop by Occasion
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-text-primary">
            Find the perfect keepsake
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-up" style={{ animationDelay: "100ms" }}>
          {occasions.map((o) => (
            <Link
              key={o.slug}
              href={`/collections/${o.slug}`}
              className="glass-card p-6 text-center group"
            >
              <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">
                {o.emoji}
              </div>
              <div className="font-display font-semibold text-base text-text-primary">
                {o.title}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────────────────── FEATURED PRODUCTS ───────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-20">
        <div className="flex items-end justify-between mb-10 animate-fade-up">
          <div>
            <div className="inline-block px-3 py-1 rounded-full bg-bg-glass border border-border-glass text-text-tertiary text-[10px] font-bold uppercase tracking-[0.2em] mb-3">
              Most Loved
            </div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-text-primary">
              The Keepsakes You Keep Coming Back To
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden sm:inline-flex text-sm font-semibold text-gold-deep hover:underline whitespace-nowrap"
          >
            See all →
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featured.map((p, idx) => (
            <div key={p.slug} style={{ animationDelay: `${idx * 60}ms` }} className="animate-fade-up">
              <ProductCard product={p} onBuy={setPaypalProduct} />
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────── TESTIMONIALS ───────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-20">
        <div className="text-center mb-12 animate-fade-up">
          <div className="inline-block px-3 py-1 rounded-full bg-bg-glass border border-border-glass text-text-tertiary text-[10px] font-bold uppercase tracking-[0.2em] mb-3">
            Real Love, Real Memories
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-text-primary">
            What Our Families Are Saying
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="glass-card p-6 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-1 mb-3 text-gold">★★★★★</div>
              <p className="text-text-primary leading-relaxed mb-4 font-medium">
                "{t.quote}"
              </p>
              <div className="pt-3 border-t border-border-glass">
                <div className="font-display font-bold text-sm text-text-primary">
                  {t.name}
                </div>
                <div className="text-xs text-text-tertiary">
                  {t.occasion} · {t.location}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────── HOW IT WORKS ───────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-20">
        <div className="glass-panel p-8 sm:p-12 gold-border">
          <div className="text-center mb-10">
            <div className="inline-block px-3 py-1 rounded-full bg-gold/15 border border-border-gold text-gold-deep text-[10px] font-bold uppercase tracking-[0.2em] mb-3">
              How It Works
            </div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-text-primary">
              Three steps to forever
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: "01", t: "Choose Your Keepsake", d: "Pick the product that fits your celebration. Customize the variant, the inscription, the moment." },
              { n: "02", t: "Pay with PayPal", d: "Quick, secure checkout. We confirm your order within 24 hours and start production." },
              { n: "03", t: "Relive It Forever", d: "Ships in 5–7 business days. Track your package. Open the box. Start the memory." },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="font-display font-bold text-5xl text-gold/30 mb-3">
                  {s.n}
                </div>
                <h3 className="font-display font-bold text-lg text-text-primary mb-2">
                  {s.t}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── CTA ───────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-16">
        <div className="glass-panel p-10 sm:p-14 text-center gold-border gold-glow">
          <div className="text-5xl mb-4">✦</div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-text-primary mb-3">
            Ready to capture the moment?
          </h2>
          <p className="text-text-secondary text-lg mb-6 max-w-xl mx-auto">
            Browse the shop, find the keepsake that fits your celebration, and
            check out with PayPal. Your forever memory is one click away.
          </p>
          <Link href="/products" className="btn-primary">
            Shop All Keepsakes →
          </Link>
        </div>
      </section>

      {paypalProduct && (
        <PayPalModal
          product={paypalProduct}
          onClose={() => setPaypalProduct(null)}
        />
      )}
    </main>
  );
}
