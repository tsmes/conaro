# Plan — Seed conventions + artists with realistic images for demos

Specification: `.claude/plans/seed-conventions-spec.md` / GitHub issue #12.

## Phase A — Asset bundle on disk

`scripts/seed-assets/conventions/<slug>/` with `manifest.json`, `logo.<ext>`, `banner.<ext>`, optional `banner-mobile.<ext>`. Schema documented in `scripts/seed-assets/conventions/README.md`. Today's status:

- **Complete (manifest + logo + banner)**: magicon, harucon, hexcon, kawaiicon, metrocon, mizucon, norcon, retromessa, sognacon, torucon, constellation, furnavia (12)
- **In progress this session**: fredrikstad-sci-fi-festival, kazokucon, pokecon (manifests just written), banzaicon (manifest written), animanga (manifest written), spillexpo (assets downloaded, manifest pending), adventurecon (assets downloading from web.archive — may need fallback)
- **Stub-only (assets unavailable)**: t-con (no public site), riscon (Instagram-only), unagicon (site 403), fandomatics (FB-only)
- **Partial**: smaragdcon (banner only, no logo), conpassion (banner only, no logo)

Phase A finishes when every slug in the spec list has a folder with at minimum a `manifest.json`. Slugs without images are valid — the seeder skips asset upload for them and inserts the convention row with `logoPath = NULL` so the design system's gradient fallback renders.

### Tasks

- [x] A1. Replace `pokecon` assets with real PokéCon Norway logo + banner.
- [x] A2. Write manifest for `fredrikstad-sci-fi-festival`, `kazokucon`, `pokecon`, `banzaicon`, `animanga`.
- [ ] A3. Try to fetch SpillExpo + AdventureCon assets via browser-style curl / Wayback. (SpillExpo: success. AdventureCon: site is parked, Wayback snapshots return 404; fall back to manifest-only.)
- [ ] A4. Write manifest stubs for `spillexpo`, `adventurecon`, `fandomatics`.

## Phase B — `npm run db:seed:conventions`

New file `scripts/seed-conventions.ts`. Helpers added to `scripts/lib/seed.ts`:

- `SEED_ORGANIZER_DOMAIN = "seed-organizer.conaro.test"`
- `ensureSeedOrganizer({ slug, name }, passwordHash)` — idempotent: looks up the organizer profile by `email = seed-organizer-<slug>@…`, creates if missing.
- `loadConventionManifests()` — reads every `scripts/seed-assets/conventions/*/manifest.json`, validates with a Zod schema, skips folders without a manifest.
- `uploadConventionAsset(conventionId, kind, filePath, sourceFilename)` — reads the file, runs through `processImage()`, calls `storage.upload()` to `conventions/<id>/<kind>.webp`, returns the storage path.

Main loop per manifest:

1. Ensure organizer profile (`profiles` row + `users` row, role = organizer).
2. Upsert the `conventions` row keyed on `organizerId`. Update fields from manifest (`name`, `description`, `websiteUrl`, `headerColor` if present).
3. For each asset (logo / banner / bannerMobile): if file exists, upload it; if not, skip and leave path NULL.
4. For each event in `manifest.events`, upsert by `(conventionId, name)` — create with `buildDefaultFieldRequirements()`, status `accepting_applications` if `applicationOpenDate` would be in the past, otherwise `draft`. Skip events with `null` startDate (they're informational only).

Idempotency: using upsert-by-organizer-email guarantees a re-run reuses the same convention row; logo/banner storage paths are stable (`conventions/<id>/logo.webp`) so re-uploading just overwrites.

Add npm script `"db:seed:conventions": "tsx scripts/seed-conventions.ts"` to `package.json`.

### Tasks

- [ ] B1. Add `SEED_ORGANIZER_DOMAIN` + `ensureSeedOrganizer` to `scripts/lib/seed.ts`.
- [ ] B2. Add manifest loader + Zod schema (`scripts/lib/conventions-manifest.ts`).
- [ ] B3. Implement `scripts/seed-conventions.ts` main loop.
- [ ] B4. Add `db:seed:conventions` npm script.
- [ ] B5. Smoke-test on local DB: run the script, verify rows + storage; rerun, verify no duplicates.

## Phase C — `db:seed:artists -- --with-portfolios`

Out of scope for this session unless time permits — flag and defer if the user would rather review Phase B first. Sketch for posterity:

- Add `scripts/seed-assets/artists/{1,2,3,...}/` with 4–8 royalty-free images each (or AI-generated set checked in once).
- `--with-portfolios` flag in `seed-artists.ts`: after artist profile is upserted, pick a deterministic image bundle (e.g. `index % bundleCount`) and upload via `processImage()` into `portfolios/<profileId>/<imageId>.webp`, insert `portfolio_images` rows with the right `category` enum mix.
- Idempotent: skip if the artist already has portfolio_images rows.

## Phase D — Manual smoke test

- Reset local DB.
- `npm run db:seed:conventions`
- `npm run db:seed:artists -- --with-portfolios`
- Visit landing page → expect ~25 cards.
- Visit a convention detail page → expect banner + header colour + description.
- Visit an artist's public profile → expect portfolio images.

Phase D is the `manual-testing` step from the workflow.

## Open risks / questions

- T-Con and Riscon: I haven't been able to identify any public site. Recommend asking the user before merging for any pointers; otherwise these slugs end up as manifest-only stubs with `notes` flagging the gap.
- Pokécon banner is a Halloween-themed seamless pattern (only wide image the org publishes); the convention detail page may look odd with it as a hero. Acceptable for seed data.
- Smaragdcon, ConPassion, Animanga: 2026 dates not confirmed — events seeded with `null` dates and `notes` flagging.
