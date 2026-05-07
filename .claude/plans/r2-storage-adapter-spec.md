# R2 Storage Adapter for Production

## Problem Statement

The active storage adapter at `src/lib/storage/index.ts` is hard-wired to `LocalStorageAdapter`, which writes uploaded portfolio, convention, event, and snapshot images to `./uploads` on the Railway container's ephemeral filesystem. Every redeploy wipes the directory, so user-uploaded artwork, convention banners, and application snapshots disappear without warning. Now that the demo db-reset cron runs nightly and re-uploads ~100 portfolios into the same ephemeral filesystem, the gap is amplified — re-seeded assets evaporate on the next deploy.

STANDARDS.md specifies Cloudflare R2 with paths `portfolios/{user_id}/{image_id}` and `snapshots/{event_id}/{application_id}/{image_id}`, served via Cloudflare CDN public URLs. This spec implements that.

## Requirements

- [REQ-1] An `R2StorageAdapter` exists that implements every method on the existing `StorageAdapter` interface (`upload`, `copy`, `delete`, `getUrl`) using the AWS SDK v3 against an R2 bucket configured via the S3-compatible API. No method on the interface changes shape — all 8 upload, 2 copy, ~15 delete, and ~17 getUrl call sites continue to work without local changes.
- [REQ-2] The active adapter is selected at module-load time from a `STORAGE_DRIVER` environment variable. Values: `local` (default if unset) selects `LocalStorageAdapter`; `r2` selects `R2StorageAdapter`. Any other value fails fast with a clear error at startup.
- [REQ-3] The `R2StorageAdapter` reads its configuration from the following env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` (the CDN base URL, with no trailing slash). When `STORAGE_DRIVER=r2` and any of these are missing or empty, the application fails fast at startup with an error naming the missing variables. Local-driver mode is unaffected.
- [REQ-4] `R2StorageAdapter.upload(key, data, contentType)` honors the `contentType` argument, sending it as the `Content-Type` HTTP header on the PUT so the CDN serves images with the correct MIME type. (`LocalStorageAdapter` ignores this argument today; the interface declares it.)
- [REQ-5] `R2StorageAdapter.getUrl(key)` returns `${R2_PUBLIC_URL}/${key}` — a fully-qualified, publicly-accessible CDN URL. No signing, no TTL, no auth. Matches the current "public by obscurity with UUIDs" model used by `LocalStorageAdapter` + `/api/uploads/[...path]`.
- [REQ-6] `R2StorageAdapter.copy(fromKey, toKey)` uses the S3 `CopyObject` operation (server-side copy within the bucket), not download-then-reupload, to keep the apply-to-event snapshot path fast.
- [REQ-7] `R2StorageAdapter.delete(key)` succeeds when deleting a non-existent key (parity with `LocalStorageAdapter`'s ENOENT swallow). All call sites use `.catch(() => {})` for cleanup paths today; behavior must remain idempotent.
- [REQ-8] The single client-side reimplementation of `getUrl` at `src/components/conventions/guests-editor.tsx:18-20` is removed. The relevant flow is updated so the client never needs to construct a storage URL — either by using the URL returned in upload responses, or by another minimal mechanism that does not couple the client to the URL shape.
- [REQ-9] An integration test verifies `R2StorageAdapter.upload`, `copy`, `delete`, and `getUrl` against a mocked S3 client (no real R2 network calls). Existing storage-adjacent tests (`guests-save.test.ts`, `apply-to-event.test.ts`) continue to pass without modification, or are minimally adjusted to remain accurate.
- [REQ-10] `.env.example` documents `STORAGE_DRIVER`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` with safe placeholder values and brief inline guidance. The README "Deployment (Railway)" section documents the R2 setup steps (creating a bucket, generating an API token, configuring the public URL / custom domain, and the variables to set).
- [REQ-11] A pre-deploy smoke-test procedure is documented in the README. It must specify how to run the dev server with `STORAGE_DRIVER=r2` against a dev R2 bucket and exercise upload + view end-to-end through the UI for at least one asset type. The intent is to catch issues that mocked tests cannot — CORS rules, content-type handling, public URL configuration, custom domain setup.

## Scope

### In Scope

- New `R2StorageAdapter` class implementing the existing `StorageAdapter` interface.
- Adapter-selection seam in `src/lib/storage/index.ts` based on `STORAGE_DRIVER`.
- Removal of the client-side `getUrl` duplication in `guests-editor.tsx` and any small refactor required to support that.
- New env vars (`STORAGE_DRIVER` and the five `R2_*` vars), `.env.example` updates, README updates.
- Integration test for `R2StorageAdapter` with a mocked S3 client.
- Documented pre-deploy smoke-test procedure.

### Out of Scope

- Migrating any existing assets currently on Railway's filesystem. Railway wipes `./uploads` on every redeploy, so by the time R2 lands the local volume is effectively empty; the next demo db-reset cron run repopulates assets in R2.
- Removing `LocalStorageAdapter` or the `/api/uploads/[...path]/route.ts` serving route. Local mode remains a supported development backend; both files stay.
- Privacy hardening (presigned URLs for snapshot images or other "private" content). Current public-by-obscurity model is preserved. Future spec if needed.
- Switching from plain `<img>` tags to `next/image`. No call site uses `next/image` today; this is unchanged.
- Custom-domain DNS setup or Cloudflare account provisioning. Operator step, documented in README.
- Cleanup of orphaned R2 objects when a portfolio is deleted but `storage.delete` was missed. Existing rollback paths in upload routes use `storage.delete` consistently; that's enough for now.
- Bandwidth metering / R2 usage alerts.
- The `STORAGE_DRIVER=local` path on a Railway service. Local mode is for development only; production uses R2.

## Acceptance Criteria

These are verified during manual testing before the feature is considered complete.

- [ ] `STORAGE_DRIVER=local` (or unset) keeps the existing local-fs behavior. `npm run dev` works without any `R2_*` variables set.
- [ ] `STORAGE_DRIVER=r2` with all five `R2_*` variables set successfully boots the app, and a test upload (e.g. portfolio image via the dashboard UI) writes the object to the configured R2 bucket.
- [ ] `STORAGE_DRIVER=r2` with one of the `R2_*` variables missing fails fast at startup with an error message naming the missing variable. The app does not boot in a half-configured state.
- [ ] An invalid `STORAGE_DRIVER` value (e.g. `STORAGE_DRIVER=s3` or `STORAGE_DRIVER=foo`) fails fast at startup.
- [ ] After upload via the UI in R2 mode, the rendered `<img src>` resolves to a `${R2_PUBLIC_URL}/${key}` URL and loads the image in the browser with the correct content type (e.g. WebP renders as image, not as a download prompt).
- [ ] Apply-to-event flow (which uses `storage.copy` to duplicate portfolio images into per-application snapshots) works end-to-end in R2 mode. The snapshot object exists in the bucket at `snapshots/{eventId}/{applicationId}/{imageId}.webp` after the apply action.
- [ ] Banner / logo replace flows: uploading a new banner overwrites the previous object at the same stable key (e.g. `conventions/{id}/banner.webp`). The cache-busting `?v=...` query param continues to refresh the browser cache.
- [ ] Deleting a portfolio image via the dashboard removes the corresponding R2 object.
- [ ] The guests-editor flow (uploading a guest portrait, attaching it to a guest entry, saving, viewing) works in R2 mode without the client constructing the URL itself.
- [ ] `npm test` passes — including the new `R2StorageAdapter` integration test against a mocked S3 client and the existing `guests-save.test.ts` / `apply-to-event.test.ts`.
- [ ] `.env.example` lists all six new variables with safe placeholders and inline guidance.
- [ ] README has a section explaining how an operator sets up an R2 bucket and what to set on the Railway service. README also has the documented smoke-test procedure.
- [ ] Smoke test executed at least once: dev server running locally with `STORAGE_DRIVER=r2` against a dev R2 bucket, with at least one image uploaded through the UI, persisted to R2, and rendered back from the CDN URL. Result documented in the PR description so future infrastructure changes can be re-verified the same way.

## Constraints

- AWS SDK v3 (`@aws-sdk/client-s3`) is the chosen client. R2 is S3-compatible and this is the standard, well-maintained option.
- The existing `StorageAdapter` interface is the contract. No method is added or removed (presigned URLs are out of scope, so no `getSignedUrl`).
- The `contentType` argument is part of the existing interface. The R2 adapter must honor it; this also means callers must continue to pass real values (they do today — every site passes `image/webp` after `processImage()`).
- The adapter-selection seam must run at module-load time (Next.js evaluates `src/lib/storage/index.ts` once per server process). Per-request driver switching is not a goal.
- Snapshot privacy: today, application snapshots live at `snapshots/{eventId}/{applicationId}/{imageId}.webp` and are publicly readable. R2 public mode preserves this. If the demo or a future production deployment requires real snapshot privacy, that is a separate spec.
- DB schema is unchanged. Stored values remain bare keys (e.g. `portfolios/{id}/{img}.webp`); URL construction stays at the render layer.
- The `/api/uploads/[...path]/route.ts` serving route stays in the codebase unchanged. It's reachable only when running with `STORAGE_DRIVER=local` (or unset), where `LocalStorageAdapter.getUrl` returns `/api/uploads/${key}`. In R2 mode, `getUrl` returns absolute URLs and the route is never hit.
