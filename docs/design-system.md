# Design System Strategy: The Curated Canvas

## 1. Overview & Creative North Star
**Creative North Star: "Conaro"**

This design system is built on the tension between the "Strict Gallery" and the "Expressive Artist." We are moving away from the generic, template-driven look of standard application forms. Instead, we treat the artist's application process as an exhibition in itself.

The aesthetic is **High-End Editorial**: a blend of rigid Swiss-style grid layouts and bold, electric interventions. We achieve a "premium" feel not through complex textures, but through extreme intentionality in whitespace, asymmetric balance, and a "tonal-first" approach to depth. We are the curator in colorful sneakers—authoritative and organized, but with an unmistakable pulse of creativity.

---

## 2. Colors & Tonal Architecture
The palette is rooted in a sophisticated neutral base to let the artwork (and our primary accent) breathe.

### Color Tokens (Material Reference)
*   **Background:** `#f9f5f8` (A warm, gallery-off-white)
*   **Primary (Electric Violet):** `#6a37d4`
*   **On-Primary (Text on Violet):** `#f8f0ff`
*   **Surface Hierarchy:**
    *   `surface-container-lowest`: `#ffffff` (Pure white for primary cards)
    *   `surface-container-low`: `#f3f0f3`
    *   `surface-container-high`: `#e5e1e5`
*   **Status Tones:**
    *   **Success:** `#b41340` (Note: Using Tertiary/Error tokens for semantic feedback as defined in the scale).

### The "No-Line" Rule
To maintain an editorial feel, **1px solid borders are prohibited for sectioning.** We do not "box" content. Instead, boundaries must be defined through background color shifts. A section should be distinguished by moving from `surface` to `surface-container-low`. This creates a seamless, modern flow that feels designed rather than engineered.

### Glass & Gradient Signature
While the system is "clean," we avoid "flat." 
*   **Primary CTAs:** Use a subtle vertical gradient from `primary` (#6a37d4) to `primary-dim` (#5e26c7). 
*   **Floating Elements:** For navigation bars or sticky headers, use Glassmorphism. Apply `surface` at 80% opacity with a `20px` backdrop-blur. This ensures the "curator’s sneakers" vibe—technical but flashy.

---

## 3. Typography
We use a high-contrast pairing to establish a clear editorial hierarchy.

*   **Display & Headlines (Manrope):** These are our "Statement Pieces." Use `display-lg` (3.5rem) for hero sections and `headline-lg` (2rem) for section starts. The weight should be Bold or Extra Bold to anchor the page.
*   **Body & Titles (Inter/Geist):** For functional data, we switch to a high-legibility sans-serif. Use `body-md` (0.875rem) for standard text. 
*   **The Curator's Note:** Use `label-sm` (0.6875rem) in All Caps with increased letter-spacing (+0.05em) for category labels or "over-line" text to mimic gallery wall plaques.

---

## 4. Elevation & Depth
Depth in this system is achieved through **Tonal Layering**, not structural scaffolding.

*   **The Layering Principle:** Treat the UI as stacked sheets of fine paper. 
    *   *Base:* `surface`
    *   *Section:* `surface-container-low`
    *   *Interactive Card:* `surface-container-lowest` (White)
*   **Ambient Shadows:** For floating modals or "active" cards, use a large-spread, ultra-soft shadow. 
    *   *Specs:* `0 20px 40px rgba(9, 9, 11, 0.04)`. 
    *   The shadow should never look "black"; it should feel like a soft ambient occlusion.
*   **The "Ghost Border":** If a border is required for input fields or accessibility, use the `outline-variant` token at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary:** Rounded (10px), Electric Violet gradient, `title-sm` typography. 
*   **Secondary:** Ghost style. No background, `outline-variant` ghost border (20% opacity), text in `primary`.
*   **Sizing:** Generous padding (1rem top/bottom, 2rem sides) to ensure the sneakers have room to move.

### Cards & Application Containers
*   **Constraint:** No dividers. 
*   **Implementation:** Use vertical whitespace (48px - 64px) to separate content blocks. 
*   **Hover State:** Shift the background from `surface-container-lowest` to `surface-bright` and apply the Ambient Shadow.

### Input Fields
*   **Visual Style:** Subtle `surface-container-low` fill. 
*   **Focus State:** A 2px solid `primary` (Electric Violet) ring with a 4px offset. This is the "Pop" in our strict grid.

### Status Badges
*   **Success/Pending/Rejected:** Use the container tokens (e.g., `tertiary-container` for rejection). Text must be the "On-Container" variant for high-contrast accessibility. Badges are Pill-shaped (9999px radius).

### Minimalist Illustrations
*   **Guideline:** Line-art only (1pt stroke weight). Use the `outline` color token. Illustrations should be "tucked" into corners or used as subtle watermarks to avoid distracting from the artist's own work.

---

## 6. Do's and Don'ts

### Do
*   **Embrace the Void:** Use more whitespace than you think you need. High-end galleries are never crowded.
*   **Align to the Grid:** Ensure all elements—especially minimalist icons—are snapped to a strict 8px baseline grid.
*   **Use Tonal Shifts:** If content feels cluttered, change the background color of the container instead of adding a line.

### Don't
*   **Don't Use Pure Black Shadows:** It kills the "Gallery" sophistication. Always tint shadows with the `on-surface` color.
*   **Don't Use Default shadcn/ui Borders:** Always override the `border` class to use our "Ghost Border" or Tonal Layering.
*   **Don't Centeralize Everything:** Use intentional asymmetry. Left-align heavy headers and offset them with generous right-side margins for an editorial look.
