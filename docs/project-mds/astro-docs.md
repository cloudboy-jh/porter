# Astro Docs - Handoff Spec

**Version:** 0.2.0  
**Status:** Active  
**Owner Repo:** Separate docs repository  
**Purpose:** Keep public/product docs aligned with shipping Porter behavior.

---

## Overview

Astro Docs is the standalone documentation app for Porter. It should track the product as it exists today (D1-backed config/secrets, Fly Machines execution, GitHub App + OAuth flows), not legacy implementation details.

This handoff spec defines:

1. canonical source files in this repo,
2. what content belongs in the docs repo,
3. the minimum sync workflow for every product change.

---

## Source of Truth (this repo)

Use these files as canonical inputs:

- `docs/project-mds/main-spec.md` (current architecture + runtime behavior)
- `docs/project-mds/next-steps.md` (active launch-critical checklist)
- `docs/project-mds/astro-docs.md` (handoff contract)

Docs in the Astro repo should summarize/reformat this source material, not introduce divergent product decisions.

---

## Required Coverage (docs repo)

1. **Product Overview**
   - What Porter does, who it is for, supported agents.
2. **Architecture**
   - Webhook -> dispatch -> Fly Machine -> callback -> PR/comment flow.
   - Cloudflare Worker + D1 + Fly boundaries.
3. **Authentication & Authorization**
   - GitHub OAuth sign-in, required scopes, GitHub App installation requirements.
   - Reconnect/install diagnostics and failure modes.
4. **Settings & Secrets**
   - D1-backed settings model (`users`, `user_settings`, `user_secrets`, `user_oauth_tokens`).
   - Encrypted secret handling and status-only UI behavior.
   - Optional GitHub Gist mirror semantics (best-effort, non-blocking).
5. **Operations**
   - Startup readiness checks, migration expectations, and runtime troubleshooting.
6. **API Reference (v1 internal/public surfaces)**
   - Webhook/callback/config/task/auth diagnostics endpoints.
7. **Roadmap**
   - Launch-critical and nice-to-have items from `next-steps.md`.

---

## Handoff Workflow

1. Update product spec files in this repo first.
2. Sync Astro docs sections affected by the change.
3. Add short changelog note in docs repo for user-visible behavior changes.

Guidelines:

- Keep language implementation-accurate; avoid speculative docs.
- Prefer short, direct sections with links back to spec files.
- Preserve naming consistency (`Porter`, `Fly Machines`, `D1`, `GitHub App`, `OAuth`).

---

## Suggested Docs Structure (Astro repo)

```text
docs/
  index.mdx
  architecture/
    overview.mdx
    execution-flow.mdx
    data-model.mdx
  auth/
    oauth-and-installation.mdx
    troubleshooting.mdx
  settings/
    providers-and-secrets.mdx
    fly-setup.mdx
  api/
    overview.mdx
    endpoints.mdx
  operations/
    startup-readiness.mdx
    migrations-and-rollout.mdx
  roadmap.mdx
```

---

## Sync Checklist

- [ ] `main-spec.md` reviewed for architecture/API/storage changes
- [ ] `next-steps.md` reviewed for roadmap/status changes
- [ ] affected docs pages updated
- [ ] docs changelog note added

---

## Current Known Gaps to Reflect in Docs

1. Production dry-run path (real `@porter` mention -> merged PR) is still open in `next-steps.md`.
2. Additional failure-mode tests and observability hardening remain in progress.

---

**End of Handoff Spec**
