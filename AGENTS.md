# Procedia — Agent Guide

Node-based procedural motion design plugin for After Effects (CEP panel, Windows, AE 2025+).

## Quick start

```bash
npm test              # single run
npm run test:watch    # watch mode
```

Tests: Vitest + jsdom, in `tests/*.test.js`. Use `loadGlobalScript('path')` from `tests/setup.js` to load IIFE sources.

## Essential reading

Read `_docs/CLAUDE.md` **in full** before any task. It contains 16 skills covering every architectural rule. It is the canonical reference.

## Architecture nutshell

Panel JS → command object → `bridge/evalBridge.js` (only caller of `csInterface.evalScript()`) → `jsx/dispatcher/dispatcher.jsx` (only file with AE API calls). Nodes never call AE directly.

## Critical quirks

- **Script loading:** Not from `<script>` tags in `index.html` directly. `index.html` only loads CSInterface.js + error reporting + `ui/scriptLoader.js`. All remaining scripts come from `data/scripts.json` (the load-order manifest). Add every new file there.
- **Node definitions:** Loaded by `graph/nodes/loadNodes.js` via `document.write()` — non-effect nodes (14 files) loaded synchronously, effect nodes (460+) generated on-demand by `graph/engine/effectNodeFactory.js` from metadata stubs under `graph/nodeMetadata/`.
- **Two JS environments:** Panel files (.js) — modern JS OK. ExtendScript files (.jsx) — **strict ES3**: `var` only, no arrow fns, no template literals, no `forEach`/`map`/`filter`, no destructuring/spread, no Promises. JSON is not native in ExtendScript — `jsx/json.jsx` must load first.
- **Node UUIDs:** `PROC-{timestamp}-{rand4}`. Wire UUIDs: `WIRE-{timestamp}-{rand4}`. Layer `.comment` = terminal wire UUID, never node UUID.
- **All 5 lifecycle hooks** (`onDrop`, `onAlive`, `onGhost`, `onDelete`, `onPropertyChange`) must exist on every node definition, even if they return `null`.
- **Adding a new node:** Create one file under `graph/nodes/categories/`, register in `nodeRegistry`, add its `<script>` tag to `graph/nodes/loadNodes.js` and its path to `data/scripts.json`. Adding a new AE action requires editing `jsx/dispatcher/dispatcher.jsx` and `bridge/evalBridge.js`.

## Key files

| Path | Purpose |
|------|---------|
| `_docs/CLAUDE.md` | **Full reference — read me first** |
| `data/scripts.json` | Script load order (truth, not index.html) |
| `bridge/evalBridge.js` | Only bridge between panel and AE |
| `jsx/dispatcher/dispatcher.jsx` | Only ExtendScript that writes AE API calls |
| `graph/engine/` | Dumb executor — zero node-type conditionals |
| `graph/graphState/` | Only mutator of `nodeMap` / `wireMap` |
| `graph/nodes/loadNodes.js` | Dynamic node definition loader |
| `data/effectSchemaCache.json` | Effect property schemas (must exist on disk) |
| `CSXS/manifest.xml` | CEP extension manifest (id: `com.uppercut.procedia`) |
