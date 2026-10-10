"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type OrderSummary = {
  id: string;
  title: string;
  type: string;
  amountTotal: number;
  currency: string;
  photosRequired: boolean;
  photosReceived: boolean;
  status: string;
};

function UploadPhotosInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order") ?? "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoadError("This page needs an order link — check your confirmation email.");
      return;
    }
    fetch(`/api/orders/${encodeURIComponent(orderId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: OrderSummary) => {
        setOrder(data);
        if (!data.photosRequired) {
          setLoadError("This order doesn't need photos — nothing to upload.");
        } else if (data.photosReceived) {
          setDone(true);
        }
      })
      .catch(() => setLoadError("We couldn't find that order. Check the link in your confirmation email."));
  }, [orderId]);

  const onPick = (picked: FileList | null) => {
    if (!picked) return;
    setFiles((prev) => [...prev, ...Array.from(picked)].slice(0, 10));
    setUploadError(null);
  };

  const onUpload = async () => {
    if (files.length === 0 || !orderId) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      files.forEach((f) => form.append("photos", f));
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/photos`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setDone(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed — please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel gold-border max-w-lg w-full p-6 sm:p-8 animate-fade-up">
        <div className="text-4xl mb-2">📸</div>
        <h1 className="font-display font-bold text-2xl text-text-primary mb-1">
          Upload your photos
        </h1>

        {loadError && !order ? (
          <p className="text-text-secondary text-sm mt-3">{loadError}</p>
        ) : done ? (
          <div className="mt-3">
            <p className="text-text-primary font-semibold">Photos received — thank you!</p>
            <p className="text-text-secondary text-sm mt-2">
              {order ? `We're starting work on your ${order.title} now.` : "We're starting work on your order now."}{" "}
              You'll get an email when they're ready.
            </p>
            <Link href="/" className="inline-block mt-6 text-gold underline text-sm">
              Back to TheMediaBox
            </Link>
          </div>
        ) : (
          <div className="mt-3">
            {order && (
              <p className="text-text-secondary text-sm">
                Order: <span className="text-text-primary font-medium">{order.title}</span>
              </p>
            )}
            <p className="text-text-secondary text-sm mt-2">
              Add up to 10 clear photos (10 MB each). Good lighting and a clear view of
              faces work best.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onPick(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-5 w-full py-3 rounded-full border border-border-glass bg-bg-glass hover:bg-bg-glass-hover text-text-primary text-sm font-medium transition"
            >
              {files.length === 0 ? "Choose photos" : `Add more (${files.length}/10 selected)`}
            </button>

            {files.length > 0 && (
              <ul className="mt-4 space-y-1.5 max-h-40 overflow-y-auto">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-sm text-text-secondary">
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="ml-3 text-text-tertiary hover:text-text-primary"
                      aria-label={`Remove ${f.name}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {uploadError && (
              <p className="mt-3 text-sm text-terracotta">{uploadError}</p>
            )}

            <button
              type="button"
              onClick={onUpload}
              disabled={files.length === 0 || uploading}
              className="mt-5 w-full bg-[#b8860b] hover:bg-[#9a7209] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-full transition text-base"
            >
              {uploading ? "Uploading…" : `Upload ${files.length} photo${files.length === 1 ? "" : "s"}`}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function UploadPhotosPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center text-text-secondary">Loading…</main>}>
      <UploadPhotosInner />
    </Suspense>
  );
}
