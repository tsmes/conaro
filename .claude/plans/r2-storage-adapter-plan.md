# Implementation Plan: R2 Storage Adapter

Spec: `.claude/plans/r2-storage-adapter-spec.md`
Issue: #13

## Technical Decisions

- **AWS SDK choice**: `@aws-sdk/client-s3` v3 (S3-compatible). Standard, well-maintained, the ecosystem default for R2.
- **R2 client config**: endpoint `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, region `"auto"`, credentials from env, default path-style. Cloudflare's documented setup.
- **Adapter selection**: top-level switch in `src/lib/storage/index.ts` based on `process.env.STORAGE_DRIVER`. Default `"local"`. An invalid value throws at module-load time, crashing the server boot — fail-fast on misconfiguration. The R2 adapter constructor throws on missing `R2_*` env vars; that error propagates the same way.
- **`R2_PUBLIC_URL` normalization**: trim a single trailing slash before use. Operator-friendly; avoids `cdn.example.com//portfolios/...`.
- **`copy()` implementation**: `CopyObjectCommand` with `CopySource: "${bucket}/${fromKey}"`. Server-side, no client-side download.
- **`delete()` semantics**: R2's `DeleteObjectCommand` returns 204 even when the key doesn't exist — matches the local adapter's ENOENT-swallow behavior. No special handling required.
- **`guests-editor.tsx` fix**: the parent server component (`src/app/(authenticated)/conventions/manage/events/[eventId]/guests/page.tsx` and any peer that mounts the editor) precomputes a `Record<string, string>` mapping `imagePath → url` and passes it to the editor as a prop. The editor uses the map for existing guests; for freshly-uploaded guests the client uses the `url` already returned by the upload route. The inline `uploadUrl` function is removed; the client never constructs storage URLs.
- **Mock library**: `aws-sdk-client-mock` as a devDependency. Purpose-built for AWS SDK v3 command mocking; `s3Mock.on(PutObjectCommand).resolves({})` is more readable than hand-rolled `vi.mock`.
- **R2 adapter file location**: `src/lib/storage/r2.ts`, alongside `local.ts`.
- **Existing storage-adjacent integration tests** (`__tests__/integration/guests-save.test.ts`, `__tests__/integration/apply-to-event.test.ts`) inline-mock `@/lib/storage`. Their mocks remain valid through the refactor — they target the public adapter surface, not the implementation. No change required unless `getUrl` shape assertions exist (the investigation confirmed none do).

## Tasks

### 1. Decouple `guests-editor.tsx` from URL construction

The client component currently hard-codes `/api/uploads/${key}`. This breaks the moment we switch to R2 and is a prerequisite for the migration. Land it independently — the change works equally well in local mode.

**Requirements:** REQ-8

**Files:**
- `src/components/conventions/guests-editor.tsx` — remove the inline `uploadUrl` function; accept a new prop (e.g. `guestImageUrls: Record<string, string>`) keyed by `imagePath`; use it for rendering existing guests. For locally-tracked just-uploaded guests, use the `url` field from the upload response (already returned today, just store it in local state alongside `imagePath`).
- `src/app/(authenticated)/conventions/manage/events/[eventId]/guests/page.tsx` (and any other server component that mounts `GuestsEditor` — search for usages) — precompute the URL map by iterating saved guests and calling `storage.getUrl(g.imagePath)` for each non-null `imagePath`; pass the map as the new prop.
- `__tests__/components/guests-editor.test.tsx` (if it exists; otherwise skip) — update fixtures to pass a URL map.

**Approach:**
- Search for `<GuestsEditor` usages (`grep -r "GuestsEditor" src/`) to find every mounting site.
- The editor's local state for new guests already has access to the upload response shape; extend the local row type with an optional `url` field that's populated on successful upload.
- Render logic: prefer locally-stored `url` if set, otherwise look up `guestImageUrls[guest.imagePath]`. Both will be defined for any guest that has an image.

**Verification:**
- `npm run lint` clean.
- `npm test` passes (existing component / integration tests still green).
- Manual smoke test in local dev: open a convention's event guests page, upload a portrait, save, refresh — image still renders.

**Depends on:** none

---

### 2. Add `@aws-sdk/client-s3` and `aws-sdk-client-mock` dependencies

Trivial dep addition; isolated commit so the diff is reviewable on its own.

**Requirements:** Infrastructure

**Files:**
- `package.json` — add `@aws-sdk/client-s3` to `dependencies`, `aws-sdk-client-mock` to `devDependencies`. Use `npm install` to update the lockfile.

**Approach:**
- `npm install @aws-sdk/client-s3@^3 aws-sdk-client-mock@^4 --save` and `--save-dev` for the second.
- Pin exact versions if STANDARDS.md requires (it does — "Pin exact versions in `package.json` (no `^` or `~` prefixes)"). Adjust the install flags accordingly.

**Verification:**
- `npm run build` succeeds (proves no type incompatibility with existing TS config).
- `npm test` passes (sanity check: nothing broken by the new deps).

**Depends on:** none

---

### 3. Implement `R2StorageAdapter` with integration tests

The adapter itself, with test-first scaffolding using `aws-sdk-client-mock`. No call site changes yet — adapter exists in isolation, exercised only by tests.

**Requirements:** REQ-1, REQ-3 (env validation only), REQ-4, REQ-5, REQ-6, REQ-7

**Files:**
- `src/lib/storage/r2.ts` — new file. Class `R2StorageAdapter implements StorageAdapter`. Constructor reads `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` from `process.env`; throws `Error("R2 storage misconfigured: missing X, Y")` if any are missing or empty. Normalizes `R2_PUBLIC_URL` (strip trailing slash). Instantiates `S3Client` with the documented config. Methods:
  - `upload(key, data, contentType)` → `PutObjectCommand` with `Bucket`, `Key`, `Body`, `ContentType`.
  - `copy(fromKey, toKey)` → `CopyObjectCommand` with `Bucket`, `Key: toKey`, `CopySource: \`${this.bucket}/${fromKey}\``.
  - `delete(key)` → `DeleteObjectCommand`. Idempotent by R2 contract; no try/catch needed.
  - `getUrl(key)` → `\`${this.publicUrl}/${key}\``.
- `__tests__/integration/r2-storage-adapter.test.ts` — new file. Use `mockClient(S3Client)` from `aws-sdk-client-mock`. Cases:
  - Constructor throws when one or more `R2_*` vars are missing or empty (per-var case + multi-missing case). Use `vi.stubEnv` to control.
  - `upload` sends `PutObjectCommand` with the expected `Bucket`, `Key`, `Body`, `ContentType`.
  - `copy` sends `CopyObjectCommand` with the expected `CopySource`.
  - `delete` sends `DeleteObjectCommand` with the expected `Key`; resolves cleanly when the mocked client returns the no-op success response.
  - `getUrl` returns `${R2_PUBLIC_URL}/${key}` exactly. Trailing-slash variant of the env var still produces the same URL (normalization).

**Approach:**
- Test-first: write the failing tests, then the adapter to make them pass.
- For the constructor-throws cases, instantiate `R2StorageAdapter` inside `expect(() => new R2StorageAdapter()).toThrow(/missing R2_ACCESS_KEY_ID/)` (or similar regex matching the error message).
- For the command-shape assertions, use `s3Mock.commandCalls(PutObjectCommand)` to retrieve the call args, then `expect(call.args[0].input).toMatchObject({ ... })`.

**Verification:**
- `npm test -- r2-storage-adapter` passes all cases.
- `npm run lint` clean on the new files.
- `npm run build` clean (no type errors).

**Depends on:** task 2

---

### 4. Wire the adapter selection seam in `src/lib/storage/index.ts`

Change the storage entry-point to a `STORAGE_DRIVER`-driven switch. After this lands, `STORAGE_DRIVER=r2` activates the R2 adapter for all 8 upload sites, 2 copy sites, ~15 delete sites, ~17 getUrl consumers — without any other code change.

**Requirements:** REQ-1 (the rest of it), REQ-2, REQ-3 (the rest)

**Files:**
- `src/lib/storage/index.ts` — replace the hardcoded `LocalStorageAdapter` instantiation with a switch:
  ```ts
  // pseudo-code
  function selectAdapter(): StorageAdapter {
    const driver = process.env.STORAGE_DRIVER ?? "local";
    switch (driver) {
      case "local": return new LocalStorageAdapter();
      case "r2":    return new R2StorageAdapter();
      default:      throw new Error(`Unknown STORAGE_DRIVER: "${driver}". Expected "local" or "r2".`);
    }
  }
  export const storage: StorageAdapter = selectAdapter();
  ```
- `__tests__/integration/storage-adapter-selection.test.ts` — new file. Cases:
  - Default (no env): exports a `LocalStorageAdapter` instance (instanceof check via constructor name comparison or duck-typing on `getUrl`).
  - `STORAGE_DRIVER=local`: same.
  - `STORAGE_DRIVER=r2`: requires re-importing the module after stubbing env (use `vi.resetModules()` + dynamic `await import("@/lib/storage")` + the R2 env vars stubbed).
  - `STORAGE_DRIVER=foo`: dynamic import throws with the documented error.

**Approach:**
- Module-load behavior means the test must `vi.resetModules()` between cases and dynamically re-import. Use `vi.stubEnv` to set the driver before each import.
- The existing `__tests__/integration/guests-save.test.ts` and `apply-to-event.test.ts` mock `@/lib/storage` wholesale, so they won't be affected by the selection logic.

**Verification:**
- `npm test` — all suites pass, including the new selection test.
- Local-mode regression check: `npm run dev` (no `STORAGE_DRIVER` set) still serves the existing `/api/uploads/[...path]` flow correctly. Upload a portfolio image manually, confirm it renders.
- Invalid-driver check: `STORAGE_DRIVER=foo npm run dev` exits with the documented error before binding the port.

**Depends on:** tasks 2, 3

---

### 5. Documentation: README and `.env.example`

Operator-facing docs for setting up R2, the variables required, and the smoke-test procedure.

**Requirements:** REQ-10, REQ-11

**Files:**
- `README.md` — extend the "Deployment (Railway)" section with an R2 subsection covering: (a) creating an R2 bucket and a Cloudflare API token (Account API Token with R2 read/write scope), (b) configuring the bucket public URL or a custom domain, (c) the six new env vars and where each value comes from, (d) the smoke-test procedure (set `STORAGE_DRIVER=r2` plus `R2_*` against a dev bucket, run `npm run dev`, upload a portfolio image through the dashboard UI, confirm it renders from the CDN URL, document the result in the PR).
- `.env.example` — **operator paste required** (file is in the sensitive-files allow-list and Claude cannot read or write it). The plan provides exact lines:

  ```
  # Storage backend selection. "local" (default) writes to ./uploads;
  # "r2" uses Cloudflare R2 (set the R2_* vars below).
  STORAGE_DRIVER=local

  # Cloudflare R2 (only required when STORAGE_DRIVER=r2)
  # Account ID from the R2 dashboard URL.
  R2_ACCOUNT_ID=
  # API token with R2 read/write scope. Create in Cloudflare dashboard.
  R2_ACCESS_KEY_ID=
  R2_SECRET_ACCESS_KEY=
  # Name of the R2 bucket.
  R2_BUCKET=
  # Public CDN base URL for the bucket (no trailing slash).
  # Either the R2.dev subdomain or a custom Cloudflare domain.
  R2_PUBLIC_URL=
  ```

**Approach:**
- README section sits between the existing "Deployment (Railway)" steps and the "Cron setup" section (or wherever fits the doc flow).
- The smoke test goes inside the deployment section as a checklist with a one-line "document the result in the PR" instruction.
- The `.env.example` paste lines are reviewed and pasted by the operator; the README walks them through it.

**Verification:**
- README renders cleanly when previewed.
- After the operator pastes into `.env.example`, `git diff .env.example` shows the six new keys with the placeholders.
- An operator following the README from scratch can complete the smoke test against a dev R2 bucket.

**Depends on:** task 4 (so the documented behavior matches code)

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 (R2 adapter implementing StorageAdapter) | 3, 4 |
| REQ-2 (STORAGE_DRIVER selection) | 4 |
| REQ-3 (R2 env vars + fail-fast on missing) | 3, 4 |
| REQ-4 (contentType honored) | 3 |
| REQ-5 (getUrl returns CDN URL) | 3 |
| REQ-6 (CopyObject for copy) | 3 |
| REQ-7 (delete idempotent) | 3 |
| REQ-8 (guests-editor decoupled from URL shape) | 1 |
| REQ-9 (integration test for R2 adapter) | 3 |
| REQ-10 (.env.example + README docs) | 5 |
| REQ-11 (documented smoke test) | 5 |

## Risks

- **R2 path-style vs virtual-hosted addressing**: the AWS SDK v3 default is virtual-hosted style. R2 supports both, but some setups (custom domains, certain TLS configurations) work better with one or the other. If the smoke test reveals a problem, flip `forcePathStyle: true` in the S3Client config. Worth documenting if encountered.
- **`R2_PUBLIC_URL` for a custom Cloudflare domain vs. the default `*.r2.dev` subdomain**: both shapes work, but the operator must enable public access on the bucket OR configure a custom domain at Cloudflare. The README must spell this out — getting it wrong yields a working upload but broken-image renders.
- **First Railway deploy after the seam lands**: until env vars are set, leaving `STORAGE_DRIVER` unset (or `=local`) is safe — the adapter falls back to local. Setting `STORAGE_DRIVER=r2` without the `R2_*` vars will crash startup (intentional, fail-fast). Operator should set all of them in one Railway deploy.
- **Existing assets in DB referencing local-fs paths**: any DB rows from before the R2 cutover point at keys that don't exist in R2 (the local volume was wiped on a prior deploy anyway; nothing was persisted). After R2 lands and the demo db-reset cron next runs, all rows will reference R2 keys that exist. Between cutover and first cron run, broken images for existing rows. Acceptable on the demo; mention in PR description so operator can manually trigger a reset post-deploy if needed.
- **`R2StorageAdapter` constructor at module-load with `STORAGE_DRIVER=local`**: the seam's switch only constructs `R2StorageAdapter` when `driver === "r2"`, so missing `R2_*` env vars don't crash local-mode boots. Verified by the selection test in task 4.
- **Unit test isolation around module-load adapter selection**: `vi.resetModules()` and dynamic `import()` is the standard pattern but easy to get subtly wrong (e.g. forgetting to stub env before re-import). The selection tests in task 4 must follow the pattern exactly; copy-paste from a known-good vitest example if needed.
