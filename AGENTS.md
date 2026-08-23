# AGENTS.md — ModelField

## Purpose

ModelField is a desktop application for creating, editing and running AI specification files.

This file is a **compact repository map for AI agents**.

Use it to locate relevant code before exploring the repository.

**Minimize context usage. Do not read unrelated files.**

When this file conflicts with source code, **source code is authoritative**.

---

## Stack

* Backend: Go 1.25 + Wails v2
* Frontend: Vanilla JS + HTML + CSS
* Persistence: JSON in `~/.modelfield/`
* Build: Makefile / shell / Docker
* No frontend framework or bundler

---

## Repository Map

```text
Go/Wails
├── main.go
│   └── Wails entry point
└── app.go
    └── backend API + JSON persistence

Frontend
├── index.html
│   └── UI structure
├── css/
│   ├── tokens.css
│   │   └── design tokens + themes
│   ├── base.css
│   │   └── reset + element defaults
│   ├── layout.css
│   │   └── app shell: topbar, workspace, panels
│   ├── components.css
│   │   └── generic primitives (.btn, .input, .textarea)
│   ├── forms.css
│   │   └── form controls, custom select, API key rows
│   ├── modals.css
│   │   └── modal shells + toasts
│   ├── dropdowns.css
│   │   └── dropdown menus
│   ├── context-menu.css
│   │   └── context menus
│   ├── files.css
│   │   └── file browser, context panel, model info, trash
│   ├── checklist.css
│   │   └── project checklist
│   ├── run.css
│   │   └── run modal, models panel, history
│   ├── chat.css
│   │   └── chat UI + markdown rendering
│   ├── search.css
│   │   └── search behavior
│   └── editor.css
│       └── tabs, editor area, toolbar, status
└── js/
    ├── app.js
    │   └── global state + initialization + persistence bridge
    ├── editor.js
    │   └── markdown editor
    ├── files.js
    │   └── file CRUD + tabs + file actions
    ├── file-browser.js
    │   └── file browsing behavior
    ├── file-explorer.js
    │   └── file explorer behavior
    ├── panels.js
    │   └── sidebar resize behavior
    ├── models.js
    │   └── models + execution + metrics + history
    ├── projects.js
    │   └── project management
    ├── checklist.js
    │   └── project checklist
    ├── modals.js
    │   └── modal + select primitives
    ├── notifications.js
    │   └── toast notifications
    ├── search.js
    │   └── search behavior
    └── templates.js
        └── static spec templates
```

---

## Task Routing

Use this map before opening files.

| Task                     | Primary files                           |
| ------------------------ | --------------------------------------- |
| UI/design                | `frontend/css/*`, `frontend/index.html` |
| Design tokens/themes     | `frontend/css/tokens.css`               |
| Layout                   | `frontend/css/layout.css`               |
| Components               | `frontend/css/components.css`           |
| Forms/API keys           | `frontend/css/forms.css`                |
| Modals/toasts            | `frontend/css/modals.css`               |
| File browser/context     | `frontend/css/files.css`                |
| Checklist styling        | `frontend/css/checklist.css`            |
| Run/models/history       | `frontend/css/run.css`                  |
| Chat styling             | `frontend/css/chat.css`                 |
| Search styling           | `frontend/css/search.css`               |
| Editor styling           | `frontend/css/editor.css`               |
| Global frontend behavior | `frontend/js/app.js`                    |
| Markdown editor          | `frontend/js/editor.js`                 |
| Files                    | `frontend/js/files.js`                  |
| File browser             | `frontend/js/file-browser.js`           |
| File explorer            | `frontend/js/file-explorer.js`          |
| Panels resize            | `frontend/js/panels.js`                 |
| Search                   | `frontend/js/search.js`                 |
| Models/runs              | `frontend/js/models.js`                 |
| Projects                 | `frontend/js/projects.js`               |
| Checklist                | `frontend/js/checklist.js`              |
| Modals/selects           | `frontend/js/modals.js`                 |
| Notifications            | `frontend/js/notifications.js`          |
| Templates                | `frontend/js/templates.js`              |
| Backend/API              | `app.go`                                |
| Wails bootstrap          | `main.go`                               |
| Build/release            | `Makefile`, `build.sh`, `Dockerfile`    |

Only inspect secondary files when the primary module depends on them.

---

## Backend

`app.go` owns:

* API key persistence
* file persistence
* project persistence
* model aliases
* run history
* native dialogs/notifications
* Wails methods exposed to frontend

Main entities:

```text
APIKeys
File
Project
RunRecord
ModelAlias
```

Persistence:

```text
~/.modelfield/
├── api_keys.json
├── files.json
├── projects.json
├── model_aliases.json
└── run_history.json
```

`app.go` is the authoritative source for backend data structures and Wails APIs.

---

## Frontend State Flow

```text
App.init()
    ↓
Load persisted state
    ↓
App.state
    ↓
Feature modules
    ↓
User interaction
    ↓
Wails API
    ↓
JSON persistence
```

When Wails is unavailable, frontend persistence falls back to `localStorage`.

---

## Module Boundaries

* `app.js` → global state, initialization, persistence bridge
* `editor.js` → editor behavior
* `files.js` → file behavior
* `file-browser.js` → browser behavior
* `file-explorer.js` → explorer behavior
* `search.js` → search behavior
* `projects.js` → project behavior
* `models.js` → model/run behavior
* `checklist.js` → checklist behavior
* `modals.js` → reusable modal/select primitives
* `notifications.js` → notifications
* `templates.js` → static templates

Keep feature-specific logic inside its responsible module.

Do not move unrelated logic into `app.js`.

---

## Architectural Rules

1. Keep frontend framework-free.
2. Keep persistence in Go/Wails.
3. Do not duplicate persistence logic across JS modules.
4. Reuse existing CSS tokens.
5. Do not hardcode design values when a token exists.
6. Do not manually edit `frontend/wailsjs/`.
7. Preserve Go/Wails ↔ frontend boundaries.
8. Prefer extending existing modules over creating duplicates.
9. Do not add dependencies without clear necessity.
10. Avoid unrelated refactors.
11. Keep runtime behavior unchanged unless the task requires it.

---

## Styling

UI/motion design spec: `DESIGN_SPEC.md` (read before UI/visual changes).

Design tokens:

```text
frontend/css/tokens.css
```

Tokens control:

* colors
* typography
* spacing
* radius
* borders
* shadows
* transitions
* themes

Always inspect `tokens.css` before modifying visual behavior.

Prefer semantic tokens over component-specific hardcoded values.

---

## Generated / Build Files

Do not inspect or modify unless the task requires them:

```text
frontend/wailsjs/
build/
go.sum
```

`frontend/wailsjs/` contains generated Wails bindings.

`build/` contains compiled binaries.

---

## Build

```bash
make
make docker
make build-windows
make release VERSION=x.y.z
```

`Makefile` is authoritative for build behavior.

---

## Agent Workflow

Before changing code:

```text
1. Identify task category.
2. Use Task Routing.
3. Read the primary file.
4. Read only direct dependencies if required.
5. Inspect backend only if crossing Wails boundary.
6. Inspect tokens.css for UI changes.
```

After changing code:

```text
1. Verify affected behavior.
2. Avoid unrelated changes.
3. Check architecture boundaries.
4. Update AGENTS.md only if architecture changed.
```

---

## Source of Truth

`AGENTS.md` describes **architecture and navigation**, not implementation details.

Do not expand this file with:

* function documentation
* implementation details
* complete API references
* CSS explanations
* duplicated source code
* temporary behavior
* historical information

Keep it **short, stable and token-efficient**.
