# CLAUDE.md — Procedia v4
*CEP · After Effects 2025+ · Windows · ExtendScript ES3*
*This file is the single source of truth for Claude Code behavior on this project.*
*Read this file in full before touching any file, in any task, without exception.*

---

## What is Procedia?

Procedia is a **node-based procedural motion design plugin for Adobe After Effects**, built as a **CEP panel**. The panel UI runs in a Chromium-based environment. All After Effects operations are executed via **ExtendScript (.jsx)** bridged through `csInterface.evalScript()`.

**Stack:**
- Platform: Windows, CEP (not UXP)
- Panel language: JavaScript (modern JS is fine in panel files)
- AE scripting: ExtendScript — **strict ES3, zero exceptions**
- Bridge: `csInterface.evalScript()` — string in, string out, always async
- AE version: After Effects 2025+
- No bundler, no ES modules — plain `<script>` tags in `index.html`, loaded in exact order

**Architecture in one sentence:**
A node returns a plain command object. The engine passes it to `evalBridge`. `evalBridge` sends it to `jsx/dispatcher/dispatcher.jsx`. The dispatcher executes it in AE. Nothing else touches AE.

---

## Quick Reference — 14 Skills

| # | Skill | The rule in one line |
|---|---|---|
| 1 | ES3 Syntax | `var` only, named functions, string concat, `for` loops — nothing else |
| 2 | evalScript Bridge | String in, string out. Always `JSON.stringify` out, always `JSON.parse` in |
| 3 | Error Handling | Every `.jsx` function returns `{ ok, data, error }`. Panel always checks `res.ok` |
| 4 | AE Comp API | 1-indexed. Always `instanceof CompItem` check before use |
| 5 | AE Layer & Property API | Always navigate by match name string, never by index |
| 6 | AE Effects API | Access effects by match name only. Never hardcode index numbers |
| 7 | AE Project Folder API | Always find-or-create the Procedia folder before any write |
| 8 | UUID as Identifier | UUID is the only identifier. Stored in `.comment` field. Never use display names |
| 9 | Dispatcher Pattern | Nodes return command objects. Only `dispatcher.jsx` writes AE calls |
| 10 | Node Definition Contract | One file per node. All hooks, ports, and params declared in that file |
| 11 | File Structure & Load Order | Dependency headers on every file. `index.html` is load-order truth |
| 12 | Task Execution Protocol | One task, one verification, one stop. Never chain without confirmation |
| 13 | Grounded Decision Protocol | Decide once, lock it, escalate when stuck, gate on ambiguity |
| 14 | Ghost Cascade Rules | Only layer wires trigger cascade. Parent and data wires are never traversed |

---

## Detailed Skill Sections

---

### SKILL 1 — ExtendScript ES3 Syntax

ExtendScript runs on a pre-ES5 engine. Modern JS features silently fail or produce cryptic errors inside After Effects. There are no warnings. There are no exceptions to this skill.

**Forbidden — never use these in any `.jsx` file:**
- `const` or `let` — use `var`
- Arrow functions `() =>` — use named functions
- Template literals `` `${}` `` — use string concatenation
- `.forEach()`, `.map()`, `.filter()`, `.reduce()` — use `for` loops
- Destructuring `const { x } = obj` — access by property name
- Spread `...args` — copy manually
- Default parameters `function(x = 0)` — guard inside function body
- `Promise`, `async`, `await` — use callbacks
- `JSON` as a native global — it is NOT available in AE 2025. Load `jsx/json.jsx` first.

**✅ Correct:**
```jsx
function createLayer(compUUID, label) {
  var result = { ok: false, data: null, error: null };
  try {
    var proj = app.project;
    for (var i = 1; i <= proj.numItems; i++) {
      var item = proj.item(i);
      if (item instanceof CompItem && item.comment === compUUID) {
        var layer = item.layers.addText(label);
        layer.comment = label;
        result.ok = true;
        result.data = { name: layer.name };
        break;
      }
    }
    if (!result.ok) result.error = 'Comp not found: ' + compUUID;
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
```

**❌ Wrong:**
```jsx
const createLayer = (compUUID, label) => {
  const item = app.project.items.find(i => i.comment === compUUID);
  return { ok: true, data: item.name }; // object not string, arrow fn, no try/catch
};
```

---

### SKILL 2 — evalScript Bridge

The bridge between the CEP panel and AE is **string-based only**. Objects cannot cross. The bridge is async. Callbacks only fire when AE has window focus.

**Rules:**
- ExtendScript must always end with `return JSON.stringify(result)`
- Panel JS must always `JSON.parse(result)` on the response
- Never pass complex objects as arguments — serialize them first, inject as strings
- `evalBridge.js` is the **only** file that calls `csInterface.evalScript()`. No other file touches it directly.
- `evalBridge` exposes exactly two functions: `dispatch(commandObj)` and `dispatchBatch(commandArr)` — both return Promises.

**✅ Correct — panel JS calls evalBridge only:**
```javascript
evalBridge.dispatch({ action: 'createTextLayer', params: { compUUID: id, content: 'Hello' } })
  .then(function(res) {
    if (!res.ok) { console.error('[Procedia]', res.error); return; }
    console.log('[Procedia] Layer created:', res.data);
  });
```

**✅ Correct — evalBridge internal pattern:**
```javascript
// bridge/evalBridge.js
function dispatch(commandObj) {
  return new Promise(function(resolve, reject) {
    var json = JSON.stringify(commandObj);
    var call = 'dispatch(' + JSON.stringify(json) + ')';
    csInterface.evalScript(call, function(result) {
      try { resolve(JSON.parse(result)); }
      catch(e) { reject(new Error('Bridge parse error: ' + result)); }
    });
  });
}
```

**Testing note:** evalScript callbacks only fire when AE has window focus. In manual testing: trigger the call, click the AE window, then switch back to the browser console to see the result.

---

### SKILL 3 — Error Handling

Every ExtendScript function must be wrapped in try/catch. AE will not surface errors to the panel unless you explicitly catch and return them.

**Rules:**
- Every `.jsx` function returns `{ ok: boolean, data: any, error: string|null }`
- Always `return JSON.stringify(result)` as the last line — even on error paths
- Panel JS always checks `res.ok` before using `res.data`
- Never swallow errors silently. Always log `res.error` when `res.ok === false`

**✅ Correct:**
```jsx
function parkLayer(nodeUUID, hostingCompUUID, reservedCompUUID) {
  var result = { ok: false, data: null, error: null };
  try {
    var hostComp = findCompByUUID(hostingCompUUID);
    if (!hostComp) { result.error = 'Host comp not found: ' + hostingCompUUID; return JSON.stringify(result); }
    var layer = findLayerByUUID(hostComp, nodeUUID);
    if (!layer) { result.error = 'Layer not found: ' + nodeUUID; return JSON.stringify(result); }
    var reserved = findCompByUUID(reservedCompUUID);
    if (!reserved) { result.error = 'Reserved comp not found'; return JSON.stringify(result); }
    layer.moveBefore(reserved.layer(1));
    result.ok = true;
    result.data = { parked: nodeUUID };
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
```

---

### SKILL 4 — AE Comp API

AE project items are 1-indexed. Always verify type before use.

**Rules:**
- Items accessed via `app.project.item(i)` where `i` starts at **1**
- Always check `item instanceof CompItem` before treating it as a comp
- Always check `app.project.numItems > 0` before iterating
- Use `.comment` to store and find Procedia UUIDs
- **Never iterate over the Reserved Comp.** Skip any comp whose name starts with `'DO NOT DELETE'`

**✅ Correct:**
```jsx
function findCompByUUID(uuid) {
  var proj = app.project;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof CompItem && item.comment === uuid) return item;
  }
  return null;
}
```

---

### SKILL 5 — AE Layer & Property API

Layers contain properties organized in a hierarchy. Always navigate by **match name**, never by display name or index.

**Rules:**
- Access properties via `.property("matchName")` — not `.property(1)`
- Match names are stable across AE versions and language settings
- Layer types: `AVLayer`, `TextLayer`, `ShapeLayer`, `NullLayer`
- Always check layer type before accessing type-specific properties
- Find layers by UUID stored in `layer.comment`

**Common match names:**
```
Transform group:  "ADBE Transform Group"
Position:         "ADBE Position"
Scale:            "ADBE Scale"
Rotation:         "ADBE Rotate Z"
Opacity:          "ADBE Opacity"
```

**✅ Correct:**
```jsx
function setLayerOpacity(layer, value) {
  var xform = layer.property('ADBE Transform Group');
  var opacity = xform.property('ADBE Opacity');
  opacity.setValue(value);
}
```

---

### SKILL 6 — AE Effects API

Effects are accessed by match name only. Display names change with language. Index positions change when effects are added or removed.

**Rules:**
- Add effects: `layer.Effects.addProperty(matchName)`
- Find effects: iterate `layer.Effects`, check `effect.matchName === targetMatchName`
- Remove effects: find by match name first, then call `.remove()`
- Never hardcode an effect index. Never access `layer.Effects.property(1)`

**✅ Correct:**
```jsx
function findEffectByMatchName(layer, matchName) {
  var effects = layer.Effects;
  for (var i = 1; i <= effects.numProperties; i++) {
    if (effects.property(i).matchName === matchName) return effects.property(i);
  }
  return null;
}
```

---

### SKILL 7 — AE Project Folder API

All Procedia-created AE objects (comps, solids, footage) live inside the Procedia project folder. The folder must exist before any write.

**Rules:**
- Folder name: `'DO NOT DELETE — Procedia Reserved'`
- Always find-or-create before writing. Never assume it exists.
- Never write items to the project root
- `FolderItem` is the AE type for project panel folders

**✅ Correct:**
```jsx
function findOrCreateProcediaFolder() {
  var name = 'DO NOT DELETE — Procedia Reserved';
  var proj = app.project;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof FolderItem && item.name === name) return item;
  }
  return proj.items.addFolder(name);
}
```

---

### SKILL 8 — UUID as Identifier

UUID is the only identifier that links panel graph nodes to AE objects. Every other identifier (label, layer name, comp name) can be changed by the user at any time.

**Rules:**
- UUID format: `PROC-{timestamp}-{rand4}` e.g. `PROC-1716000000000-a3f2`
- Wire UUID format: `WIRE-{timestamp}-{rand4}`
- UUIDs are generated in panel JS via `uuidGenerator.js`, never in ExtendScript
- UUIDs are stored in `layer.comment` and `comp.comment` in AE
- UUID is never shown in the UI except in the inspector's read-only state field
- Never use `layer.name`, `comp.name`, or node label as a lookup key

---

### SKILL 9 — Dispatcher Pattern

This is the most important architectural rule in v4. **Nodes never write ExtendScript. Only `dispatcher.jsx` writes AE calls.**

**How it works:**
1. A node lifecycle hook returns a plain command object: `{ action: 'createTextLayer', params: {...} }`
2. The engine passes the command to `evalBridge.dispatch(commandObj)`
3. `evalBridge` serializes it and calls `csInterface.evalScript('dispatch(...)')`
4. `dispatcher.jsx` receives the serialized command, routes to the named action handler, returns `JSON.stringify({ ok, data, error })`

**Adding a new action to the dispatcher:**
- Open `jsx/dispatcher/dispatcher.jsx`
- Add one named function: `function actionCreateTextLayer(params) { ... }`
- Register it in the dispatch routing table at the bottom of the file
- This is the **only** acceptable reason to edit `dispatcher.jsx` when adding a new node

**Rules:**
- `evalBridge.js` is the only file that calls `csInterface.evalScript()`
- `dispatcher.jsx` is the only `.jsx` file that contains AE API calls
- Node definition hooks return command objects or `null` — they never call `evalBridge` directly
- `engine.js` contains zero node-type conditionals — it calls hooks by name, passes results to `evalBridge`

**✅ Correct — node lifecycle hook:**
```javascript
onAlive: function(nodeData, hostingCompUUID) {
  return {
    action: 'createTextLayer',
    params: {
      compUUID: hostingCompUUID,
      nodeUUID: nodeData.id,
      content:  nodeData.props.content,
      fontSize: nodeData.props.fontSize
    }
  };
}
```

**✅ Correct — dispatcher handler:**
```jsx
function actionCreateTextLayer(params) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = findCompByUUID(params.compUUID);
    if (!comp) { result.error = 'Comp not found: ' + params.compUUID; return result; }
    var layer = comp.layers.addText(params.content);
    layer.comment = params.nodeUUID;
    layer.name    = params.nodeUUID;
    result.ok   = true;
    result.data = { layerName: layer.name };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
```

**❌ Wrong — node writing ExtendScript:**
```javascript
onAlive: function(nodeData, hostingCompUUID) {
  // NEVER do this — nodes must not call evalBridge or write AE strings
  evalBridge.dispatch({ action: 'createTextLayer', ... });
}
```

---

### SKILL 10 — Node Definition Contract

Every node is a plain JS object with these required fields. One file, one node.

```javascript
var TextNode = {
  // Identity
  type:      'layers/text',   // category/node-name, kebab-case, unique
  label:     'Text',          // human-readable display name
  category:  'Layers',        // must match the folder name under categories/
  version:   '1.0.0',

  // Classification — type-level constants, never overridden per instance
  nodeKind:  'affected',      // 'affected' | 'effector' | 'data'
  dedicated: false,           // true if node needs an AE project panel object

  // Ports — declared once; engine manages extendable slot instances
  ports: [
    // input ports live on the left edge of the node
    // output ports live on the right edge
    // parent ports live on the top (child_of) and bottom (parent_of) edges
    { id: 'output',    category: 'output', type: 'layer',  extendable: false },
    { id: 'child_of',  category: 'parent', role: 'child',  type: 'parent'   },
    { id: 'parent_of', category: 'parent', role: 'parent', type: 'parent'   }
  ],

  // Params — inspector fields AND valid types for extendable port binding
  params: [
    { key: 'label',    type: 'string', default: 'Text',     label: 'Label'    },
    { key: 'content',  type: 'string', default: 'New Text', label: 'Content'  },
    { key: 'fontSize', type: 'number', default: 72,         label: 'Font Size', min: 1, max: 999 },
    { key: 'color',    type: 'color',  default: [1,1,1,1],  label: 'Color'    },
    { key: 'position', type: 'vector2',default: [0,0],      label: 'Position' },
    { key: 'rotation', type: 'number', default: 0,          label: 'Rotation' },
    { key: 'opacity',  type: 'number', default: 100,        label: 'Opacity',  min: 0, max: 100 }
  ],

  // Lifecycle hooks — return a command object or null. Never call evalBridge here.
  onDrop: function(nodeData) {
    return null; // CompNode overrides this to return an onAlive command immediately
  },

  onAlive: function(nodeData, hostingCompUUID) {
    return {
      action: 'createTextLayer',
      params: { compUUID: hostingCompUUID, nodeUUID: nodeData.id, content: nodeData.props.content }
    };
  },

  onGhost: function(nodeData, hostingCompUUID) {
    return {
      action: 'parkLayer',
      params: { nodeUUID: nodeData.id, hostingCompUUID: hostingCompUUID }
    };
  },

  onDelete: function(nodeData) {
    return {
      action: 'deleteParkedLayer',
      params: { nodeUUID: nodeData.id }
    };
  },

  onPropertyChange: function(key, value, nodeData, hostingCompUUID) {
    return {
      action: 'setLayerProperty',
      params: { nodeUUID: nodeData.id, hostingCompUUID: hostingCompUUID, key: key, value: value }
    };
  }
};

nodeRegistry.register(TextNode);
```

**Mandatory rules:**
- All 5 lifecycle hooks must be present, even if they return `null`
- Every param must have a `default` matching its declared `type`
- `nodeKind` and `dedicated` are never set per instance — they are constants
- The file ends with `nodeRegistry.register(NodeName)` — no other registration step needed
- No `import`/`export` statements anywhere

**`dedicated` reference — memorize this:**

| Node | `dedicated` | AE Project Object |
|---|---|---|
| CompNode | `true` | `CompItem` |
| NullNode | `true` | `FootageItem` (solid) |
| SolidNode | `true` | `FootageItem` (solid) |
| FootageNode | `true` | `FootageItem` |
| TextNode | `false` | — |
| ShapeNode | `false` | — |
| AdjustmentNode | `false` | — |

**Effector port rule — non-negotiable:**
Every effector node has exactly this port structure. No variations, no exceptions:

```javascript
ports: [
  // Main input: type is ALWAYS 'layer', required: true.
  // Extendable newborn slots accept data wires only — bound to effect params via picker.
  { id: 'layer_in', category: 'input',  type: 'layer', extendable: true, required: true },

  // Output: type is ALWAYS 'layer'. Same layer reference passed through — not a new layer.
  { id: 'output',   category: 'output', type: 'layer', extendable: false }

  // NO parent ports on effectors — they have no standalone AE layer.
]
```

---

### SKILL 11 — File Structure & Load Order

This project has no bundler and no ES modules. `index.html` is the only source of load order truth. Files are loaded via `<script>` tags in exact top-to-bottom order.

**Every file must declare its dependencies at the top:**
```javascript
// graph/engine.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/cascadeAlgorithm.js,
//             graph/portManager.js, graph/wireValidator.js, bridge/evalBridge.js
// MUST LOAD BEFORE: index.js
```

**Rules:**
- Never create a file without adding its `<script>` tag to `index.html` in the same task
- Group tags in `index.html` by layer: infrastructure → node definitions → engine → canvas → ui → entry point
- When splitting a file, create a folder named after the original file and place splits inside it. Delete the original.
- Never split mid-task. Declare the split as its own step before writing any code.
- After any file change, the first verification item is always: panel loads without console errors

**Load order in `index.html`:**
```html
<!-- 1. Infrastructure — no dependencies -->
<script src="data/uuidGenerator.js"></script>
<script src="bridge/evalBridge.js"></script>
<script src="graph/graphState.js"></script>
<script src="graph/nodeRegistry.js"></script>

<!-- 2. Node definitions — depend on nodeRegistry -->
<script src="graph/nodes/categories/core/Comp.js"></script>
<script src="graph/nodes/categories/layers/Text.js"></script>
<!-- ... all other node files ... -->

<!-- 3. Graph engine — depends on graphState, nodeRegistry, all nodes -->
<script src="graph/cycleChecker.js"></script>
<script src="graph/portManager.js"></script>
<script src="graph/wireValidator.js"></script>
<script src="graph/cascadeAlgorithm.js"></script>
<script src="graph/engine.js"></script>

<!-- 4. Canvas — depends on engine -->
<script src="graph/canvas/viewport.js"></script>
<script src="graph/canvas/renderer.js"></script>
<script src="graph/canvas/input.js"></script>
<script src="graph/canvas/minimap.js"></script>
<script src="graph/wire/wireRenderer.js"></script>
<script src="graph/wire/wire.js"></script>

<!-- 5. UI — depends on graphState, nodeRegistry -->
<script src="ui/nodeList.js"></script>
<script src="ui/drag.js"></script>
<script src="ui/inspector.js"></script>
<script src="ui/layerOrderList.js"></script>
<script src="ui/keyboard.js"></script>

<!-- 6. Infrastructure services -->
<script src="flush/dirtyFlusher.js"></script>
<script src="polling/poller.js"></script>
<script src="notifications/notificationBar.js"></script>

<!-- 7. Entry point — depends on everything -->
<script src="index.js"></script>
```

---

### SKILL 12 — Task Execution Protocol

Never chain multiple tasks without verifying each one works first.

**Every task follows this structure:**
```
1. State what you are building — one sentence
2. List every file you will touch
3. State your approach — one sentence (APPROACH: I will...)
4. Write the code
5. Output verification checklist — stop and wait for confirmation
```

**Verification checklist always includes:**
- [ ] Panel loads without console errors (open browser dev tools, check console)
- [ ] The specific behavior works as described
- [ ] Edge cases handled (not found, AE busy, null input)
- [ ] No regressions in adjacent behavior

**AE has no script editor — verification methods:**
- AE does **not** have a built-in script editor available. Never write verification steps that require ESTK or `alert(...)`.
- **Option A — direct panel interaction:** describe the panel action and the expected AE-observable outcome (e.g., "drop a Comp node → comp appears in AE project panel with correct UUID in `.comment`").
- **Option B — CEP DevTools console:** call `evalBridge.dispatch(...)` or run test scripts pasted into the panel's browser DevTools console (accessible via `http://localhost:8088` or the panel's browser dev tools), and check the logged result.
- Never ask the user to run a `.jsx` file in a standalone script editor.

**Hard stops:**
- After every task — do not proceed to the next without explicit confirmation
- After every `.jsx` change — test via panel interaction or DevTools console, not a standalone script runner
- Before creating a new file — always check if it already exists
- Before any git operation — confirm current branch and status

---

### SKILL 13 — Grounded Decision Protocol

Never oscillate between approaches, rewrite working code speculatively, or resolve ambiguity by trying both paths.

**RULE A — Decide once:**
```
APPROACH: I will use [X] because [one reason].
```
That decision is frozen for the task. Only the user can change it.

**RULE B — Escalation ladder when stuck:**
```
STEP 1 → Re-read the relevant CLAUDE.md skill section
STEP 2 → Check PROCEDIA-V4-ARCHITECTURE.md for the relevant rule
STEP 3 → State what is unknown and ask ONE specific question. STOP.

Format:
STUCK: [one sentence — what is unknown]
TRIED: [one sentence — what was already attempted]
NEED:  [one specific question]
```

**RULE C — Ambiguity gate:**
If a task is underspecified, stop before touching any file and ask one clarifying question. Never attempt both interpretations.

```
AMBIGUOUS: [what is unclear]
QUESTION:  [the one thing needed to proceed]
```

---

### SKILL 14 — Ghost Cascade Rules

The cascade algorithm governs when nodes transition from `alive` to `ghost`. Getting this wrong corrupts AE state silently.

**Hard rules — never violate:**
- Only `layer` wire deletions trigger cascade. Data wire and parent wire deletions never trigger cascade.
- The cascade traversal in `cascadeAlgorithm.js` must skip any wire whose `type` is `'parent'` or `'data'`
- Effectors ghost before the affected node they modify. An affected node is never parked before all its effectors are stripped from its layer.
- A node stays alive if it has any remaining comp path downstream — even if the deleted wire was one of several
- CompNode is never ghosted. It is never added to the cascade set.
- The entire cascade is batched into a single `evalBridge.dispatchBatch()` call — one bridge crossing per cascade, regardless of depth

**Cascade order:**
```
1. Collect all nodes in cascade set (effectors + affected, never comps)
2. Order: effectors outermost-first, affected nodes last
3. Call onGhost() on each → collect command objects
4. dispatchBatch(allCommands) → one bridge crossing
5. Update all node states to 'ghost' in nodeMap
6. Rebuild tempGraph
```

---

## File Directory

```
procedia-v4/
├── index.html                              ← Script load order. Single source of truth.
├── index.js                                ← Panel entry point.
│
├── graph/
│   ├── graphState.js                       ← nodeMap, wireMap, tempGraph. ONLY mutator.
│   ├── nodeRegistry.js                     ← register(), getDefinition(), getAll(), getByCategory()
│   ├── engine.js                           ← Dumb executor. Zero node-type conditionals.
│   ├── cascadeAlgorithm.js                 ← cascadeGhost(), hasCompDownstream()
│   ├── cycleChecker.js                     ← hasCycle() — pure graph traversal
│   ├── portManager.js                      ← Extendable port slot lifecycle
│   ├── wireValidator.js                    ← Wire type compatibility. Filters picker list.
│   ├── nodes/
│   │   └── categories/
│   │       ├── core/        Comp.js
│   │       ├── layers/      Text.js, Null.js, Shape.js, Adjustment.js
│   │       ├── effects/     FillEffect.js, GaussianBlur.js, ...
│   │       ├── data/        Color.js, Number.js
│   │       └── utility/
│   ├── canvas/
│   │   ├── viewport.js, renderer.js, input.js, minimap.js
│   └── wire/
│       ├── wire.js, wireRenderer.js
│
├── ui/
│   ├── nodeList.js, drag.js, inspector.js, layerOrderList.js, keyboard.js
│
├── flush/         dirtyFlusher.js
├── polling/       poller.js
├── notifications/ notificationBar.js
│
├── bridge/
│   └── evalBridge.js                       ← ONLY file that calls csInterface.evalScript()
│
├── data/
│   └── uuidGenerator.js
│
└── jsx/
    ├── json.jsx                            ← JSON polyfill. MUST be first in evalBridge preamble.
    ├── utils.jsx                           ← findCompByUUID, findLayerByUUID, findReservedComp
    ├── persistence.jsx                     ← readGraph, writeGraph, chunking
    ├── polling.jsx                         ← pollAliveNodes — single multi-UUID check
    └── dispatcher/
        └── dispatcher.jsx                  ← THE ONLY EXTENDSCRIPT WRITER.
```

---

## Absolute Rules — Never Violate

These apply to every task, every file, without exception.

1. **ES3 in all `.jsx` files.** No `const`, `let`, arrow functions, template literals, `forEach`, destructuring, spread, default parameters, Promises.

2. **Every `.jsx` function returns `JSON.stringify({ ok, data, error })`.** No exceptions.

3. **`evalBridge.js` is the only file that calls `csInterface.evalScript()`.** No other file touches it.

4. **`graphState.js` is the only file that mutates `nodeMap` and `wireMap`.** All other files call into it.

5. **`dispatcher.jsx` is the only file that contains AE API calls.** Nodes return command objects. They never call AE.

6. **`engine.js` contains zero node-type conditionals.** No `if (node.type === 'CompNode')`, no `switch(nodeKind)`.

7. **Adding a new node touches one file only** — the node definition file — plus adding its `<script>` tag to `index.html`. If any other file needs editing, stop and reconsider the design.

8. **Exception to rule 7:** If the new node needs an AE action that doesn't exist yet, add one handler function to `dispatcher.jsx`. This is the only acceptable second file.

9. **Ghost cascade never traverses `parent` or `data` wires.** These wire types are explicitly skipped.

10. **UUID is the only identifier in AE.** Stored in `.comment`. Never use display names.

11. **Cascade order is non-negotiable.** Effectors first. Affected last. Never park before stripping.

12. **Persistence writes happen only on three events:** AE save, AE quit, panel unload.

13. **Polling pauses during writes.** `isWriting = true` before dispatch. `isWriting = false` in callback. Poller skips if true.

14. **`JSON` is not native in ExtendScript.** `jsx/json.jsx` must be the first file in the evalBridge preamble.

15. **CompNode is always alive.** No ghost state. No park step. Never add CompNode to a cascade set.

16. **One task, one verification, one stop.** Never chain tasks without explicit developer confirmation.

---

## Prerequisite Reading — Before Any Task

Read these documents in this order before starting any implementation task:

1. **This file (`CLAUDE.md`)** — all 14 skills, all absolute rules
2. **`PROCEDIA-V4-ARCHITECTURE.md`** — the full system design
3. **The specific task brief or feature doc** for the work at hand

If a task brief contradicts this file, stop and ask. Do not resolve the contradiction by choosing one or the other.

---

*Procedia v4 — CLAUDE.md — May 2026*
*Any behavior not described here must be clarified with the developer before implementation begins.*
