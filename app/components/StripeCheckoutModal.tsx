"use client";

import { useEffect } from "react";

/**
 * Slim pre-checkout modal. The Stripe payment link itself collects
 * variants (custom dropdowns), quantity, email, and shipping address —
 * this modal is just the handoff summary.
 */
export function StripeCheckoutModal({
  emoji,
  title,
  priceDisplay,
  priceCaption,
  checkoutNote,
  stripeLink,
  onClose,
}: {
  emoji: string;
  title: string;
  priceDisplay: string;
  priceCaption: string;
  checkoutNote: string;
  stripeLink: string;
  onClose: () => void;
}) {
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
            <div className="text-4xl mb-2">{emoji}</div>
            <h3 className="font-display font-bold text-2xl text-text-primary">
              {title}
            </h3>
            <p className="text-text-secondary text-sm mt-1">
              {priceDisplay}{" "}
              <span className="text-text-tertiary">{priceCaption}</span>
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

        <p className="text-text-secondary text-sm leading-relaxed mb-6">
          {checkoutNote}
        </p>

        <button
          type="button"
          onClick={() => window.open(stripeLink, "_blank", "noopener,noreferrer")}
          className="w-full bg-[#635bff] hover:bg-[#4e46e8] text-white font-semibold py-4 rounded-full transition flex items-center justify-center gap-2 text-base"
        >
          <span className="font-bold">Pay securely with Stripe</span>
          <span aria-hidden>→</span>
        </button>
        <p className="text-text-muted text-[10px] text-center mt-3">
          You&apos;ll be redirected to Stripe&apos;s secure checkout. We never
          see or store your card details.
        </p>
      </div>
    </div>
  );
}
