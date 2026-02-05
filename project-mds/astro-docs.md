# Astro Docs - Handoff Spec

**Version:** 0.1.0
**Status:** Draft
**Owner Repo:** Separate docs repository
**Purpose:** Centralize product documentation so updates track product changes over time.

---

## Overview

Astro Docs is the standalone documentation application for Porter. It lives in a separate repository and consumes curated content from this repo (specs, roadmap, and UI notes) to keep docs accurate as the product evolves.

This spec defines the handoff boundary between the product repo and the docs repo, plus a lightweight workflow for syncing content.

---

## Source of Truth

These files in this repo are the canonical inputs for docs:

- `project-mds/main-spec.md` (core product spec)
- `project-mds/next-steps.md` (short-term roadmap and UI polish notes)
- `project-mds/astro-docs.md` (this handoff spec)

Docs in the Astro repository should summarize and reformat this content, not replace it.

---

## Content Scope (Docs Repo)

The docs app should include:

1. **Product Overview**
   - What Porter is, core value proposition, supported agents.
2. **Architecture**
   - High-level system design, execution flow, Fly Machines integration.
3. **User Guide**
   - How to install the GitHub App, connect repos, run agents, review PRs.
4. **Settings Reference**
   - Execution environment, GitHub connection, agent configuration.
5. **API Reference (v1)**
   - Public endpoints and webhook expectations.
6. **Roadmap**
   - Short-term and phase-based roadmap (from `next-steps.md`).

---

## Handoff Workflow

1. **Update product specs here.**
2. **Summarize into docs content** in the Astro repo:
   - Pull key changes from `main-spec.md` and `next-steps.md`.
   - Update affected sections, keep the same structure.
3. **Publish docs updates** with a short changelog note.

Guidelines:
- Keep docs derived from spec content; do not introduce new product decisions only in docs.
- Prefer concise summaries with deep links back to relevant sections in the spec.
- Use consistent naming (Porter, Fly Machines, agents, routes, settings sections).

---

## Suggested Docs Structure (Astro Repo)

```
docs/
  index.mdx            # Overview
  architecture.mdx     # System design + flow
  user-guide/
    install.mdx
    connect-github.mdx
    run-agents.mdx
    review-prs.mdx
  settings/
    execution.mdx
    github.mdx
    agents.mdx
  api/
    overview.mdx
    endpoints.mdx
  roadmap.mdx
```

---

## Sync Checklist

- [ ] Spec changes reviewed in `project-mds/main-spec.md`
- [ ] Roadmap changes reviewed in `project-mds/next-steps.md`
- [ ] Docs pages updated to reflect changes
- [ ] Publish docs with a short changelog note

---

## Open Questions

1. Should the docs repo consume spec content automatically (CI sync) or manually?
2. Do we want a public changelog page in the docs app?
3. Should the docs site include UI screenshots, or rely on text-only for now?

---

**End of Handoff Spec**
