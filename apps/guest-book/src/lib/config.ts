/**
 * Cloudflare Workers environment bindings + vars for TheMediaBox Guest Book.
 *
 * Secrets (set with `wrangler secret put`):
 *   CLOUDFLARE_STREAM_TOKEN  — Account.Stream:Edit scope
 *   FIREBASE_PRIVATE_KEY     — (optional) Firebase Admin service account key, JSON-encoded
 *
 * Vars (set in wrangler.toml):
 *   CF_ACCOUNT_ID, OWNER_EMAIL, APP_URL, MAX_RECORDING_SECONDS, MAX_UPLOAD_BYTES
 */
export interface Env {
  // Bindings
  ASSETS: Fetcher;

  // Vars
  CF_ACCOUNT_ID: string;
  OWNER_EMAIL: string;
  APP_URL: string;
  MAX_RECORDING_SECONDS: string;
  MAX_UPLOAD_BYTES: string;

  // Secrets
  CLOUDFLARE_STREAM_TOKEN: string;
  FIREBASE_PRIVATE_KEY?: string;
  FIREBASE_WEB_API_KEY?: string;  // The apiKey from the Firebase web app config
}

export interface GuestBook {
  id: string;
  eventSlug: string;       // FK to events/{slug} — the event this entry belongs to
  name: string;          // guest's display name (free-text)
  email?: string;        // optional, for owner to follow up
  toWhom: string;        // who the message is for (the host/event)
  occasion: string;      // free-text, e.g. "Wedding", "50th Birthday"
  message?: string;      // optional text message alongside the video
  streamUid: string;     // Cloudflare Stream UID
  streamPlaybackUrl: string; // https://customer-...cloudflarestream.com/<uid>/manifest/video.m3u8
  streamThumbnailUrl?: string;
  streamWatchUrl?: string;    // https://customer-...cloudflarestream.com/<uid>/watch (browser-agnostic)
  durationSeconds: number;
  status: "pending" | "approved" | "rejected";
  createdAt: number;     // epoch ms
  moderatedAt?: number;
  moderatedBy?: string;
  rejectReason?: string;
}

export interface Event {
  slug: string;            // url-safe identifier, e.g. "maya-and-jordan"
  name: string;            // display name, e.g. "Maya & Jordan's Wedding"
  occasion: string;        // default copy, e.g. "Wedding"
  date: string;            // ISO date for display, e.g. "2026-08-15"
  welcomeMessage: string;  // longer intro text, e.g. "Leave a heartfelt message..."
  themeColor: string;      // hex color, default "#c9a14a" gold
  headerImage?: string;    // optional URL to a hero image
  promoVideoId?: string;   // YouTube video ID (e.g. "dQw4w9WgXcQ") — rendered as an iframe
  status: "open" | "closed"; // closed = form disabled, feed still visible
  createdAt: number;       // epoch ms
  hostEmails: string[];    // emails allowed to moderate this event (lowercase, deduped)
  claimCodes: ClaimCode[]; // active + used invite codes for co-organizers
}

export interface ClaimCode {
  code: string;            // 8-char base32; one-time-use, expires after 7 days
  createdAt: number;       // epoch ms
  createdBy: string;       // email of the host who created the code
  usedBy?: string;         // email of the co-organizer who consumed it
  usedAt?: number;         // epoch ms when consumed
}

export interface FirestoreDoc {
  fields: Record<string, FirestoreValue>;
}

export type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { arrayValue: { values: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

export function toFirestoreValue(v: unknown): FirestoreValue {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v)
      ? { integerValue: String(v) }
      : { doubleValue: v };
  }
  if (typeof v === "boolean") return { booleanValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) {
    return {
      arrayValue: {
        values: v.map((x) => (x == null ? { nullValue: null } : toFirestoreValue(x))),
      },
    };
  }
  if (v != null && typeof v === "object") {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      fields[k] = x == null ? { nullValue: null } : toFirestoreValue(x);
    }
    return { mapValue: { fields } };
  }
  throw new Error(`Unsupported Firestore value type: ${typeof v}`);
}

export function fromFirestoreValue<T = unknown>(v: FirestoreValue): T {
  if ("nullValue" in v) return null as T;
  if ("stringValue" in v) return v.stringValue as T;
  if ("integerValue" in v) return Number(v.integerValue) as T;
  if ("doubleValue" in v) return v.doubleValue as T;
  if ("booleanValue" in v) return v.booleanValue as T;
  if ("timestampValue" in v) return v.timestampValue as T;
  if ("arrayValue" in v) {
    if (!v.arrayValue?.values) return [] as unknown as T;
    return v.arrayValue.values
      .filter((x): x is FirestoreValue => x != null)
      .map((x) => fromFirestoreValue(x)) as unknown as T;
  }
  if ("mapValue" in v) {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v.mapValue.fields ?? {})) {
      out[k] = fromFirestoreValue(x);
    }
    return out as T;
  }
  throw new Error("Unknown Firestore value shape");
}
