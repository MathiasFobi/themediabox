"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Product } from "../../types";
import { OCCASION_GRADIENTS } from "../../types";
import { ProductCard } from "../../components/ProductCard";
import { PayPalModal } from "../../components/PayPalModal";
import products from "@/data/products.json";

const allProducts = products as unknown as Product[];

export default function ProductDetailClient({ product }: { product: Product }) {
  const [paypalProduct, setPaypalProduct] = useState<Product | null>(null);

  const primaryOccasion = product.occasions[0];
  const gradient = primaryOccasion
    ? OCCASION_GRADIENTS[primaryOccasion]
    : "from-gold/30 to-terracotta/20";

  const related = useMemo(
    () =>
      allProducts
        .filter((p) => p.slug !== product.slug && p.occasions.some((o) => product.occasions.includes(o)))
        .slice(0, 3),
    [product]
  );

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8 sm:py-12 max-w-7xl mx-auto w-full">
      <div className="text-sm text-text-tertiary mb-6 animate-fade-up">
        <Link href="/" className="hover:text-gold-deep">Home</Link>
        <span className="mx-2 text-text-muted">/</span>
        <Link href="/products" className="hover:text-gold-deep">Keepsakes</Link>
        <span className="mx-2 text-text-muted">/</span>
        <span className="text-text-primary font-semibold">{product.title}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="animate-fade-up">
          <div className={`relative aspect-square bg-gradient-to-br ${gradient} rounded-3xl flex items-center justify-center overflow-hidden glass-panel gold-border`}>
            <div className="absolute inset-0 pattern-overlay opacity-50" />
            <div className="relative text-[14rem] sm:text-[18rem] leading-none">
              {product.emoji}
            </div>
            {product.tag && (
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-text-primary/90 backdrop-blur-sm text-bg-base text-xs font-bold uppercase tracking-wider">
                {product.tag}
              </div>
            )}
          </div>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/15 border border-border-gold text-gold-deep text-[10px] font-bold uppercase tracking-[0.18em] mb-4">
            ✦ Custom Made
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-text-primary leading-tight mb-4">
            {product.title}
          </h1>
          <div className="flex items-baseline gap-3 mb-6">
            <div className="font-display font-bold text-4xl text-gold-deep tabular-nums">
              ${product.price.toFixed(2)}
            </div>
            <div className="text-text-tertiary text-sm">starting price</div>
          </div>
          <p className="text-text-secondary text-lg leading-relaxed mb-8">
            {product.longDescription}
          </p>

          <div className="flex flex-wrap gap-2 mb-8">
            {product.occasions.slice(0, 6).map((o) => (
              <Link
                key={o}
                href={`/collections/${o}`}
                className="pill px-3 py-1.5 text-xs font-semibold"
              >
                {o.replace("-", " ")}
              </Link>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPaypalProduct(product)}
            className="btn-primary w-full justify-center text-base py-4 mb-3"
          >
            Choose & Buy with PayPal →
          </button>
          <p className="text-text-muted text-xs text-center">
            Opens a modal to pick your variants, quantity, and total. PayPal handles the rest.
          </p>

          <div className="mt-10 space-y-3 text-sm">
            {[
              { label: "Custom-made to your celebration" },
              { label: "Ships in 5–7 business days" },
              { label: "Secure PayPal checkout" },
              { label: "Made in Atlanta, GA" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-text-secondary">
                <span className="text-gold">✦</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-text-primary mb-6">
            You might also love
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} onBuy={setPaypalProduct} />
            ))}
          </div>
        </section>
      )}

      {paypalProduct && (
        <PayPalModal product={paypalProduct} onClose={() => setPaypalProduct(null)} />
      )}
    </main>
  );
}
