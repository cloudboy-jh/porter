# Wails dev server issue

## Problem
The Wails desktop window rendered the placeholder `frontend/dist` page instead of the Svelte UI. `wails dev` appeared to hang on `Compiling frontend`.

## Root cause
The Wails v2 config keys were incorrect. We used a nested `frontend` block and `frontend:dev`, which Wails v2 ignores. Without the proper keys, Wails fell back to the embedded assets and tried to run the build command during dev.

## Fix
Switch to the v2 flat config keys and split the dev build and watcher commands:

```json
"frontend:dir": "frontend",
"frontend:install": "bun install",
"frontend:build": "bun run build",
"frontend:dev:build": "bun run build",
"frontend:dev:watcher": "bun run dev",
"frontend:dev:serverUrl": "http://localhost:34115"
```

After this change, Wails loads the Vite dev server in dev mode and the UI renders correctly.
