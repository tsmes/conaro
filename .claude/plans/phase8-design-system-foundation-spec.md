# Phase 8 — Design System Foundation: Curator's Canvas

## Summary

Adopt the "Curator's Canvas" design system across Art Apply, replacing the
current default shadcn neutral palette and centered-hero homepage with an
editorial high-end aesthetic (electric violet primary, warm off-white surface,
Manrope/Inter typography, tonal layering instead of borders).

This is a **vertical slice** — the design system is built end-to-end alongside
two flagship screens (homepage + artist dashboard) so the tokens are validated
against real screens before being scaled to the remaining ~20 stitch designs in
later phases.

The slice covers both **light and dark mode** in the foundation, with a theme
toggle in the global navigation.

The slice also introduces a **route-group split** (`(public)` /
`(authenticated)`) and a new **sidebar-based authenticated layout** that wraps
all logged-in pages — even pages whose inner content isn't being redesigned in
this slice.

Source designs: `docs/design-system.md` (the design system, copied from
`stitch/curator_s_canvas/DESIGN.md`), `stitch/homepage_1` +
`stitch/homepage_2` (light/dark homepage), `stitch/artist_dashboard_1` +
`stitch/artist_dashboard_2` (light/dark dashboard).

## Goals

1. Replace the default shadcn neutral palette with the Curator's Canvas tokens
   (light + dark) so every existing page picks up the new look automatically
   via semantic tokens.
2. Establish typography (Manrope display + Inter body) and the type scale used
   across all stitch designs.
3. Restyle the small set of shadcn primitives that need it (Button, Input,
   Card, Badge, Separator) to match the design system rules ("no-line",
   tonal layering, gradient primary CTA, ghost border, ambient shadow).
4. Introduce a sidebar-based authenticated layout shell that maps cleanly to
   the stitch dashboard structure and accommodates per-role nav.
5. Redesign the homepage and artist dashboard pixel-faithfully against stitch,
   minus elements cut as not-in-PRD.
6. Ship a working light/dark theme toggle (light, dark, system).

## Non-Goals

- Redesigning the other ~20 stitch screens (login, registration, profile
  editor, event/convention pages, application review, organizer surfaces,
  field configuration, list manager). These get the new tokens and the new
  shell automatically but their content layouts wait for later phases.
- Building the deferred messaging feature.
- Building an organizer-specific dashboard (organizers continue to land on
  `/conventions/manage`; the sidebar's "Overview" item points there for them).
- Profile photo upload (avatars in nav use initials chips).
- ArtDeck portfolio integration (deferred — see "Future considerations").
- Automated visual regression testing.

## Component sourcing rules

**Mandatory: use shadcn primitives where they exist.** No hand-rolled
equivalents for components shadcn provides. This applies to every interactive
or composable surface in this slice and all future phases.

**Currently installed** (`src/components/ui/`): badge, button, card, checkbox,
dialog, input, label, select, separator, textarea.

**To be added in this phase** (via `npx shadcn@latest add <name>`):

- `sidebar` — used for `AuthShell` left navigation. shadcn's sidebar primitive
  handles the collapsible/mobile-drawer behavior, keyboard nav, persistent
  state, and accessibility. We do NOT build a custom sidebar.
- `sheet` — used as the mobile drawer fallback for the sidebar (shadcn
  sidebar uses Sheet internally on small screens).
- `dropdown-menu` — used for the theme toggle dropdown and the avatar chip
  menu (logout, settings).
- `avatar` — used for user avatar chips. `AvatarFallback` renders initials
  when no image is set (which is always, in this slice — no upload yet).
- `table` — used for the desktop applications table on the dashboard.
- `tooltip` — used for icon-only buttons (theme toggle when collapsed,
  notification bell, etc.) for accessibility.

**Best-in-class third-party libraries** for needs shadcn doesn't cover —
either already in scope or pre-approved for future phases:

- **Charts** (future phases — analytics is dropped from this slice but will
  return): use shadcn's `chart` component, which is a thin wrapper around
  **Recharts**. This is the established shadcn-canonical chart pattern. Do
  NOT introduce a parallel charting lib (no Chart.js, no Tremor, no
  Visx, etc.).
- **Tables with sorting/filtering/pagination** (future phases): when the
  applications table or admin tables need real interactivity, layer
  **TanStack Table** on top of shadcn's `Table` primitive. shadcn's docs
  show this pattern explicitly. Do NOT bring in another table library.
- **Forms**: continue using **react-hook-form + Zod** with shadcn's `Form`
  components (already the project pattern; `Form` will be added when needed).
- **Date pickers** (future phases): shadcn `Calendar` + `Popover` (not
  react-datepicker or similar).
- **Animations**: use **Tailwind transitions and `tw-animate-css`** (already
  in `globals.css`). For complex orchestration, **Framer Motion** is the
  pre-approved escape hatch — but the slice screens don't need it.

**When in doubt**: check `https://ui.shadcn.com/docs/components` first. If a
shadcn primitive exists, use it. Custom components should be **compositions**
of shadcn primitives, not parallel implementations.

## Design system foundation

### Color tokens (`src/app/globals.css`)

Replace the existing oklch neutral palette with the Curator's Canvas palette,
mapped to shadcn's semantic naming so existing components continue to work
unchanged.

**Light mode (`:root`)**

| Token | Value | Source name |
|---|---|---|
| `--background` | `#f9f5f8` | surface |
| `--foreground` | `#2f2e31` | on-surface |
| `--card` | `#ffffff` | surface-container-lowest |
| `--card-foreground` | `#2f2e31` | on-surface |
| `--popover` | `#ffffff` | surface-container-lowest |
| `--popover-foreground` | `#2f2e31` | on-surface |
| `--primary` | `#6a37d4` | primary (electric violet) |
| `--primary-foreground` | `#f8f0ff` | on-primary |
| `--secondary` | `#f3f0f3` | surface-container-low |
| `--secondary-foreground` | `#2f2e31` | on-surface |
| `--muted` | `#e5e1e5` | surface-container-high |
| `--muted-foreground` | `#5c5b5d` | on-surface-variant |
| `--accent` | `#f3f0f3` | surface-container-low |
| `--accent-foreground` | `#2f2e31` | on-surface |
| `--destructive` | `#b41340` | error |
| `--border` | `color-mix(in srgb, #787679 15%, transparent)` | outline-variant ghost (15% opacity) |
| `--input` | same as `--border` | (inherits ghost border) |
| `--ring` | `#6a37d4` | primary (focus) |

**Additional named tokens** (not part of shadcn naming, kept as-is):

| Token | Value | Purpose |
|---|---|---|
| `--primary-dim` | `#5e26c7` | gradient endpoint |
| `--primary-container` | `#ae8dff` | status badges, icon tiles |
| `--on-primary-container` | `#2b006e` | text on primary-container |
| `--secondary-container` | `#e4c6ff` | quick-action icon tile |
| `--on-secondary-container` | `#5f2d92` | text on secondary-container |
| `--tertiary-container` | `#ff8eb0` | rejection badges, icon tiles |
| `--on-tertiary-container` | `#640430` | text on tertiary-container |
| `--surface-bright` | `#f9f5f8` | hover state for cards |

**Dark mode (`.dark`)**

| Token | Value | Source name |
|---|---|---|
| `--background` | `#0e0e10` | inverse-surface |
| `--foreground` | `#dfdce0` | surface-variant in dark |
| `--card` | `#1a1a1d` | surface-container-lowest in dark |
| `--card-foreground` | `#dfdce0` | on-surface in dark |
| `--popover` | `#1a1a1d` | (matches card) |
| `--popover-foreground` | `#dfdce0` | on-surface in dark |
| `--primary` | `#a078ff` | inverse-primary (brighter for dark) |
| `--primary-foreground` | `#000000` | on-primary-fixed |
| `--secondary` | `#222226` | section background in dark |
| `--secondary-foreground` | `#dfdce0` | on-surface in dark |
| `--muted` | `#2a2a2e` | surface-container-high in dark |
| `--muted-foreground` | `#9e9c9f` | on-surface-variant in dark |
| `--accent` | `#222226` | matches secondary |
| `--accent-foreground` | `#dfdce0` | on-surface in dark |
| `--destructive` | `#f74b6d` | error-container in dark |
| `--border` | `color-mix(in srgb, #787679 20%, transparent)` | (slightly more visible in dark) |
| `--input` | same as `--border` | (inherits) |
| `--ring` | `#a078ff` | matches primary |
| `--primary-dim` | `#8e60f0` | gradient endpoint, dark-tweaked |
| `--primary-container` | `#5f2d92` | dark variant |
| `--on-primary-container` | `#e4c6ff` | dark variant |

The ~50 stitch tokens not listed above (primary-fixed, secondary-fixed-dim,
on-tertiary-fixed-variant, etc.) are intentionally not adopted — they are not
referenced by any of the slice screens. If a later phase needs them, they get
added then.

### Typography

Two web fonts loaded via `next/font/google` in `src/app/layout.tsx`:

- **Manrope** weights 400/600/700/800 — assigned to `--font-heading` /
  `--font-display` CSS variables. Used for hero titles, section headings, the
  all-caps "Curator's Note" overline.
- **Inter** weights 400/500/600 — assigned to `--font-sans`. Used for body
  text, labels, table data, button text. Default body font (`html { @apply
  font-sans }` in globals).

The existing `--font-geist-mono` variable for monospace is kept untouched.

**Type scale** added to `@theme` in `globals.css` (Tailwind v4 utility
generation):

| Utility | Size / line-height | Usage |
|---|---|---|
| `text-display-lg` | `3.5rem` / `1.05` / tracking-tighter | hero h1 |
| `text-display-md` | `2.5rem` / `1.1` / tracking-tight | dashboard welcome h2 |
| `text-headline-lg` | `2rem` / `1.2` / tracking-tight | section heads |
| `text-headline-md` | `1.5rem` / `1.25` | sub-section heads |
| `text-body-md` | `0.875rem` / `1.5` | default body |
| `text-label-sm` | `0.6875rem` / `1.4` / tracking +0.05em / uppercase | "Curator's Note" overlines |

Default Tailwind text utilities (`text-sm`, `text-base`, etc.) remain available
for cases where the editorial scale isn't appropriate.

### Custom utilities

Added to `globals.css` via `@layer utilities`:

- `.shadow-gallery` → `box-shadow: 0 20px 40px rgba(9, 9, 11, 0.04);` — soft
  ambient shadow used on cards and floating elements. Dark mode variant uses
  `rgba(0, 0, 0, 0.3)` for visibility on dark backgrounds.
- `.bg-primary-gradient` → vertical gradient `var(--primary)` →
  `var(--primary-dim)`. Used by primary buttons and bento card CTAs.
- `.glass-nav` → `backdrop-filter: blur(20px); background: color-mix(in srgb, var(--background) 80%, transparent);` —
  glassmorphism for sticky navigation surfaces.

### Icons

Stitch uses Material Symbols. We're already on `lucide-react` via shadcn — no
icon font is added. Stitch icon names are mapped to Lucide equivalents during
implementation:

| Stitch (Material) | Lucide |
|---|---|
| `palette` | `Palette` |
| `event` | `CalendarDays` |
| `account_circle` | `UserCircle` |
| `search` | `Search` |
| `send` | `Send` |
| `dashboard` | `LayoutDashboard` |
| `description` | `FileText` |
| `mail` | `Mail` |
| `analytics` | `BarChart3` |
| `settings` | `Settings` |
| `notifications` | `Bell` |
| `add` | `Plus` |
| `add_box` | `PlusSquare` |
| `tune` | `SlidersHorizontal` |
| `grading` | `ClipboardCheck` |
| `arrow_forward` | `ArrowRight` |
| `more_vert` | `MoreVertical` |
| `person_edit` | `UserPen` |
| `grid_view` | `LayoutGrid` |
| `explore` | `Compass` |
| `help` | `HelpCircle` |

## Component library updates

### Button (`src/components/ui/button.tsx`)

- `default` (primary) variant: replace `bg-primary text-primary-foreground` with
  `bg-primary-gradient text-primary-foreground`. Change radius to
  `rounded-[10px]`, add `font-semibold tracking-tight`. Default size padding
  bumped to `px-8 py-4` per the design's "generous padding" rule.
- `outline` variant: re-tone as "ghost border" — no background, `border` uses
  the ghost border token (already 15% opacity from `--border`), text in
  `text-primary`.
- `ghost` variant: kept as-is (low-emphasis), retoned by token swap.
- All API/variant names unchanged — consumer code (`buttonVariants`, `<Button>`)
  works without modification.

### Input + Textarea (`src/components/ui/input.tsx`, `textarea.tsx`)

- Background fill: `bg-secondary` instead of `border border-input bg-background`.
- Border: removed (no-line rule).
- Focus state: `focus-visible:ring-2 focus-visible:ring-ring
  focus-visible:ring-offset-4 focus-visible:ring-offset-background` — the
  signature 2px violet ring with 4px offset.
- Disabled state: keep current styles; reduce opacity to 50%.

### Card (`src/components/ui/card.tsx`)

- Default styling: `bg-card rounded-2xl shadow-gallery border-0` (no border).
- New optional `interactive` prop (boolean) that adds `transition-all
  hover:bg-surface-bright hover:shadow-gallery cursor-pointer`. Used by
  dashboard quick-action cards.
- `CardHeader` / `CardContent` / `CardFooter`: padding-based separation, no
  internal divider lines.

### Badge (`src/components/ui/badge.tsx`)

- Base style: `rounded-full text-[10px] font-bold uppercase tracking-wider
  px-3 py-1`.
- Variant tones (replaces current shadcn defaults):
  - `default` → `bg-primary/10 text-primary`
  - `secondary` → `bg-amber-100 text-amber-700` (Under Review — intentionally
    off-palette to differentiate "in flight" status)
  - `success` (new variant) → `bg-emerald-100 text-emerald-700`
  - `destructive` → `bg-tertiary-container text-on-tertiary-container`
  - `outline` → kept for backward compat, retoned to ghost border
- Dark mode tones for amber/emerald: `dark:bg-amber-900/30 dark:text-amber-300`,
  `dark:bg-emerald-900/30 dark:text-emerald-300`.

### Separator (`src/components/ui/separator.tsx`)

- Per the no-line rule, audited at each existing usage and replaced with
  whitespace or tonal background shifts. The component itself stays available
  but should be considered last-resort.

### Status badge mapping update (`src/app/(authenticated)/dashboard/page.tsx`)

The existing `STATUS_STYLES` constant is updated to use the new variant set:

```ts
const STATUS_STYLES = {
  submitted: { label: "Submitted", variant: "default" },
  under_review: { label: "Under Review", variant: "secondary" },
  accepted: { label: "Accepted", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  revoked: { label: "Revoked", variant: "destructive" },
};
```

Components that don't need direct touching (Dialog, DropdownMenu, Sheet, Tabs,
etc.) inherit the new tokens automatically and may need polish in later phases.

## Layout architecture

### Route group restructure

```
src/app/
├── (public)/
│   ├── layout.tsx           # PublicShell
│   ├── page.tsx             # homepage (moved from src/app/page.tsx)
│   ├── login/               # moved
│   ├── register/            # moved
│   ├── events/              # moved (public browsing)
│   └── conventions/         # moved (public directory + [conventionId])
├── (authenticated)/
│   ├── layout.tsx           # AuthShell
│   ├── dashboard/           # moved
│   ├── conventions/manage/  # moved (organizer convention list)
│   ├── settings/            # moved
│   └── notifications/       # moved
├── api/                     # untouched
├── layout.tsx               # root: html/body, fonts, theme provider only
└── globals.css
```

Route groups (`(public)`, `(authenticated)`) don't affect URL paths.
`/dashboard` and `/login` keep their URLs.

The existing per-page `auth()` checks and redirects stay where they are. The
new layouts are **purely presentational** — they don't enforce auth. This avoids
subtle dynamic-route bugs and keeps the shells testable in isolation.

### Root layout (`src/app/layout.tsx`)

Strips down to the bare minimum:
- `<html lang="en" suppressHydrationWarning>` (suppressHydrationWarning required by next-themes)
- `<body>` with the font CSS variables applied
- `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>`
- The `Providers` wrapper for SWR/etc. (existing — kept)
- `{children}`

No `Header` import here anymore — that's the shells' responsibility.

### `PublicShell` (`src/components/layout/public-shell.tsx`)

Server component (uses `auth()` directly).

- **Top nav** (fixed `h-16` full-width, `glass-nav`):
  - Left: brand wordmark "Art Apply" in extrabold violet (Manrope 800,
    `text-primary`, tracking-tighter)
  - Center (hidden below `md`): "Events" / "Conventions" links (the public
    surfaces). Active state: text in primary + small underline accent.
  - Right: theme toggle button. If logged out: shadcn `<Button variant="ghost">`
    "Log in" + `<Button>` (primary-gradient) "Register". If logged in: shadcn
    `<Avatar>` chip (initials via `AvatarFallback`) wrapped in `<DropdownMenu>`
    with items "Dashboard" / "Logout".

- **Main content slot**: `pt-16` to clear the fixed nav.

- **Footer**: NOT rendered by `PublicShell`. Pages that want a footer render
  it themselves (only the homepage in this slice). The footer is extracted as
  a reusable `<HomepageFooter>` component (`src/components/layout/homepage-footer.tsx`)
  imported by the homepage. Other public pages (login, events, conventions
  directory) render no footer. Footer content: copyright row, link list
  (About / Terms / Privacy — all linking to `#` with TODO comments since
  pages don't exist yet; Support dropped per cut list).

### `AuthShell` (`src/components/layout/auth-shell.tsx`)

Server component (uses `auth()` directly). Composes shadcn's `Sidebar`
primitive (`SidebarProvider`, `Sidebar`, `SidebarHeader`, `SidebarContent`,
`SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarFooter`,
`SidebarTrigger`, `SidebarInset`) for the layout chrome around child content.
The shell is composition-only — no custom replacement of shadcn's sidebar
behavior. shadcn's sidebar handles collapse, mobile Sheet drawer, keyboard
shortcuts, and persistent open/closed state automatically.

- **Left sidebar** (composed via shadcn `<Sidebar collapsible="icon">`,
  hidden as a Sheet below `md`):
  - Brand block (top): primary-container chip with palette icon + role-specific
    title ("Artist Studio" or "Convention Studio") in Manrope 900 violet +
    "CONARO" tagline in label-sm.
  - Nav list (artist role):
    - Overview → `/dashboard`
    - Profile → `/dashboard/profile`
    - Events → `/events`
    - Notifications → `/notifications`
    - `// TODO(messaging): commented-out Messages entry — captures deferred
      decision so it's discoverable when messaging is built later`
  - Nav list (organizer role):
    - Overview → `/conventions/manage` (acts as their dashboard for now)
    - Conventions → `/conventions/manage`
    - Notifications → `/notifications`
  - Active state: shadcn's `SidebarMenuButton` `isActive` prop drives the
    pill styling — overridden via the project's `--primary` token so the
    active item matches stitch's white-card-on-violet-tint look.
  - Hover: shadcn's default sidebar hover styles, retoned via tokens.
  - Bottom block (in `<SidebarFooter>`): Settings → `/settings/notifications`,
    Logout button (reuses existing `<LogoutButton>`).
  - The "New Application" CTA from stitch is dropped — applications come
    from event pages, not standalone.

- **Top header** (lives inside shadcn's `<SidebarInset>`, sticky at top,
  `glass-nav`):
  - Left: shadcn `<SidebarTrigger>` (handles mobile drawer + desktop
    collapse) followed by page title (passed as prop, e.g. "Dashboard") and
    optional small horizontal sub-nav.
  - Right: notification bell (existing `<NotificationBell>` component), theme
    toggle (uses `DropdownMenu`), avatar chip (uses shadcn `<Avatar>` +
    `<AvatarFallback>` for initials, wrapped in `DropdownMenu` for the
    logout/settings menu).

- **Mobile**: shadcn sidebar's built-in Sheet behavior — no custom mobile
  handling needed. `<SidebarTrigger>` opens it.

- **Main content area** (`<SidebarInset>` provides this): page provides its
  own container width and inner padding; shell stays content-agnostic.

### Existing `header.tsx` deleted

`src/components/layout/header.tsx` is removed; its responsibilities split
between `PublicShell` and `AuthShell`. Logout button (`logout-button.tsx`) and
NotificationBell are kept and reused by the new shells.

## Homepage redesign (`src/app/(public)/page.tsx`)

Long-scroll editorial layout matching `stitch/homepage_1` (light) and
`stitch/homepage_2` (dark — same structure, just inherits dark tokens).

### Section A — Hero
- Container: `max-w-7xl mx-auto px-8` with top spacing to clear glass nav
- Inner: `max-w-3xl` (left-aligned per the no-centralization rule)
- Overline: "CONARO" in `text-label-sm text-primary`
- Headline: "Apply to conventions. *Once.*" in `text-display-lg
  font-extrabold tracking-tighter` — "Once." wrapped in
  `<span className="text-primary italic">`
- Subhead: brief value-prop in `text-xl text-muted-foreground max-w-2xl`

### Section B — Two CTA bento cards (`grid-cols-1 md:grid-cols-2 gap-8`)

**Artist card** (light):
- `bg-card rounded-3xl p-12 shadow-gallery overflow-hidden relative`
- Soft violet radial blur in top-right corner via absolute-positioned div
- Palette icon in primary
- Headline "I'm an Artist" in `text-headline-lg`
- Value-prop paragraph
- Primary-gradient button "Join as Creator" → `/register/artist`
- Subtle `hover:scale-[1.01] transition-transform`

**Organizer card** (dark, inverted):
- `bg-foreground text-background rounded-3xl p-12` (uses dark-on-dark inversion
  even in light mode — matches stitch)
- White blur in bottom-right corner
- Event icon in primary-container
- Headline "I'm an Organizer"
- Inverted button: `bg-card text-foreground` → `/register/organizer`

**Logged-in state behavior:**
- If `session.user.role === "artist"`: both card buttons say "Go to Dashboard"
  → `/dashboard`.
- If organizer: "Manage Conventions" → `/conventions/manage`.

### Section C — "Designed for Focus" three-step explainer
- Section: `bg-secondary py-32` (tonal section break, no border)
- Centered headline `text-display-md font-extrabold tracking-tight` + small
  `h-1.5 w-24 bg-primary mx-auto rounded-full` accent bar
- Two columns (`grid-cols-1 lg:grid-cols-2 gap-24`):
  - "For Artists" (numbered chip "1") with three rows: Profile / Browse / Apply
  - "For Organizers" (numbered chip "2") with three rows: Create / Configure / Review
- Each row: shrink-0 16x16 white tile + icon + step name + one-line description

### Section D — Final CTA
- `py-48 text-center max-w-7xl mx-auto px-8`
- "READY TO START?" pill chip (`bg-primary/10 text-primary text-xs uppercase
  tracking-widest`)
- Tagline `text-display-lg font-extrabold tracking-tighter max-w-4xl mx-auto`
- Two buttons: primary-gradient "Get Started" → `/register/artist`, ghost
  "View Our Directory" → `/events`. Both swap behavior when logged in (same
  as Section B).

### Section E — Footer
Rendered by the homepage itself via the `<HomepageFooter>` component (not by
`PublicShell`).

- `flex flex-col md:flex-row justify-between items-center px-12 py-8 gap-4`
- Left: copyright in `text-label-sm text-muted-foreground`
- Center: link list (About / Terms / Privacy) in `text-label-sm` — all link
  to `#` with `// TODO: link to real page when it exists` comment
- Right: small social icons (kept as visual ornament; no real links yet)

### Drops vs. stitch
- Avatar in nav (no upload yet — initials chip)
- "Manage Lists" nav link (organizer-specific, not exposed on public homepage)
- "Support" footer link (no support page exists)

## Artist Dashboard redesign (`src/app/(authenticated)/dashboard/page.tsx`)

Renders inside `AuthShell` (which handles the sidebar + top header chrome).
The page itself focuses on main-column content.

Container: `max-w-7xl mx-auto px-8 space-y-12`.

### Section A — Welcome hero
- Layout: `flex flex-col md:flex-row justify-between items-end gap-6`
- Left: overline "OVERVIEW" in `text-label-sm text-primary` →
  `text-display-md font-extrabold tracking-tight` "Welcome back, {firstName}"
  → muted subtitle
  - Subtitle is dynamic: if there are unread notifications, "You have N new
    notifications." Otherwise "Your creative journey continues."
- Right: **Completeness widget** (`w-full md:w-80 bg-card p-6 rounded-2xl
  shadow-gallery space-y-4`):
  - Top row: "COMPLETENESS" label + small primary-container chip
    "{filled}/{total} fields completed"
  - Segmented progress bar: 7 thin pills (`flex gap-1.5 h-1.5`); filled
    segments in `bg-primary`, unfilled in `bg-muted`
  - Bottom row: "Basic Info" (in `text-primary font-bold`) ↔ "Logistics"
    (in `text-muted-foreground`) — segment label endpoints

The existing `<CompletenessIndicator>` component is refactored to render this
layout (or replaced inline if a single-purpose render is cleaner).
`computeCompleteness` math stays untouched.

### Section B — Quick action cards (`grid grid-cols-1 md:grid-cols-3 gap-6`)

Three `<Card interactive>` cards, each with:
- 12×12 colored icon tile (`rounded-xl`, `group-hover:scale-110 transition-transform`)
- Title in `text-headline-md font-bold`
- One-line description in `text-sm text-muted-foreground`

Cards:
1. **Edit Profile** — secondary-container tile + `UserPen` icon → `/dashboard/profile`
2. **View Portfolio** — primary-container tile + `LayoutGrid` icon →
   `/dashboard/profile#portfolio`
3. **Browse Events** — tertiary-container tile + `Compass` icon → `/events`

### Section C — My Applications
- Section header: "My Applications" in `text-headline-lg font-bold` left,
  optional small "{count} total" muted text right (no "View All" link — full
  list is here)
- Card wrapper: `bg-card rounded-2xl shadow-gallery overflow-hidden`
- **Desktop (`md+`)**: shadcn `<Table>` (`Table`, `TableHeader`, `TableBody`,
  `TableRow`, `TableHead`, `TableCell`) with columns Convention / Event / Date
  Applied / Status. No TanStack Table layer needed yet (no sorting/filtering
  in this slice — added in a future phase if the list grows).
  - Convention cell: shadcn `<Avatar>` with convention logo (`AvatarImage`) or
    initials fallback (`AvatarFallback`) + bold convention name
  - Status cell: shadcn `<Badge>` using updated variant mapping. Preserves
    existing `displayStatus` masking logic (when `event.status === "reviewing"`
    and `app.status !== "submitted"`, display as "under_review" to mask
    in-progress decisions before publish)
  - The whole row is wrapped in a `<Link>` to `/events/{eventId}` (no overflow
    column for now)
- **Mobile (below `md`)**: Table collapses to stacked cards. Each card shows
  convention logo + name (top), event name (subtitle), date applied (small
  muted), status badge (right-aligned)
- **Empty state** (`applicationList.length === 0`): centered empty-state card
  with "No applications yet" headline + muted helper + primary-gradient
  "Browse Events" button → `/events`

### Section D — Following
Kept from the existing dashboard (PRD-real feature), relocated below
applications.

- Section header: "Following" in `text-headline-md font-bold`
- Desktop: horizontal scrollable row of small convention chips
- Mobile: vertical list
- Each chip: convention logo (or initials) + name → `/conventions/{conventionId}`
- Empty state: small muted line "Follow conventions from the directory to track
  them here." with link to `/events`
- Hidden entirely if Following is empty AND there are zero applications (avoids
  two empty states stacked)

### Server-side data fetching unchanged
The existing `Promise.all` block (profile, artistProfile, completeness count,
application list, follows) is preserved as-is. Only JSX presentation changes.

### Drops vs. stitch
- Sidebar items "Messages" (deferred — TODO in nav config),
  "Analytics" (not in PRD), "Portfolio" as separate route (lives inside
  profile editor), "Support" (no page)
- "New Application" sidebar CTA → repurposed as "Browse Events" entry in main
  nav
- Stock-photo avatars in the table convention column → use convention logo
  where available, initials fallback otherwise
- "View All" applications link (full list shown on dashboard already)

## Theme switching

### Mechanism
- `next-themes` with `attribute="class"`, `defaultTheme="system"`,
  `enableSystem`, `disableTransitionOnChange`.
- `<ThemeProvider>` wraps `<body>` children in root layout.
- `<html suppressHydrationWarning>` to silence next-themes' expected first-render
  mismatch.

### Toggle UI (`src/components/layout/theme-toggle.tsx`)
- Client component.
- Composed from shadcn `<Button variant="ghost" size="icon">` +
  `<DropdownMenu>` (`DropdownMenuTrigger`, `DropdownMenuContent`,
  `DropdownMenuItem`).
- Renders the resolved theme's Lucide icon (Sun / Moon / Monitor) in the
  trigger button.
- Dropdown items: Light, Dark, System.
- Renders a same-sized `<Skeleton>` (or fixed-size placeholder div) during
  SSR until mounted to avoid hydration mismatch on the icon.

### Verification approach
During implementation, both light and dark stitch screenshots are checked
side-by-side for the homepage and dashboard to verify no token leaks. No
automated visual regression tooling is added in this slice.

## Acceptance criteria

### Foundation
- [ ] `globals.css` defines the new light + dark token palettes per the
      tables above.
- [ ] Manrope + Inter loaded via `next/font/google`; `font-heading` and
      `font-sans` CSS variables wired up.
- [ ] Type scale utilities (`text-display-lg`, `text-display-md`,
      `text-headline-lg`, `text-headline-md`, `text-body-md`, `text-label-sm`)
      generated by Tailwind v4.
- [ ] `.shadow-gallery`, `.bg-primary-gradient`, `.glass-nav` utilities
      defined.

### Components
- [ ] New shadcn primitives installed via `npx shadcn add`: `sidebar`,
      `sheet`, `dropdown-menu`, `avatar`, `table`, `tooltip`. No hand-rolled
      replacements.
- [ ] Button: primary uses gradient, `rounded-[10px]`, generous padding,
      `font-semibold tracking-tight`. Variant API unchanged.
- [ ] Input/Textarea: filled (`bg-secondary`), no border, 2px primary focus
      ring with 4px offset.
- [ ] Card: `border-0`, `rounded-2xl`, default `shadow-gallery`. New
      `interactive` prop adds hover state.
- [ ] Badge: pill-shaped, `text-[10px] font-bold uppercase tracking-wider`.
      `success` variant added. Existing `STATUS_STYLES` map updated.
- [ ] `AuthShell` composes shadcn Sidebar primitives (no custom sidebar
      implementation). Mobile drawer behavior comes from shadcn's built-in
      Sheet integration.
- [ ] Theme toggle uses shadcn `DropdownMenu` (no custom popover).
- [ ] Applications table uses shadcn `Table` (no raw `<table>` markup).
- [ ] Avatar chips use shadcn `Avatar` + `AvatarFallback` for initials
      (no custom avatar component).

### Layout
- [ ] `(public)` and `(authenticated)` route groups created. All existing
      pages moved into the appropriate group. URLs unchanged.
- [ ] `PublicShell`: glass nav (logo, public links, theme toggle, auth
      buttons), homepage-only footer.
- [ ] `AuthShell`: left sidebar (role-aware nav), top header (page title,
      notification bell, theme toggle, avatar chip), mobile drawer collapse.
- [ ] Old `header.tsx` deleted; logout button + notification bell reused.
- [ ] Authentication redirects continue to work (handled per-page, not by
      layouts).

### Homepage
- [ ] Hero section matches stitch (overline, big headline with italic primary
      "Once.", subhead) — left-aligned.
- [ ] Two CTA bento cards (Artist white / Organizer dark inverted) render and
      link correctly.
- [ ] CTA buttons swap to "Go to Dashboard" / "Manage Conventions" when
      logged in.
- [ ] "Designed for Focus" section renders both columns with three steps
      each.
- [ ] Final CTA renders with both buttons.
- [ ] `<HomepageFooter>` renders only on homepage (other public pages have
      no footer); About/Terms/Privacy stub-link to `#`.

### Dashboard
- [ ] Welcome hero shows the user's first name + dynamic subtitle.
- [ ] Completeness widget shows segmented progress bar with correct fill
      based on `computeCompleteness`.
- [ ] Three quick-action cards render with correct icons, colors, and
      destinations.
- [ ] Applications table renders on desktop, collapses to stacked cards on
      mobile.
- [ ] Status badges use the new variant mapping. The "reviewing" status
      masking logic is preserved.
- [ ] Empty state for zero applications renders correctly with CTA.
- [ ] Following section renders below applications; hidden when both
      applications and follows are empty.

### Theming
- [ ] Theme toggle in both shells offers Light / Dark / System.
- [ ] Selected theme persists across page loads.
- [ ] No flash of wrong theme on initial load (handled by next-themes).
- [ ] Both light and dark variants of homepage + dashboard match stitch
      screenshots.

### No regressions
- [ ] All other authenticated pages (profile editor, events, conventions/manage,
      settings, notifications) render inside `AuthShell` with their existing
      content and remain functional.
- [ ] All other public pages (login, register, events directory, public
      conventions) render inside `PublicShell` with their existing content
      and remain functional.
- [ ] Existing tests pass.

## Future considerations (out of scope for this phase)

- **Remaining stitch screen redesigns** — login, registration, role selection,
  profile editor (artist + mobile), event/convention browsing and editor,
  application status/review, field configuration, list manager, organizer
  dashboards. Each is a separate phase that benefits from the foundation built
  here.
- **Messaging feature** — deferred. A `// TODO(messaging)` placeholder
  in the artist sidebar nav array captures the location where the entry
  belongs when it's built. Will need its own spec covering data model,
  delivery, notifications, organizer/artist permissions.
- **ArtDeck integration** — deferred. Model: import-from (not sync-from).
  Affordance lives in the profile editor, pulls public portfolio entries from
  artdeck.app for the artist to selectively add to their art-apply portfolio.
  Snapshot semantics are preserved by treating imports as new art-apply
  portfolio entries at import time. Not needed for this slice.
- **Profile photo upload** — would replace the initials-chip avatar pattern
  introduced here. Requires R2 upload UX in profile editor + table cell
  rendering changes.
- **Organizer dashboard** — currently organizers reuse `/conventions/manage`
  as their landing page. A dedicated organizer dashboard would be a new page,
  designed in a later phase.
- **About / Terms / Privacy / Support pages** — placeholder `#` links in the
  homepage footer. Real pages are a separate content/marketing task.
- **Automated visual regression testing** — not introduced here. If we want
  this, it would be a separate tooling task (Playwright + Percy or similar).
