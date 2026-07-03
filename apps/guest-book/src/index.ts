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
import type { Env, GuestBook } from "./lib/config";
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
    return err("Invalid ID token", 401);
  }
  if (!claims.email_verified) return err("Email not verified", 403);
  if (claims.email.toLowerCase() !== c.env.OWNER_EMAIL.toLowerCase()) {
    return err("Not the owner", 403);
  }

  // 7-day session cookie (httpOnly, sameSite=Lax, secure in prod)
  const maxAge = 60 * 60 * 24 * 7;
  const cookie = [
    `__session=${encodeURIComponent(body.idToken)}`,
    `Max-Age=${maxAge}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    c.env.APP_URL.startsWith("https://") ? "Secure" : "",
  ].filter(Boolean).join("; ");

  return json({ ok: true, email: claims.email }, 200, { "Set-Cookie": cookie });
});

app.post("/api/admin/logout", () => {
  const cookie = "__session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax";
  return json({ ok: true }, 200, { "Set-Cookie": cookie });
});

// ─────────────────────────────────────────────────────────────────────────
// Stream upload ticket — direct upload flow
// ─────────────────────────────────────────────────────────────────────────

app.post("/api/upload-ticket", async (c) => {
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
// Public guest endpoints
// ─────────────────────────────────────────────────────────────────────────

app.post("/api/guests", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Partial<GuestBook> & {
    streamUid?: string;
  };

  // Validation — keep this tight; this is the only untrusted write surface
  const required: (keyof GuestBook)[] = ["name", "toWhom", "occasion", "streamUid"];
  for (const k of required) {
    const v = body[k];
    if (typeof v !== "string" || !v.trim()) return err(`Missing ${k}`);
  }
  const maxBytes = Number(c.env.MAX_UPLOAD_BYTES);
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
  const guest: GuestBook = {
    id: randomId(),
    name: body.name!.trim().slice(0, 80),
    email: body.email?.trim().slice(0, 200) || undefined,
    toWhom: body.toWhom!.trim().slice(0, 80),
    occasion: body.occasion!.trim().slice(0, 80),
    message: body.message?.trim().slice(0, 1000) || undefined,
    streamUid: stream.uid,
    streamPlaybackUrl: stream.playbackUrl,
    streamThumbnailUrl: stream.thumbnail,
    durationSeconds: Math.round(stream.duration ?? 0),
    status: "pending", // default — owner approves
    createdAt: Date.now(),
  };
  if (maxBytes && body.durationSeconds && body.durationSeconds > maxSecs) {
    return err("Recording too long", 400);
  }

  // 3) Public write path: guests don't have Firebase accounts, so we use
  //    the service account (admin) to write to Firestore. The Worker holds
  //    FIREBASE_PRIVATE_KEY as a secret.
  try {
    await createGuest(c.env, PROJECT_ID, guest, { useAdmin: true });
  } catch (e) {
    console.error("firestore create error", e);
    return err(e instanceof Error ? e.message : "Firestore write failed", 500);
  }
  return json({ id: guest.id, status: guest.status });
});

app.get("/api/guests", async (c) => {
  const status = c.req.query("status") as "pending" | "approved" | "rejected" | undefined;
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);

  // Public read: only approved, max 50
  if (status && status !== "approved") return err("Only approved is public", 400);
  try {
    const rows = await listGuests(c.env, PROJECT_ID, {
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
  const id = c.req.param("id");
  try {
    const guest = await getGuest(c.env, PROJECT_ID, id, { useAdmin: true });
    if (!guest) return err("Not found", 404);
    // Pending/rejected are owner-only
    if (guest.status !== "approved") {
      try {
        await requireOwner(c.req.raw, c.env);
      } catch {
        return err("Not found", 404); // collapse 403 into 404 to avoid existence leaks
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
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
    const rows = await listGuests(c.env, PROJECT_ID, { status, limit, useAdmin: true });
    return { guests: rows, requestedBy: email };
  })
);

app.post(
  "/api/admin/guests/:id/approve",
  withOwnerErrors(async (c, email) => {
    const id = c.req.param("id")!;
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
    const id = c.req.param("id")!;
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
    const id = c.req.param("id")!;
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
// Cloudflare Pages-style routing: "/" → "index.html", "/admin" → "admin.html"
// ─────────────────────────────────────────────────────────────────────────

app.get("/", (c) => c.env.ASSETS.fetch(new URL("/index.html", c.req.url)));
app.get("/admin", (c) => c.env.ASSETS.fetch(new URL("/admin.html", c.req.url)));
app.get("/thank-you", (c) => c.env.ASSETS.fetch(new URL("/thank-you.html", c.req.url)));

// ─────────────────────────────────────────────────────────────────────────
// 404
// ─────────────────────────────────────────────────────────────────────────

app.notFound(() => err("Not found", 404));

app.onError((e) => {
  console.error("unhandled", e);
  return err(e instanceof Error ? e.message : "Internal error", 500);
});

export default app;
