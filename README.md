# Porter

<p align="center">
  <img src="./porter-logo-readme.png" alt="Porter" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Fly.io-Fly%20Machines-8B5CF6?logo=fly.io&logoColor=white" alt="Fly.io" />
</p>


Universal agent orchestrator for GitHub Issues. Porter brings the @mention workflow to any coding agent by running tasks in Fly Machines containers and returning PRs automatically.

## What it does

- Dispatch tasks from GitHub issues or the dashboard.
- Run agents in cloud containers (Fly Machines) with repo context.
- Track progress, logs, and PR output in a single UI.

## Local development

```bash
cd web
bun install
bun run dev
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

- Product spec: `project-mds/main-spec.md`
- Daily plan: `project-mds/next-steps.md`


<p align="center">
  <img src="./porter-visual.png" alt="Porter visual" />
</p>
