# Spec — Seed conventions + artists with realistic images for demos

> Source of truth: GitHub issue #12. This file mirrors it so the workflow has a spec on disk.

## Goals

- Spin up a fresh local DB and end up with the seeded conventions visible on the public landing + directory pages, each with a real logo / banner / description.
- A run of `db:seed:artists` produces artist profiles that have **portfolio images attached** (not just empty profiles), so reviewing applications and the public artist gallery feel realistic.

## Conventions to seed (deterministic order, `(?)` = lower priority)

1. Magicon
2. Harucon
3. Fredrikstad Sci-fi Festival
4. Kazokucon
5. Pokécon
6. T-Con (?)
7. Norcon
8. Riscon
9. Torucon
10. Retromessa (?)
11. Mizucon
12. Metrocon
13. Furnavia (?)
14. Hexcon (?)
15. Constellation
16. SpillExpo (?)
17. AdventureCon
18. Banzaicon
19. Animanga
20. Fandomatics
21. ConPassion
22. Smaragdcon
23. Sognacon
24. Unagicon
25. Kawaiicon

## Asset sourcing

- Per convention: logo (square ≥256), banner (4:1 wide), short Markdown description, website URL, host city. Pulled from each convention's own site / wiki where available; source URL recorded in `manifest.json` so it's auditable.
- Per artist: 4–8 portfolio images spread across promo / product / previous_stand sections. CC0 / placeholder / generated art is fine; license recorded in seed metadata.

## Storage layout (mirror existing app)

- `conventions/<id>/logo.webp`
- `conventions/<id>/banner.webp` (and `/banner-mobile.webp` for the responsive variant)
- `portfolios/<profileId>/<imageId>.webp`

Seeder must run sharp through the same `processImage()` helper used for live uploads, so output is consistently webp-optimized.

## Suggested split

- `npm run db:seed:conventions` — creates a seed organizer per convention (idempotent: `seed-organizer-<slug>@seed-organizer.conaro.test`), inserts the convention row, uploads logo + banner + banner-mobile, sets header_color, optionally seeds 1–2 events per convention.
- Extend `npm run db:seed:artists` with `--with-portfolios` flag that picks N images from `scripts/seed-assets/artists/<n>/` per artist and writes `portfolio_images` rows.

## Acceptance

- [ ] Fresh local DB → `npm run db:seed:conventions && npm run db:seed:artists -- --with-portfolios` → landing page shows ~25 cards with real logos.
- [ ] Each convention's detail page renders the correct banner, header colour, description.
- [ ] Reviewing seeded applications shows actual portfolio thumbnails (matches `getArtistsForFloorPlan` shape).
- [ ] Idempotent: running the script twice doesn't duplicate rows or leak files.
- [ ] No production / remote DB writes — local only, per `.claude/rules/safety.md`.

## Out of scope

- Real follower counts, applications counts (already seeded by other scripts).
- Event banners (per-event branding) — covered separately.
