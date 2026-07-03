"use client";

import { useMemo, useState } from "react";
import products from "@/data/products.json";
import type { Product, Collection } from "../types";
import { CATEGORY_LABELS, OCCASION_GRADIENTS } from "../types";
import { ProductCard } from "../components/ProductCard";
import { PayPalModal } from "../components/PayPalModal";

const allProducts = products as unknown as Product[];

const CATEGORIES = Array.from(new Set(allProducts.map((p) => p.category)));

export default function ProductsPage() {
  const [query, setQuery] = useState("");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [paypalProduct, setPaypalProduct] = useState<Product | null>(null);

  const toggleCategory = (c: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allProducts.filter((p) => {
      if (activeCategories.size > 0 && !activeCategories.has(p.category)) return false;
      if (q) {
        const hay = `${p.title} ${p.shortDescription} ${p.longDescription} ${p.tag}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [query, activeCategories]);

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8 sm:py-12 max-w-7xl mx-auto w-full">
      <header className="mb-10 animate-fade-up">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl sm:text-4xl">✦</span>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight">
            <span className="shimmer-text">Shop All Keepsakes</span>
          </h1>
        </div>
        <p className="text-text-secondary text-base sm:text-lg max-w-2xl">
          Every product is custom-made for your celebration. Pick a keepsake, customize
          the variants, and check out with PayPal.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">
          <span className="px-2.5 py-1 rounded-md border border-border-glass bg-bg-glass">
            {allProducts.length} keepsakes
          </span>
          <span className="px-2.5 py-1 rounded-md border border-border-glass bg-bg-glass">
            PayPal checkout
          </span>
          <span className="px-2.5 py-1 rounded-md border border-border-glass bg-bg-glass">
            Ships in 5–7 days
          </span>
        </div>
      </header>

      {/* Search */}
      <section className="mb-6 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="relative">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-text-muted">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keepsakes..."
            className="glass-input w-full pl-14 pr-5 py-4 rounded-2xl text-sm placeholder:text-text-muted text-text-primary font-medium"
            aria-label="Search keepsakes"
          />
        </div>
      </section>

      {/* Category pills */}
      <section className="mb-8 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <button
            type="button"
            onClick={() => setActiveCategories(new Set())}
            className={`pill px-5 py-2.5 text-xs font-semibold whitespace-nowrap ${
              activeCategories.size === 0 ? "pill-active" : "text-text-secondary"
            }`}
          >
            All <span className="ml-1 text-[10px] opacity-70">{allProducts.length}</span>
          </button>
          {CATEGORIES.map((c) => {
            const isActive = activeCategories.has(c);
            const count = allProducts.filter((p) => p.category === c).length;
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                className={`pill px-5 py-2.5 text-xs font-semibold whitespace-nowrap ${
                  isActive ? "pill-active" : "text-text-secondary"
                }`}
              >
                {CATEGORY_LABELS[c] ?? c}{" "}
                <span className="ml-1 text-[10px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display font-bold text-xl sm:text-2xl text-text-primary">
          {filtered.length === allProducts.length
            ? "All Keepsakes"
            : `${filtered.length} of ${allProducts.length}`}
        </h2>
        {(query || activeCategories.size > 0) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveCategories(new Set());
            }}
            className="text-xs text-gold-deep hover:underline font-semibold"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-text-secondary font-medium">
            No keepsakes match your search yet.
          </p>
          <p className="text-text-muted text-sm mt-1">
            Try clearing the filters or simplifying your search.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p, idx) => (
            <div key={p.slug} style={{ animationDelay: `${idx * 50}ms` }} className="animate-fade-up">
              <ProductCard product={p} onBuy={setPaypalProduct} />
            </div>
          ))}
        </div>
      )}

      {paypalProduct && (
        <PayPalModal product={paypalProduct} onClose={() => setPaypalProduct(null)} />
      )}
    </main>
  );
}
