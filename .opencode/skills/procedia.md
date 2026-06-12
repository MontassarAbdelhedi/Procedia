# Procedia Skill

> Node-based procedural motion design plugin for Adobe After Effects (CEP panel)
> Platform: **Windows only** · AE 2025+ · CSXS 11.0 · May 2026

**Always load this skill when working on Procedia.** For full detail, see `_docs/CLAUDE.md` (16 skills, 21 absolute rules), `_docs/arch_specs.md`, `_docs/structure.md`, `_docs/flow.md`.

---

## Quick Reference

| Area | Key Facts |
|------|-----------|
| **Panel** | JS in Chromium CEF — modern JS OK |
| **AE side** | ExtendScript (.jsx) — **strict ES3**: `var`, named fns, string concat, `for` loops. No `const`/`let`/arrow/forEach/template literals/Promise/destructuring/spread/default params/`Object.keys` |
| **Bridge** | `csInterface.evalScript()` — string in, string out, always async. Only `bridge/evalBridge.js` calls it |
| **Dispatcher** | Only `jsx/dispatcher/dispatcher.jsx` contains AE API calls. Nodes return `{ action, params }` command objects |
| **Load order** | `index.html` is the single truth. No bundler. 86 `<script>` tags in exact order. Every file has `// DEPENDS ON:` header |
| **State** | `graph/graphState/` is the only module that mutates `nodeMap`, `wireMap` |
| **Identifiers** | UUID only. `comp.comment` = node UUID. `layer.comment` = **terminal wire UUID** (not node UUID) |
| **Persistence** | Written only on: AE save, AE quit, panel unload |
| **Polling** | Adaptive (1s active / 5s idle). Pauses during writes (`isWriting` flag) |

## Node Kinds

| Kind | AE Presence | Always Alive? | Hook Signature |
|------|-------------|---------------|----------------|
| `affected` | Owns a standalone AE layer | No | `(nodeData, hostingCompUUID)` |
| `effector` | Effect on upstream layer | No | `(nodeData, hostingCompUUID, upstreamNodeUUID)` — `params: 'dynamic'` |
| `data` | None | Yes | All hooks return `null` |
| `blending` | Sets `layer.blendingMode` on upstream affected | Yes | `(nodeData, hostingCompUUID, upstreamNodeUUID)` |
| `matte` | Sets `layer.trackMatteType` on top layer | Yes | `(nodeData, hostingCompUUID, topLayerUUID, matteLayerUUID)` |

**Dedicated nodes** (have AE project object): CompNode, NullNode, AdjustmentNode. Creation order: AE object first, layer second.

## Critical Rules (Never Violate)

1. ES3 in all `.jsx` files — zero exceptions
2. Every `.jsx` function returns `JSON.stringify({ ok, data, error })`
3. `evalBridge.js` is the only file calling `csInterface.evalScript()`
4. `graphState/` is the only module mutating `nodeMap`/`wireMap`
5. `dispatcher.jsx` is the only file with AE API calls
6. Engine (`engine/`) has zero node-type conditionals — no `if (node.nodeKind === ...)`
7. New node = one file + one `<script>` tag in `index.html`; dispatcher action = only acceptable second file
8. Cascade traverses layer wires only — never `parent` or `data` wires
9. Cascade order: effectors outermost-first → affected nodes last (never park before stripping)
10. CompNode, data nodes, blending nodes, matte nodes are never ghosted
11. Layer `.comment` = terminal wire UUID — never look up by node UUID for path ops
12. AE layer stacking 1-based, panel `layerOrder` 0-based
13. Blending node `main_input` only accepts wires from affected nodes
14. Matte activation requires all 3 conditions (both inputs connected, same hosting comp, output to that comp)

## Known Gotchas & Tricks

- **evalScript callbacks only fire when AE has window focus** — testing requires clicking AE window after triggering
- **Effect opacity 0–100 → AE 0–1**: Normalization happens in dispatcher action handler, never in node definition
- **`Object.keys` is valid in panel JS** but not in `.jsx` — use `for...in` in ExtendScript
- **No native `JSON` in ExtendScript** — `jsx/json.jsx` must be first in evalBridge preamble
- **`effectSchemaCache.json` must exist on disk** — never created at runtime
- **Temp solid cleanup in `introspectEffect`** must happen on both success AND failure paths
- **`restampLayer` vs `unparkLayer`**: restamp for wire-insertion (layer stays in hosting comp), unpark for dormant reconnection (layer was parked)
- **Panel JS is source of truth** for graph topology; AE is source of truth for keyframes

## Bugs Resolved

| Bug | Fix |
|-----|-----|
| Deleting text node not removing AE layer | Ensured `onDelete` dispatches `deleteParkedLayer` |
| Deleting hosting comp doesn't trigger parking | Cascade handles comp deletion → parks affected layers |
| Renaming layers not updating in timeline | `renameNode` action sets `layer.name` from node label |
| Double-click on wire to remove it | Wire interaction handler added |
| Notification system missing | `notifications/notificationBar.js` added |
| Footage node (video) | Implemented in `layers/Footage.js` |

## What To Do (Roadmap)

- [ ] Footage nodes: image and audio variants
- [ ] Rework inspector — each node exports its own inspector definition
- [ ] Fix false alert: unwiring effector from affected node triggers "effect deleted outside Procedia"
- [ ] Add Procedia folder check on every Comp node drop
- [ ] Test import: unnecessary blending node case
- [ ] `_docs/For_Mont.md` — see full task list

## What Has Been Done (v4)

- Dispatcher pattern refactor (nodes return command objects)
- Path-driven layer model (terminal wire UUID in `layer.comment`)
- Ghost cascade algorithm (effectors first, affected last, batched dispatch)
- Dynamic effect schema cache (introspect → cache → diff on version change)
- Matte nodes (alpha + luma, 3-condition activation)
- Blending node (mode enum, direct affected-only wiring)
- Adaptive polling (missing nodes, external deletions, host notifications)
- Dirty flush (300ms debounced property push)
- Auto-layout (Sugiyama algorithm)
- Wire-insertion (drop node onto active wire)
- Sugoi import feature

## Key File Map

| File | Purpose |
|------|---------|
| `index.html` | Load order truth + DOM shell |
| `index.js` | Entry point |
| `bridge/evalBridge.js` | Only evalScript caller |
| `jsx/dispatcher/dispatcher.jsx` | Only AE API writer |
| `graph/engine/index.js` | Public engine API |
| `graph/graphState/` | In-memory state (only mutator) |
| `graph/nodeRegistry.js` | Node definition registry |
| `graph/schemaCache/` | Dynamic effect schema cache |
| `graph/cascade/` | Ghost cascade algorithm |
| `flush/dirtyFlusher.js` | Debounced property flush (300ms) |
| `polling/poller.js` | Adaptive AE polling |
| `graph/nodes/categories/` | All 13 node definitions |
| `data/effectSchemaCache.json` | Disk cache (must pre-exist) |

## Verification Checklist (Every Task)

- Panel loads without console errors
- Specific behavior works as described
- Edge cases handled (not found, AE busy, null input)
- No regressions in adjacent behavior
- AE testing: panel interaction or DevTools console (`http://localhost:8088`)
