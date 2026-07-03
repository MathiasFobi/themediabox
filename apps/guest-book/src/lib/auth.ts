/**
 * Firebase Auth ID token verification.
 *
 * Strategy: verify the ID token's signature using Google's public keys (RS256).
 * We don't need the full firebase-admin SDK on Workers — jose can do the JWT
 * verification directly, and we only need the `email` and `email_verified` claims
 * to authorize the OWNER.
 *
 * Why not firebase-admin: it's a Node.js lib that doesn't run on Workers. We
 * could use a service account + REST API for Admin SDK operations, but the only
 * Admin operation we need is "is this Firebase ID token real?" — which the
 * public-keys endpoint handles without auth.
 */

// Cache the JWKS for the lifetime of the Worker isolate.
let cachedKeys: Record<string, string> | null = null;
let cachedKeysAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getFirebasePublicKeys(): Promise<Record<string, string>> {
  if (cachedKeys && Date.now() - cachedKeysAt < CACHE_TTL_MS) {
    return cachedKeys;
  }
  // The Firebase public-certs endpoint is keyed by kid → PEM.
  const res = await fetch(
    "https://www.googleapis.com/robot/v1/metrics/x509/securetoken@system.gserviceaccount.com"
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase public keys: ${res.status}`);
  }
  const json = (await res.json()) as Record<string, string>;
  cachedKeys = json;
  cachedKeysAt = Date.now();
  return json;
}

export interface VerifiedFirebaseToken {
  email: string;
  email_verified: boolean;
  sub: string;       // Firebase UID
  auth_time: number;
  exp: number;
  iat: number;
  iss: string;
  aud: string;
}

/**
 * Verify a Firebase ID token using only Web Crypto + the JWKS endpoint.
 * Returns the decoded claims on success, throws on failure.
 *
 * NOTE: For real production use, consider the `jose` library — but we can
 * stay zero-dep here for the smallest possible Worker.
 */
export async function verifyFirebaseIdToken(
  idToken: string,
  projectId: string
): Promise<VerifiedFirebaseToken> {
  // 1) Split JWT
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed ID token");
  const [headerB64, payloadB64, sigB64] = parts;

  // 2) Decode header to get kid
  const header = JSON.parse(atob(headerB64)) as { alg: string; kid: string; typ: string };
  if (header.alg !== "RS256") throw new Error(`Unsupported alg: ${header.alg}`);

  // 3) Look up public key
  const keys = await getFirebasePublicKeys();
  const pem = keys[header.kid];
  if (!pem) throw new Error(`Unknown kid: ${header.kid}`);

  // 4) Verify signature using Web Crypto
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sig = base64UrlDecode(sigB64);
  const key = await importPublicKey(pem);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, data);
  if (!ok) throw new Error("Invalid signature");

  // 5) Validate claims
  const payload = JSON.parse(atob(payloadB64)) as Record<string, unknown>;
  const now = Math.floor(Date.now() / 1000);

  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("Wrong issuer");
  }
  if (payload.aud !== projectId) {
    throw new Error("Wrong audience");
  }
  if (typeof payload.exp === "number" && payload.exp < now) {
    throw new Error("Token expired");
  }
  if (typeof payload.iat === "number" && payload.iat > now + 300) {
    throw new Error("Token from future");
  }
  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("Missing sub");
  }
  if (typeof payload.email !== "string" || !payload.email) {
    throw new Error("Missing email");
  }

  return payload as unknown as VerifiedFirebaseToken;
}

async function importPublicKey(pem: string): Promise<CryptoKey> {
  // Strip PEM headers + whitespace
  const b64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/, "")
    .replace(/-----END CERTIFICATE-----/, "")
    .replace(/\s+/g, "");
  const der = base64Decode(b64);
  return crypto.subtle.importKey(
    "spki",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

function base64UrlDecode(s: string): Uint8Array {
  // JWT base64url → standard base64
  const padded = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(s.length + ((4 - (s.length % 4)) % 4), "=");
  return base64Decode(padded);
}

function base64Decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Extract the Firebase ID token from an incoming Request.
 * Accepts either:
 *   - `Authorization: Bearer <token>`
 *   - Cookie: `__session=<token>`  (Firebase Auth's default web session cookie name)
 */
export function extractIdToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)__session=([^;]+)/);
  if (m) return decodeURIComponent(m[1]);
  return null;
}

/**
 * Strict variant — returns a non-null token or throws a 401 Response.
 * Use in handlers that REQUIRE a token (admin routes).
 */
export function requireIdToken(req: Request): string {
  const token = extractIdToken(req);
  if (!token) {
    throw new Response(JSON.stringify({ error: "Missing auth token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return token;
}