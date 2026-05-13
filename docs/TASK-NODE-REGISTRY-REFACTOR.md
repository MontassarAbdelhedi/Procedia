# TASK — Node Registry Refactor ✅ COMPLETE
## Migrate nodeRegistry.js to the One-File-Per-Node Architecture

> **Status:** Done (May 2026). Registry is at `graph/nodes/nodeRegistry.js`. Node files in `graph/nodes/categories/`. `Comp.js` and `Text.js` registered. `Layer.js` was not created — `Text.js` in `layers/` was the first non-core node instead.

---

## Prerequisites

Before touching any file, read in this order:
1. `CLAUDE.md` — all 10 skills apply, especially SKILL 1 (ES3), SKILL 2 (bridge), SKILL 3 (error handling)
2. `docs/SKILL-NODE-AUTHORING.md` — the node definition contract you must follow exactly
3. This file — the task spec

---

## What You Are Building

Refactor `graph/nodeRegistry.js` from a monolithic file into a thin registry that loads individual node definition files. Each node type gets its own file under `graph/nodes/categories/`.

---

## Current State

- `graph/nodeRegistry.js` — exists, mostly placeholder/skeleton
- No node definition files exist yet
- No `graph/nodes/` folder exists yet

---

## Target State

```
graph/
  nodeRegistry.js                          ← thin registry (loader + map only)
  nodes/
    categories/
      core/
        Comp.js                            ← core node (already partially defined in registry)
        Layer.js                           ← core node (already partially defined in registry)
      effects/                             ← empty, ready for future nodes
      generators/                          ← empty, ready for future nodes
      utility/                             ← empty, ready for future nodes
```

---

## Tasks — Execute One at a Time. Stop and verify after each.

---

### TASK 1 — Create the folder structure

**What:** Create the directory tree under `graph/nodes/categories/`. No files yet — folders only.

**Folders to create:**
- `graph/nodes/`
- `graph/nodes/categories/`
- `graph/nodes/categories/core/`
- `graph/nodes/categories/effects/`
- `graph/nodes/categories/generators/`
- `graph/nodes/categories/utility/`

**Verification checklist:**
- [ ] All 6 folders exist on disk
- [ ] No files created yet
- [ ] No existing files modified

---

### TASK 2 — Create `Comp.js` node definition

**What:** Extract the Comp node definition from `nodeRegistry.js` into its own file at `graph/nodes/categories/core/Comp.js`.

**Rules:**
- Follow the node definition contract in `docs/SKILL-NODE-AUTHORING.md` exactly
- `type` must be `'core/comp'`
- `category` must be `'Core'`
- Use whatever ports and params are currently defined for the Comp node in `nodeRegistry.js`
- If the current definition is too sparse, use the contract defaults from the skill file
- The `apply` function returns an empty string `''` for now — Comp nodes are orchestrators, not effect applicators

**File to create:** `graph/nodes/categories/core/Comp.js`
**Files to read first:** `graph/nodeRegistry.js`, `docs/SKILL-NODE-AUTHORING.md`
**Files to modify:** none yet

**Verification checklist:**
- [ ] `Comp.js` exists at the correct path
- [ ] File exports a default object with all required contract fields: `type`, `label`, `category`, `version`, `inputs`, `outputs`, `params`, `apply`
- [ ] No syntax errors (check with `node --check` if available)
- [ ] `nodeRegistry.js` is NOT modified yet

---

### TASK 3 — Create `Layer.js` node definition

**What:** Same as Task 2 but for the Layer node.

**Rules:**
- `type` must be `'core/layer'`
- `category` must be `'Core'`
- Follow the same contract as Task 2
- `apply` returns empty string `''` for now

**File to create:** `graph/nodes/categories/core/Layer.js`
**Files to read first:** `graph/nodeRegistry.js`, `docs/SKILL-NODE-AUTHORING.md`
**Files to modify:** none yet

**Verification checklist:**
- [ ] `Layer.js` exists at the correct path
- [ ] All required contract fields present
- [ ] No syntax errors
- [ ] `nodeRegistry.js` still NOT modified

---

### TASK 4 — Rewrite `nodeRegistry.js` as a thin registry

**What:** Replace the body of `nodeRegistry.js` with the thin registry pattern. It imports node definitions, registers them, and exposes a public API. Nothing else.

**The new registry must expose exactly these four functions:**
```javascript
getDefinition(type)        // returns one node definition object or null
getAllDefinitions()         // returns the full registry map
getByCategory(category)    // returns array of definitions in that category
listTypes()                // returns array of all registered type strings
```

**Import and register:** `Comp.js` and `Layer.js` only. No other nodes yet.

**Rules:**
- Use `var` and named functions — no `const`, `let`, arrow functions (SKILL 1)
- The registry object itself is a plain `{}` — not a class, not a Map
- The `register()` function must warn (not throw) on duplicate type
- Remove ALL old node definition code from this file — it now lives in node files only

**File to modify:** `graph/nodeRegistry.js`

**Verification checklist:**
- [ ] `nodeRegistry.js` imports `Comp.js` and `Layer.js`
- [ ] Both nodes are registered via `register()`
- [ ] All four public functions exist and are exported
- [ ] No node definition objects remain inline in `nodeRegistry.js`
- [ ] Old code is fully removed, not commented out
- [ ] No `const`, `let`, or arrow functions anywhere in the file

---

### TASK 5 — Verify the registry loads correctly in the panel

**What:** Confirm the refactored registry loads without errors in the CEP panel environment and that both nodes are accessible.

**How to verify:**
Add this temporary debug call somewhere that runs on panel load (e.g. the panel init function), then open the panel in AE and check the browser console:

```javascript
var comp = nodeRegistry.getDefinition('core/comp');
var layer = nodeRegistry.getDefinition('core/layer');
var all = nodeRegistry.getAllDefinitions();
var cores = nodeRegistry.getByCategory('Core');

console.log('[Registry] comp:', comp ? 'FOUND' : 'MISSING');
console.log('[Registry] layer:', layer ? 'FOUND' : 'MISSING');
console.log('[Registry] total registered:', Object.keys(all).length);
console.log('[Registry] Core category count:', cores.length);
```

**Remove the debug lines after verification.**

**Verification checklist:**
- [ ] Panel loads without console errors
- [ ] `comp: FOUND` appears in console
- [ ] `layer: FOUND` appears in console
- [ ] `total registered: 2` appears in console
- [ ] `Core category count: 2` appears in console
- [ ] Debug lines removed after passing

---

## What NOT to Do

- Do not create effect/generator/utility node files yet — folders only
- Do not modify any UI files, graph rendering, or connection logic
- Do not add a node type that isn't in the current `nodeRegistry.js` — migrate only, don't invent
- Do not leave old node definitions commented out in `nodeRegistry.js`
- Do not use `class`, `Map`, `Set`, or any ES6+ constructs

---

## Execution Order

```
TASK 1 → verify → TASK 2 → verify → TASK 3 → verify → TASK 4 → verify → TASK 5 → verify → DONE
```

Stop after every task. Do not proceed until all checkboxes are checked.
