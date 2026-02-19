# Porter

<p align="center">
  <img src="./porter-logo-readme.png" alt="Porter" />
</p>

<p align="center">
<img src="https://img.shields.io/badge/Svelte-FF3E00?style=flat-square&logo=svelte&logoColor=white" alt="Svelte"/>
<img src="https://img.shields.io/badge/Bun-000?style=flat-square&logo=bun&logoColor=white" alt="Bun"/>
<img src="https://img.shields.io/badge/Fly.io-8B5CF6?logo=fly.io&logoColor=white" alt="Fly.io" />
</p>


Universal agent orchestrator for GitHub Issues. Porter brings the @mention workflow to any coding agent by running tasks in Fly Machines containers and returning PRs automatically.

## What it does

- Dispatch tasks from GitHub issue comments (`@porter ...`) or the dashboard.
- Run agents in Fly Machines containers with launch-contract validation and callback reconciliation.
- Store settings/secrets in Cloudflare D1 (encrypted secret values); optional GitHub Gist mirror is non-blocking.
- Track task status, callback attempts, and PR output in one UI.

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

## Worker image (Phase 1)

Porter launches Fly Machines using `PORTER_WORKER_IMAGE` (default: `registry.fly.io/porter-worker:latest`).

Build locally:

```bash
docker build -f worker/Dockerfile -t porter-worker:local .
```

Build for Fly registry:

```bash
docker build -f worker/Dockerfile -t registry.fly.io/porter-worker:latest .
```

Entrypoint contract (`worker/entrypoint.sh`) expects:

- `TASK_ID`, `REPO_FULL_NAME`, `AGENT`, `PROMPT`
- `CALLBACK_URL`, `CALLBACK_TOKEN`
- `GITHUB_TOKEN` unless `REPO_CLONE_URL` is provided
- Optional: `BRANCH_NAME`, `BASE_BRANCH`, `REPO_CLONE_URL`

For local smoke tests, see `worker/README.md`.

## Docs

- Product spec: `docs/project-mds/main-spec.md`
- Roadmap / next work: `docs/project-mds/next-steps.md`
- Docs handoff spec: `docs/project-mds/astro-docs.md`


<p align="center">
  <img src="./porter-visual.png" alt="Porter visual" />
</p>
