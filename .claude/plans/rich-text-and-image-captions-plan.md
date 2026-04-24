# Implementation Plan: Rich-text editing + portfolio image captions

Spec: `.claude/plans/rich-text-and-image-captions-spec.md`

## Technical Decisions

- **Rich-text editor: Tiptap.** `@tiptap/react` + `@tiptap/pm` + `@tiptap/starter-kit` + `@tiptap/extension-link` + `tiptap-markdown`. Chosen over MDXEditor / Lexical because it styles cleanly with Tailwind, has a clean extension model for our six-control toolbar, is proven on React 19, and serializes to Markdown via `tiptap-markdown`. Literal `{{ token }}` text is preserved verbatim in editor content.
- **Markdown renderer: `react-markdown` + `remark-gfm` + `rehype-sanitize`.** Server-renderable (RSC-safe) and outputs a React element tree (no raw-HTML injection pattern required). `rehype-sanitize` is configured with an explicit allowlist tied to our six formatting features. `remark-gfm` is included so pasted content with autolinks / strikethrough still renders sensibly.
- **Shared component surfaces:**
  - `src/components/ui/rich-text-editor.tsx` (client) — Tiptap wrapper. Default uncontrolled (writes serialized Markdown to a hidden `<textarea name={name}>` so FormData submission keeps working). Also exposes a controlled mode (`value` / `onChange`) for `ResponseTemplatesForm` which needs to drive the editor from an external "Copy from" dropdown.
  - `src/components/ui/markdown.tsx` (server-safe) — renders Markdown as React elements with shared Tailwind typography styling that matches today's `whitespace-pre-line text-sm leading-relaxed`.
- **Plain-text flatten helper: `src/lib/utils/markdown-to-text.ts`** — tiny regex-based stripper for our six-feature subset. Used by the public conventions list `line-clamp-3` teaser, and by the event-form `placeholder` that shows the convention-level acceptance/rejection default. No extra dep; fully unit-tested.
- **No data migration.** Existing plain-text values are valid Markdown and render identically. Historic `applications.responseMessage`, `applications.profileSnapshot.bio`, etc. need no DB rewrite.
- **Caption wiring.** `portfolio_images.caption` column already exists. Enable its input UI on all three portfolio sections; add `caption: string | null` to `SnapshotImage` (hand-written TS interface in `src/lib/db/schema/applications.ts`); extend the `applyToEvent` snapshot loop to copy the value; extend the organizer mapper and `PortfolioCollage` to surface it.

## Tasks

### 1. Install deps + shared Markdown renderer ✅

Adds the renderer stack and the shared RSC-safe `<Markdown>` component. This unblocks every read-side task.

**Requirements:** Infrastructure (enables REQ-3, REQ-4).

**Files:**
- `package.json` — add `react-markdown`, `remark-gfm`, `rehype-sanitize` at pinned versions (no `^` / `~` per STANDARDS.md).
- `src/components/ui/markdown.tsx` — new server-safe component. Props: `{ source: string; className?: string }`. Configures `rehype-sanitize` with an explicit schema that allows only `p`, `strong`, `em`, `h3`, `ul`, `ol`, `li`, `a` (with `href`, `target`, `rel`); `a` must force `target="_blank" rel="noopener noreferrer"`. Tailwind styling mirrors the current long-form treatment (`text-sm leading-relaxed` + spacing between blocks). When `source` is empty, renders nothing.
- `__tests__/components/markdown.test.tsx` — new jsdom test: renders bold/italic/h3/ul/ol/link correctly; sanitizes `<script>`; ignores disallowed tags (images, tables); plain text round-trips.

**Approach:**
- Build the rehype-sanitize schema by starting from `defaultSchema` and narrowing `tagNames` / `attributes` to our allowlist.
- Wrap the root in a `<div className="markdown …">` so consumers can override spacing contextually.
- Component is a plain function component — importable from both RSC and client components.

**Verification:** `npm test -- __tests__/components/markdown.test.tsx` passes. `npm run build` green.
**Depends on:** none.

### 2. Plain-text flatten helper ✅

Small, well-tested helper used by teasers and form placeholders.

**Requirements:** Infrastructure (enables REQ-3 teaser surfaces).

**Files:**
- `src/lib/utils/markdown-to-text.ts` — new. Exports `markdownToText(md: string): string`. Strips `**`, `__`, `*`, `_`, `### `, `## `, `# `, `- `, `1. `, `[text](url) → text`, and collapses whitespace. Empty string in → empty string out.
- `__tests__/unit/lib/utils/markdown-to-text.test.ts` — new. Cases: bold/italic/list items, heading, link, nested formatting, existing plain text unchanged, empty string.

**Approach:** Sequential regex replacements. Only needs to cover the six features the editor emits.

**Verification:** `npm test -- __tests__/unit/lib/utils/markdown-to-text.test.ts` passes.
**Depends on:** none.

### 3. Install Tiptap + shared rich-text editor ✅

Adds Tiptap and a single wrapper component that every form reuses.

**Requirements:** Infrastructure (enables REQ-1, REQ-2, REQ-4).

**Files:**
- `package.json` — pin `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `tiptap-markdown`.
- `src/components/ui/rich-text-editor.tsx` — new client component. Props:
  ```ts
  {
    name: string;                  // used on hidden <textarea name=...>
    defaultValue?: string;
    value?: string;                // controlled mode (optional)
    onChange?: (markdown: string) => void;
    placeholder?: string;
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
    disabled?: boolean;
  }
  ```
  Uses `StarterKit` with heading levels restricted to `[3]` and with `bulletList` + `orderedList` + `listItem` enabled; disables StarterKit defaults we don't want (blockquote, codeBlock, horizontalRule, strike, code). Adds `Link` extension with `openOnClick: false` and `autolink: true`. Adds `tiptap-markdown` extension configured for GFM-light (no tables, no task lists).
  Emits the serialized Markdown into a hidden `<textarea name={name} defaultValue={…}>` that `<form action={…}>` / FormData can pick up. The hidden textarea is updated on every editor transaction.
  Toolbar: Bold, Italic, H3, Bullet list, Ordered list, Link (opens a small inline popover for URL). Styling matches the current Textarea visual tokens (`rounded-lg border-0 bg-secondary px-3 py-2 min-h-20 …`) on the wrapping container; toolbar sits above the content area.
  Keyboard shortcuts from StarterKit (Ctrl/Cmd+B, I) are preserved; literal `{{ token }}` typed by the user is inserted as a plain-text node with no formatting.
- `__tests__/components/rich-text-editor.test.tsx` — new jsdom test:
  - Renders an editor with a default value and confirms the hidden textarea contains the same Markdown.
  - Typing bold via the toolbar updates the hidden textarea to include `**`.
  - In controlled mode, `value="### foo"` maps `onChange` calls back with Markdown when content changes.
  - Literal `{{ artist_name }}` typed in the editor survives a round-trip (content stays `{{ artist_name }}`).

**Approach:**
- Use `useEditor({ content: defaultValue ?? value, onUpdate: ({ editor }) => sync() })`.
- `sync()` reads `editor.storage.markdown.getMarkdown()`, writes to the hidden textarea's `value`, and calls `onChange` if provided.
- In controlled mode (`value` prop present), react to external `value` changes via `useEffect` and call `editor.commands.setContent(value)` only when it differs from `editor.storage.markdown.getMarkdown()` (to avoid cursor jumps).
- Toolbar: a flex row of buttons with `aria-pressed={editor.isActive('bold')}` etc.

**Verification:** `npm test -- __tests__/components/rich-text-editor.test.tsx` passes. `npm run build` green.
**Depends on:** 1 (renderer isn't imported by the editor, but we want a consistent commit order).

### 4. Wire rich-text editor into ConventionProfileForm ✅

Swap four `<Textarea>`s for `<RichTextEditor>` in the convention-info form.

**Requirements:** REQ-1, REQ-2 (convention side).

**Files:**
- `src/components/conventions/convention-profile-form.tsx` — replace the `<Textarea>`s for `description`, `guidelines`, `acceptanceMessage`, `rejectionMessage` with `<RichTextEditor name=… defaultValue=… id=… aria-describedby=… aria-invalid=…>`. Existing `<Label htmlFor="…">` pairing + error markup stays. The form remount key (`key={JSON.stringify(defaultValues)}`) still drives re-initialization.
- `__tests__/components/convention-profile-form.test.tsx` — new. Mount the form, confirm the four target fields render the rich-text editor (look for toolbar role or hidden textarea), confirm the hidden textarea retains the Markdown from `defaultValues`, confirm submit path still carries the Markdown via FormData.

**Approach:**
- No server-side change — `conventionProfileSchema` already caps byte length via `.max()` on the same strings. Markdown syntax is counted in the cap; that's fine.
- Field errors already surface per-field from server action state; wire `aria-invalid` from `state.fieldErrors?.X` onto the editor.

**Verification:** `npm run build` green; new component test passes; manual edit of a convention description shows the toolbar, saves, and re-renders on reload.
**Depends on:** 3.

### 5. Wire rich-text editor into EventForm

Swap `description`, `guidelinesOverride`, `acceptanceMessage`, `rejectionMessage`. **`priceInfo` stays a plain `<Textarea>`**.

**Requirements:** REQ-1, REQ-2 (event side).

**Files:**
- `src/components/conventions/event-form.tsx` — same swap pattern as task 4 for the four fields listed. Keep the inline `<FieldError />` markup. `priceInfo` is untouched.
- `__tests__/components/event-form.test.tsx` — new or extend existing. Verify only four fields show the toolbar; `priceInfo` still renders a plain textarea.

**Approach:** Event-form placeholders that fall back to the convention-level acceptance/rejection are handled in task 10 (need the flatten helper).

**Verification:** Component test passes; `npm run build` green; manual: create an event, use formatting on guidelines, save, reopen — round-trips.
**Depends on:** 3.

### 6. Wire rich-text editor into ResponseTemplatesForm (controlled mode)

This form uses a "Copy from convention default" dropdown that overwrites the textarea content, so the editor must be driven controlled.

**Requirements:** REQ-1, REQ-2.

**Files:**
- `src/components/conventions/response-templates-form.tsx` — replace the two `<Textarea>`s with `<RichTextEditor value={acceptance} onChange={setAcceptance} name="acceptanceMessage" …>` and the rejection counterpart. The existing `useState` lives remain the source of truth; the "Copy from" dropdown still works by calling the setters.
- `__tests__/components/response-templates-form.test.tsx` — extend (or create). Confirm: (a) editor is controlled — changing `acceptance` state externally updates the rendered content; (b) Copy-from-convention pre-fills content; (c) toolbar is visible.

**Approach:**
- In the editor's controlled-mode `useEffect`, diff incoming `value` against `editor.storage.markdown.getMarkdown()` before calling `setContent` to avoid cursor jumps while the user types.
- Form's `action` submission stays untouched — server reads raw `formData.get(...)`.

**Verification:** Component test passes; manual: open applications page, switch between event override and "Copy from convention default", typing works without cursor jumps.
**Depends on:** 3.

### 7. Wire rich-text editor into BasicInfoForm

Single field: `bio`.

**Requirements:** REQ-1, REQ-2 (artist side — bio).

**Files:**
- `src/components/profile/basic-info-form.tsx` — swap the one `<Textarea name="bio">` for `<RichTextEditor name="bio" defaultValue={defaultValues.bio} …>`. Keep label + aria wiring.
- `__tests__/components/basic-info-form.test.tsx` — new or extend. Confirm toolbar renders, hidden textarea carries the default Markdown.

**Approach:** Same shape as task 4.

**Verification:** Component test passes; `npm run build` green.
**Depends on:** 3.

### 8. Wire rich-text editor into LogisticsForm

Two fields: `accessibilityNeeds`, `notes`.

**Requirements:** REQ-1, REQ-2 (artist side — accessibility + notes).

**Files:**
- `src/components/profile/logistics-form.tsx` — swap the two `<Textarea>`s for `<RichTextEditor>`s, preserving labels and any aria wiring.
- `__tests__/components/logistics-form.test.tsx` — new or extend.

**Approach:** Same shape as task 4.

**Verification:** Component test passes; `npm run build` green.
**Depends on:** 3.

### 9. Render Markdown on public convention surfaces

Make the public convention page + the convention list teaser show formatted output.

**Requirements:** REQ-3.

**Files:**
- `src/app/(public)/conventions/[conventionId]/page.tsx:139` — replace the `<p className="whitespace-pre-line …">{description}</p>` block with `<Markdown source={description} className="…">`.
- `src/app/(public)/conventions/page.tsx:69` — teaser card. Replace the plain description rendering with `markdownToText(description)` piped through `line-clamp-3` so truncation still works.

**Approach:** No schema or server change; purely presentational swap.

**Verification:** Manual smoke: write bold/list/link in a convention description, visit public convention page — rendered. Visit conventions list — teaser shows stripped plain text.
**Depends on:** 1, 2.

### 10. Render Markdown on the public event page + event-form placeholders

Covers "About this event", "About the convention", and — importantly — the event-form's `placeholder` that currently shows the convention-level default acceptance/rejection.

**Requirements:** REQ-3.

**Files:**
- `src/app/(public)/events/[eventId]/page.tsx` — at the `whitespace-pre-line` sites for event description (`:300`), about-convention (`:390`), and any guidelines block that currently renders plain text: replace with `<Markdown source=… />`. Do **not** touch the applicant-facing `responseMessage` here — that's task 12.
- `src/components/conventions/event-form.tsx` — at the two `placeholder={conventionAcceptanceMessage}` and `placeholder={conventionRejectionMessage}` sites (around :521 and :542), pipe the value through `markdownToText(…)`. Placeholders are plain-text only; this keeps them readable when the default becomes formatted Markdown.

**Approach:** Pure rendering swap; teaser gets the flatten helper.

**Verification:** Manual: create an event with a bolded description; public event page shows bold. Convention editor → set a default acceptance message with bullets → event editor placeholder shows a clean single-line plain-text preview.
**Depends on:** 1, 2.

### 11. Render Markdown in the apply dialog guidelines block

**Requirements:** REQ-3.

**Files:**
- `src/components/events/application-form.tsx:183` — replace the plain-text guidelines block with `<Markdown source={guidelines} />`.

**Verification:** Manual: set convention guidelines with lists, open the apply dialog, guidelines render formatted.
**Depends on:** 1.

### 12. Render Markdown in the applicant-facing acceptance/rejection message

After publish, applicants see their own response message on the event page. That string is already the substituted-and-rendered template; now it needs to render as Markdown.

**Requirements:** REQ-3, REQ-4.

**Files:**
- `src/app/(public)/events/[eventId]/page.tsx:412` — replace the `whitespace-pre-line` render of `ownResponseMessage` with `<Markdown source={ownResponseMessage} />`.

**Approach:**
- No change to `publishResults` is required: `renderTemplate` continues to run regex `{{ token }}` substitution on the raw Markdown source before storing. The resulting Markdown + substituted values is stored in `applications.responseMessage` and then rendered as Markdown on display.
- Verify manually that a template like `Hi **{{ artist_name }}**, welcome to Kawaiicon.` produces `Hi **Elena**, welcome to Kawaiicon.` in `responseMessage`, which the Markdown renderer then shows as bold.

**Verification:** Integration test to extend: `__tests__/integration/publish-results.test.ts` — add a case that writes a template with `**{{ artist_name }}**`, publishes, and asserts the stored `responseMessage` contains `**Elena**`. Manual smoke confirms on-page render.
**Depends on:** 1.

### 13. Render Markdown in organizer deep-review

Bio + accessibility-needs are shown to organizers from `profileSnapshot`.

**Requirements:** REQ-3.

**Files:**
- `src/components/conventions/selection/deep-review-layout.tsx:250` — Statement cell (bio) → `<Markdown source={bio} />`.
- `src/components/conventions/selection/deep-review-layout.tsx:280` — Accessibility full-text block → `<Markdown source={accessibilityNeeds} />`. (Line :269 is a "Noted"/"—" summary and stays as-is.)

**Approach:** Purely presentational. Historic plain-text snapshots render identically (plain text is valid Markdown).

**Verification:** Existing `__tests__/components/deep-review-layout.test.tsx` must still pass; extend it to assert that formatted content renders with `<strong>` / `<ul>` as expected.
**Depends on:** 1.

### 14. Extend the application image snapshot with `caption`

Data-contract change that makes captions available to every consumer of `profileSnapshot.images`.

**Requirements:** REQ-6 (data path).

**Files:**
- `src/lib/db/schema/applications.ts:23` — add `caption: string | null` to the `SnapshotImage` interface.
- `src/app/(public)/events/[eventId]/actions.ts:202` — in the snapshot build loop, include `caption: image.caption ?? null` in the pushed entry. Ensure the upstream `images` query selects the `caption` column (update the Drizzle select there if the current select doesn't include it).
- `src/app/(authenticated)/conventions/manage/events/[eventId]/applications/page.tsx:70` — extend the mapper output with `caption: image.caption ?? null`.
- `src/components/conventions/selection/types.ts` — add `caption: string | null` to the `SelectionApplicantView.images[number]` shape.
- `__tests__/integration/apply-to-event.test.ts` — extend (or create) to assert that after applying with a captioned image, `profileSnapshot.images[0].caption` equals the source caption.

**Approach:** Historic snapshots without `caption` deserialize as `undefined`; treat any read as `caption ?? null`. No DB migration.

**Verification:** Integration test passes. No new columns required; `npm run db:generate` should show no schema drift.
**Depends on:** none (parallelizable with tasks 1–13).

### 15. Enable caption input on Promo + Products portfolio sections

Flip the existing `allowCaption` wiring.

**Requirements:** REQ-5.

**Files:**
- `src/app/(authenticated)/dashboard/profile/page.tsx` — at the two `<PortfolioGallery>` calls for `promo` (~:127) and `product` (~:151), add `allowCaption`. Keep the existing placeholder pattern (or tune copy per section).
- `__tests__/components/portfolio-gallery.test.tsx` — new. With `allowCaption`, the caption `<Input>` renders; blurring calls the PATCH handler (mock `fetch`); without `allowCaption`, no input renders.

**Approach:** The PATCH handler at `src/app/api/portfolio/route.ts:183` already accepts `{ imageId, caption }`, clamps to 280 chars, and checks ownership. No server change needed.

**Verification:** Component test passes; manual: add a caption to a Promo image, reload, caption persists.
**Depends on:** none (independent of rich-text stream).

### 16. Surface captions to organizers in PortfolioCollage

Render the caption beneath each image tile and use it as accessible `alt` when present.

**Requirements:** REQ-6 (UI path).

**Files:**
- `src/components/conventions/selection/portfolio-collage.tsx` — extend `PortfolioCollageProps.images` to `{ id: string; url: string; caption?: string | null }`. Beneath each tile, render a small `<figcaption>` (or `<p>`) when a caption is present. When `caption` is present, compute `alt={caption}`; otherwise fall back to today's positional `Portfolio image N from {displayName}`.
- `src/components/conventions/selection/gallery-layout.tsx`, `deep-review-layout.tsx`, `table-layout.tsx` — pass the `caption` through when mapping the images array for the collage.
- `__tests__/components/deep-review-layout.test.tsx`, `gallery-layout.test.tsx`, `table-layout.test.tsx` — extend to assert that when an image has a caption, (a) the caption text is in the DOM, (b) the image's `alt` is the caption.

**Approach:** Keep the caption visually restrained (small muted text). Truncate to one or two lines via Tailwind `line-clamp-2` — full text is available to screen readers via `alt`.

**Verification:** Extended component tests pass. Manual: organizer deep-review shows captions beneath tiles.
**Depends on:** 14 (needs the snapshot + mapper carrying `caption`), 15 (optional — a caption can be set directly via the DB for manual testing but in normal use the artist sets it first).

## Requirements Coverage

| Requirement | Task(s) |
|---|---|
| REQ-1 (rich-text toolbar) | 3, 4, 5, 6, 7, 8 |
| REQ-2 (ten target fields) | 4, 5, 6, 7, 8 |
| REQ-3 (read-side rendering) | 1, 2, 9, 10, 11, 12, 13 |
| REQ-4 (templates still work) | 3, 12 |
| REQ-5 (caption input on all 3 sections) | 15 |
| REQ-6 (captions in snapshot + organizer view) | 14, 16 |

## Risks

- **Tiptap schema ↔ sanitize allowlist drift.** The editor can only emit what `StarterKit` + our extensions produce, but pasted HTML can introduce surprises. `rehype-sanitize` is the backstop — keep the allowlist tight and add a test case for pasted `<script>` / `<img>` / `<iframe>` content being stripped.
- **Controlled editor cursor jumps in `ResponseTemplatesForm`.** Naïvely calling `editor.commands.setContent(value)` on every parent render will wipe the cursor. The diff-before-setContent guard in task 3 is the mitigation — cover it with a test.
- **Historic `profileSnapshot.images` entries lack `caption`.** Consumers must default to `null`. The mapper and `PortfolioCollage` handle this by treating `caption?: null | undefined` uniformly.
- **`rehype-sanitize` schema mistakes.** The allowlist is the security boundary. Require tests for each disallowed element being stripped before task 1 is considered done.
- **Bundle size.** Tiptap + StarterKit + markdown serializer adds ~100-140KB gzipped to any client route that uses the editor. All five form pages are authenticated and not performance-critical, so acceptable — but avoid pulling the editor into RSC-rendered read surfaces. Keep `src/components/ui/markdown.tsx` strictly RSC-compatible (no client imports).
- **`tiptap-markdown` maintenance.** It's a community package. If abandoned or broken on React 19, fallbacks are the official `@tiptap/extension-markdown` (if available) or a custom `remark`-based serializer using ProseMirror's `Node.toJSON`. Not expected to bite us now.
