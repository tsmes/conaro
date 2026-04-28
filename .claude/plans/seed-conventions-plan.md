# Plan — Seed conventions + artists with realistic images for demos

Specification: `.claude/plans/seed-conventions-spec.md` / GitHub issue #12.

## Phase A — Asset bundle on disk

`scripts/seed-assets/conventions/<slug>/` with `manifest.json`, `logo.<ext>`, `banner.<ext>`, optional `banner-mobile.<ext>`. Schema documented in `scripts/seed-assets/conventions/README.md`.

Phase A finishes when every slug in the spec list has a folder with at minimum a `manifest.json`. Slugs without images are valid — the seeder skips asset upload for them and inserts the convention row with `logoPath = NULL` so the design system's gradient fallback renders.

### Tasks

- [x] A1. Replace `pokecon` assets with real PokéCon Norway logo + banner.
- [x] A2. Write manifest for `fredrikstad-sci-fi-festival`, `kazokucon`, `pokecon`, `banzaicon`, `animanga`.
- [x] A3. Fetch SpillExpo + AdventureCon assets. (SpillExpo: success. AdventureCon: site parked, falls back to manifest-only.)
- [x] A4. Write manifest stubs for `spillexpo`, `adventurecon`, `fandomatics`.
- [x] A5. Audit and remove photo-as-banner files; keep only real branded logos/banners.
- [x] A6. Bump 5 past-dated events (ConPASSION, HaruCon, KawaiiCon, SognaCon, Unagicon) to 2027 weekend dates with original duration.

Phase A committed at 355ab790.

## Phase A2 — Guests + programme bundle

Decision (from user): all 25 cons get synthetic-but-plausible guests and programmes; guest photos are curated CC0 stock portraits shared via a small bundled set.

- `scripts/seed-assets/guests/` ships ~12 CC0 portrait JPGs (`1.jpg` … `12.jpg`) plus a `LICENSES.md` recording each source URL + license.
- Each manifest's `events[]` entries gain optional `guests[]` and `programme[]` arrays:
  - `guests[].photo` is the bundled portrait filename (e.g. `"3.jpg"`); the seeder uploads it to `events/<eventId>/guests/<uuid>.webp` via `processImage()`.
  - `guests[].name`, `title`, `role?`, `pronouns?`, `bio?`, `websiteUrl?`, `socialLinks?[{type,url}]` mirror `Guest` in `src/lib/db/schema/events.ts`.
  - `programme[].date` (YYYY-MM-DD, must fall inside the event window), `startTime` (HH:mm), `endTime?`, `title`, `room?`, `speaker?`. Mirrors `ProgrammeItem`.
- Manifests are written so a manifest with empty `guests: []` / `programme: []` is valid — the seeder skips inserting and the org can populate via UI.
- Synthetic data style: realistic Norwegian artist/cosplayer-style names, plausible roles (Cosplay judge, Workshop host: watercolour, Manga artist spotlight, Game design panel, Voice actor Q&A, etc.), generic con schedule (registration → opening → panels → cosplay contest → workshops → closing) lightly themed per con.

### Tasks

- [ ] A2.1. Curate 12 CC0 portraits from Pexels/Unsplash; write `LICENSES.md`.
- [ ] A2.2. Extend manifest README with `guests[]` and `programme[]` schema.
- [ ] A2.3. Add Zod schema entries for the new fields and update `loadConventionManifests()`.
- [ ] A2.4. Author guests + programme entries for all 25 manifests (4–6 guests, 10–18 programme items per event day).

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
5. For each guest in the event's manifest `guests[]`: upload `photo` (if present) to `events/<eventId>/guests/<uuid>.webp` via `processImage()`, then write the resulting `Guest` object into `events.guests` JSONB column. Replace the array on each run (idempotent).
6. Write the event's manifest `programme[]` array verbatim into `events.programme` JSONB column.

Idempotency: using upsert-by-organizer-email guarantees a re-run reuses the same convention row; logo/banner storage paths are stable (`conventions/<id>/logo.webp`) so re-uploading just overwrites.

Add npm script `"db:seed:conventions": "tsx scripts/seed-conventions.ts"` to `package.json`.

### Tasks

- [ ] B1. Add `SEED_ORGANIZER_DOMAIN` + `ensureSeedOrganizer` to `scripts/lib/seed.ts`.
- [ ] B2. Add manifest loader + Zod schema (`scripts/lib/conventions-manifest.ts`).
- [ ] B3. Implement `scripts/seed-conventions.ts` main loop.
- [ ] B4. Add `db:seed:conventions` npm script.
- [ ] B5. Smoke-test on local DB: run the script, verify rows + storage; rerun, verify no duplicates.

## Phase C — `db:seed:artists -- --with-portfolios`

User decision (from this session): default artist count bumps from 25 to 50, every artist gets a populated portfolio when the flag is set.

- `scripts/seed-assets/portfolios/` ships a shared pool of CC0 art images
  (digital illustration / painting / line art) plus a few "previous-stand"
  booth photos. A small `manifest.json` maps each filename to its
  `portfolio_section` (`promo` | `product` | `previous_stand`) so the
  seeder splits them across the right sections.
- Helper `seedArtistPortfolio(profileId, plan)` in `scripts/lib/seed.ts`:
  picks 4–8 images deterministically from the pool based on the artist's
  index, uploads each through `processImage()` to
  `portfolios/<profileId>/<imageId>.webp`, inserts a `portfolio_images`
  row with the matching section, sortOrder, and a generated caption.
- `seed-artists.ts` gains a `--with-portfolios` flag (and `--portfolios-only`
  for re-running just the upload step). Default behavior without the
  flag is unchanged.
- Idempotent: helper deletes existing portfolio_images for the artist
  before re-inserting, so re-runs don't pile up duplicates.
- `seed-reset.ts` already tears down portfolios via the cascade through
  profiles → portfolio_images, so no extra cleanup needed.

### Tasks

- [ ] C1. Curate ~30–60 CC0 portfolio images under `scripts/seed-assets/portfolios/` plus `manifest.json` mapping section tags.
- [ ] C2. Bump default artist count to 50 in `seed-artists.ts`.
- [ ] C3. Implement `seedArtistPortfolio()` and `--with-portfolios` flag.
- [ ] C4. Smoke-test: `npm run db:seed:reset && npm run db:seed:artists -- 50 --with-portfolios`.

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
