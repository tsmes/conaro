# Project Standards

## Code Style

- Use `camelCase` for variables and functions, `PascalCase` for types, interfaces, components, and classes
- Use `kebab-case` for file and directory names (e.g., `application-review.tsx`, `use-notifications.ts`)
- Prefer named exports over default exports (exception: Next.js page/layout components which require default exports)
- Max line length: 100 characters (soft limit — don't break readability to hit it)
- Use `const` by default, `let` only when reassignment is needed, never `var`
- Prefer `interface` over `type` for object shapes; use `type` for unions, intersections, and computed types
- Prefer early returns over deeply nested conditionals
- No unused imports or variables — keep the codebase clean

## Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages, layouts, route handlers
│   ├── (auth)/             # Auth-related pages (login, register)
│   ├── (artist)/           # Artist dashboard, profile, applications
│   ├── (organizer)/        # Convention dashboard, event management, review
│   └── api/                # API route handlers
├── components/             # Reusable React components
│   ├── ui/                 # shadcn/ui primitives
│   └── [feature]/          # Feature-specific components (e.g., portfolio/, notifications/)
├── lib/                    # Shared utilities and configurations
│   ├── db/                 # Drizzle schema, migrations, connection
│   │   ├── schema/         # Schema files organized by domain
│   │   └── migrations/     # Drizzle migration files
│   ├── auth/               # Auth.js configuration
│   ├── storage/            # R2 client and image utilities
│   ├── email/              # Resend client and email templates
│   ├── notifications/      # Notification creation and delivery
│   └── validations/        # Zod schemas for validation
├── hooks/                  # Custom React hooks
└── types/                  # Shared TypeScript types
```

### Layering Rules

- **Route handlers** (`app/api/`) are thin — validate input, call service functions, return responses
- **Service functions** (`lib/`) contain business logic — they are framework-agnostic and testable in isolation
- **Database access** goes through Drizzle queries in `lib/db/` — no raw SQL in components or route handlers
- **Components** do not call the database directly — they receive data via props or server component data fetching
- **Validation** happens at system boundaries: Zod schemas validate API input and form submissions

### Server vs Client Components

- Default to server components — use `"use client"` only when the component needs interactivity (event handlers, hooks, browser APIs)
- Data fetching happens in server components; pass data down as props
- Forms and interactive elements are client components
- Keep client component boundaries as narrow as possible

## Patterns & Conventions

### Error Handling

- Use Zod schemas at API boundaries for input validation
- Throw descriptive errors from service functions — let route handlers catch and format responses
- Never swallow errors silently — log or propagate
- Use `try/catch` in route handlers, not in service functions (let errors bubble up)

### Database

- All schema definitions in `lib/db/schema/` using Drizzle's schema builder
- Use Drizzle's query builder — no raw SQL unless there's a compelling reason
- Use transactions for operations that modify multiple tables
- All migrations generated via `drizzle-kit generate` and applied via `drizzle-kit migrate`

### Image Handling

- Client-side: compress with `browser-image-compression` before upload
- Server-side: resize (max 2048px longest edge) and compress (~80% WebP/JPEG) with `sharp` before storing in R2
- Storage paths: `portfolios/{user_id}/{image_id}` for artist portfolios, `snapshots/{event_id}/{application_id}/{image_id}` for application snapshots
- Serve via Cloudflare CDN using R2 public URLs or presigned URLs for private content

### Auth & Authorization

- Auth.js v5 with Credentials provider for email/password
- Session stored in PostgreSQL via Drizzle adapter
- Role (`artist` | `organizer`) stored in `profiles` table
- Middleware protects routes by role — artists cannot access organizer routes and vice versa
- Always check ownership in service functions (e.g., an organizer can only manage their own convention)

### Notifications

- Create notification records in PostgreSQL for all in-app notifications
- Email delivery via Resend — templates built with React Email in `lib/email/`
- Push via Web Push API using `web-push` package
- Respect user notification preferences before sending any notification

### Field Registry

- Toggleable fields defined as a typed constant array in `lib/db/field-registry.ts`.
- Each entry has a `source`:
  - `"profile"` — pulled from the artist profile at apply time and snapshotted into `applications.profileSnapshot`.
  - `"application"` — filled in by the artist on the application form and stored in `applications.answers`.
- Event field requirements are a JSONB map (`required | optional | not_requested`) keyed by registry field keys.

#### Invariant — the field registry must match the artist profile

**Every profile-source field in the artist profile UI MUST have a corresponding entry in `FIELD_REGISTRY`, and every profile-source registry entry MUST map to data actually present on the profile.** The organizer's per-event field toggle screen iterates the registry; anything missing there can't be required of applicants, and anything in the registry that doesn't exist on the profile produces an un-satisfiable requirement.

When you add, rename, or remove an editable field on the artist profile:

1. Update the schema (`lib/db/schema/artist-profiles.ts` or related) and generate a migration.
2. Add / rename / remove the matching entry in `FIELD_REGISTRY`.
3. Update `lib/applications/validation.ts` — both the `ArtistProfileData` interface and the `isFieldFilled` helper (special-case for multi-column fields like `priceRange`).
4. Update `lib/db/schema/applications.ts` `ProfileSnapshot` so organizers see the new value on submitted applications.
5. Update the snapshot build in `app/(public)/events/[eventId]/actions.ts` `applyToEvent`.
6. Update `lib/validations/profile.ts` so the save action validates the new input.
7. Extend the mapping in `__tests__/unit/lib/field-registry-profile-match.test.ts` (this test exists specifically to fail when the registry and the profile drift apart).

Application-source registry entries don't have a corresponding profile column; they live in `applications.answers` and are validated by `buildApplicationAnswersSchema` in `lib/validations/application.ts`.

## Testing

### Philosophy

Every layer of the application has tests. The goal is confidence when shipping — if tests pass, the feature works.

### Test Structure

```
__tests__/
├── unit/                   # Pure function and service logic tests
│   ├── lib/                # Service function tests
│   └── components/         # Component unit tests (rendering, props)
├── integration/            # Tests that hit the database or external services
│   ├── api/                # Route handler tests with real DB
│   └── db/                 # Query and migration tests
└── e2e/                    # Full browser tests (Playwright)
    ├── artist/             # Artist user journeys
    └── organizer/          # Organizer user journeys
```

### Test Tools

- **Unit & Integration**: Vitest — fast, TypeScript-native, compatible with Next.js
- **Component tests**: Vitest + React Testing Library
- **E2E**: Playwright — real browser tests for critical user journeys
- **Database tests**: Use a test database (separate from dev), reset between test suites via migrations

### What to Test

| Layer | What to test | Tool |
|-------|-------------|------|
| **Service functions** (`lib/`) | Business logic, edge cases, error paths | Vitest (unit) |
| **Zod schemas** (`lib/validations/`) | Valid input passes, invalid input fails with correct errors | Vitest (unit) |
| **API route handlers** (`app/api/`) | Request/response contracts, auth checks, error responses | Vitest (integration, with test DB) |
| **Database queries** (`lib/db/`) | Queries return expected data, migrations apply cleanly | Vitest (integration, with test DB) |
| **React components** | Renders correctly, user interactions work, conditional rendering | Vitest + React Testing Library |
| **Critical user journeys** | Registration, profile setup, apply to event, review applicants, publish results | Playwright (e2e) |

### Test Requirements

- All service functions must have unit tests covering the happy path and at least one error/edge case
- All API routes must have integration tests verifying auth, valid input, and invalid input
- All Zod validation schemas must have tests for valid and invalid inputs
- Critical user journeys (listed above) must have Playwright E2E tests
- Tests run in CI before merge — failing tests block the PR

### Test Conventions

- Test file naming: `[name].test.ts` or `[name].test.tsx`
- Use descriptive test names: `it("rejects application when required fields are missing")`
- One assertion per test when practical — makes failures easier to diagnose
- Use factories or helpers for creating test data — no copy-pasting fixture objects
- Mock external services (R2, Resend, web-push) in unit/integration tests — test their integration in E2E
- Never skip or disable a test to make the build pass — fix the underlying issue

## Dependencies

- Prefer well-maintained packages with TypeScript support
- Pin exact versions in `package.json` (no `^` or `~` prefixes)
- Before adding a new dependency, check if the need can be met with existing packages or stdlib — but no approval process needed
- Security: run `npm audit` as part of CI — no unresolved critical/high vulnerabilities
