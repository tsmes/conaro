# Implementation Plan: Phase 2 — Artist Profile

Spec: `.claude/plans/phase2-artist-profile-spec.md`

## Technical Decisions

- **Lean profiles + separate artist_profiles table**: Keep `profiles` role-agnostic (id, userId, role, displayName). New `artist_profiles` table holds artist-specific fields (real name, contact email, phone, bio, website, social links, logistics fields). 1:1 relationship with indexed FK. Organizer-specific fields can follow the same pattern later with `organizer_profiles`.
- **Portfolio images table**: New `portfolio_images` table with id, profileId, filename, storagePath, mimeType, width, height, sortOrder, createdAt. sortOrder is an integer for drag-to-reorder persistence.
- **Storage abstraction**: Interface in `src/lib/storage/` with `upload`, `delete`, `getUrl` methods. `LocalStorageAdapter` writes to `uploads/` (gitignored). Swapping to R2 later is one file implementing the same interface.
- **Image upload via API route**: `POST /api/portfolio` handles multipart file upload. Profile text updates use server actions (matching existing pattern). API route is more natural for file uploads.
- **Image processing with sharp**: Utility in `src/lib/storage/image.ts` — resize to max 2048px longest edge, convert to WebP at 80% quality, return processed buffer + metadata.
- **Drag-and-drop with @dnd-kit**: `@dnd-kit/core` + `@dnd-kit/sortable` for portfolio reordering. Modern, headless, React 19 compatible.
- **Profile page: single page with sections**: `/dashboard/profile` with vertically stacked card sections (Basic Info, Logistics, Portfolio), each with its own save. Shows completeness at a glance.
- **Artist profile created at registration**: Create an empty `artist_profiles` row during artist registration (in the same transaction) so it always exists.

## Tasks

### 1. Install Phase 2 dependencies
Add sharp, @dnd-kit, and additional shadcn/ui components needed for profile forms.

**Requirements:** Infrastructure

**Files:**
- `package.json` — add `sharp`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- shadcn components: `textarea`, `badge`, `separator`, `select`

**Approach:**
- `npm install --save-exact sharp @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- `npx shadcn@latest add textarea badge separator select`

**Verification:** `npm run build` succeeds
**Depends on:** none

### 2. Field registry
Define the typed constant array of toggleable profile fields.

**Requirements:** REQ-12

**Files:**
- `src/lib/db/field-registry.ts` — new: typed constant array defining all profile fields with key, label, section, data type, and whether required

**Approach:**
- Define a `FieldDefinition` interface: `{ key: string; label: string; section: "basic" | "logistics" | "portfolio"; type: "text" | "textarea" | "email" | "phone" | "number" | "url" | "images"; required: boolean }`
- Define `FIELD_REGISTRY` as `const` array of `FieldDefinition` entries for all fields: displayName, realName, contactEmail, phone, bio, websiteUrl, socialLinks, helpers, accessibilityNeeds, tableSizePreference, notes, portfolioImages
- Export type helpers: `FieldKey`, `FieldSection`

**Verification:** `npm run build` compiles
**Depends on:** none

### 3. Database schema: artist_profiles + portfolio_images + migration
Add the two new tables and update artist registration to create an empty artist_profiles row.

**Requirements:** REQ-2, REQ-3, REQ-5 (schema only)

**Files:**
- `src/lib/db/schema/artist-profiles.ts` — new: artist_profiles table (id, profileId FK unique, realName, contactEmail, phone, bio, websiteUrl, socialLinks, helpers, accessibilityNeeds, tableSizePreference, notes, createdAt, updatedAt)
- `src/lib/db/schema/portfolio-images.ts` — new: portfolio_images table (id, profileId FK, filename, storagePath, mimeType, width, height, sortOrder, createdAt)
- `src/lib/db/schema/index.ts` — modify: add exports for new tables
- `src/app/register/artist/actions.ts` — modify: add `artist_profiles` insert inside the registration transaction
- `__tests__/helpers/db.ts` — modify: add portfolio_images and artist_profiles to cleanDatabase, add helper to find artist profile

**Approach:**
- `artist_profiles`: all text fields nullable except profileId. `helpers` as integer (default 0). `socialLinks` as text (comma-separated or JSON string — keep simple, no JSONB needed yet)
- `portfolio_images`: sortOrder as integer, default 0. storagePath is the relative path within the storage adapter
- Generate migration with `npm run db:generate`, apply with `npm run db:migrate`
- Update artist registration: after creating the profile row, also insert an empty artist_profiles row with just the profileId
- Update cleanDatabase helper to delete portfolio_images and artist_profiles (before profiles, respecting FK order)

**Verification:** Migration applies cleanly; `npm test` passes (existing tests still work with the registration change); new tables visible in DB
**Depends on:** none

### 4. Validation schemas for profile forms
Define Zod schemas for basic info and logistics form submissions.

**Requirements:** REQ-4 (validation)

**Files:**
- `src/lib/validations/profile.ts` — new: basicInfoSchema, logisticsSchema, and inferred types

**Approach:**
- `basicInfoSchema`: displayName (min 1, required), realName (optional string), contactEmail (email format, required), phone (optional string), bio (optional string, max 2000 chars), websiteUrl (optional, url format or empty), socialLinks (optional string)
- `logisticsSchema`: helpers (number, 0-5), accessibilityNeeds (optional string), tableSizePreference (optional string), notes (optional string)
- Export types inferred from schemas

**Verification:** `npm run build` compiles
**Depends on:** none

### 5. Storage abstraction + image processing
Build the storage interface, local filesystem adapter, image processing utility, and static file serving route.

**Requirements:** REQ-6, REQ-11

**Files:**
- `src/lib/storage/types.ts` — new: `StorageAdapter` interface (upload, delete, getUrl)
- `src/lib/storage/local.ts` — new: `LocalStorageAdapter` implementing the interface, writes to `uploads/portfolios/{profileId}/{imageId}.webp`
- `src/lib/storage/index.ts` — new: export the active adapter instance (local for now)
- `src/lib/storage/image.ts` — new: `processImage(buffer)` → returns `{ data: Buffer, width: number, height: number, format: "webp" }`
- `src/app/api/uploads/[...path]/route.ts` — new: GET handler that serves files from the uploads directory (dev only)
- `.gitignore` — modify: add `uploads/` directory
- `__tests__/unit/lib/image-processing.test.ts` — new: test that processImage resizes and converts to WebP

**Approach:**
- StorageAdapter interface: `upload(key: string, data: Buffer, contentType: string): Promise<void>`, `delete(key: string): Promise<void>`, `getUrl(key: string): string`
- LocalStorageAdapter: uses `fs.mkdir` + `fs.writeFile` for upload, `fs.unlink` for delete, returns `/api/uploads/{key}` for getUrl
- processImage: use sharp to resize (fit inside 2048x2048, preserving aspect ratio), convert to webp with quality 80, return buffer + metadata
- Static file serving route: read file from `uploads/` directory, serve with correct content-type. Only needed for dev — R2 serves via CDN in production
- Test: create a small test image buffer, process it, verify output is WebP and dimensions are correct

**Verification:** `npm test` passes; can manually upload a file and retrieve it via the API route
**Depends on:** 1

### 6. Profile update server actions (basic info + logistics)
Build server actions for saving basic info and logistics sections.

**Requirements:** REQ-2, REQ-3, REQ-4

**Files:**
- `src/app/dashboard/profile/actions.ts` — new: `updateBasicInfo` and `updateLogistics` server actions
- `__tests__/integration/profile-update.test.ts` — new: tests for both actions

**Approach:**
- Both actions follow the established pattern: `(prevState: ActionState, formData: FormData) => Promise<ActionState>`
- Get session via `auth()`, verify user is artist, get profileId
- Parse formData with respective Zod schema
- `updateBasicInfo`: upsert artist_profiles row (update if exists, which it should since created at registration). Also update displayName on the profiles table since it lives there
- `updateLogistics`: update artist_profiles row with logistics fields
- Return `{ success: true }` pattern — extend ActionState to include a success flag for feedback
- Tests: create artist via registration helper, then call updateBasicInfo/updateLogistics, verify DB state

**Verification:** `npm test` passes
**Depends on:** 3, 4

### 7. Portfolio image upload API route
Build the upload endpoint that accepts images, processes them, and stores them.

**Requirements:** REQ-5, REQ-6, REQ-7

**Files:**
- `src/app/api/portfolio/route.ts` — new: POST handler for image upload, DELETE handler for image removal
- `__tests__/integration/portfolio-upload.test.ts` — new: test upload creates DB record and file on disk

**Approach:**
- POST: authenticate via `auth()`, verify artist role. Parse multipart FormData to get the file. Validate: file type (JPEG/PNG/WebP), file size (<10MB), current image count (<20). Call `processImage()` on the buffer. Call `storage.upload()` to store. Insert `portfolio_images` row with metadata. Return the new image record as JSON.
- DELETE: authenticate, verify ownership. Take imageId from request body or query param. Delete from storage via `storage.delete()`. Delete the DB row. Return success.
- Tests: mock storage adapter or use real local storage. Test happy path upload, file too large, wrong format, max count exceeded, delete.

**Verification:** `npm test` passes; manually uploading an image via curl creates the file and DB record
**Depends on:** 3, 5

### 8. Portfolio reorder API route
Build the endpoint to persist new image order after drag-and-drop.

**Requirements:** REQ-8

**Files:**
- `src/app/api/portfolio/reorder/route.ts` — new: PUT handler accepting an ordered array of image IDs

**Approach:**
- PUT: authenticate, verify artist role. Accept JSON body: `{ imageIds: string[] }`. Validate all IDs belong to this artist's profile. Update sortOrder for each image in a transaction (set sortOrder = array index). Return success.
- No separate test file — add reorder tests to `portfolio-upload.test.ts`

**Verification:** `npm test` passes
**Depends on:** 3

### 9. Basic info form component
Build the client-side form for editing basic profile information.

**Requirements:** REQ-1, REQ-2, REQ-4

**Files:**
- `src/components/profile/basic-info-form.tsx` — new: client component with form fields for all basic info, using useActionState
- `src/app/dashboard/profile/page.tsx` — new: server component that fetches current profile data and renders the form sections

**Approach:**
- Server component: call `auth()` to get session, query artist_profiles + profiles for current data, pass as defaultValues to form components
- BasicInfoForm: "use client", useActionState with updateBasicInfo action. Fields: displayName, realName, contactEmail, phone, bio (textarea), websiteUrl, socialLinks. Pre-fill with current values via defaultValue props. Show success message when action returns success. Follow existing aria patterns.
- Use shadcn Card for section wrapper, Input for text fields, Textarea for bio

**Verification:** `npm run build` succeeds; form renders at `/dashboard/profile`
**Depends on:** 6

### 10. Logistics form component
Build the client-side form for editing logistics information.

**Requirements:** REQ-1, REQ-3, REQ-4

**Files:**
- `src/components/profile/logistics-form.tsx` — new: client component with logistics fields

**Approach:**
- Same pattern as BasicInfoForm. Fields: helpers (number input or select, 0-5), accessibilityNeeds (textarea), tableSizePreference (text input), notes (textarea)
- Pre-fill with current values
- Add to the profile page below basic info section

**Verification:** `npm run build` succeeds; form renders at `/dashboard/profile`
**Depends on:** 6, 9 (page exists)

### 11. Portfolio management component
Build the image gallery with upload, reorder, and delete functionality.

**Requirements:** REQ-5, REQ-7, REQ-8, REQ-9

**Files:**
- `src/components/profile/portfolio-gallery.tsx` — new: client component with image grid, drag-to-reorder, upload zone, delete buttons
- `src/components/profile/image-upload-zone.tsx` — new: client component for drag-and-drop / file picker upload area

**Approach:**
- PortfolioGallery: receives current images as props. Renders a grid of image thumbnails. Each has a delete button (calls DELETE /api/portfolio). Uses @dnd-kit/sortable for drag-to-reorder — on drag end, call PUT /api/portfolio/reorder with new order, then optimistically update the UI.
- ImageUploadZone: file input with drag-and-drop area. On file select, validate client-side (type, size). POST to /api/portfolio with FormData. On success, append to gallery. Show loading state during upload. Show error for invalid files.
- Show count indicator: "X / 20 images". Disable upload when at 20.
- Add to profile page as the third section

**Verification:** `npm run build` succeeds; can upload, view, reorder, and delete images at `/dashboard/profile`
**Depends on:** 7, 8, 9 (page exists)

### 12. Profile completeness indicator
Build the completeness widget for the dashboard.

**Requirements:** REQ-10

**Files:**
- `src/components/profile/completeness-indicator.tsx` — new: server component showing per-section completion status
- `src/app/dashboard/page.tsx` — modify: add completeness indicator, link to profile page
- `src/lib/profile/completeness.ts` — new: function that computes completeness per section given profile data

**Approach:**
- `computeCompleteness(profile, artistProfile, imageCount)`: returns `{ basic: { complete: boolean, filled: number, total: number }, logistics: { complete: boolean, filled: number, total: number }, portfolio: { complete: boolean, hasImages: boolean, count: number } }`
- Basic info complete when: displayName (from profiles) and contactEmail (from artist_profiles) are filled
- Logistics complete when: at least helpers field is set (it has a default of 0, so it's always "set" — complete when any logistics field has been explicitly saved, tracked by checking if any non-default value exists)
- Portfolio complete when: at least 1 image uploaded
- CompletenessIndicator: renders three badges/cards with section name, status icon (check or warning), and "X/Y fields filled" text
- Dashboard page: query profile data, render indicator, add "Edit Profile" link

**Verification:** `npm run build` succeeds; dashboard shows completeness; indicator updates after saving profile data
**Depends on:** 3, 9

### 13. Tests for Phase 2
Write remaining tests for profile completeness logic, validation schemas, and integration tests.

**Requirements:** Infrastructure

**Files:**
- `__tests__/unit/lib/validations-profile.test.ts` — new: test basicInfoSchema and logisticsSchema
- `__tests__/unit/lib/completeness.test.ts` — new: test computeCompleteness with various profile states
- `__tests__/unit/lib/field-registry.test.ts` — new: test registry has all expected fields, sections are valid

**Approach:**
- Validation tests: valid inputs pass, required fields fail when empty, email format enforced, helpers range enforced
- Completeness tests: empty profile → all incomplete, filled required fields → basic complete, images exist → portfolio complete
- Field registry tests: all expected keys present, no duplicate keys, sections are valid enum values

**Verification:** `npm test` — all tests pass
**Depends on:** 2, 4, 12

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 | 9, 10, 11 |
| REQ-2 | 3, 4, 6, 9 |
| REQ-3 | 3, 4, 6, 10 |
| REQ-4 | 4, 6, 9, 10 |
| REQ-5 | 3, 7, 11 |
| REQ-6 | 5, 7 |
| REQ-7 | 7, 11 |
| REQ-8 | 8, 11 |
| REQ-9 | 7, 11 |
| REQ-10 | 12 |
| REQ-11 | 5 |
| REQ-12 | 2 |

## Risks

- **sharp in Next.js**: sharp sometimes has issues with Next.js bundling (native module). May need `serverExternalPackages: ["sharp"]` in next.config.ts. Will address during implementation if the build fails.
- **@dnd-kit with React 19**: @dnd-kit is tested with React 18. React 19 compatibility should be fine but may need version pinning if issues arise.
- **File upload size limits**: Next.js has a default body size limit for API routes (4MB). Need to configure `export const config = { api: { bodyParser: { sizeLimit: '12mb' } } }` or use the App Router equivalent to allow 10MB uploads.
