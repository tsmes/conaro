# Implementation Plan: Phase 8 Design System Foundation

Spec: `.claude/plans/phase8-design-system-foundation-spec.md`

## Technical Decisions

- **Base UI under `base-nova` style, not Radix.** The project already uses `@base-ui/react`. New shadcn primitives are installed via `npx shadcn@latest add <name>` which pulls Base UI versions from the `base-nova` registry. If a primitive is missing from `base-nova` (most likely candidate: `sidebar`), build a thin Base UI composition that mirrors shadcn's standard sidebar API (same component names, same `data-slot` pattern) so consumer code is unchanged.
- **`next-themes` for theming.** Adding the dependency. Avoids the well-known pitfalls of rolling our own theme provider (FOUC, hydration mismatch).
- **Component testing scope: option C.** Add `jsdom` + `@testing-library/react` + `@testing-library/jest-dom` to enable component tests, then write tests only for logic-bearing components (theme toggle behavior, completeness widget, status badge mapping, dashboard empty states). Pure presentation gets manual QA via the `manual-testing` skill.
- **CompletenessIndicator three-section adaptation.** Existing data has three sections (basic, logistics, portfolio). The widget renders one continuous segmented bar (segment count = total fields across all sections, filled = total fields completed) with three small section pills below the bar instead of stitch's two endpoint labels. Faithful to data, close to stitch.
- **Page moves use `git mv`.** Preserves blame/history. Bundled per route group (one move task per group, plus a third task to coordinate shell layouts and strip the root layout — see Task 13).
- **Variant preservation rule.** When restyling existing shadcn primitives, additive only. Don't remove the existing `xs` / `icon-xs` button sizes, the `size` variant on Card, or the `ghost`/`link` Badge variants. Add new variants (Card `interactive` prop, Badge `success`) without breaking existing consumers.
- **Existing `<CompletenessIndicator>` is rewritten in place** rather than parallel-implemented. Single source of truth. Old visual is replaced by the new widget.
- **Custom utilities live in `globals.css` `@layer utilities`** so Tailwind class merging and arbitrary value composition work cleanly.

## Tasks

### 1. Add design tokens, fonts, type scale, and custom utilities to `globals.css` ✅ DONE

Lay down the foundation that every later task depends on. Pure CSS — no component changes yet. After this commit, every existing page renders with the new color palette (likely looking off, but functional).

**Requirements:** Foundation

**Files:**
- `src/app/globals.css` — replace the existing oklch neutral palette in `:root` and `.dark` with the Curator's Canvas tokens per spec. Add custom tokens (`--primary-dim`, `--primary-container`, etc.). Add `@theme inline` type-scale utilities (`--text-display-lg` etc.). Add `@layer utilities` with `.shadow-gallery`, `.bg-primary-gradient`, `.glass-nav`.
- `src/app/layout.tsx` — replace `Geist`/`Geist_Mono` font setup with `Manrope` (weights 400/600/700/800) and `Inter` (weights 400/500/600) via `next/font/google`. Apply CSS variables `--font-heading` (Manrope) and `--font-sans` (Inter). Keep `--font-geist-mono` slot or drop if unused elsewhere (verify with grep before dropping).

**Approach:**
- Token table values come directly from spec — use `color-mix(in srgb, ...)` for the ghost border (15%/20% opacity).
- Type scale uses Tailwind v4's `@theme` block to register custom font-size utilities. Verify each new utility class generates correctly (`text-display-lg`, `text-headline-md`, etc.).
- The three custom utilities are CSS, not Tailwind plugins. Define them in `@layer utilities { .shadow-gallery { box-shadow: 0 20px 40px rgba(9,9,11,0.04); } ... }`.
- Body class on `<body>` should pick up `font-sans` (already does via current globals).
- Verify `.dark` class block correctly inverts via toggling at the html level (we test this in Task 4 once next-themes lands).

**Verification:**
- `npm run build` succeeds.
- Visit any page in dev — palette is shifted (warm off-white, violet primary).
- Inspect a button: text uses Inter; inspect a heading: tag inherits Inter unless overridden (next task adds Manrope to headings).
- Verify `.shadow-gallery` works on a manually-classed div.

**Depends on:** none

---

### 2. Set up component test infrastructure (jsdom + React Testing Library) ✅ DONE

Enable React component tests so subsequent tasks can ship with proper coverage per STANDARDS.md. No tests written yet — just the harness.

**Requirements:** Infrastructure

**Files:**
- `package.json` — add devDependencies: `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
- `vitest.config.ts` — add a `projects` array (or `environmentMatchGlobs`) so files under `__tests__/components/**` and `__tests__/unit/components/**` use `jsdom`, while existing service/integration tests keep `node`.
- `__tests__/setup.ts` — extend with `import "@testing-library/jest-dom/vitest"` so DOM matchers are available globally for component tests.
- `__tests__/components/.gitkeep` — placeholder so the directory exists.

**Approach:**
- Vitest 3.x supports per-project environments via `test.projects`. Use that pattern (one project for `node` env (current), one for `jsdom` env (new component tests).
- The setup file extension must be conditional or shared cleanly — prefer a single shared setup that registers `jest-dom` matchers (idempotent, harmless for node tests).
- Verify by writing a smoke test (e.g., `__tests__/components/smoke.test.tsx` rendering a `<div>Hello</div>` with RTL) and run `npm test`. Delete the smoke after verifying.

**Verification:**
- `npm test` runs both the existing tests AND a temporary smoke test successfully.
- `expect(...).toBeInTheDocument()` works in a component test.

**Depends on:** none

---

### 3. Install `next-themes` and wire `ThemeProvider` ✅ DONE

*Implementation note: ThemeProvider was added inside the existing `<Providers>`
client component rather than creating a separate `theme-provider.tsx` file —
Providers is already a client component that wraps SessionProvider, so the
extra file would have been redundant.*

Adds the theme switching mechanism without yet adding the toggle UI (that's Task 10). After this commit, OS preference is respected and `.dark` class is applied to `<html>`.

**Requirements:** Theming

**Files:**
- `package.json` — add `next-themes` to dependencies.
- `src/app/layout.tsx` — wrap `<body>` children with `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>`. Add `suppressHydrationWarning` to `<html>`.
- `src/components/theme-provider.tsx` — new tiny client wrapper around `next-themes`'s `ThemeProvider` (RSC-safe pattern).

**Approach:**
- `next-themes`'s `ThemeProvider` is a client component; importing it directly in a server-component layout fails. The shadcn-canonical fix is the thin client wrapper. Implement that file with `"use client"` and re-export.
- Verify by changing OS appearance (or by running `document.documentElement.classList.add("dark")` in devtools) — colors should swap.

**Verification:**
- `npm test` and `npm run build` pass.
- In browser devtools, run `document.documentElement.classList.toggle("dark")` — page palette swaps. No FOUC on first paint.

**Depends on:** Task 1

---

### 4. Add new shadcn primitives via `npx shadcn add` ✅ DONE

*Implementation notes:*
- *All six primitives (sidebar, sheet, dropdown-menu, avatar, table, tooltip)
  were available in the `base-nova` registry — no custom Base UI fallback was
  needed. CLI also pulled bonus `skeleton` and a `use-mobile` hook that
  sidebar depends on. All imports use `@base-ui/react`, no Radix
  contamination.*
- *`TooltipProvider` added to the Providers client component per CLI guidance.*
- *jsdom's missing `window.matchMedia` required a shim in `__tests__/setup.ts`
  — Sidebar's use-mobile hook calls it at mount.*

Install the six primitives the spec mandates. Pure registry adds — no consumer code yet.

**Requirements:** Foundation

**Files:**
- `src/components/ui/sheet.tsx` — added by CLI
- `src/components/ui/dropdown-menu.tsx` — added by CLI
- `src/components/ui/avatar.tsx` — added by CLI
- `src/components/ui/table.tsx` — added by CLI
- `src/components/ui/tooltip.tsx` — added by CLI
- `src/components/ui/sidebar.tsx` — added by CLI **OR** custom Base UI composition (see fallback below)

**Approach:**
- Run `npx shadcn@latest add sheet dropdown-menu avatar table tooltip sidebar`.
- For each: verify the file is added under `src/components/ui/` and that imports resolve. Check that each pulls Base UI imports (`@base-ui/react/...`), not Radix. If any pulls Radix peer deps, that means `base-nova` is missing that primitive — surface and address inline.
- **Fallback for `sidebar` if missing from base-nova:** write `src/components/ui/sidebar.tsx` manually as a composition using `@base-ui/react` Dialog (for the mobile sheet aspect), local React state for collapse, `localStorage`/cookie for persistence. Mirror shadcn's standard exports: `SidebarProvider`, `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` (with `isActive` prop), `SidebarFooter`, `SidebarTrigger`, `SidebarInset`. ~200-300 LOC. Use the public shadcn sidebar source as the structural reference.
- Smoke test each primitive: render in a temporary scratch route or write a minimal RTL test confirming each renders without throwing.

**Verification:**
- All six files exist under `src/components/ui/`.
- `npm run build` succeeds (catches missing peer deps).
- A basic render test for each primitive passes.

**Depends on:** Task 2 (for the smoke RTL tests)

---

### 5. Restyle Button ✅ DONE

*Implementation note: "generous padding" was applied to the `lg` size (bumped
to `h-12 px-8`) rather than the default size — default stays compact for the
dense form-button usage across the app. The homepage and other hero CTAs
already use `size="lg"`, so they pick up the generous treatment automatically.*

Apply Curator's Canvas styles to the existing Button without changing its variant/size API. Existing consumers (every page) keep working.

**Requirements:** Components

**Files:**
- `src/components/ui/button.tsx` — modify the `cva` config: `default` variant uses `bg-primary-gradient text-primary-foreground`, default size padding `px-8 py-4`, `rounded-[10px]`, `font-semibold tracking-tight`. `outline` variant uses ghost border (token already at 15% opacity). Other variants/sizes preserved.
- `__tests__/components/button.test.tsx` — render each variant, assert correct classes applied. Smoke test only.

**Approach:**
- The existing Button uses `cva` with multiple variants/sizes — modify only the relevant entries. Don't restructure the API.
- Verify the `data-slot` attribute is preserved (Base UI pattern).
- Test: render `<Button>Click</Button>` (default), `<Button variant="outline">`, `<Button size="sm">`. Assert text renders.

**Verification:**
- `npm test` passes.
- Visit any page with a button (e.g., `/login`) in dev — primary button shows gradient, generous padding.

**Depends on:** Task 1

---

### 6. Restyle Input and Textarea ✅ DONE

Filled-fill design with the signature 2px violet focus ring + 4px offset.

**Requirements:** Components

**Files:**
- `src/components/ui/input.tsx` — replace `border border-input bg-background` with `bg-secondary border-0`. Update focus state to `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background`.
- `src/components/ui/textarea.tsx` — same treatment.
- `__tests__/components/input.test.tsx` — render input, assert `bg-secondary` class present, assert focus styles via `userEvent.tab()`.

**Approach:**
- Preserve all existing prop spreading and `data-slot` attributes. Just change the className string.
- Disabled state: keep current behavior, set opacity to 50%.

**Verification:**
- `npm test` passes.
- Visit `/login` or `/register/artist` — inputs render filled, focus shows the violet ring.

**Depends on:** Task 1

---

### 7. Restyle Card and add `interactive` prop ✅ DONE

*Implementation note: also enabled vitest `globals: true` to activate RTL's
auto-cleanup hook between tests — prevents testid collisions across cases in
the same file.*

Border-removed, `rounded-2xl`, ambient shadow by default. New optional `interactive` prop adds hover state for the dashboard quick-action cards.

**Requirements:** Components

**Files:**
- `src/components/ui/card.tsx` — base `Card` className changes: `border-0 rounded-2xl shadow-gallery`. Add an `interactive` prop (boolean) to the root `Card` that, when true, appends `transition-all hover:bg-surface-bright cursor-pointer`. Preserve the existing `size` variant.
- `__tests__/components/card.test.tsx` — render default Card and interactive Card, assert classes.

**Approach:**
- Add `interactive` to the type signature. Use `cn()` to conditionally append classes.
- Verify the existing `CardHeader` / `CardFooter` border behavior (the existing component conditionally adds borders when CardFooter is present) is *removed* per the no-line rule — borders inside cards are not allowed.

**Verification:**
- `npm test` passes.
- Render an interactive card on the dashboard page (in Task 16) — confirm hover behavior works.

**Depends on:** Task 1

---

### 8. Restyle Badge and add `success` variant ✅ DONE

Pill shape with uppercase tracked text. Add `success` variant. Update existing variants' tones.

**Requirements:** Components

**Files:**
- `src/components/ui/badge.tsx` — base className: `rounded-full text-[10px] font-bold uppercase tracking-wider px-3 py-1`. Variant tones updated:
  - `default` → `bg-primary/10 text-primary`
  - `secondary` → `bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300`
  - `destructive` → `bg-tertiary-container text-on-tertiary-container`
  - `success` (new) → `bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300`
  - `outline`, `ghost`, `link` → preserve, retone with new tokens
- `src/app/dashboard/page.tsx` — update the `STATUS_STYLES` constant: `accepted` uses `success` variant; otherwise unchanged.
- `__tests__/components/badge.test.tsx` — render each variant, assert classes.
- `__tests__/unit/components/dashboard-status-styles.test.ts` — extract the `STATUS_STYLES` map to a small module file (`src/lib/applications/status-styles.ts`) so it can be unit tested. Test: each app status maps to the correct label + variant.

**Approach:**
- The status styles refactor is small and useful — moving it out of the page file makes it reusable when the same statuses appear elsewhere (e.g., applicant list for organizers, future).
- The page imports the constant from the new file rather than defining it inline.

**Verification:**
- `npm test` passes including the new status-styles test.
- Existing dashboard renders application statuses with correct new pill styling.

**Depends on:** Task 1

---

### 9. Refactor `CompletenessIndicator` into the new widget shape ✅ DONE

Three-section adaptation (per D4). The component's input API (`{ completeness: CompletenessResult }`) is unchanged. Internal rendering changes completely.

**Requirements:** Dashboard widget

**Files:**
- `src/components/profile/completeness-indicator.tsx` — rewrite the body. Layout: top row with "COMPLETENESS" overline + chip showing `{filled}/{total} fields completed`. Middle: continuous segmented progress bar where segment count equals `basic.total + logistics.total + portfolio.total`, filled segment count equals the sum of `filled` across sections. Bottom row: three small section pills (Basic / Logistics / Portfolio) each showing a checkmark or muted state based on `section.complete`.
- `__tests__/components/completeness-indicator.test.tsx` — test data shapes:
  - Empty (0/N) — no segments filled, all section pills muted
  - Partial (3/7 with basic complete) — 3 segments filled, basic pill shows checkmark
  - Full (N/N) — all segments filled, all section pills show checkmark

**Approach:**
- The existing component's `Link to /dashboard/profile` at the bottom is preserved as a tiny edit-pen icon button or removed entirely (the new dashboard quick-action card already provides "Edit Profile" navigation). **Remove the link** to avoid duplication.
- Use existing token classes (`bg-primary`, `bg-muted`, etc.). No new styling primitives needed.

**Verification:**
- `npm test` passes including the new component tests.
- Render in the existing (pre-redesign) dashboard temporarily — confirm visual matches stitch widget. (The new dashboard page in Task 14 will also use it.)

**Depends on:** Task 1, Task 2

---

### 10. Build `ThemeToggle` component ✅ DONE

Client component using shadcn `DropdownMenu` + `Button`. Light / Dark / System options.

**Requirements:** Theming

**Files:**
- `src/components/layout/theme-toggle.tsx` — `"use client"`. Imports `useTheme` from `next-themes`, `Sun`/`Moon`/`Monitor` from `lucide-react` (or fallback if Lucide imports break — check Task 1's verification). Renders a `Button variant="ghost" size="icon"` as the dropdown trigger. Dropdown items set theme via `setTheme("light"|"dark"|"system")`. Hides actual icon until `mounted` to avoid hydration mismatch — show a same-sized placeholder div.
- `__tests__/components/theme-toggle.test.tsx` — test: clicking each menu item calls `setTheme` with the right value (mock `useTheme`). Test: pre-mount shows placeholder, post-mount shows resolved theme icon.

**Approach:**
- Use the shadcn-canonical pattern from their docs (mounted state via `useEffect`).
- The trigger button must have an `aria-label` like "Toggle theme" for screen reader accessibility.

**Verification:**
- `npm test` passes.
- Wired into shells in Task 13; manual verification then.

**Depends on:** Task 3, Task 4 (needs DropdownMenu primitive)

---

### 11. Build `PublicShell` layout component ✅ DONE

Glass top nav + main slot. Used by `(public)` route group in Task 13.

**Requirements:** Layout architecture

**Files:**
- `src/components/layout/public-shell.tsx` — server component (uses `auth()`). Renders fixed glass nav with brand wordmark on left, Events/Conventions links in the center (md+), right side: theme toggle + auth buttons (Log in / Register if logged out, Avatar dropdown with Dashboard/Logout if logged in). Nav uses `glass-nav` utility. Children render in `<main className="pt-16">`.
- `src/components/layout/avatar-menu.tsx` — small client component used by both shells. Composes `Avatar` (with `AvatarFallback` for initials computed from session name/email) wrapped in `DropdownMenu` with role-aware menu items (Dashboard for artist / Manage Conventions for organizer / Logout). Initials helper inline.

**Approach:**
- `PublicShell` accepts only `children` (and renders `headerSlot` is not needed — the shell IS the header).
- Brand wordmark uses Manrope 800, `text-primary`, `tracking-tighter`.
- Theme toggle imports the component from Task 10.
- Active-link state on the center nav: pass current pathname via `headers().get("x-pathname")` is unreliable in Next.js; instead, use a thin client component for the nav links that uses `usePathname()`. Keep the rest of `PublicShell` as server.
- Helper to derive avatar initials: split session.user.name on space, take first letter of each (max 2). If no name, take first letter of email.

**Verification:**
- Wire into Task 13. Until then, can render `<PublicShell><div>test</div></PublicShell>` in a scratch route to manually verify.

**Depends on:** Task 4 (DropdownMenu, Avatar), Task 5 (Button styling for the auth buttons), Task 10 (ThemeToggle)

---

### 12. Build `AuthShell` layout component using shadcn Sidebar primitives ✅ DONE

*Implementation notes:*
- *Active state uses longest-prefix match across the current role's nav
  items — prevents `/dashboard` from staying active when the user is on
  `/dashboard/profile` (which has its own nav entry).*
- *AuthShell enforces login-or-redirect at the shell level. Per-page role
  checks still live in each page so role-based authorization is unchanged.*
- *Added a `next-auth/react` mock to the vitest config so client
  components that import signOut can be tested without the real auth
  runtime.*

Sidebar + slim top header. Composition only — uses `Sidebar`, `SidebarProvider`, etc. from Task 4.

**Requirements:** Layout architecture

**Files:**
- `src/components/layout/auth-shell.tsx` — server component (uses `auth()`). Composes `<SidebarProvider><Sidebar>...</Sidebar><SidebarInset>...header + children...</SidebarInset></SidebarProvider>`. Sidebar contains: brand block (palette icon in primary-container chip + "Artist Studio" or "Convention Studio"), nav menu (role-filtered items via `SidebarMenu`/`SidebarMenuItem`/`SidebarMenuButton`), footer with Settings + Logout. Top header inside `SidebarInset`: `SidebarTrigger` + page title (prop) + right-side cluster (NotificationBell, ThemeToggle, AvatarMenu).
- `src/components/layout/auth-sidebar-nav.tsx` — client component (needs `usePathname()` for `isActive`). Receives `role` and `unreadCount` props, renders the role-appropriate nav menu items. Includes commented-out Messages entry: `// TODO(messaging): Messages nav item — built in a future phase, see project memory and project_helpers project notes`.
- `__tests__/components/auth-sidebar-nav.test.tsx` — test: artist role renders Overview/Profile/Events/Notifications links; organizer role renders Overview/Conventions/Notifications. Active state lights up the matching item per `pathname`.

**Approach:**
- The Messages TODO comment captures the deferred decision in code. Add a brief `// TODO(messaging)` line where the nav entry would live, NOT a commented-out import — comment-only so a future build doesn't accidentally enable it.
- `AuthShell` accepts a `pageTitle?: string` prop (or derives it from pathname client-side).
- Avatar initials helper: extract to `src/lib/auth/initials.ts` so both shells use the same logic.
- The notification bell already polls `/api/notifications` itself; the shell just renders it.

**Verification:**
- Wire into Task 13.
- After Task 13: navigate `/dashboard` — sidebar renders, mobile drawer opens via trigger, theme toggle works.

**Depends on:** Task 4 (Sidebar, Sheet, DropdownMenu, Avatar), Task 5/6/7/8 (restyled primitives), Task 10 (ThemeToggle), Task 11 (avatar-menu)

---

### 13. Route group restructure: move pages, mount shells, strip root layout ✅ DONE

*Implementation note: after moving pages, ~20 files across src/ and tests/
imported server actions via the old absolute `@/app/<subpath>` paths. A
single bulk sed pass rewrote them to their new `(public)` / `(authenticated)`
homes. All 190 tests still pass.*

The big coordinated change. After this commit, every page renders inside its appropriate shell. URLs unchanged.

**Requirements:** Layout architecture

**Files:**

Created:
- `src/app/(public)/layout.tsx` — server component, renders `<PublicShell>{children}</PublicShell>`.
- `src/app/(authenticated)/layout.tsx` — server component, renders `<AuthShell>{children}</AuthShell>`.

Moved via `git mv`:
- `src/app/page.tsx` → `src/app/(public)/page.tsx`
- `src/app/login/` → `src/app/(public)/login/`
- `src/app/register/` → `src/app/(public)/register/`
- `src/app/events/` → `src/app/(public)/events/`
- `src/app/conventions/page.tsx` → `src/app/(public)/conventions/page.tsx`
- `src/app/conventions/[conventionId]/` → `src/app/(public)/conventions/[conventionId]/`
- `src/app/dashboard/` → `src/app/(authenticated)/dashboard/`
- `src/app/conventions/manage/` → `src/app/(authenticated)/conventions/manage/`
- `src/app/notifications/` → `src/app/(authenticated)/notifications/`
- `src/app/settings/` → `src/app/(authenticated)/settings/`

Modified:
- `src/app/layout.tsx` — strip down. Remove `<Header />` import. Keep: `<html>` + `<body>` + font CSS variables + `<ThemeProvider>` + `<Providers>` + `{children}`. Remove the flexbox `min-h-screen` wrapper (each shell handles its own layout). Keep `suppressHydrationWarning` on `<html>` (added in Task 3).

Deleted:
- `src/components/layout/header.tsx`

**Approach:**
- All page imports use `@/` absolute paths — no relative-import fixes needed.
- Verify each existing page's `auth()` checks still redirect correctly. The `(authenticated)` route group does NOT enforce auth at the layout level — pages keep their existing per-page checks.
- Convention split: `src/app/conventions/page.tsx` and `src/app/conventions/[conventionId]/` are public; `src/app/conventions/manage/` is authenticated. Two separate locations after the move. Verify Next.js handles this — having `conventions` as a path segment under both groups is fine because Next.js merges route groups at the URL level.
- Check the existing `<Providers>` component in `src/app/providers.tsx` — confirm it remains usable. If it currently renders auth context, keep it wrapping inside ThemeProvider.
- Do NOT add a layout-level redirect. Auth is per-page.
- Do NOT add `pageTitle` prop wiring yet — AuthShell can default to a derived title or empty for now; per-page titles can be set in later phases.

**Verification:**
- `npm run build` succeeds.
- `npm test` passes (all integration tests still pass — auth flows unchanged).
- Manual: visit `/`, `/login`, `/events` — render with PublicShell glass nav, no double header.
- Visit `/dashboard` (logged in as artist) — render with AuthShell sidebar + slim header.
- Visit `/conventions/manage` (logged in as organizer) — render with AuthShell, sidebar shows organizer items.
- Sidebar mobile drawer opens correctly below `lg`.
- Theme toggle visible in both shells.

**Depends on:** Task 11, Task 12

---

### 14. Redesign artist dashboard page ✅ DONE

Welcome hero + completeness widget + quick-action cards + applications table + Following section. Server-side data fetching unchanged.

**Requirements:** Dashboard

**Files:**
- `src/app/(authenticated)/dashboard/page.tsx` — replace JSX (keep the `Promise.all` data block as-is). New layout per spec Section 5/D.
  - Section A: welcome hero with overline "OVERVIEW", Manrope display-md headline, dynamic subtitle (use unread notification count from a small new query), completeness widget on the right (renders `<CompletenessIndicator>`).
  - Section B: three `<Card interactive>` cards with colored icon tiles and Lucide icons (`UserPen`, `LayoutGrid`, `Compass`). Each is an `<a>` (or Next `<Link>` wrapper) so the entire card is clickable.
  - Section C: applications table using shadcn `<Table>` on `md+`. Stacked `<Card>` list on mobile (use Tailwind's `hidden md:block` / `md:hidden` pair). Each row uses `<Avatar>` + `<AvatarFallback>` for the convention logo cell.
  - Status mapping uses `STATUS_STYLES` from `src/lib/applications/status-styles.ts` (created in Task 8). Preserves the existing `displayStatus` masking.
  - Empty state for zero applications: centered card with a primary-gradient "Browse Events" button.
  - Section D: Following block. Horizontal scroll row on desktop (`flex gap-4 overflow-x-auto`), vertical list on mobile. Use `<Avatar>` with `AvatarImage` (convention logo) + `AvatarFallback` (initials).
  - Hidden when both applications and follows are empty (avoids two empty states).
- Add unread-notification count query: extend the existing `Promise.all` block with a `count()` query against `notifications` filtered by `profileId` and `read = false`.
- `__tests__/components/dashboard.test.tsx` — RTL test rendering the page with mocked data:
  - With apps + follows → renders both sections
  - Empty apps → empty state CTA
  - Empty everything → no Following section
  - Status badge "Accepted" maps to success variant
  - The "reviewing" mask: status `submitted`, `event.status === reviewing` → renders as "Submitted" still; status `accepted`, `event.status === reviewing` → renders as "Under Review"

**Approach:**
- The page is a server component; testing requires mocking `auth()` and `db` queries (existing test patterns from `__tests__/integration/` show the project's mocking approach — adapt for component tests).
- Or — extract the rendering into a presentational client component (`<DashboardView data={...} />`) and unit test that. This is cleaner for testing AND makes the data fetching responsibility clearer. **Take this approach.**
- New file: `src/components/dashboard/dashboard-view.tsx` — client component rendering all sections from props. Page just fetches and passes data.
- Subtitle logic: if `unreadCount > 0`, "You have N new notification(s) regarding your applications." Else "Your creative journey continues."
- Lucide icons: `UserPen`, `LayoutGrid`, `Compass`, `Bell`, `ArrowRight`, `Send`. Verify imports work — if `lucide-react@^1.8.0` doesn't export these names, fall back to closest equivalents at implementation time.

**Verification:**
- `npm test` passes including new dashboard view tests.
- Manual: log in as artist, visit `/dashboard`. Compare against `stitch/artist_dashboard_1/screen.png` (light) and `artist_dashboard_2/screen.png` (dark). All four sections render.
- Mobile (devtools 375px) — table collapses to stacked cards, sidebar hidden behind drawer.
- Empty state: as a fresh artist with no applications, the empty state renders with the CTA.

**Depends on:** Task 7 (interactive Card), Task 8 (Badge variants + status-styles), Task 9 (CompletenessIndicator), Task 13 (route group + AuthShell), Task 4 (Avatar, Table)

---

### 15. Redesign homepage ✅ DONE

*Implementation note: Base UI's Button warns when its render prop swaps to
a non-button element. Pass `nativeButton={false}` whenever rendering a
Button as a Link to acknowledge the swap intentionally — applied across
HomepageView, PublicShell, and the dashboard's empty state CTA.*

Long-scroll editorial layout. Public route. Hero + two CTA bento + 3-step explainer + final CTA + footer.

**Requirements:** Homepage

**Files:**
- `src/app/(public)/page.tsx` — replace the existing 30-line page. Sections per spec Section 4. Server component (uses `auth()` to check session for the CTA-button-state-swap behavior).
- `src/components/layout/homepage-footer.tsx` — new component. Three-row layout (copyright / link list / social icons). About/Terms/Privacy link to `#` with `// TODO: link to real page when it exists` comments.
- `__tests__/components/homepage.test.tsx` — RTL test:
  - Logged-out: renders both CTA buttons linking to `/register/artist` and `/register/organizer`
  - Logged-in as artist: both card buttons link to `/dashboard`
  - Logged-in as organizer: both card buttons link to `/conventions/manage`
  - Footer renders with three nav links
- `__tests__/components/homepage-footer.test.tsx` — renders three nav links + copyright.

**Approach:**
- The same client/server split as Task 14: extract presentation into `<HomepageView session={...}>` so it can be tested without mocking `auth()`. Page is a server component; view is the client/dumb component.
- The "DESIGNED FOR FOCUS" section's three-step rows: each row is a small composition (`<div className="flex gap-8 group">` per spec). Don't extract into a sub-component — the structure is one-off and inline reads better than abstracting for two columns.
- For the dark-inverted Organizer card: use `bg-foreground text-background` (works in both light and dark modes since the tokens swap).
- Decorative blurs in card corners: `<div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl" aria-hidden />`.
- Verify the `text-display-lg` and `text-headline-lg` utilities from Task 1 render at expected sizes.

**Verification:**
- `npm test` passes including new homepage tests.
- Manual: visit `/` logged out. Compare against `stitch/homepage_1/screen.png` (light) and `homepage_2/screen.png` (dark via OS toggle).
- Visit `/` logged in as artist → CTA buttons say "Go to Dashboard" → `/dashboard`.
- Visit `/` logged in as organizer → CTA buttons say "Manage Conventions" → `/conventions/manage`.
- Footer renders only on `/`; `/login` and `/events` have no footer.

**Depends on:** Task 5 (Button), Task 7 (Card), Task 13 (route group + PublicShell)

---

### 16. Light + dark QA pass and regression check ✅ DONE

*Automated checks clean; test results doc at
`phase8-design-system-foundation-test-results.md`. Browser-based
visual QA flagged as the last manual step before merge.*

Verify the slice across both themes for all touched and inherited surfaces. Fix any token leaks.

**Requirements:** Theming + No regressions

**Files:**
- Bug fixes in any file as needed.
- `.claude/plans/phase8-design-system-foundation-test-results.md` — write-up of the test pass per project workflow Step 5.

**Approach:**
- For each of: homepage, login, register (both flows), events list, event detail, conventions directory, convention detail, dashboard, profile editor, notifications, settings, conventions/manage and its sub-pages — open in dev, verify renders without console errors in both light and dark themes.
- Compare slice screens (homepage, dashboard) against stitch screenshots in both themes.
- Run full test suite: `npm test`. Run `npm run build`. Run `npm run lint`.
- Write up findings in the test results file. List each acceptance criterion from the spec with a check or a noted issue.
- Fix any token leaks (e.g., a hard-coded `bg-white` that should be `bg-card`). Look for `text-black`, `bg-white`, `text-gray-`, `bg-gray-`, `bg-slate-` patterns in the touched files — those are likely leaks.

**Verification:**
- All acceptance criteria in the spec marked as passing in the test results file.
- `npm test`, `npm run build`, `npm run lint` all green.
- Visual diff between light and dark stitch screenshots for slice screens shows no significant deviation.

**Depends on:** Task 14, Task 15

---

## Requirements Coverage

Acceptance criteria from the spec are mapped to tasks below. Each criterion appears at least once.

| Criterion (spec section) | Task(s) |
|---|---|
| Foundation: tokens defined per tables | 1 |
| Foundation: Manrope + Inter loaded | 1 |
| Foundation: type-scale utilities generated | 1 |
| Foundation: `.shadow-gallery` / `.bg-primary-gradient` / `.glass-nav` defined | 1 |
| Components: shadcn primitives installed (sidebar, sheet, dropdown-menu, avatar, table, tooltip) | 4 |
| Components: Button primary gradient + rounded-[10px] + padding | 5 |
| Components: Input/Textarea filled, focus ring | 6 |
| Components: Card border-0, rounded-2xl, shadow-gallery, `interactive` prop | 7 |
| Components: Badge pill + `success` variant + STATUS_STYLES update | 8 |
| Components: AuthShell composes shadcn Sidebar (no custom) | 12 |
| Components: ThemeToggle uses DropdownMenu | 10 |
| Components: Applications table uses shadcn Table | 14 |
| Components: Avatar uses shadcn Avatar + AvatarFallback | 11, 12, 14 |
| Layout: `(public)` and `(authenticated)` route groups, all pages moved, URLs unchanged | 13 |
| Layout: PublicShell glass nav | 11, 13 |
| Layout: AuthShell sidebar + top header + mobile drawer | 12, 13 |
| Layout: old header.tsx deleted | 13 |
| Layout: per-page auth checks preserved | 13 |
| Homepage: hero with italic primary "Once.", left-aligned | 15 |
| Homepage: two CTA bento cards | 15 |
| Homepage: CTA buttons swap when logged in | 15 |
| Homepage: "Designed for Focus" section | 15 |
| Homepage: final CTA section | 15 |
| Homepage: footer renders only on homepage; About/Terms/Privacy stub-link | 15 |
| Dashboard: welcome hero + dynamic subtitle | 14 |
| Dashboard: completeness widget per `computeCompleteness` data | 9, 14 |
| Dashboard: three quick-action cards | 14 |
| Dashboard: applications table desktop, stacked cards mobile | 14 |
| Dashboard: status badges + reviewing-mask preserved | 8, 14 |
| Dashboard: empty state CTA | 14 |
| Dashboard: Following section, hidden when both empty | 14 |
| Theming: theme toggle in both shells, Light/Dark/System | 10, 11, 12 |
| Theming: persists across page loads | 3 |
| Theming: no flash on initial load | 3 |
| Theming: light + dark stitch parity verified | 16 |
| No regressions: all pages render in shells with existing content | 13, 16 |
| No regressions: all existing tests pass | 16 |

## Risks

- **`base-nova` registry may not have `sidebar`.** It's the most complex shadcn primitive and the newest. If `npx shadcn add sidebar` fails or pulls Radix peers, Task 4 expands to include the Base UI fallback build (~200-300 LOC). Mitigation: Task 4 explicitly accommodates this; budget extra time if it triggers.
- **`lucide-react@^1.8.0`** in `package.json` doesn't match mainline Lucide's version line. May be a fork, an alias, or a pre-release. Icon name imports could fail. Mitigation: verify in Task 1's verification step; fall back to closest available names per icon if needed.
- **next-themes + Next.js 16 (canary).** The project is on `next@16.2.3` which is bleeding edge. `next-themes` should still work (it's framework-agnostic) but the SSR hydration patterns may have shifted. Mitigation: smoke-test thoroughly in Task 3 before relying on it elsewhere.
- **Component test infrastructure with vitest projects.** The current vitest config uses a single `node` env. Adding a per-glob jsdom env requires Vitest 3's `projects` syntax which is recent. Mitigation: Task 2 is a small scoped task — if `projects` syntax is finicky, fallback is two separate vitest configs.
- **Per-page `auth()` checks under route groups.** Adding `(authenticated)` doesn't auto-enforce auth — pages must keep their existing `auth()` + redirect logic. Easy to forget that the route group is presentational only. Mitigation: Task 13's verification checklist explicitly walks every authenticated page.
- **CompletenessIndicator usage outside dashboard.** The component is currently used by `dashboard/page.tsx` only (per investigation). Verify before changing — if it's imported elsewhere, the rewrite affects them too. Quick `grep -r "CompletenessIndicator"` before Task 9 confirms.
- **Mobile drawer on the authenticated shell.** shadcn's sidebar handles mobile via Sheet. If the fallback Base UI sidebar is used, ensure the mobile drawer behavior is wired correctly — known to be the trickiest part of a sidebar build.
- **Slice ends without redesigning the inner content of profile editor / events / conventions/manage / etc.** They render inside the new shell with old inner JSX. Visually inconsistent until later phases. This is intentional per the spec's non-goals, but worth flagging for the review.
