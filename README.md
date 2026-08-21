# Procedia

Visual node-based compositing panel for Adobe After Effects. Build procedural motion design workflows as a node graph — each node represents an AE layer, effect, or data input, and wires define how data flows between them.

**Status:** Early development (`v0.0.4`). AE 2020+, Windows, CEP panel.

## Requirements

- **After Effects 2020+** (manifest range: `[17.0, 99.9]`)
- **Windows**
- **Node.js 18+** (dev only — for running tests)

## Features

- **Node graph canvas** — pan, zoom, snap-to-grid, minimap
- **Layer nodes** — Text, Null, Shape, Solid, Adjustment, Camera, Light, Footage
- **Shape nodes** — Rectangle, Ellipse, Star, Squircle, Gear, Wave, Flower, Polygon
- **Effect nodes** — 460+ dynamic effects with auto-resolved property schemas
- **Data nodes** — Color, Number, Expression (wire-driven animation)
- **Blending & Track Matte** — NORMAL through LUMINOSITY, Alpha and Luma mattes
- **Ghost cascade** — correct AE layer lifecycle on wire deletion
- **Undo/redo** — two-phase fast state restore + AE reconciliation (depth 50)
- **Presets** — save/load/drop reusable subgraphs via localStorage
- **Walkthrough** — 8-step interactive onboarding overlay
- **Auto layout** — Sugiyama layered graph algorithm
- **Graph persistence** — round-trip via Reserved Comp text layers
- **Polling** — syncs external AE changes back to the panel
- **Keyframe state** — per-param tracking + playhead round-trip
- **Error reporting** — Sentry + html2canvas bug report form (opt-in)
- **Import project** — scan existing AE comps into the graph

## Quick Start (Development)

```bash
# Install dependencies
npm install

# Run tests (67 passing)
npm test

# Watch mode
npm run test:watch

# Build distributable extension (injects secrets from env vars)
npm run build
```

The build output goes to `build/` — this is the distributable extension folder.
Copy it to `%APPDATA%\Adobe\CEP\extensions\com.uppercut.procedia\` to install.

### Secrets (production builds)

| Variable | Injected placeholder |
|---|---|
| `SENTRY_DSN` | `__SENTRY_DSN__` |
| `REPORTING_API_URL` | `__REPORTING_API_URL__` |

Set either via environment variables or a `.secrets/build.config.json` file at the repo root.

> Note: the `.debug` **file** at the repo root is the CEP remote-debugging manifest
> (port 8088) — do not use that name for anything else.

## Project Structure

```
procedia/
├── index.html              ← Shell (CSInterface + vendor libs + scriptLoader)
├── index.js                ← Panel entry point
├── graph/                  ← Graph engine, state, nodes, schema cache, undo
│   ├── engine/             ← Dumb executor (zero node-type conditionals)
│   ├── graphState/         ← Single mutator of nodeMap / wireMap
│   ├── nodes/              ← Node definitions + 460+ effect metadata stubs
│   └── canvas/, wire/, autoLayout/, cascade/, comment/
├── ui/                     ← Sidebar, inspector, top bar, walkthrough, modals
├── jsx/                    ← ExtendScript (ES3) handlers
│   └── dispatcher/         ← Single bridge between panel and AE (~89 actions)
├── bridge/                 ← evalBridge.js — only caller of csInterface.evalScript()
├── polling/, flush/        ← AE state sync + dirty-flush pipeline
├── reporting/              ← Sentry + html2canvas + bug-report form
├── data/                   ← uuidGenerator, deepClone, categoryColors, scripts.json
├── lib/                    ← CSInterface.js, sentry.bundle.min.js, html2canvas.min.js
├── css/, fonts/            ← Stylesheets + Tabler Icons
├── tests/                  ← Vitest + jsdom (7 files, 67 tests)
└── _docs/                  ← Full architecture reference, flow, changelog
```

## Documentation

| Document | Purpose |
|---|---|
| `_docs/CLAUDE.md` | Canonical architecture reference (16 skills, absolute rules) |
| `_docs/arch_specs.md` | Full system design specification |
| `_docs/flow.md` | Control-flow scenarios |
| `_docs/guide.md` | End-user guide |
| `_docs/Track/progress.md` | Development progress log |
| `CHANGELOG.md` | Release changelog (Keep a Changelog format) |
| `RELEASING.md` | Release checklist |
| `_docs/THIRD_PARTY_LICENSES.md` | Third-party license notices |

## License

MIT — see `package.json`.
