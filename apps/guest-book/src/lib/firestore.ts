/**
 * Firestore REST API client (Native mode).
 *
 * We use the public REST API rather than @google-cloud/firestore because the
 * Node.js SDK doesn't run on Workers. The REST API only requires a Firebase
 * ID token (or a service-account access token) for auth.
 */
import type { Env, GuestBook, FirestoreDoc, FirestoreValue } from "./config";
import { toFirestoreValue, fromFirestoreValue } from "./config";
import { getServiceAccountToken } from "./service-account";

const FIRESTORE_BASE =
  "https://firestore.googleapis.com/v1/projects/{project}/databases/(default)/documents";

function base(projectId: string): string {
  return FIRESTORE_BASE.replace("{project}", projectId);
}

function docUrl(projectId: string, id: string): string {
  return `${base(projectId)}/guests/${id}`;
}

interface FetchOpts {
  method?: string;
  body?: unknown;
  // Pass EITHER an idToken (user-context, scoped to that user's Firestore rules)
  // OR useAdmin = true (uses the env's service account — bypasses user rules).
  idToken?: string;
  useAdmin?: boolean;
}

async function resolveAuth(env: Env, opts: FetchOpts): Promise<string> {
  if (opts.useAdmin) {
    if (!env.FIREBASE_PRIVATE_KEY) {
      throw new Error("FIREBASE_PRIVATE_KEY not set — cannot use admin auth");
    }
    return getServiceAccountToken(env.FIREBASE_PRIVATE_KEY);
  }
  if (!opts.idToken) throw new Error("No auth credentials provided");
  return opts.idToken;
}

async function fdocs(
  url: string,
  env: Env,
  { method = "GET", body, idToken, useAdmin }: FetchOpts
): Promise<Response> {
  const token = await resolveAuth(env, { idToken, useAdmin });
  return fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function createGuest(
  env: Env,
  projectId: string,
  guest: GuestBook,
  opts: { useAdmin?: boolean; idToken?: string } = {}
): Promise<GuestBook> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(guest)) {
    if (v === undefined) continue;
    fields[k] = toFirestoreValue(v);
  }
  const res = await fdocs(docUrl(projectId, guest.id), env, {
    method: "PATCH", // upsert — PATCH on the doc URL is create-or-replace
    idToken: opts.idToken,
    useAdmin: opts.useAdmin,
    body: { fields },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore create failed: ${res.status} ${text}`);
  }
  return guest;
}

export async function getGuest(
  env: Env,
  projectId: string,
  id: string,
  opts: { useAdmin?: boolean; idToken?: string } = {}
): Promise<GuestBook | null> {
  const res = await fdocs(docUrl(projectId, id), env, {
    idToken: opts.idToken,
    useAdmin: opts.useAdmin,
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore read failed: ${res.status} ${text}`);
  }
  return docToGuest(await res.json() as FirestoreDoc);
}

export async function listGuests(
  env: Env,
  projectId: string,
  opts: {
    status?: "pending" | "approved" | "rejected";
    limit?: number;
    useAdmin?: boolean;
    idToken?: string;
  } = {}
): Promise<GuestBook[]> {
  // Firestore REST API: structured queries (filter + sort + pageSize) require
  // POST /documents:runQuery with a RunQueryRequest body. The GET /documents
  // endpoint only supports simple "from"/"pageSize" — no filters.
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: "guests" }],
      where: opts.status
        ? {
            fieldFilter: {
              field: { fieldPath: "status" },
              op: "EQUAL",
              value: { stringValue: opts.status },
            },
          }
        : undefined,
      orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
      limit: opts.limit ?? 50,
    },
  };
  const res = await fdocs(url, env, {
    method: "POST",
    idToken: opts.idToken,
    useAdmin: opts.useAdmin,
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore list failed: ${res.status} ${text}`);
  }
  // runQuery returns an array of { document?: { fields: ... }, readTime: ... }
  const rows = (await res.json()) as Array<{ document?: FirestoreDoc }>;
  return rows
    .filter((r) => r.document)
    .map((r) => docToGuest(r.document!));
}

export async function updateGuestStatus(
  env: Env,
  projectId: string,
  id: string,
  status: "approved" | "rejected",
  moderator: string,
  rejectReason: string | undefined,
  opts: { useAdmin?: boolean; idToken?: string } = {}
): Promise<GuestBook> {
  const body = {
    fields: {
      status: toFirestoreValue(status),
      moderatedAt: toFirestoreValue(Date.now()),
      moderatedBy: toFirestoreValue(moderator),
      ...(rejectReason ? { rejectReason: toFirestoreValue(rejectReason) } : {}),
    },
  };
  const url =
    `${docUrl(projectId, id)}?` +
    new URLSearchParams({
      "updateMask.fieldPaths": ["status", "moderatedAt", "moderatedBy", "rejectReason"].join("&updateMask.fieldPaths="),
    });
  const res = await fdocs(url, env, {
    method: "PATCH",
    idToken: opts.idToken,
    useAdmin: opts.useAdmin,
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore update failed: ${res.status} ${text}`);
  }
  return docToGuest(await res.json() as FirestoreDoc);
}

export async function deleteGuest(
  env: Env,
  projectId: string,
  id: string,
  opts: { useAdmin?: boolean; idToken?: string } = {}
): Promise<void> {
  const res = await fdocs(docUrl(projectId, id), env, {
    method: "DELETE",
    idToken: opts.idToken,
    useAdmin: opts.useAdmin,
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Firestore delete failed: ${res.status} ${text}`);
  }
}

function docToGuest(doc: FirestoreDoc): GuestBook {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    out[k] = fromFirestoreValue(v);
  }
  return out as unknown as GuestBook;
}
