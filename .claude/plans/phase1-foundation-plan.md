# Implementation Plan: Phase 1 — Foundation

Spec: `.claude/plans/phase1-foundation-spec.md`

## Technical Decisions

- **Session strategy: JWT** — Auth.js v5 Credentials provider doesn't support database sessions. User records stored in PostgreSQL via Drizzle adapter; session token is a signed JWT containing user ID and role. Standard Auth.js v5 + Credentials approach.
- **Password hashing: `bcryptjs`** — Pure JS, no native compilation issues, sufficient for auth workloads.
- **Form submissions: Server Actions** — Idiomatic Next.js 15 App Router. Simpler than API routes, built-in progressive enhancement. Zod validation on both client and server.
- **Profile creation: Transactional with registration** — User + profile (+ convention for organizers) created in a single database transaction. Profile always exists from account creation.
- **Schema organization: Split by domain** — `src/lib/db/schema/auth.ts`, `profiles.ts`, `conventions.ts` per STANDARDS.md.
- **Auth.js Drizzle adapter** — Standard adapter schema for `users`, `accounts`, `sessions`, `verificationTokens` tables, extended with custom `profiles` and `conventions`.

## Tasks

### 1. Project scaffolding
Initialize the Next.js 15 project with all dependencies and tooling.

**Requirements:** REQ-1

**Files:**
- `package.json` — new: all dependencies with exact versions
- `tsconfig.json` — new: TypeScript strict mode, `@/*` path alias
- `next.config.ts` — new: Next.js configuration
- `tailwind.config.ts` — new: Tailwind CSS configuration
- `postcss.config.mjs` — new: PostCSS for Tailwind
- `components.json` — new: shadcn/ui configuration (New York style)
- `src/app/layout.tsx` — new: minimal root layout (just enough to render)
- `src/app/page.tsx` — new: placeholder homepage
- `src/app/globals.css` — new: Tailwind base styles + shadcn/ui CSS variables
- `src/lib/utils.ts` — new: `cn()` utility from shadcn/ui
- `.gitignore` — new: Node, Next.js, env files
- `.env.example` — new: template for required env vars

**Approach:**
- Run `npx create-next-app@latest` with TypeScript, Tailwind, App Router, `src/` directory, Turbopack, `@/*` import alias
- Install exact versions of all project dependencies: `drizzle-orm`, `drizzle-kit`, `@auth/drizzle-adapter`, `next-auth@5` (Auth.js v5), `bcryptjs`, `zod`, `pg` (PostgreSQL driver), `sharp`
- Install dev dependencies: `@types/bcryptjs`, `@types/pg`
- Initialize shadcn/ui with `npx shadcn@latest init` — New York style, RSC enabled
- Add shadcn/ui components needed for Phase 1: `button`, `card`, `input`, `label`, `form` (uses react-hook-form + zod)
- Create `.env.example` with: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`

**Verification:** `npm run dev` starts without errors; `npm run build` compiles; `npm run lint` passes
**Depends on:** none

### 2. Docker Compose + Drizzle configuration
- [x] completed — Set up local PostgreSQL via Docker and configure Drizzle ORM connection.

**Requirements:** REQ-2

**Files:**
- `docker-compose.yml` — new: PostgreSQL 16 container with volume, port 5432, dev credentials
- `.env.local` — new: actual dev environment values (gitignored)
- `src/lib/db/index.ts` — new: Drizzle client instance using `pg` Pool
- `drizzle.config.ts` — new: Drizzle Kit configuration pointing to schema directory

**Approach:**
- Docker Compose with `postgres:16-alpine`, named volume for data persistence, health check
- Database name: `art_apply_dev`, user: `postgres`, password: `postgres`
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/art_apply_dev`
- Drizzle client: create a `pg` Pool, pass to `drizzle()` with schema import
- Drizzle Kit config: dialect `postgresql`, schema path `src/lib/db/schema/*`, connection from env
- Add npm scripts: `db:generate` (`drizzle-kit generate`), `db:migrate` (`drizzle-kit migrate`), `db:studio` (`drizzle-kit studio`)
- Update `.env.example` with database connection string template

**Verification:** `docker compose up -d` starts PostgreSQL; `npx drizzle-kit studio` connects successfully
**Depends on:** 1

### 3. Database schema + migration
Define the initial database schema and run the first migration.

**Requirements:** REQ-3

**Files:**
- `src/lib/db/schema/auth.ts` — new: Auth.js tables (users, accounts, sessions, verificationTokens) using Drizzle adapter's recommended schema
- `src/lib/db/schema/profiles.ts` — new: profiles table with role enum, display name, foreign key to users
- `src/lib/db/schema/conventions.ts` — new: conventions table with name, foreign key to profiles (organizer)
- `src/lib/db/schema/index.ts` — new: barrel export of all schema modules

**Approach:**
- Auth tables: follow `@auth/drizzle-adapter` documented schema for PostgreSQL — `users` (id, name, email, emailVerified, image), `accounts`, `sessions`, `verificationTokens`
- Profiles table: `id` (uuid, pk), `userId` (references users.id, unique), `role` (pgEnum: 'artist' | 'organizer'), `displayName` (text, not null), `createdAt`, `updatedAt`
- Conventions table: `id` (uuid, pk), `organizerId` (references profiles.id, unique — one convention per organizer), `name` (text, not null), `createdAt`, `updatedAt`
- Export all tables and relations from index.ts
- Generate migration with `npm run db:generate`
- Apply migration with `npm run db:migrate`

**Verification:** Migration applies cleanly; `drizzle-kit studio` shows all tables with correct columns
**Depends on:** 2

### 4. Auth.js configuration
Set up Auth.js v5 with Credentials provider, Drizzle adapter, and JWT callbacks.

**Requirements:** REQ-4

**Files:**
- `src/lib/auth/index.ts` — new: Auth.js configuration (providers, adapter, callbacks, session strategy)
- `src/app/api/auth/[...nextauth]/route.ts` — new: Auth.js route handler (GET, POST exports)
- `src/lib/auth/helpers.ts` — new: `getServerSession()` helper, `hashPassword()`, `verifyPassword()` utilities

**Approach:**
- Configure Auth.js with: Drizzle adapter (for user storage), JWT session strategy, Credentials provider
- Credentials provider `authorize` function: look up user by email, verify password with bcryptjs, return user object or null
- JWT callback: on sign-in, look up profile to get role; encode `userId`, `role`, `profileId` into the JWT
- Session callback: expose `userId`, `role`, `profileId` from JWT to the client session object
- Extend Auth.js types (next-auth.d.ts) to include `role`, `profileId` on Session and JWT
- Create `auth()` export for server-side session access
- Helper functions: `hashPassword(plain)` → bcryptjs hash, `verifyPassword(plain, hash)` → boolean
- Generate AUTH_SECRET with `npx auth secret` and add to `.env.local`

**Verification:** `npm run build` compiles with no type errors; Auth.js route handler responds at `/api/auth/providers`
**Depends on:** 3

### 5. Validation schemas
Define Zod schemas for all auth-related form inputs.

**Requirements:** Infrastructure (enables REQ-6, REQ-7, REQ-8)

**Files:**
- `src/lib/validations/auth.ts` — new: Zod schemas for artist registration, organizer registration, and login

**Approach:**
- `artistRegistrationSchema`: email (email format), password (min 8 chars), confirmPassword, displayName (non-empty). Add `.refine()` to check password === confirmPassword
- `organizerRegistrationSchema`: same as artist + `conventionName` (non-empty)
- `loginSchema`: email (email format), password (non-empty)
- Export TypeScript types inferred from each schema

**Verification:** `npm run build` compiles with no type errors
**Depends on:** 1

### 6. Layout + homepage + stub pages
Build the app shell: layout with header, homepage, and stub dashboard pages as redirect targets.

**Requirements:** REQ-11 (partial — static header only, auth-awareness added in task 11)

**Files:**
- `src/app/layout.tsx` — modify: add header component, body structure
- `src/app/page.tsx` — modify: homepage with app description, register/login CTAs
- `src/components/layout/header.tsx` — new: header with app name, register and login links (static, no auth state yet)
- `src/app/dashboard/page.tsx` — new: artist dashboard stub ("Welcome to your dashboard")
- `src/app/conventions/page.tsx` — new: organizer dashboard stub ("Welcome to your conventions")

**Approach:**
- Header: app name "Art Apply" linking to `/`, nav with "Log in" and "Register" links. Simple, clean layout using shadcn/ui Button components for links.
- Homepage: hero section with brief description of Art Apply, two CTA buttons — "I'm an Artist" (→ /register/artist) and "I organize Conventions" (→ /register/organizer), plus a login link
- Stub pages: minimal server components, just a heading and a sentence. These exist so registration/login have valid redirect targets.
- No auth-awareness yet — that comes in task 11 after login is built

**Verification:** `npm run dev` — homepage renders with links; `/dashboard` and `/conventions` render their stub content; all links navigate correctly
**Depends on:** 1

### 7. Registration landing page
Build the `/register` role selection page with two cards.

**Requirements:** REQ-5

**Files:**
- `src/app/register/page.tsx` — new: landing page with artist and organizer cards

**Approach:**
- Two shadcn/ui Cards side by side (responsive: stack on mobile)
- Artist card: icon/emoji, "I'm an Artist" heading, brief description ("Create your profile and apply to conventions"), link to `/register/artist`
- Organizer card: icon/emoji, "I organize a Convention" heading, brief description ("Set up your convention and manage applications"), link to `/register/organizer`
- "Already have an account? Log in" link at the bottom
- Server component — no interactivity needed

**Verification:** `npm run dev` — `/register` renders both cards; clicking each navigates to the correct registration form URL
**Depends on:** 6

### 8. Artist registration
Build the artist registration form, server action, and user+profile creation flow.

**Requirements:** REQ-6

**Files:**
- `src/app/register/artist/page.tsx` — new: page wrapper (server component) rendering the form
- `src/components/auth/artist-register-form.tsx` — new: client component with form fields, client-side validation, submit handling
- `src/app/register/artist/actions.ts` — new: `registerArtist` server action

**Approach:**
- Form fields: email, password, confirm password, display name. Use shadcn/ui form components with react-hook-form + Zod resolver using `artistRegistrationSchema`
- Server action `registerArtist(formData)`:
  1. Parse and validate with Zod schema (server-side)
  2. Check email uniqueness (query users table)
  3. Hash password with `hashPassword()`
  4. In a transaction: create user in `users` table → create profile in `profiles` table with role='artist'
  5. Auto sign-in the user via Auth.js `signIn("credentials", ...)`
  6. Redirect to `/dashboard`
- On validation/uniqueness errors: return error state to the form, display inline
- Form shows loading state during submission

**Verification:** `npm run dev` — fill form at `/register/artist` with valid data → user + profile created in DB → redirected to `/dashboard`. Try duplicate email → error shown. Try short password → error shown.
**Depends on:** 4, 5, 7

### 9. Organizer registration
Build the organizer registration form, server action, and user+profile+convention creation flow.

**Requirements:** REQ-7

**Files:**
- `src/app/register/organizer/page.tsx` — new: page wrapper rendering the form
- `src/components/auth/organizer-register-form.tsx` — new: client component with form fields
- `src/app/register/organizer/actions.ts` — new: `registerOrganizer` server action

**Approach:**
- Same pattern as artist registration, plus `conventionName` field
- Server action `registerOrganizer(formData)`:
  1. Parse with `organizerRegistrationSchema`
  2. Check email uniqueness
  3. Hash password
  4. In a transaction: create user → create profile (role='organizer') → create convention (name, organizerId)
  5. Auto sign-in
  6. Redirect to `/conventions`
- Share common form styling/structure with artist form but keep as separate components (they have different fields, and extracting a shared abstraction for two forms is premature)

**Verification:** `npm run dev` — fill form at `/register/organizer` → user + profile + convention created in DB → redirected to `/conventions`
**Depends on:** 4, 5, 7

### 10. Login
Build the login form, server action, and role-based redirect.

**Requirements:** REQ-8

**Files:**
- `src/app/login/page.tsx` — new: page wrapper rendering the login form
- `src/components/auth/login-form.tsx` — new: client component with email/password form
- `src/app/login/actions.ts` — new: `login` server action

**Approach:**
- Form: email and password fields using shadcn/ui components with react-hook-form + `loginSchema`
- Server action `login(formData)`:
  1. Parse with Zod
  2. Call Auth.js `signIn("credentials", { email, password, redirect: false })`
  3. If error: return generic "Invalid email or password" (never reveal which field is wrong)
  4. If success: look up user's role from profile, redirect to `/dashboard` (artist) or `/conventions` (organizer)
- "Don't have an account? Register" link at bottom

**Verification:** `npm run dev` — log in with valid credentials → redirected to role-appropriate page. Try wrong email → generic error. Try wrong password → same generic error.
**Depends on:** 4, 5, 6

### 11. Auth-aware header + logout + route protection
Complete the auth experience: update header with session state, add logout, and protect routes by role.

**Requirements:** REQ-9, REQ-10, REQ-11

**Files:**
- `src/components/layout/header.tsx` — modify: make auth-aware (show different nav based on session)
- `src/components/auth/logout-button.tsx` — new: client component that calls signOut
- `src/middleware.ts` — new: Next.js middleware for auth and role-based route protection

**Approach:**
- Header (server component): call `auth()` to get session. If logged in: show role-appropriate nav links + logout button. If logged out: show "Log in" and "Register" links.
  - Artist nav: "Dashboard" (→ /dashboard)
  - Organizer nav: "Conventions" (→ /conventions)
- Logout button: client component using `signOut()` from `next-auth/react`. Redirects to `/` on completion.
- Middleware (`src/middleware.ts`):
  - Use Auth.js middleware helper to get session token
  - Define protected route matchers: `/dashboard(.*)` requires artist role, `/conventions(.*)` requires organizer role
  - Unauthenticated → redirect to `/login`
  - Wrong role → redirect to their own dashboard
  - Auth pages (`/login`, `/register`) when already logged in → redirect to dashboard
  - Public routes (`/`, `/api/auth`) → pass through

**Verification:**
- Logged out: header shows Log in / Register. Visiting `/dashboard` or `/conventions` redirects to `/login`.
- Logged in as artist: header shows Dashboard + logout. Visiting `/conventions` redirects to `/dashboard`. Clicking logout → redirected to homepage, session cleared.
- Logged in as organizer: header shows Conventions + logout. Visiting `/dashboard` redirects to `/conventions`.
- `npm run build` succeeds. `npm run lint` passes.

**Depends on:** 8, 9, 10

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 | 1 |
| REQ-2 | 2 |
| REQ-3 | 2, 3 |
| REQ-4 | 4 |
| REQ-5 | 7 |
| REQ-6 | 5, 8 |
| REQ-7 | 5, 9 |
| REQ-8 | 5, 10 |
| REQ-9 | 11 |
| REQ-10 | 11 |
| REQ-11 | 6, 11 |

## Risks

- **Auth.js v5 Credentials + auto sign-in after registration**: Auth.js `signIn()` called from a server action can be tricky with redirects. May need to return a redirect URL to the client and handle navigation there instead of server-side redirect. Will address during implementation if needed.
- **Auth.js Drizzle adapter schema compatibility**: The adapter's expected table structure must match our Drizzle schema exactly. Will follow the official `@auth/drizzle-adapter` documentation for PostgreSQL table definitions.
