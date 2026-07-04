/**
 * TheMediaBox Guest Book — Cloudflare Worker entry.
 *
 * Endpoints:
 *   GET  /                          → guest recording UI (static, via ASSETS)
 *   GET  /admin                     → owner moderation UI (static, via ASSETS)
 *   GET  /thank-you                 → post-submit landing (static, via ASSETS)
 *
 *   POST /api/guests                → register a new guest entry (no auth)
 *                                    Body: { name, email?, toWhom, occasion, message?, streamUid }
 *                                    1) creates Stream upload ticket
 *                                    2) OR accepts an already-uploaded streamUid
 *                                    3) writes a `pending` row to Firestore
 *
 *   GET  /api/guests                → list approved guests (no auth) — for the public feed
 *   GET  /api/guests/:id            → get one (no auth for approved, auth required for pending)
 *
 *   POST /api/upload-ticket         → returns a one-time direct-upload URL for Stream
 *                                    Body: { maxDurationSeconds? }
 *
 *   POST /api/admin/login           → exchanges a Firebase ID token for a __session cookie
 *                                    Body: { idToken }
 *
 *   GET  /api/admin/guests          → list guests by status (auth: owner)
 *   POST /api/admin/guests/:id/approve (auth: owner)
 *   POST /api/admin/guests/:id/reject  (auth: owner)
 *   DELETE /api/admin/guests/:id      (auth: owner) — also deletes the Stream video
 */
import { Hono } from "hono";
import type { Env, Event, GuestBook } from "./lib/config";
import {
  extractIdToken,
  verifyFirebaseIdToken,
} from "./lib/auth";
import {
  createGuest,
  deleteGuest,
  getGuest,
  listGuests,
  updateGuestStatus,
} from "./lib/firestore";
import {
  createDirectUploadTicket,
  deleteStreamVideo,
  getStreamVideo,
} from "./lib/stream";
import {
  getEvent,
  listEvents,
  normalizeSlug,
  upsertEvent,
} from "./lib/events";

const app = new Hono<{ Bindings: Env }>();

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

const PROJECT_ID = "themediabox-guestbook"; // single source of truth

function randomId(): string {
  // 16-char url-safe id, plenty of entropy
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function json(data: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });
}

function err(message: string, status = 400): Response {
  return json({ error: message }, status);
}

/**
 * Build the event-scoped Firestore doc id. The admin URL uses just the
 * short id (e.g. "P_j28P68uJPrjRbY") because the client doesn't know the
 * full prefixed form. We accept either:
 *   - the short id, in which case we prepend `{eventSlug}__` if provided
 *   - the full id (already prefixed), in which case we leave it alone
 */
function scopedId(shortId: string, eventSlug: string | undefined): string {
  if (shortId.includes("__")) return shortId; // already event-scoped
  if (!eventSlug) return shortId;             // no slug → use as-is (legacy v1)
  return `${eventSlug}__${shortId}`;
}

/**
 * Verify the caller is the owner (by Firebase ID token) and return their email.
 * Throws 401/403 Response on failure (Hono will pick it up).
 */
async function requireOwner(req: Request, env: Env): Promise<string> {
  const token = extractIdToken(req);
  if (!token) throw err("Missing auth token", 401);
  const claims = await verifyFirebaseIdToken(token, PROJECT_ID);
  if (!claims.email_verified) throw err("Email not verified", 403);
  if (claims.email.toLowerCase() !== env.OWNER_EMAIL.toLowerCase()) {
    throw err("Not authorized", 403);
  }
  return claims.email;
}

function withOwnerErrors<T>(fn: (c: import("hono").Context<{ Bindings: Env }>, email: string) => Promise<T>) {
  return async (c: import("hono").Context<{ Bindings: Env }>) => {
    try {
      const email = await requireOwner(c.req.raw, c.env);
      const result = await fn(c, email);
      return json(result);
    } catch (e) {
      if (e instanceof Response) return e;
      console.error("owner route error", e);
      return err(e instanceof Error ? e.message : "Internal error", 500);
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Auth: exchange Firebase ID token for a session cookie
// ─────────────────────────────────────────────────────────────────────────

app.post("/api/admin/login", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { idToken?: string };
  if (!body.idToken) return err("Missing idToken");

  let claims;
  try {
    claims = await verifyFirebaseIdToken(body.idToken, PROJECT_ID);
  } catch (e) {
    console.error("admin login: token verification failed", e);
    return err(`Invalid ID token: ${e instanceof Error ? e.message : String(e)}`, 401);
  }
  // Owner check first (cheaper, and avoids leaking verification state to
  // non-owners). Verification status is reported back in the response so
  // the admin UI can prompt the user to verify if needed.
  if (claims.email.toLowerCase() !== c.env.OWNER_EMAIL.toLowerCase()) {
    return err("Not the owner", 403);
  }

  // 7-day session cookie (httpOnly, sameSite=Lax, secure in prod).
  // The session is granted even if email is unverified — moderation actions
  // will still be blocked at the route level (requireOwner enforces verified).
  // This lets the admin UI show a "please verify" prompt + send button.
  const maxAge = 60 * 60 * 24 * 7;
  const cookie = [
    `__session=${encodeURIComponent(body.idToken)}`,
    `Max-Age=${maxAge}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    c.env.APP_URL.startsWith("https://") ? "Secure" : "",
  ].filter(Boolean).join("; ");

  return json(
    {
      ok: true,
      email: claims.email,
      emailVerified: claims.email_verified,
    },
    200,
    { "Set-Cookie": cookie }
  );
});

/**
 * Send a Firebase verification email to the current user.
 *
 * Uses the Identity Toolkit REST API: POST accounts:sendOobCode with
 * requestType=VERIFY_EMAIL. The email is delivered by Firebase (the
 * "from" address and link domain depend on what's configured in the
 * Firebase console's Authentication → Templates section).
 *
 * Requires an authenticated session (owner) — the email is sent to the
 * caller's own address, derived from the verified ID token, not from any
 * client-supplied input.
 */
app.post("/api/admin/send-verification", async (c) => {
  // Verify the caller is the owner (and that their ID token is valid).
  // We don't gate on email_verified here — that's the whole point of the
  // endpoint (unverified users need a way to trigger it).
  const token = extractIdToken(c.req.raw);
  if (!token) return err("Missing auth token", 401);
  let claims;
  try {
    claims = await verifyFirebaseIdToken(token, PROJECT_ID);
  } catch (e) {
    return err(`Invalid ID token: ${e instanceof Error ? e.message : String(e)}`, 401);
  }
  if (claims.email.toLowerCase() !== c.env.OWNER_EMAIL.toLowerCase()) {
    return err("Not the owner", 403);
  }
  if (claims.email_verified) {
    return err("Email already verified", 400);
  }

  // Call Identity Toolkit to send the verification email. Firebase Auth
  // requires the Web API key (the same one used in the client-side config).
  // We pass it via env so it isn't committed; the SDK key was set when the
  // Firebase web app was registered. We re-fetch from env if available, but
  // a fallback isn't ideal — the user should set FIREBASE_WEB_API_KEY.
  const webApiKey = c.env.FIREBASE_WEB_API_KEY;
  if (!webApiKey) {
    return err(
      "FIREBASE_WEB_API_KEY not configured. Set it via `wrangler secret put FIREBASE_WEB_API_KEY` (use the apiKey from the Firebase web app config).",
      500
    );
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${webApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "VERIFY_EMAIL",
          idToken: token,
        }),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      console.error("sendOobCode failed", res.status, text);
      return err(`Firebase rejected the request: ${res.status} ${text}`, 502);
    }
    return json({ ok: true, message: "Verification email sent" });
  } catch (e) {
    console.error("send-verification error", e);
    return err(e instanceof Error ? e.message : "Failed to send", 500);
  }
});

app.post("/api/admin/logout", () => {
  const cookie = "__session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax";
  return json({ ok: true }, 200, { "Set-Cookie": cookie });
});

// ─────────────────────────────────────────────────────────────────────────
// Stream upload ticket — direct upload flow
// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────
// Stream upload — server-proxied flow
//
// Why not direct upload: Cloudflare Stream's `direct_upload` URL on this
// account has a TUS protocol regression — the `Tus-Resumable` header is
// stripped by a Data Worker in front of `upload.cloudflarestream.com`, so
// no upload method works (returns 400 with "Decoding Error" or "Basic
// uploads must be made using POST method"). The plain server-side
// multipart upload via the Stream REST API works fine.
//
// Tradeoff: the Worker proxies the bytes, so we're subject to the Worker
// request body limit (100 MB on free, 500 MB on paid). For wedding videos
// (~100-300 MB at standard resolution) this is fine on the paid plan. If
// we hit the limit, we can chunk the upload across multiple Worker calls
// using the Stream "clip" / "upload by URL" APIs.
// ─────────────────────────────────────────────────────────────────────────

app.post("/api/upload", async (c) => {
  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.startsWith("video/")) {
    return err("Content-Type must be a video/* type", 400);
  }
  const maxBytes = Number(c.env.MAX_UPLOAD_BYTES);
  const contentLength = Number(c.req.header("content-length") ?? "0");
  if (maxBytes && contentLength && contentLength > maxBytes) {
    return err(`File too large (${contentLength} > ${maxBytes})`, 413);
  }

  try {
    // Build a fresh multipart/form-data request to Cloudflare Stream.
    // We stream the body through; the body is the raw video bytes.
    const filename = c.req.header("x-filename") ?? "recording.bin";
    const body = await c.req.raw.arrayBuffer();
    const form = new FormData();
    form.set("file", new Blob([body], { type: contentType }), filename);

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${c.env.CF_ACCOUNT_ID}/stream`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.env.CLOUDFLARE_STREAM_TOKEN}`,
        },
        body: form,
      }
    );
    if (!res.ok) {
      const text = await res.text();
      console.error("Stream upload failed", res.status, text);
      return err(`Stream upload failed: ${res.status}`, 502);
    }
    const stream = (await res.json()) as {
      result: {
        uid: string;
        playback: { url?: string; hls?: string; dash?: string };
        thumbnail?: string;
        duration?: number;
        status: { state: string };
        readyToStream: boolean;
      };
    };
    return json({
      uid: stream.result.uid,
      playbackUrl:
        stream.result.playback.hls ??
        stream.result.playback.url ??
        stream.result.playback.dash ??
        "",
      thumbnail: stream.result.thumbnail,
      duration: stream.result.duration,
      status: stream.result.status.state,
      readyToStream: stream.result.readyToStream,
    });
  } catch (e) {
    console.error("upload error", e);
    return err(e instanceof Error ? e.message : "Upload failed", 500);
  }
});

app.post("/api/upload-ticket", async (c) => {
  // Kept for backward compat — the client no longer uses it, but if a
  // direct-upload ticket has already been issued we still want it to work
  // for clients that come back to this endpoint.
  const body = (await c.req.json().catch(() => ({}))) as { maxDurationSeconds?: number };
  const max = body.maxDurationSeconds ?? Number(c.env.MAX_RECORDING_SECONDS);
  try {
    const ticket = await createDirectUploadTicket(c.env, { maxDurationSeconds: max });
    return json(ticket);
  } catch (e) {
    console.error("ticket error", e);
    return err(e instanceof Error ? e.message : "Ticket failed", 500);
  }
});

// Public status check — used by the client to wait for processing.
app.get("/api/stream/:uid/status", async (c) => {
  const uid = c.req.param("uid");
  try {
    const v = await getStreamVideo(c.env, uid);
    return json({
      uid: v.uid,
      status: v.status, // "uploading" | "processing" | "ready" | "error"
      duration: v.duration,
      playbackUrl: v.playbackUrl,
      thumbnail: v.thumbnail,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Not found", 404);
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Public event endpoints
// ─────────────────────────────────────────────────────────────────────────

app.get("/api/events", async (c) => {
  // List all events (public read; in v1.5 we just need the slug for routing)
  try {
    const events = await listEvents(c.env, PROJECT_ID, { useAdmin: true });
    return json({ events });
  } catch (e) {
    return err(e instanceof Error ? e.message : "List failed", 500);
  }
});

app.get("/api/events/:slug", async (c) => {
  const slug = c.req.param("slug")!;
  try {
    const event = await getEvent(c.env, PROJECT_ID, slug, { useAdmin: true });
    if (!event) return err("Not found", 404);
    return json(event);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Get failed", 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Public guest endpoints
// ─────────────────────────────────────────────────────────────────────────

app.post("/api/guests", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Partial<GuestBook> & {
    streamUid?: string;
  };

  // Validation — keep this tight; this is the only untrusted write surface
  const required: (keyof GuestBook)[] = ["name", "toWhom", "occasion", "streamUid", "eventSlug"];
  for (const k of required) {
    const v = body[k];
    if (typeof v !== "string" || !v.trim()) return err(`Missing ${k}`);
  }

  // Verify the event exists and is open.
  let event: Event;
  try {
    const e = await getEvent(c.env, PROJECT_ID, body.eventSlug!, { useAdmin: true });
    if (!e) return err("Event not found", 404);
    if (e.status === "closed") return err("This event is closed to new submissions", 403);
    event = e;
  } catch (e) {
    return err(e instanceof Error ? e.message : "Event lookup failed", 500);
  }

  const maxSecs = Number(c.env.MAX_RECORDING_SECONDS);

  // 1) Verify the Stream UID actually exists & is ready
  let stream;
  try {
    stream = await getStreamVideo(c.env, body.streamUid!);
  } catch (e) {
    return err("Stream video not found or not ready", 400);
  }
  if (stream.status !== "ready") {
    return err(`Stream not ready (status: ${stream.status})`, 400);
  }
  if (stream.duration && stream.duration > maxSecs) {
    return err(`Recording too long (${stream.duration}s > ${maxSecs}s)`, 400);
  }
  if (!stream.playbackUrl) {
    return err("Stream has no playback URL", 400);
  }

  // 2) Build the guest row
  // Derive a "watch" URL from the playback URL so the admin UI can preview
  // the video in a browser-agnostic iframe (browsers other than Safari
  // don't play raw HLS in <video> without hls.js).
  //   playbackUrl: https://customer-<hash>.cloudflarestream.com/<uid>/manifest/video.m3u8
  //   watchUrl:    https://customer-<hash>.cloudflarestream.com/<uid>/watch
  const m = stream.playbackUrl?.match(/^(https:\/\/customer-[^.]+\.cloudflarestream\.com)\/[^/]+\//);
  const streamWatchUrl = m ? `${m[1]}/${stream.uid}/watch` : undefined;

  const guest: GuestBook = {
    id: randomId(),
    eventSlug: event.slug,
    name: body.name!.trim().slice(0, 80),
    email: body.email?.trim().slice(0, 200) || undefined,
    toWhom: body.toWhom!.trim().slice(0, 80),
    occasion: body.occasion!.trim().slice(0, 80),
    message: body.message?.trim().slice(0, 1000) || undefined,
    streamUid: stream.uid,
    streamPlaybackUrl: stream.playbackUrl,
    streamThumbnailUrl: stream.thumbnail,
    streamWatchUrl,
    durationSeconds: Math.round(stream.duration ?? 0),
    status: "pending", // default — owner approves
    createdAt: Date.now(),
  };

  // 3) Public write path: guests don't have Firebase accounts, so we use
  //    the service account (admin) to write to Firestore. The Worker holds
  //    FIREBASE_PRIVATE_KEY as a secret.
  try {
    await createGuest(c.env, PROJECT_ID, guest, { useAdmin: true });
  } catch (e) {
    console.error("firestore create error", e);
    return err(e instanceof Error ? e.message : "Firestore write failed", 500);
  }
  return json({ id: guest.id, eventSlug: guest.eventSlug, status: guest.status });
});

app.get("/api/guests", async (c) => {
  const status = c.req.query("status") as "pending" | "approved" | "rejected" | undefined;
  const eventSlug = c.req.query("eventSlug") ?? undefined;
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);

  // Public read: only approved, must be scoped to an event
  if (status && status !== "approved") return err("Only approved is public", 400);
  if (!eventSlug) return err("eventSlug query param is required", 400);
  try {
    const rows = await listGuests(c.env, PROJECT_ID, {
      eventSlug,
      status: status ?? "approved",
      limit,
      useAdmin: true,
    });
    return json({ guests: rows });
  } catch (e) {
    console.error("firestore list error", e);
    return err(e instanceof Error ? e.message : "Firestore list failed", 500);
  }
});

app.get("/api/guests/:id", async (c) => {
  // ID format: {eventSlug}__{id} — we split it to scope the read.
  const rawId = c.req.param("id");
  const sep = rawId.indexOf("__");
  if (sep < 0) return err("Invalid id", 400);
  const eventSlug = rawId.slice(0, sep);
  try {
    const guest = await getGuest(c.env, PROJECT_ID, rawId, { useAdmin: true });
    if (!guest) return err("Not found", 404);
    if (guest.status !== "approved" || eventSlug !== c.req.query("eventSlug")) {
      try {
        await requireOwner(c.req.raw, c.env);
      } catch {
        return err("Not found", 404);
      }
    }
    return json(guest);
  } catch (e) {
    console.error("get guest error", e);
    return err(e instanceof Error ? e.message : "Read failed", 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Admin endpoints — owner only
// ─────────────────────────────────────────────────────────────────────────

app.get(
  "/api/admin/guests",
  withOwnerErrors(async (c, email) => {
    const url = new URL(c.req.url);
    const status = (url.searchParams.get("status") ?? "pending") as
      | "pending"
      | "approved"
      | "rejected";
    const eventSlug = url.searchParams.get("eventSlug") ?? undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
    const rows = await listGuests(c.env, PROJECT_ID, {
      status,
      limit,
      eventSlug,
      useAdmin: true,
    });
    return { guests: rows, requestedBy: email };
  })
);

app.get(
  "/api/admin/events",
  withOwnerErrors(async (_c, email) => {
    const events = await listEvents(_c.env, PROJECT_ID, { useAdmin: true });
    return { events, requestedBy: email };
  })
);

app.post(
  "/api/admin/events",
  withOwnerErrors(async (c, email) => {
    const body = (await c.req.json().catch(() => ({}))) as Partial<Event>;
    if (!body.slug) return err("Missing slug");
    let slug: string;
    try {
      slug = normalizeSlug(body.slug);
    } catch (e) {
      return err(e instanceof Error ? e.message : "Bad slug", 400);
    }
    const existing = await getEvent(c.env, PROJECT_ID, slug, { useAdmin: true });
    if (existing) return err("Slug already in use", 409);

    const event: Event = {
      slug,
      name: body.name?.trim() || slug,
      occasion: body.occasion?.trim() || "Event",
      date: body.date?.trim() || new Date().toISOString().slice(0, 10),
      welcomeMessage: body.welcomeMessage?.trim() || `Leave a message for the hosts of ${slug}.`,
      themeColor: body.themeColor?.trim() || "#c9a14a",
      headerImage: body.headerImage?.trim() || undefined,
      status: body.status === "closed" ? "closed" : "open",
      createdAt: Date.now(),
      ownerEmail: email,
    };
    await upsertEvent(c.env, PROJECT_ID, event, { useAdmin: true });
    return event;
  })
);

app.put(
  "/api/admin/events/:slug",
  withOwnerErrors(async (c, email) => {
    const slug = c.req.param("slug")!;
    const existing = await getEvent(c.env, PROJECT_ID, slug, { useAdmin: true });
    if (!existing) return err("Event not found", 404);
    if (existing.ownerEmail.toLowerCase() !== email.toLowerCase()) {
      return err("Not the owner of this event", 403);
    }
    const body = (await c.req.json().catch(() => ({}))) as Partial<Event>;
    const updated: Event = {
      ...existing,
      name: body.name?.trim() || existing.name,
      occasion: body.occasion?.trim() || existing.occasion,
      date: body.date?.trim() || existing.date,
      welcomeMessage: body.welcomeMessage?.trim() || existing.welcomeMessage,
      themeColor: body.themeColor?.trim() || existing.themeColor,
      headerImage:
        body.headerImage !== undefined ? body.headerImage?.trim() || undefined : existing.headerImage,
      status: body.status === "closed" || body.status === "open" ? body.status : existing.status,
    };
    await upsertEvent(c.env, PROJECT_ID, updated, { useAdmin: true });
    return updated;
  })
);

app.post(
  "/api/admin/guests/:id/approve",
  withOwnerErrors(async (c, email) => {
    const eventSlug = (c.req.query("eventSlug") || "").trim();
    const id = scopedId(c.req.param("id")!, eventSlug);
    const guest = await updateGuestStatus(
      c.env,
      PROJECT_ID,
      id,
      "approved",
      email,
      undefined,
      { useAdmin: true }
    );
    return guest;
  })
);

app.post(
  "/api/admin/guests/:id/reject",
  withOwnerErrors(async (c, email) => {
    const eventSlug = (c.req.query("eventSlug") || "").trim();
    const id = scopedId(c.req.param("id")!, eventSlug);
    const body = (await c.req.json().catch(() => ({}))) as { reason?: string };
    const guest = await updateGuestStatus(
      c.env,
      PROJECT_ID,
      id,
      "rejected",
      email,
      body.reason?.trim().slice(0, 200),
      { useAdmin: true }
    );
    return guest;
  })
);

app.delete(
  "/api/admin/guests/:id",
  withOwnerErrors(async (c) => {
    const eventSlug = (c.req.query("eventSlug") || "").trim();
    const id = scopedId(c.req.param("id")!, eventSlug);
    const guest = await getGuest(c.env, PROJECT_ID, id, { useAdmin: true });
    if (guest) {
      // Best-effort delete the Stream video too
      try {
        await deleteStreamVideo(c.env, guest.streamUid);
      } catch (e) {
        console.warn("stream delete failed (continuing)", e);
      }
      await deleteGuest(c.env, PROJECT_ID, id, { useAdmin: true });
    }
    return { ok: true };
  })
);

// ─────────────────────────────────────────────────────────────────────────
// Static page routes (delegate to ASSETS binding)
//
// Routing model:
//   /                            → index.html (which calls /api/events → first event or empty state)
//   /{slug}                      → index.html (with ?slug=... pre-applied)
//   /{slug}/admin                → admin.html
//   /{slug}/thank-you            → thank-you.html
//   /admin                       → admin.html (redirects to first event's admin)
//   /thank-you                   → thank-you.html (legacy)
//
// Slug pattern: lowercase, 1-50 chars, letters/digits/hyphens.
// We pass the slug to the static pages via a query string so the JS can
// read it from `location.search` (or location.pathname).
// ─────────────────────────────────────────────────────────────────────────

const SLUG_RE = /^\/([a-z0-9-]{1,50})(?:\/(admin|thank-you))?\/?$/;

app.get("/", (c) => c.env.ASSETS.fetch(new URL("/index.html", c.req.url)));

app.get("/admin", (c) => c.env.ASSETS.fetch(new URL("/admin.html", c.req.url)));

app.get("/thank-you", (c) => c.env.ASSETS.fetch(new URL("/thank-you.html", c.req.url)));

app.get("/:slug", (c) => {
  const slug = c.req.param("slug");
  if (!SLUG_RE.test(`/${slug}`)) return err("Not found", 404);
  return c.env.ASSETS.fetch(new URL(`/index.html?slug=${encodeURIComponent(slug)}`, c.req.url));
});

app.get("/:slug/admin", (c) => {
  const slug = c.req.param("slug");
  if (!SLUG_RE.test(`/${slug}/admin`)) return err("Not found", 404);
  return c.env.ASSETS.fetch(new URL(`/admin.html?slug=${encodeURIComponent(slug)}`, c.req.url));
});

app.get("/:slug/thank-you", (c) => {
  const slug = c.req.param("slug");
  if (!SLUG_RE.test(`/${slug}/thank-you`)) return err("Not found", 404);
  return c.env.ASSETS.fetch(new URL(`/thank-you.html?slug=${encodeURIComponent(slug)}`, c.req.url));
});

// ─────────────────────────────────────────────────────────────────────────
// 404
// ─────────────────────────────────────────────────────────────────────────

app.notFound(() => err("Not found", 404));

app.onError((e) => {
  console.error("unhandled", e);
  return err(e instanceof Error ? e.message : "Internal error", 500);
});

export default app;
