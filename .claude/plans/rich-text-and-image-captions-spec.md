# Rich-text editing + portfolio image captions

## Problem Statement
Long-form text in Conaro — convention / event descriptions, guidelines, acceptance & rejection messages, and artist profile prose — is stored and rendered as unstructured plain text. That produces flat walls of text for content where structure matters most (multi-paragraph guidelines, acceptance messages with a follow-up checklist, artist bios). Additionally, artists upload portfolio images with no way to label them, so organizers reviewing applications have no context for what each image shows.

## Requirements
- **REQ-1** Ten long-form text fields gain a compact WYSIWYG toolbar with **bold, italic, bulleted list, numbered list, link, and H3 heading**. Content is stored as Markdown.
- **REQ-2** Affected fields:
  - Convention Info — Description, Guidelines, Default Acceptance Message, Default Rejection Message
  - Event editor — Description, Guidelines (override), Acceptance Message, Rejection Message
  - Artist profile — Bio / Description, Accessibility Needs, Additional Notes
  - *(`Event → Price Info` stays plain — see Out of Scope.)*
- **REQ-3** Every read-side surface that displays these fields renders the stored Markdown as formatted HTML. Existing plain-text values render correctly without migration.
- **REQ-4** Acceptance / rejection message templates continue to support `{{ artist_name }}`, `{{ event_name }}`, etc. Tokens are preserved through rich-text editing and substituted at publish time on the raw Markdown source, before the applicant-facing page renders the result.
- **REQ-5** Every portfolio image (across Promo, Products, and Previous Stands) can have a **short plain-text caption** added or edited by the artist. Captions save to the existing `portfolio_images.caption` column.
- **REQ-6** Captions are included in the per-application image snapshot, and every organizer-facing portfolio display (Gallery, Table, Deep review) shows the caption beneath its image. When present, the caption is also used as the image's accessible `alt` text.

## Scope

### In Scope
- WYSIWYG toolbar editor on the 10 listed fields, across 3 forms.
- Markdown rendering in every read-side surface for those fields (public convention page, public event page "About the event" / "About the convention", apply dialog guidelines, post-publish acceptance/rejection message display, organizer deep-review "Statement" cell).
- Per-image caption input on all three portfolio sections with save-on-blur.
- Caption persisted to the `applications.profileSnapshot.images` shape.
- Caption rendered beneath its tile in the Gallery, Table, and Deep review layouts.
- Caption used as accessible `alt` text when present.

### Out of Scope
- Images, tables, code blocks, blockquotes, colors, custom fonts in the editor.
- Rich-text formatting of captions themselves (captions stay plain, short).
- Rich text on `Event → Price Info` (inline display — rich-text controls would break layout).
- Email formatting — acceptance/rejection messages are in-app only today; no change.
- Migration of historic data — existing plain-text values render as-is under the Markdown renderer.
- Changing existing character limits on any of the 10 fields.

## Acceptance Criteria

### Rich-text editing
- [ ] Convention Info form: each of the four affected fields shows the toolbar and persists Markdown to its column.
- [ ] Event editor: each of the four affected fields shows the toolbar and persists Markdown.
- [ ] Artist profile: each of the three affected fields shows the toolbar and persists Markdown.
- [ ] Typing each toolbar control (bold, italic, H3, bulleted list, numbered list, link) in any affected field round-trips correctly when the form is reloaded.
- [ ] `Event → Price Info` remains a plain textarea.

### Read-side rendering
- [ ] Public convention page renders the convention description as formatted Markdown.
- [ ] Public event page renders event description, "About the convention", and guidelines as formatted Markdown.
- [ ] The apply dialog's guidelines block renders as formatted Markdown.
- [ ] The applicant-facing acceptance/rejection message (post-publish) renders as formatted Markdown with placeholders substituted.
- [ ] The organizer deep-review "Statement" cell renders the artist's bio as formatted Markdown.
- [ ] Pre-existing plain-text values in any of these fields render with no visible glitches.

### Template placeholders
- [ ] An acceptance message of `Hi **{{ artist_name }}**, welcome to Kawaiicon.` published against applicant "Elena" renders as "Hi **Elena**, welcome to Kawaiicon." with bold applied on the artist's event page.

### Image captions
- [ ] Artist can add / edit a caption on any image in Promo, Products, or Previous Stands. Captions save on blur and persist across reloads.
- [ ] After applying, organizers see the caption beneath each portfolio image in Gallery, Table, and Deep review layouts.
- [ ] When a caption is present, a screen reader announces it as the image's accessible name.

## Constraints
- React 19 + Next 16 + Tailwind 4. No rich-text / markdown / sanitizer deps exist yet — the implementation plan picks the library.
- `applications.profileSnapshot` JSONB is the invariant per `STANDARDS.md` — adding `caption` to `SnapshotImage` means updating the snapshot build in `applyToEvent` and the organizer-side mapper.
- Rich-text rendering must produce sanitized HTML (user-generated content from both artists and organizers will be rendered to other users).
