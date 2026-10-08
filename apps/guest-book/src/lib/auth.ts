/**
 * Firebase Auth ID token verification.
 *
 * Uses the `jose` library to verify Firebase ID tokens. Firebase exposes
 * its public keys as X.509 PEMs (not JWKS), so we use jose's `importX509`
 * to turn each PEM into a `CryptoKey`, then `jwtVerify` to verify the
 * signature + validate the standard claims.
 */

import { importX509, jwtVerify } from "jose";
import type { JWTPayload } from "jose";

// Cache the kid → CryptoKey map for the lifetime of the Worker isolate.
const cachedKeys: Map<string, CryptoKey> = new Map();
let cachedKeysAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getFirebasePublicKeys(): Promise<Map<string, CryptoKey>> {
  if (cachedKeys.size > 0 && Date.now() - cachedKeysAt < CACHE_TTL_MS) {
    return cachedKeys;
  }
  const res = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase public keys: ${res.status}`);
  }
  const json = (await res.json()) as Record<string, string>;
  cachedKeys.clear();
  for (const [kid, pem] of Object.entries(json)) {
    const key = await importX509(pem, "RS256");
    cachedKeys.set(kid, key);
  }
  cachedKeysAt = Date.now();
  return cachedKeys;
}

export interface VerifiedFirebaseToken {
  email: string;
  email_verified: boolean;
  sub: string;
  auth_time: number;
  exp: number;
  iat: number;
  iss: string;
  aud: string;
}

export async function verifyFirebaseIdToken(
  idToken: string,
  projectId: string
): Promise<VerifiedFirebaseToken> {
  const [headerB64] = idToken.split(".");
  const header = JSON.parse(atob(headerB64)) as { kid?: string; alg?: string };
  if (!header.kid) throw new Error("Missing kid in JWT header");

  const keys = await getFirebasePublicKeys();
  const key = keys.get(header.kid);
  if (!key) throw new Error(`Unknown kid: ${header.kid}`);

  const { payload } = await jwtVerify(idToken, key, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ["RS256"],
  });

  const p = payload as JWTPayload;
  if (typeof p.email !== "string" || !p.email) throw new Error("Missing email");
  if (typeof p.sub !== "string" || !p.sub) throw new Error("Missing sub");

  return p as unknown as VerifiedFirebaseToken;
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
