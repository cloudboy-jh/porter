# Porter

![Porter](web/src/logos/porter-logo-readme.png)

Universal agent orchestrator for GitHub Issues. Assign any issue to any AI coding agent with `@porter` and let Porter coordinate local or cloud execution.

[![Docs](https://img.shields.io/badge/Docs-porter-10b981?style=flat-square)](SPEC.md)
[![GitHub last commit](https://img.shields.io/github/last-commit/cloudboy-jh/porter?style=flat-square&color=10b981)](https://github.com/cloudboy-jh/porter/commits/main)
[![License: MIT](https://img.shields.io/badge/License-MIT-10b981.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Made with Go](https://img.shields.io/badge/Made%20with-Go-10b981?style=flat-square&logo=go)](https://go.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-10b981.svg?style=flat-square)](https://github.com/cloudboy-jh/porter/pulls)

## Repo Layout
- `web/`: SvelteKit dashboard
- `desktop/`: Wails desktop daemon + UI
- `SPEC.md`: Product specification

## Development
- Web: `cd web && bun install && bun run dev`
- Desktop: `cd desktop && wails dev`
