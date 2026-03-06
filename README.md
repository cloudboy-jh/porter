# Porter

<p align="center">
  <img src="./porter-logo-readme.png" alt="Porter" />
</p>

<p align="center">
<img src="https://img.shields.io/badge/Svelte-FF3E00?style=flat-square&logo=svelte&logoColor=white" alt="Svelte"/>
<img src="https://img.shields.io/badge/Bun-000?style=flat-square&logo=bun&logoColor=white" alt="Bun"/>
<img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare Workers" />
</p>


Porter is a cloud-native GitHub task runner. It handles `@porter` comments and dashboard dispatches through a Cloudflare Worker + Durable Object runtime, then opens PRs with atomic GitHub commits.

## What it does

- Dispatch tasks from GitHub issue comments (`@porter ...`) or the dashboard.
- Execute each task in a Durable Object lifecycle (`queued -> reading -> running -> committing -> pr_opened -> done`).
- Select model as a product feature; swap providers by API call.
- Store settings/secrets in Cloudflare D1 (encrypted secret values); optional GitHub Gist mirror is non-blocking.
- Track task status, logs, and PR output in one UI.

## Local development

```bash
cd web
bun install
bun run dev
```

Webhook-to-callback local smoke test:

```bash
cd web
bun run smoke:webhook-callback
```

Run test suite:

```bash
cd web
bun run test
```

## Runtime

Porter runtime is Worker + Durable Objects.

- Worker validates webhook/dispatch input and hands off to a task DO.
- Each DO owns one task end-to-end and writes progress to D1.
- Git changes are committed atomically with GitHub Git Trees API.

Runtime service code lives in `runtime/`.

## Docs

- Product spec: `docs/project-mds/main-spec.md`
- Roadmap / next work: `docs/project-mds/next-steps.md`
- Docs handoff spec: `docs/project-mds/astro-docs.md`

## Recent updates (Mar 2026)

- Auth responses for `/auth` and `/api/auth*` now send `no-store` cache headers to prevent stale redirect/session behavior after logout.
- Task feed cards are denser and failed-state visuals are cleaner (no red card border/left stripe; status is carried by the failed badge).
- Failed tasks hide `+0/-0` diff badges, show `No summary generated.` when empty, and prioritize `Retry` over `View`.
- Review feed/detail UI was tightened: redundant header label removed, reject action de-emphasized, and metadata hierarchy improved.
- Review diff controls and aggregate diff chips now appear inline with the file header area; mock and real review views are kept in sync.


<p align="center">
  <img src="./porter-visual.png" alt="Porter visual" />
</p>
