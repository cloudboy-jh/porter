# Porter Runtime (Worker + Durable Object)

This directory contains Porter's execution runtime.

- `POST /dispatch` receives task payloads from the web app.
- `TaskRunnerDO` owns per-task execution state.

## Local

```bash
cd runtime
bun install
bun run dev
```

## Required vars

- `PORTER_DO_DISPATCH_TOKEN` for dispatch auth.

Set `PORTER_DO_DISPATCH_URL` in the web app to this worker's `/dispatch` URL.
