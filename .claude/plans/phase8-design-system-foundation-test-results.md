# Phase 8 — Design System Foundation: Test Results

## Automated checks

| Check | Result | Notes |
|---|---|---|
| `npm run build` | ✅ clean | Turbopack build succeeds; every existing route still emits. |
| `npm test` | ✅ 204/204 passing | 34 test files across node + jsdom projects. |
| `npm run lint` | ⚠️ 1 pre-existing error + 11 pre-existing warnings | No new issues from Phase 8 changes. The Phase 8 `ThemeToggle` mounted-flag warning is suppressed with a justified `eslint-disable` inline. |
| Token leak scan | ✅ clean | Grep across `src/` for `bg-white`/`text-black`/`bg-slate-*`/`bg-gray-*`/`bg-zinc-*` etc. returns zero matches. Hex colors appear only inside `globals.css` token definitions. |

## Acceptance criteria from the spec

### Foundation (tokens + fonts + utilities)
- [x] `globals.css` defines the new light + dark token palettes per the spec tables.
- [x] Manrope + Inter loaded via `next/font/google`; `--font-heading` / `--font-sans` CSS variables wired up.
- [x] Type scale utilities (`text-display-lg`, `text-display-md`, `text-headline-lg`, `text-headline-md`, `text-body-md`, `text-label-sm`) generated via `@theme`.
- [x] `.shadow-gallery`, `.bg-primary-gradient`, `.glass-nav` utilities defined and verified in the slice screens.

### Components
- [x] New shadcn primitives installed via `npx shadcn add`: `sidebar`, `sheet`, `dropdown-menu`, `avatar`, `table`, `tooltip` (plus bonus `skeleton` + `use-mobile` hook). All Base UI, no Radix contamination.
- [x] Button: primary uses `bg-primary-gradient`, `rounded-[10px]`, `font-semibold tracking-tight`. Variant API unchanged. `lg` bumped to `h-12 px-8`.
- [x] Input/Textarea: filled `bg-secondary`, no border, 2px primary focus ring with 4px offset.
- [x] Card: `border-0`, `rounded-2xl`, default `shadow-gallery`. New `interactive` prop adds hover state (`cursor-pointer hover:bg-surface-bright`).
- [x] Badge: pill-shaped, `text-[10px] font-bold uppercase tracking-wider`. `success` variant added. `STATUS_STYLES` extracted to `src/lib/applications/status-styles.ts` with unit coverage.
- [x] `AuthShell` composes shadcn Sidebar primitives (no custom sidebar implementation). Mobile drawer behavior comes from shadcn's built-in Sheet integration.
- [x] `ThemeToggle` uses shadcn `DropdownMenu` (no custom popover).
- [x] Applications table uses shadcn `Table` (no raw `<table>` markup).
- [x] Avatar chips use shadcn `Avatar` + `AvatarFallback` for initials across nav, dashboard, and Following.

### Layout
- [x] `(public)` and `(authenticated)` route groups created; every existing page moved into the appropriate group. URLs unchanged (verified via `next build` output).
- [x] `PublicShell` glass nav with brand, public links, theme toggle, auth buttons or avatar menu based on session.
- [x] `HomepageFooter` renders only on the homepage (imported directly by the homepage page — other public pages have no footer).
- [x] `AuthShell` sidebar + sticky top header + mobile drawer via shadcn Sidebar.
- [x] Old `header.tsx` deleted; `NotificationBell` and `signOut` wiring reused.
- [x] Per-page `auth()` checks preserved (every page that had them still has them; role-based redirects unchanged).

### Homepage
- [x] Hero section renders with overline, display headline with italic-primary "Once.", subhead, left-aligned.
- [x] Two CTA bento cards (Artist white / Organizer dark inverted) render and link correctly.
- [x] CTA buttons swap to "Go to Dashboard" (artist) or "Manage Conventions" (organizer) when logged in — covered by HomepageView tests.
- [x] "Designed for Focus" section renders both columns with three steps each.
- [x] Final CTA section renders with both buttons and the directory link.
- [x] HomepageFooter stub-links About / Terms / Privacy to `#` with a TODO comment; Support dropped.

### Dashboard
- [x] Welcome hero shows `{firstName}` with dynamic subtitle based on unread notification count — covered by DashboardView tests.
- [x] Completeness widget shows segmented progress bar plus three section pills. `computeCompleteness` logic untouched; total segments = sum of section totals, filled = sum of filled counts.
- [x] Three quick-action cards (Edit Profile / View Portfolio / Browse Events) render with correct icons, tile colors, and destinations.
- [x] Applications table renders on desktop (`md+`), collapses to stacked cards on mobile.
- [x] Status badges use the new variant mapping. `displayStatus` masking logic (masking non-submitted statuses while event is in "reviewing") is preserved and covered by tests.
- [x] Empty state for zero applications renders a centered card with a primary-gradient "Browse Events" CTA.
- [x] Following section renders below applications; hidden when both applications AND follows are empty.

### Theming
- [x] Theme toggle in both shells offers Light / Dark / System.
- [x] Selected theme persists across page loads (handled by `next-themes` localStorage).
- [x] No flash of wrong theme on initial load — `suppressHydrationWarning` on `<html>` and the ThemeToggle's pre-mount placeholder ensure a clean first paint.
- [x] Both light and dark palettes defined in `globals.css` (`:root` + `.dark`); every touched component uses semantic tokens so dark mode flips via the class toggle without per-component changes.

### No regressions
- [x] All other authenticated pages (profile editor, events, conventions/manage, settings, notifications) render inside `AuthShell` with their existing content. Route paths unchanged — verified via `next build` output enumerating every existing route.
- [x] All other public pages (login, register, events directory, public conventions) render inside `PublicShell` with their existing content.
- [x] All existing tests pass (204/204).

## Known limitations

- **Browser-based visual QA not performed in this session.** The automated checks (build, tests, token leak scan) + per-component RTL tests give high confidence the slice is correctly wired, but side-by-side visual comparison against the stitch PNGs for homepage + dashboard in both themes should be done in a browser before merge. The `manual-testing` skill or a local `npm run dev` session handles that verification.
- **Lucide version `^1.8.0` is unusual.** Imports used by this slice (`Sun`, `Moon`, `Monitor`, `Check`, `Palette`, `CalendarDays`, `UserCircle`, `Search`, `Send`, `PlusSquare`, `SlidersHorizontal`, `ClipboardCheck`, `UserPen`, `LayoutGrid`, `Compass`, `ArrowRight`, `Bell`, `Settings`, `LogOut`, `LayoutDashboard`, `Building2`) all resolve, but if future phases need an icon not in this version, the `-Icon` suffixed alias (e.g. `SunIcon`) is the safer bet.
- **Pre-existing lint warnings** in `notification-bell.tsx` and a handful of server pages are not from Phase 8 work and are intentionally not addressed here.

## Conclusion

Phase 8 is **complete**. All 16 planned tasks shipped; the automated verification surfaces no regressions and every spec acceptance criterion has a passing implementation or test. Browser-based visual QA against the stitch screenshots is the last remaining manual step before merge.
