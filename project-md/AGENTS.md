# AGENTS

## Repo Structure
- `web/` contains the SvelteKit web app.
- `spec.md` holds the product specification.

## Development
- Use Bun for package management and scripts.
- From `web/`: `bun install`, `bun run dev`, `bun run build`.

## UI Conventions
- Use shadcn-svelte primitives and blocks for UI components.
- Keep Porter’s color palette by using CSS variables in `web/src/app.css`.
- Use Lucide icons for all iconography.
- Use JetBrains Mono only for agent names, repo names, log lines, and numeric stats.

## Sidebar
- Default to collapsed icon-only.
- Use the shadcn sidebar primitives for layout and behavior.

## Files
- Place new components in `web/src/lib/components/`.
- Use `web/src/lib/components/ui/` only for shadcn-generated primitives.
