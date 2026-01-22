# Porter Design System

**Version:** 0.1.0
**Status:** Draft
**Last Updated:** January 21, 2026

---

## Principles

- **Platform-grade clarity:** crisp typography, deliberate spacing, subtle depth.
- **Quiet surfaces:** smoky neutrals, restrained borders, minimal noise.
- **Developer-first:** Inter for UI, JetBrains Mono for metrics, IDs, and logs.
- **Orange as signal:** Porter orange is the only strong accent. Avoid blues.

---

## Typography

- **UI font:** Inter
- **Mono font:** JetBrains Mono

## Iconography

- **Library:** Phosphor (via `phosphor-svelte`)
- **Default weight:** Bold
- **Guideline:** Use a single icon system across the app; avoid mixing libraries.
- **Scale (approx):**
  - Page title: 24 / 28 (semibold)
  - Section title: 18 / 24 (medium)
  - Body: 14 / 20
  - Subtle/Meta: 12 / 16
  - Micro labels: 11 / 14 (uppercase tracking)

---

## Color Tokens

Use CSS variables defined in `web/src/app.css`.

- **Surface:** `--background`, `--card`, `--popover`
- **Text:** `--foreground`, `--muted-foreground`
- **Borders:** `--border`, `--input`
- **Accent:** `--primary` (Porter orange)
- **Secondary:** `--secondary`, `--accent`
- **Status:** `--destructive`, `--status-success`, `--status-error`

---

## Layout + Spacing

- **Page max width:** 720px to 820px for settings/detail views.
- **Grid rhythm:** 24px section spacing, 12px intra-card spacing.
- **Use separators sparingly:** only between major sections.
- **Avoid deep nesting:** no more than two visual layers (page → card → content).

---

## Radius + Elevation

- **Cards:** rounded-2xl, subtle shadow (`0 1px 2px rgba(20,19,18,0.1)`).
- **Buttons/Inputs:** rounded-lg, minimal shadow.
- **Badges:** rounded-full, thin border.

---

## Component Guidelines

### Buttons

- **Primary:** solid orange, subtle shadow.
- **Secondary:** light surface, neutral text.
- **Ghost:** for low-emphasis actions.
- **Spacing:** consistent padding and icon sizing.

### Cards

- **Header:** small title + short description.
- **Content:** tighter vertical rhythm.
- **Avoid stacking cards inside cards** unless using an embedded/flat variant.

### Inputs

- **Height:** 40px
- **Focus:** 2px ring in primary color
- **Background:** slightly lifted from page background

### Badges

- **Small, neutral by default**
- **Use color only for status or primary signal**

### Tables

- **Header:** muted background + subtle border
- **Rows:** minimal separators, avoid zebra unless needed

### Modals

- **Single-layer surfaces:** avoid nested cards
- **Footer actions:** right-aligned primary + secondary

---

## Usage Rules

- Keep visual layers to 2 levels max.
- Prioritize spacing over borders for structure.
- Use orange only for primary actions or active signals.
- Default state should feel calm and neutral.
- Avoid stacked subtitles; use supporting text only when it prevents confusion.

---

## Quick Checklist

- [ ] Sections use consistent spacing and max width
- [ ] Cards have clear headers + restrained depth
- [ ] Buttons and inputs match sizing rules
- [ ] Badges are neutral unless status-driven
- [ ] No card-in-card stacks

---

**End of Design System**
