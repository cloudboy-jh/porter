# Porter

![Porter](web/src/logos/porter-logo-readme.png)

Universal agent orchestrator for GitHub Issues. Assign any issue to any AI coding agent with `@porter` and let Porter coordinate local or cloud execution.

## Repo Layout
- `web/`: SvelteKit dashboard
- `desktop/`: Wails desktop daemon + UI
- `SPEC.md`: Product specification

## Development
- Web: `cd web && bun install && bun run dev`
- Desktop: `cd desktop && wails dev`
