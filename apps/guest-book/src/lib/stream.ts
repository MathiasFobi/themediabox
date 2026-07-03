/**
 * Cloudflare Stream integration.
 *
 * Two flows:
 *
 *   1) Server-side upload (used for the mock provider in dev / fallback):
 *      POST https://api.cloudflare.com/client/v4/accounts/{id}/stream
 *      Body: multipart/form-data with `file=<binary>`
 *      Returns: { result: { uid, playbackUrl, thumbnail } }
 *
 *   2) Direct browser upload (preferred for production):
 *      Client requests `POST /api/upload-ticket` from us.
 *      We call Cloudflare's "direct upload" endpoint to get a one-time upload URL.
 *      Client PUTs the file to that URL.
 *      On success, we register the Stream UID + playback URL in Firestore.
 *
 *      Docs: https://developers.cloudflare.com/stream/uploading-videos/direct-upload/
 *
 * The latter is preferred because it bypasses our Worker for the actual bytes —
 * a 500 MB wedding video shouldn't touch our 100 MB Worker request limit.
 */
import type { Env } from "./config";

const CF_API = "https://api.cloudflare.com/client/v4";

export interface StreamUploadResult {
  uid: string;
  playbackUrl: string;
  thumbnail?: string;
  duration?: number;
  status: string;
  readyToStream?: boolean;
}

/**
 * Direct-upload ticket — the client uses `uploadURL` to PUT a file directly to
 * Cloudflare. We never see the bytes. After the upload, Cloudflare calls our
 * webhook (if configured) and/or the client polls for readiness.
 */
export interface DirectUploadTicket {
  uid: string;
  uploadURL: string; // one-time use, ~30 min TTL
}

export async function createDirectUploadTicket(
  env: Env,
  opts: {
    maxDurationSeconds: number;
    creator?: string;
  }
): Promise<DirectUploadTicket> {
  const url = `${CF_API}/accounts/${env.CF_ACCOUNT_ID}/stream/direct_upload`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_STREAM_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      maxDurationSeconds: opts.maxDurationSeconds,
      creator: opts.creator,
      // Don't auto-require signed playback URLs in dev — keeps the public
      // playbackUrl stable for testing. Set this to true in production once
      // signed URL flow is implemented.
      requireSignedURLs: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare Stream direct_upload failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    result: { uid: string; uploadURL: string };
  };
  return { uid: json.result.uid, uploadURL: json.result.uploadURL };
}

/**
 * Look up a Stream video's status, playback URL, thumbnail, and duration.
 * Used by the client after upload to confirm processing is complete.
 */
export async function getStreamVideo(
  env: Env,
  uid: string
): Promise<StreamUploadResult> {
  const res = await fetch(
    `${CF_API}/accounts/${env.CF_ACCOUNT_ID}/stream/${uid}`,
    { headers: { Authorization: `Bearer ${env.CLOUDFLARE_STREAM_TOKEN}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stream get failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    result: {
      uid: string;
      status: { state: string; errorReasonCode?: string; errorReasonText?: string } | string;
      playback: { url: string };
      thumbnail?: string;
      duration?: number;
      readyToStream?: boolean;
    };
  };
  // API has returned `status` as either an object `{ state: "ready" }` or
  // (older docs) a plain string. Normalize.
  const state =
    typeof json.result.status === "string"
      ? json.result.status
      : json.result.status.state;
  return {
    uid: json.result.uid,
    status: state,
    playbackUrl: json.result.playback.url,
    thumbnail: json.result.thumbnail,
    duration: json.result.duration,
    readyToStream: json.result.readyToStream ?? (state === "ready"),
  };
}

/**
 * Delete a Stream video (used when the owner rejects + deletes a guest entry).
 */
export async function deleteStreamVideo(env: Env, uid: string): Promise<void> {
  const res = await fetch(
    `${CF_API}/accounts/${env.CF_ACCOUNT_ID}/stream/${uid}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_STREAM_TOKEN}` },
    }
  );
  // 404 is fine — already gone
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Stream delete failed: ${res.status} ${text}`);
  }
}
