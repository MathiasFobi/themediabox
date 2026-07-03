"use client";

import Link from "next/link";
import type { Product } from "../types";
import { OCCASION_GRADIENTS } from "../types";

export function ProductCard({
  product,
  onBuy,
}: {
  product: Product;
  onBuy: (p: Product) => void;
}) {
  const primaryOccasion = product.occasions[0];
  const gradient = primaryOccasion
    ? OCCASION_GRADIENTS[primaryOccasion]
    : "from-gold/30 to-terracotta/20";

  return (
    <div className="glass-card overflow-hidden group h-full flex flex-col">
      <Link href={`/products/${product.slug}`} className="block">
        <div
          className={`relative aspect-[4/3] bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}
        >
          <div className="absolute inset-0 pattern-overlay opacity-50" />
          <div className="relative text-7xl group-hover:scale-110 transition-transform duration-500">
            {product.emoji}
          </div>
          {product.tag && (
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-text-primary/90 backdrop-blur-sm text-bg-base text-[10px] font-bold uppercase tracking-wider">
              {product.tag}
            </div>
          )}
        </div>
      </Link>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-2">
          <Link
            href={`/products/${product.slug}`}
            className="font-display font-bold text-lg text-text-primary leading-tight hover:text-gold-deep transition"
          >
            {product.title}
          </Link>
          <div className="font-display font-bold text-lg text-gold-deep tabular-nums whitespace-nowrap">
            ${product.price}
          </div>
        </div>
        <p className="text-text-secondary text-sm leading-relaxed mb-4 flex-1">
          {product.shortDescription}
        </p>
        <div className="flex gap-2">
          <Link
            href={`/products/${product.slug}`}
            className="btn-secondary text-xs py-2 px-4 flex-1 justify-center"
          >
            Details
          </Link>
          <button
            type="button"
            onClick={() => onBuy(product)}
            className="btn-primary text-xs py-2 px-4 flex-1 justify-center"
          >
            Buy with PayPal
          </button>
        </div>
      </div>
    </div>
  );
}
