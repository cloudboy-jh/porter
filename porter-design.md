# Porter Design Audit

Date: 2026-02-06
Audited directory: `PORTER-Feb/`
Target use: Astro content site handoff (`portercontent`)

## Scope and Method

This audit covers visual and UX patterns currently implemented in the repo, then translates them into practical guidance for an Astro documentation/content site.

Primary sources reviewed:

- Global styling and tokens: `web/src/app.css`, `web/src/shadcn.css`
- Layout shell and navigation: `web/src/routes/+layout.svelte`, `web/src/lib/components/AppSidebar.svelte`
- Core pages: `web/src/routes/+page.svelte`, `web/src/routes/history/+page.svelte`, `web/src/routes/settings/+page.svelte`, `web/src/routes/review/+page.svelte`, `web/src/routes/review/[taskId]/+page.svelte`, `web/src/routes/account/+page.svelte`, `web/src/routes/auth/+page.svelte`
- Reusable UI: `web/src/lib/components/ui/*`, `web/src/lib/components/TaskFeed.svelte`, `web/src/lib/components/CommandBar.svelte`
- Existing docs and design intent: `project-mds/porter-design-system.md`, `project-mds/astro-docs.md`, `README.md`

Note: there are no Astro component/page files in this directory. The current implementation is SvelteKit, so this audit derives design direction from existing UI and docs content.

## Current Design Language (What Exists)

### Brand and Visual Identity

- Strong identity around warm neutrals and orange accent (`--primary: #fb923c`) in `web/src/app.css`.
- Visual tone is "quiet platform": soft borders, low-contrast neutrals, restrained shadows.
- Consistent pill/capsule micro-label style (uppercase, wide tracking) across pages.
- Good use of "calm by default, highlight on action" for status and key controls.

### Typography

- Primary typeface is Inter; mono is JetBrains Mono (`web/src/routes/+layout.svelte`, `web/src/app.css`).
- Clear hierarchy at component level, but many micro labels are very small (`0.55rem`-`0.68rem`) and can reduce readability on mobile.

### Color and Theming

- Light/dark token pairs are defined and generally coherent (`web/src/app.css`).
- Theme token architecture is duplicated between `app.css` and `shadcn.css` and not fully aligned (hex palette vs generic oklch defaults).
- Auth route uses hardcoded colors outside token system (`web/src/routes/auth/+page.svelte`, `web/src/lib/components/SignInForm.svelte`).

### Components and Surfaces

- Core primitives (button, card, input, badge) are stylistically consistent and production-ready.
- Card system is used well to segment dense operational content.
- Timeline treatment in `TaskFeed.svelte` is distinctive and brandable.
- Dialog/sheet patterns are reused heavily, reducing UI fragmentation.

### Layout and Responsiveness

- App shell (sidebar + inset) is structured and consistent.
- Several desktop-first grids/table-like layouts likely overflow or compress on small screens (notably history list row grids and settings dashboard matrix).
- Scroll handling is controlled but occasionally hidden (`.hide-scrollbar`), which can reduce affordance.

## Strengths to Preserve for Astro

1. Warm neutral + orange palette with low-noise surfaces.
2. Mono for metadata, Inter for narrative UI/body.
3. Compact but elegant card language with restrained shadow.
4. Uppercase micro-label system for section framing.
5. Distinctive timeline/ops visual motif (good hero motif candidate for docs).

## Gaps and Risks (Priority Order)

### P0 - Design System Drift

- Two token systems coexist (`app.css` and `shadcn.css`) with overlapping variable names and different values.
- Impact: hard to guarantee visual consistency and harder to port cleanly to Astro.
- Recommendation: define a single canonical token source (brand tokens + semantic aliases) and generate framework-specific mappings from it.

### P0 - Token Bypass in Auth Experience

- Auth screens rely on hardcoded hex values and custom styling not expressed through shared tokens.
- Impact: auth flow can drift from rest of brand; dark/light parity is manual.
- Recommendation: migrate auth colors to semantic tokens (`--background-auth`, `--surface-auth`, `--accent-auth`) and keep component primitives shared.

### P1 - Small Type and Dense Microcopy

- Frequent use of very small text classes for key context labels.
- Impact: reduced readability/accessibility, especially in docs context where sustained reading matters.
- Recommendation: set minimum body/meta size floor for docs pages (typically 14px body, 12px minimum meta).

### P1 - Mobile Compression in Data-Dense Views

- History/settings grids prioritize dense desktop information.
- Impact: potential overflow, truncated semantics, and interaction friction on phones.
- Recommendation: for Astro docs, enforce mobile-first content width, stacked metadata, and avoid table-first layouts except with responsive wrappers.

### P1 - Motion and Performance Accessibility

- Auth canvas animation runs continuously and does not appear to respect reduced-motion preference.
- Impact: can cause distraction and accessibility complaints.
- Recommendation: gate decorative animation under `prefers-reduced-motion: no-preference` and provide static fallback.

### P2 - External Icon Source Dependency

- Agent icons use Google favicon service URLs.
- Impact: third-party dependency, privacy/perf concerns, inconsistent rendering.
- Recommendation: cache/provider-map icons locally for docs and product UI where feasible.

### P2 - Visual Intent vs Public Brand Artifacts

- README badge color uses purple while design principles say orange should be dominant signal.
- Impact: mild brand inconsistency between product UI and external docs/readme.
- Recommendation: align public badges/marketing accents with core Porter palette.

## Astro Content Site Translation Guide

### 1) Establish Canonical Tokens First

Create a design token contract for Astro before page work:

- Brand: `primary`, `background`, `foreground`, `muted`, `border`, `destructive`
- Surfaces: `surface-1`, `surface-2`, `surface-elevated`
- Typography: `font-sans`, `font-mono`, size scale, tracking scale
- Effects: radius scale, shadow scale, focus ring, grid texture opacity

Source these initially from `web/src/app.css`, not `shadcn.css` defaults.

### 2) Rebuild Reusable Content Components

For Astro/MDX, create shared primitives mirroring successful Svelte patterns:

- `DocsCard`, `KickerLabel`, `StatusBadge`, `InlineCodeMeta`, `Callout`, `StepTimeline`
- Keep max 2 visual layers per section (page -> card -> content)
- Keep badge usage semantic (status only, not decorative overload)

### 3) Define a Docs-Specific Layout System

- Reading width: 68-76ch for long-form docs
- Section spacing: 24-32px rhythm
- Sidebar/nav: preserve simple hierarchy, avoid dense dashboard chrome
- Mobile: stack all metadata rows; no fixed multi-column grids under ~1024px

### 4) Accessibility Baseline for Docs

- Minimum 4.5:1 contrast for body text in both themes
- Minimum 14px for body copy
- Visible focus states on links/buttons/toggles
- Respect reduced motion for all decorative effects

### 5) Visual Continuity with Product

Use the docs site to feel like Porter, not like the admin app:

- Keep palette and typography consistent
- Reduce operational density and interactive chrome
- Reuse timeline motif for process explanations (how Porter runs tasks)

## Quick Implementation Checklist (Astro)

- [ ] Consolidate one token source and export to Astro CSS variables
- [ ] Port Inter + JetBrains Mono font pairing
- [ ] Build shared docs UI primitives before page content migration
- [ ] Replace hardcoded auth-like color usage with semantic tokens
- [ ] Add responsive rules for any table/metric-heavy sections
- [ ] Add reduced-motion handling for decorative animation
- [ ] Run contrast check on light/dark theme pairs

## Suggested First 3 Actions

1. Publish `tokens.css` in the Astro repo using values from `web/src/app.css`.
2. Build an MDX component pack (`DocsCard`, `Callout`, `StatusBadge`, `StepTimeline`) and apply to 2-3 high-traffic pages first.
3. Add a docs QA pass for typography floor, contrast, and mobile layout before full content migration.
