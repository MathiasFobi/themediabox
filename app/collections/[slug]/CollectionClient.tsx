"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import products from "@/data/products.json";
import type { Product, Collection } from "../../types";
import { ProductCard } from "../../components/ProductCard";
import { PayPalModal } from "../../components/PayPalModal";

const allProducts = products as unknown as Product[];

export default function CollectionClient({ collection }: { collection: Collection }) {
  const [paypalProduct, setPaypalProduct] = useState<Product | null>(null);

  const collectionProducts = useMemo(
    () =>
      collection.products
        .map((slug) => allProducts.find((p) => p.slug === slug))
        .filter(Boolean) as Product[],
    [collection]
  );

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8 sm:py-12 max-w-7xl mx-auto w-full">
      <div className="text-sm text-text-tertiary mb-6 animate-fade-up">
        <Link href="/" className="hover:text-gold-deep">Home</Link>
        <span className="mx-2 text-text-muted">/</span>
        <Link href="/products" className="hover:text-gold-deep">Keepsakes</Link>
        <span className="mx-2 text-text-muted">/</span>
        <span className="text-text-primary font-semibold">{collection.title}</span>
      </div>

      <header className="mb-10 animate-fade-up">
        <div className="text-6xl mb-4">{collection.emoji}</div>
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-text-primary leading-tight mb-4">
          {collection.title}
        </h1>
        <p className="text-text-secondary text-lg max-w-3xl leading-relaxed">
          {collection.description}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">
          <span className="px-2.5 py-1 rounded-md border border-border-glass bg-bg-glass">
            {collectionProducts.length} keepsakes
          </span>
          <Link
            href="/products"
            className="px-2.5 py-1 rounded-md border border-border-glass bg-bg-glass hover:bg-bg-glass-hover transition"
          >
            ← All Collections
          </Link>
        </div>
      </header>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {collectionProducts.map((p, idx) => (
          <div key={p.slug} style={{ animationDelay: `${idx * 60}ms` }} className="animate-fade-up">
            <ProductCard product={p} onBuy={setPaypalProduct} />
          </div>
        ))}
      </section>

      <section className="mt-20 glass-panel p-8 sm:p-12 gold-border text-center">
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-text-primary mb-3">
          Not sure which keepsake fits?
        </h2>
        <p className="text-text-secondary mb-6 max-w-xl mx-auto">
          Tell us about your celebration and we'll help you pick the perfect
          product — no commitment, no pressure.
        </p>
        <a href="mailto:hello@themediabox.store" className="btn-primary">
          Email Us →
        </a>
      </section>

      {paypalProduct && (
        <PayPalModal product={paypalProduct} onClose={() => setPaypalProduct(null)} />
      )}
    </main>
  );
}
