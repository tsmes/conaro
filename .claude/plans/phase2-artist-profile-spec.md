# Phase 2: Artist Profile

## Problem Statement

Artists need to maintain a profile with their information and portfolio so they can apply to conventions without re-entering data each time. Phase 1 created accounts with only a display name. Phase 2 adds the full profile editing experience: basic info (name, bio, contact details), logistics info (helpers, accessibility, table preferences), portfolio image management (upload, reorder, delete with server-side processing), and a completeness indicator so artists know what's still missing.

## Requirements

- **[REQ-1]** Artist profile page at `/dashboard/profile` with sectioned editing for basic info, logistics, and portfolio
- **[REQ-2]** Basic info fields: display name (required), real name, contact email (required, separate from account email), phone number, bio/description, website/social links
- **[REQ-3]** Logistics info fields: number of helpers (0–5), accessibility needs (free text), table size preference, additional notes
- **[REQ-4]** All profile fields save on form submission with success feedback. Validation on required fields (display name, contact email)
- **[REQ-5]** Portfolio image upload: up to 20 images, accepted formats JPEG/PNG/WebP, max 10 MB per file. Drag-and-drop or file picker
- **[REQ-6]** Uploaded images are processed server-side: resized to max 2048px longest edge, compressed to ~80% quality WebP, then stored
- **[REQ-7]** Image preview displayed after upload. Gallery view of all portfolio images
- **[REQ-8]** Ability to reorder portfolio images via drag-and-drop sorting
- **[REQ-9]** Ability to delete individual portfolio images. Deletion removes the file from storage immediately
- **[REQ-10]** Profile completeness indicator on the dashboard showing status per section (basic info, logistics, portfolio). Incomplete sections are visually distinct
- **[REQ-11]** Image storage uses a local filesystem adapter in development, behind an abstraction that can be swapped to R2 later
- **[REQ-12]** Field registry: a typed constant array in `lib/db/field-registry.ts` defining the set of toggleable profile fields. Each field has a key, label, section (basic/logistics/portfolio), and data type. This registry is the source of truth for what fields exist — used by the profile form and later by event field configuration (Phase 3)

## Scope

### In Scope

- Artist profile schema extension (new columns for all profile fields)
- Portfolio images table and storage abstraction (local filesystem)
- Server-side image processing with sharp (resize + compress to WebP)
- Profile editing forms (basic info section, logistics section)
- Portfolio image management (upload, preview, reorder, delete)
- Profile completeness indicator on the dashboard
- Field registry as a typed constant array
- Zod validation schemas for profile forms
- Tests for profile actions, validation schemas, and image processing

### Out of Scope

- Cloudflare R2 integration (local filesystem adapter only — R2 swap is a future task)
- Client-side image pre-compression with `browser-image-compression` (defer until R2 integration when upload bandwidth matters more)
- Portfolio lightbox/fullscreen viewing (that's for organizer review in Phase 5)
- Event field configuration using the registry (Phase 3)
- Profile visibility to organizers (Phase 4 — application snapshots)
- City/region field

## Acceptance Criteria

- [ ] `/dashboard/profile` page loads with three sections: basic info, logistics, portfolio
- [ ] Editing basic info (display name, real name, contact email, phone, bio, website/social links) and saving persists to database
- [ ] Display name and contact email are validated as required; saving without them shows errors
- [ ] Success feedback is shown after saving profile changes
- [ ] Editing logistics info (helpers 0–5, accessibility needs, table size preference, notes) and saving persists to database
- [ ] Uploading a JPEG, PNG, or WebP image under 10 MB succeeds and shows a preview in the gallery
- [ ] Uploaded images are resized to max 2048px longest edge and converted to WebP at ~80% quality
- [ ] Uploading a file over 10 MB or in a non-supported format shows an error
- [ ] Cannot upload more than 20 images total; attempting to shows an error
- [ ] Images can be reordered by dragging and the new order persists
- [ ] Deleting an image removes it from the gallery and from disk storage
- [ ] Profile completeness indicator on dashboard shows status for each section (basic info, logistics, portfolio)
- [ ] Incomplete sections show a visually distinct indicator (e.g., warning badge)
- [ ] A section with all required fields filled shows as complete
- [ ] Field registry exists at `lib/db/field-registry.ts` with entries for all profile fields
- [ ] TypeScript compiles with no errors (`npm run build` succeeds)
- [ ] ESLint passes with no errors
- [ ] All new tests pass (`npm test`)
