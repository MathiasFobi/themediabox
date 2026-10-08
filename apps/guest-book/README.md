# TheMediaBox · Video Guest Book

A standalone Cloudflare Worker app that lets guests record a video message
for an event (wedding, birthday, graduation, …) and submit it for the host
to moderate. Pushed to the existing `MathiasFobi/themediabox` repo under
`apps/guest-book/`, so the Next.js ecom at the repo root is untouched.

## Stack

- **Runtime:** Cloudflare Workers (TypeScript + Hono)
- **Video:** Cloudflare Stream (direct browser → Stream upload; Worker never
  sees the bytes)
- **Database:** Firestore (Native mode, `us-central`)
- **Auth:** Firebase Auth (Google + email/password) for the owner only
- **Frontend:** Static HTML + vanilla ES modules — no SPA build step
- **Service account:** Worker holds a Firebase service-account JSON to bypass
  Firestore user-context rules (guests are anonymous — no Firebase account)

## Endpoints

| Method | Path                              | Auth   | Purpose                              |
|--------|-----------------------------------|--------|--------------------------------------|
| GET    | `/`                               | —      | Guest recording page                 |
| GET    | `/admin`                          | —      | Owner moderation page                |
| GET    | `/thank-you`                      | —      | Post-submit landing                  |
| POST   | `/api/upload-ticket`              | —      | One-time direct-upload URL for Stream |
| POST   | `/api/guests`                     | —      | Public write of a new guest entry    |
| GET    | `/api/guests?status=approved`     | —      | Public list of approved entries      |
| GET    | `/api/guests/:id`                 | ± owner| Single guest (approved: public, else owner) |
| GET    | `/api/stream/:uid/status`         | —      | Cloudflare Stream processing status |
| POST   | `/api/admin/login`                | —      | Exchange Firebase ID token for session cookie |
| POST   | `/api/admin/logout`               | —      | Clear session                        |
| GET    | `/api/admin/guests?status=…`      | owner  | List guests by status                |
| POST   | `/api/admin/guests/:id/approve`   | owner  | Approve a pending entry              |
| POST   | `/api/admin/guests/:id/reject`    | owner  | Reject a pending entry               |
| DELETE | `/api/admin/guests/:id`           | owner  | Delete entry + Stream video          |

## Setup (one-time)

### 1. Install

```bash
cd apps/guest-book
pnpm install
```

### 2. Cloudflare: enable Stream

Already done for account `8f22679e3ed18ec29e74afdbb45c9c9d`. The Stream API
token used at build time is **not** committed — set it as a secret.

```bash
pnpm wrangler secret put CLOUDFLARE_STREAM_TOKEN
# paste the token with Account.Stream:Edit scope
```

### 3. Firebase: enable Email/Password auth

1. Open https://console.firebase.google.com/project/themediabox-guestbook/authentication/providers
2. Enable **Email/Password**
3. (Optional) Enable **Google** for a one-click sign-in
4. Add `fobimathias@gmail.com` as a user under the **Users** tab

### 4. Firebase: create a service account

1. Open https://console.firebase.google.com/project/themediabox-guestbook/settings/serviceaccounts/adminsdk
2. Click **Generate new private key** → downloads `serviceAccount.json`
3. Strip whitespace so it's a single line of JSON
4. `pnpm wrangler secret put FIREBASE_PRIVATE_KEY` → paste the single-line JSON

The Worker uses this service account to:
- write new `pending` guest entries without requiring guests to sign in
- list/approve/reject entries from the admin UI

### 5. Deploy Firestore rules

```bash
firebase deploy --only firestore:rules
```

### 6. Deploy the Worker

```bash
pnpm run deploy
# output: published themediabox-guestbook (X.XX sec)
#          https://themediabox-guestbook.<your-subdomain>.workers.dev
```

For a custom domain (recommended), add a route in `wrangler.toml`:

```toml
routes = { pattern = "guestbook.themediabox.com/*", custom_domain = true }
```

## Local dev

```bash
pnpm dev
# wrangler dev at http://localhost:8787
```

The dev server reads secrets from `.dev.vars` (gitignored). Create one with:

```toml
# apps/guest-book/.dev.vars
CLOUDFLARE_STREAM_TOKEN = "..."
FIREBASE_PRIVATE_KEY = "..."
```

## Project layout

```
apps/guest-book/
├── public/
│   ├── index.html        # Guest recording page
│   ├── admin.html        # Owner moderation page
│   └── thank-you.html    # Post-submit landing
├── src/
│   ├── index.ts          # Worker entry, all routes
│   └── lib/
│       ├── config.ts     # Env bindings + types
│       ├── auth.ts       # Firebase ID token verification (no SDK)
│       ├── service-account.ts  # OAuth2 access token for Admin REST
│       ├── firestore.ts  # Firestore REST client
│       └── stream.ts     # Cloudflare Stream REST client
├── wrangler.toml         # Worker config
├── tsconfig.json
├── package.json
├── firebase.json         # Firestore rules deploy
├── firestore.rules       # Security rules
├── .firebaserc           # Project alias
└── .gitignore
```

## How a guest leaves a message

1. Open `https://<host>/`
2. Fill in name, who it's for, occasion, optional text
3. Allow camera/mic
4. Hit **Start recording**, talk, hit **Stop**
5. Review the playback
6. Hit **Submit** →
   - Client requests `POST /api/upload-ticket` → gets a one-time `uploadURL`
   - Client PUTs the recorded video directly to Cloudflare Stream
   - Client polls `GET /api/stream/:uid/status` until status is `ready`
   - Client posts `POST /api/guests` with the streamUid + form fields
   - Worker validates the Stream video exists & is ready, then writes a
     `pending` row to Firestore
7. Client redirects to `/thank-you?id=<entry-id>`

## How the owner moderates

1. Open `https://<host>/admin`
2. Sign in with `fobimathias@gmail.com` (Email/Password or Google)
3. Firebase ID token is exchanged for a 7-day httpOnly session cookie
4. Pending tab shows new entries with inline approve / reject / delete
5. Approve flips `status` to `approved` → it appears in the public list
6. Reject flips `status` to `rejected` + optional reason (kept private)
7. Delete also removes the underlying Stream video

## Notes / gotchas

- **Why no firebase-admin SDK on Workers:** the Node.js SDK doesn't bundle
  for Workers. We use the REST APIs directly + sign a service-account JWT
  by hand. The `service-account.ts` file does this with Web Crypto.
- **Why a service account for public writes:** guests are anonymous. Forcing
  them to sign in with Firebase before recording a 30-second video would
  crater the conversion rate. The Worker is the trust boundary — it
  validates every field on `POST /api/guests` before writing.
- **Why direct upload (not server-proxied):** weddings are 500 MB. Workers
  cap requests at 100 MB. Direct upload bypasses us entirely; the bytes
  go from the browser to Cloudflare, and we just hold the resulting UID.
- **`requireSignedURLs: false`:** in dev this keeps playback URLs stable.
  In production you'd flip this to `true` and add a token-mint endpoint
  that issues short-lived signed URLs scoped to each playback. That's a
  future task once we know the actual threat model (likely "anyone with
  the link can watch" is fine for a wedding guest book).
- **Firestore location:** `nam5` (us-central). Matches 4 of your other
  projects and is lowest-latency for East Coast events.
