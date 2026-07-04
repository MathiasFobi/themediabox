/**
 * Firestore helpers for the `events` collection.
 *
 * One event = one guest book. v1 only has a single "default" event
 * (created by the migration script). v1.5+ can host many events,
 * each with its own slug, branding, and moderation queue.
 *
 * Schema:
 *   events/{slug} {
 *     slug, name, occasion, date, welcomeMessage, themeColor,
 *     headerImage?, status, createdAt, ownerEmail
 *   }
 */
import type { Env, Event, FirestoreDoc, FirestoreValue } from "./config";
import { toFirestoreValue, fromFirestoreValue } from "./config";

function eventUrl(projectId: string, slug: string): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/events/${slug}`;
}

interface FetchOpts {
  method?: string;
  body?: unknown;
  useAdmin?: boolean;
  idToken?: string;
}

async function resolveAuth(env: Env, opts: FetchOpts): Promise<string> {
  if (opts.useAdmin) {
    if (!env.FIREBASE_PRIVATE_KEY) {
      throw new Error("FIREBASE_PRIVATE_KEY not set — cannot use admin auth");
    }
    const { getServiceAccountToken } = await import("./service-account");
    return getServiceAccountToken(env.FIREBASE_PRIVATE_KEY);
  }
  if (!opts.idToken) throw new Error("No auth credentials provided");
  return opts.idToken;
}

async function fdocs(
  url: string,
  env: Env,
  { method = "GET", body, useAdmin, idToken }: FetchOpts
): Promise<Response> {
  const token = await resolveAuth(env, { useAdmin, idToken });
  return fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function docToEvent(doc: FirestoreDoc): Event {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    out[k] = fromFirestoreValue(v);
  }
  return out as unknown as Event;
}

export async function getEvent(
  env: Env,
  projectId: string,
  slug: string,
  opts: { useAdmin?: boolean; idToken?: string } = {}
): Promise<Event | null> {
  const res = await fdocs(eventUrl(projectId, slug), env, opts);
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore getEvent failed: ${res.status} ${text}`);
  }
  return docToEvent(await res.json() as FirestoreDoc);
}

export async function listEvents(
  env: Env,
  projectId: string,
  opts: { useAdmin?: boolean; idToken?: string } = {}
): Promise<Event[]> {
  // POST runQuery for a list (no filter — we want all events, scoped by
  // ownerEmail on the client).
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const res = await fdocs(url, env, {
    method: "POST",
    useAdmin: opts.useAdmin,
    idToken: opts.idToken,
    body: { structuredQuery: { from: [{ collectionId: "events" }], limit: 100 } },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore listEvents failed: ${res.status} ${text}`);
  }
  const rows = (await res.json()) as Array<{ document?: FirestoreDoc }>;
  return rows.filter((r) => r.document).map((r) => docToEvent(r.document!));
}

export async function upsertEvent(
  env: Env,
  projectId: string,
  event: Event,
  opts: { useAdmin?: boolean; idToken?: string; updateOnly?: string[] } = {}
): Promise<Event> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(event)) {
    if (v === undefined) continue;
    fields[k] = toFirestoreValue(v);
  }

  // Firestore REST API quirk: PATCH on a document URL without an
  // `updateMask.fieldPaths` parameter REPLACES the entire document (only
  // the fields in the body remain). For partial updates we MUST include
  // the mask listing exactly the fields we want to write.
  let url = eventUrl(projectId, event.slug);
  if (opts.updateOnly && opts.updateOnly.length) {
    const mask = new URLSearchParams();
    for (const f of opts.updateOnly) mask.append("updateMask.fieldPaths", f);
    url += `?${mask.toString()}`;
  }

  const res = await fdocs(url, env, {
    method: "PATCH",
    useAdmin: opts.useAdmin,
    idToken: opts.idToken,
    body: { fields },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore upsertEvent failed: ${res.status} ${text}`);
  }
  return event;
}

export async function deleteEvent(
  env: Env,
  projectId: string,
  slug: string,
  opts: { useAdmin?: boolean; idToken?: string } = {}
): Promise<void> {
  const res = await fdocs(eventUrl(projectId, slug), env, {
    method: "DELETE",
    useAdmin: opts.useAdmin,
    idToken: opts.idToken,
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Firestore deleteEvent failed: ${res.status} ${text}`);
  }
}

/**
 * Validate a slug: lowercase, alphanumeric + hyphens, 1-50 chars.
 * Returns the normalized slug or throws on invalid input.
 */
export function normalizeSlug(raw: string): string {
  const slug = raw.trim().toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  if (!slug || slug.length > 50) {
    throw new Error("Slug must be 1-50 chars, lowercase letters/digits/hyphens");
  }
  return slug;
}
