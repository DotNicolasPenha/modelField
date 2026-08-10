# AGENTS.md — ModelField

## Purpose

ModelField is a desktop application for creating, editing and running
AI specification files.

This file is a compact architectural map. Use it as the first reference
before exploring the repository. Read source files only when implementation
details are required.

## Stack

- Backend: Go 1.25 + Wails v2
- Frontend: Vanilla JS + HTML + CSS
- Persistence: JSON files in `~/.modelfield/`
- Build: Makefile / shell / Docker
- No frontend framework or bundler

## Architecture

```text
Go/Wails
  └── app.go
       └── JSON persistence

Frontend
  ├── app.js          → global state + initialization + persistence bridge
  ├── editor.js       → markdown editor
  ├── files.js        → files, tabs and file actions
  ├── models.js       → models, runs and history
  ├── modals.js       → modal/select system
  ├── templates.js    → spec templates
  ├── projects.js     → project management
  ├── checklist.js    → project checklist
  └── notifications.js → toast system
```

## Important Files

| File | Responsibility |
|------|----------------|
| `main.go` | Wails entry point |
| `app.go` | Backend API + persistence |
| `frontend/index.html` | Main UI structure |
| `frontend/js/app.js` | Global frontend state |
| `frontend/js/editor.js` | Markdown editor |
| `frontend/js/files.js` | File management |
| `frontend/js/models.js` | Models, execution and history |
| `frontend/js/projects.js` | Projects |
| `frontend/js/checklist.js` | Checklist |
| `frontend/js/modals.js` | Modal/select system |
| `frontend/js/templates.js` | Spec templates |
| `frontend/css/tokens.css` | Design tokens |
| `frontend/css/*.css` | UI styling |
| `frontend/wailsjs/` | Generated Wails bindings |

## Data Model

Backend persistence is JSON-based.

```
~/.modelfield/
├── api_keys.json
├── files.json
├── projects.json
├── model_aliases.json
└── run_history.json
```

Main entities:

- `APIKeys`
- `File`
- `Project`
- `RunRecord`
- `ModelAlias`

See `app.go` for the authoritative Go definitions.

## State Flow

```
App.init()
   ↓
Load persisted state
   ↓
App.state
   ↓
Frontend modules
   ↓
User interaction
   ↓
Wails API
   ↓
JSON persistence
```

When running outside Wails, frontend persistence falls back to `localStorage`.

## Architectural Rules

1. Keep the frontend framework-free.
2. Keep persistence logic in Go/Wails.
3. Do not duplicate backend persistence logic in individual JS modules.
4. Reuse existing CSS tokens before creating new visual values.
5. Do not manually edit generated files under `frontend/wailsjs/`.
6. Keep module responsibilities separated.
7. Prefer modifying an existing module over creating another module for related behavior.
8. Do not introduce dependencies without a clear architectural reason.
9. Preserve existing Wails/frontend boundaries.
10. When behavior already exists, extend it instead of duplicating it.

## Frontend Module Boundaries

- `app.js` → state, initialization and persistence bridge
- `editor.js` → editor behavior only
- `files.js` → file behavior only
- `projects.js` → project behavior only
- `models.js` → model/run behavior only
- `checklist.js` → checklist behavior only
- `modals.js` → reusable modal/select primitives
- `notifications.js` → notifications
- `templates.js` → static spec templates

Avoid putting feature-specific logic into `app.js` unless it is truly global.

## Styling

Design tokens live in:

```
frontend/css/tokens.css
```

Use existing variables for:

- colors
- typography
- spacing
- radius
- transitions
- themes

Avoid hardcoded design values when an equivalent token exists.

## Build

```bash
make
make docker
make build-windows
make release VERSION=x.y.z
```

Check the `Makefile` for authoritative build behavior.

## Development Guidance

Before changing code:

1. Identify the responsible module from the map above.
2. Read only that module and its direct dependencies.
3. Check `app.go` if the change crosses the Wails boundary.
4. Check `tokens.css` if changing UI.
5. Avoid broad repository exploration unless necessary.

After changing code:

- preserve existing architecture;
- verify affected flows;
- avoid unrelated refactors;
- update this file only when architecture or module responsibilities change.

## Source of Truth

`AGENTS.md` is a navigation and architecture summary, not detailed documentation.

When this file conflicts with source code, source code is authoritative.

Keep this file short. Update it when the architecture changes, not when implementation details change.
