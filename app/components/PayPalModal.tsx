"use client";

import { useState, useMemo, useEffect } from "react";
import type { Product } from "../types";

export function PayPalModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const variantKeys = Object.keys(product.variants);
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    variantKeys.forEach((k) => {
      init[k] = product.variants[k][0];
    });
    return init;
  });
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const total = useMemo(
    () => (product.price * quantity).toFixed(2),
    [product.price, quantity]
  );

  const handlePayPal = () => {
    // Build a simple amount-based PayPal link from the base URL.
    // Real product would have a proper PayPal button or hosted link per SKU.
    const url = `${product.paypalBase.split("?")[0]}/${total}`;
    window.open(url, "_blank", "noopener,noreferrer");
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
            <div className="text-4xl mb-2">{product.emoji}</div>
            <h3 className="font-display font-bold text-2xl text-text-primary">
              {product.title}
            </h3>
            <p className="text-text-secondary text-sm mt-1">
              ${product.price.toFixed(2)} per unit
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
          {variantKeys.map((key) => (
            <div key={key}>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-tertiary mb-2">
                {key}
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants[key].map((opt) => {
                  const isActive = selections[key] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setSelections((prev) => ({ ...prev, [key]: opt }))
                      }
                      className={`pill px-3 py-1.5 text-xs font-semibold ${
                        isActive ? "pill-active" : ""
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-tertiary mb-2">
              Quantity
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
          You'll be redirected to PayPal to complete your purchase securely.
        </p>
      </div>
    </div>
  );
}
