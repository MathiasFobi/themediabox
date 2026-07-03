# apps/

Sub-apps for TheMediaBox. Each lives in its own folder with its own
`package.json` and deploy pipeline.

- **`guest-book/`** — Standalone video guest book (Cloudflare Workers +
  Firestore + Firebase Auth + Cloudflare Stream). See
  [`guest-book/README.md`](./guest-book/README.md).

The Next.js ecom at the repo root (in `app/`, `data/`, `public/`,
`scripts/`) is the original TheMediaBox v1 product catalog and is
unaffected by the apps in this folder.
