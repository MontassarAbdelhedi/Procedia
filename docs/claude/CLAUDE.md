# CLAUDE.md — Procedia

## What is Procedia?

Procedia is a **node-based procedural motion design plugin for Adobe After Effects**, built as a **CEP (Common Extensibility Platform) panel**. The panel UI runs in a Chromium-based environment. All After Effects operations are executed via **ExtendScript (.jsx)** bridged through `csInterface.evalScript()`.

**Stack:**
- Platform: Windows, CEP (not UXP)
- Panel language: JavaScript (modern JS is fine here)
- AE scripting language: ExtendScript — **strict ES3, no exceptions**
- Bridge: `csInterface.evalScript()` — string in, string out
- AE version: After Effects 2025+
- No bundler, no ES modules — plain `<script>` tags in `index.html`, loaded in order

---

## Quick Reference — 11 Skills

| # | Skill | Core Rule | Never Do |
|---|---|---|---|
| 1 | ExtendScript ES3 Syntax | Write `.jsx` as if it's year 2000 | `const`, `let`, arrow functions, template literals, `forEach`, spread, destructuring |
| 2 | evalScript Bridge | Always stringify out, always parse in | Return raw objects from ExtendScript |
| 3 | evalScript Error Handling | Wrap every `.jsx` in try/catch, return `{ok, data, error}` | Assume evalScript succeeded |
| 4 | AE Comp API | Always check `app.project.numItems > 0` before iterating | Access `.item(0)` without bounds check |
| 5 | AE Layer & Property API | Use `.property()` with match name strings | Use positional index to access effects |
| 6 | AE Effects API | Access effects by match name, not display name | Hardcode effect index numbers |
| 7 | AE Project Folder API | Always find-or-create the Procedia folder before any write | Write items to root of project panel |
| 8 | Node Data Model | Every node has a UUID, stored in AE comp comment field | Use display names as identifiers |
| 9 | Node State Management | State lives in the panel JS, AE is the source of truth for comp data | Sync state during render or heavy operations |
| 10 | Task Execution Protocol | Plan → implement one task → verify in AE → then next task | Chain multiple tasks without verification checkpoints |
| 11 | Plain-Script File Splitting | Declare dependencies in header, update `index.html` in same task | Split mid-task, leave dead files, skip the load-order check |
| 12 | Grounded Decision Protocol | Decide once, lock it, escalate when stuck, gate on ambiguity | Revisit decisions mid-task or resolve ambiguity by trying both approaches |
| 13 | Parent Port Geometry | `parent_in` = left rectangle tab; `child_out` = right tab; layer/data = top/bottom circles | Mix parent ports into circle lists or inline port math outside `nodeGeometry.js` |

---

## Detailed Sections

---

### SKILL 1 — ExtendScript ES3 Syntax

ExtendScript runs on a **pre-ES5 engine**. Modern JavaScript features silently fail or throw cryptic errors inside After Effects.

**Rules:**
- Use `var` only — never `const` or `let`
- Use named functions — never arrow functions `() =>`
- Use string concatenation — never template literals `` `${}` ``
- Use `for` loops — never `.forEach()`, `.map()`, `.filter()`, `.reduce()`
- Never use destructuring `const { x } = obj`
- Never use spread `...args`
- Never use default parameters `function(x = 0)`
- Never use `Promise`, `async`, `await`
- Always use `JSON.stringify()` to return data — but `JSON` is **not** a native global in AE 2025. It is provided by `jsx/json.jsx` which must be loaded first in the evalBridge preamble. Never assume native JSON.

**✅ Correct:**
```jsx
function getCompName(compId) {
  var result = { ok: false, data: null, error: null };
  try {
    var proj = app.project;
    for (var i = 1; i <= proj.numItems; i++) {
      var item = proj.item(i);
      if (item instanceof CompItem && item.comment === compId) {
        result.ok = true;
        result.data = item.name;
        break;
      }
    }
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
```

**❌ Wrong:**
```jsx
const getCompName = (compId) => {
  const proj = app.project;
  const found = [...Array(proj.numItems)].find(...)
  return { ok: true, data: found.name }; // returns object, not string
};
```

---

### SKILL 2 — evalScript Bridge Pattern

The bridge between the CEP panel (JS) and After Effects (ExtendScript) is **string-based only**. Objects cannot cross the bridge.

**Rules:**
- ExtendScript must always `return JSON.stringify(result)`
- Panel JS must always `JSON.parse(result)` on the response
- Never pass complex objects as arguments to `evalScript` — serialize them first
- Pass arguments by injecting them into the script string (sanitize inputs)
- Always use a callback or Promise wrapper around `evalScript`
- **`evalScript` callbacks only fire when AE has window focus.** In testing: run the call, click the AE window, then switch back to the console to see the result.

**✅ Correct — Panel JS:**
```javascript
function callExtendScript(fnCall) {
  return new Promise(function(resolve, reject) {
    csInterface.evalScript(fnCall, function(result) {
      try {
        var parsed = JSON.parse(result);
        resolve(parsed);
      } catch (e) {
        reject(new Error('Bridge parse error: ' + result));
      }
    });
  });
}

// Usage
callExtendScript('getCompName("' + nodeId + '")')
  .then(function(res) {
    if (res.ok) console.log(res.data);
  });
```

**❌ Wrong:**
```javascript
csInterface.evalScript('getCompName()', function(result) {
  console.log(result.data); // result is a STRING, not an object
});
```

---

### SKILL 3 — evalScript Error Handling

Every ExtendScript function must be wrapped in try/catch. AE will not surface errors to the panel unless you explicitly catch and return them.

**Rules:**
- Every `.jsx` function returns `{ ok: boolean, data: any, error: string|null }`
- Always `return JSON.stringify(result)` as the last line — even on error
- Panel JS always checks `res.ok` before using `res.data`
- Log `res.error` to panel console when `res.ok === false`

**✅ Correct — ExtendScript:**
```jsx
function createProcediaFolder() {
  var result = { ok: false, data: null, error: null };
  try {
    var folder = findOrCreateFolder("DO NOT DELETE - Procedia");
    result.ok = true;
    result.data = folder.name;
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
```

**✅ Correct — Panel JS:**
```javascript
callExtendScript('createProcediaFolder()').then(function(res) {
  if (!res.ok) {
    console.error('[Procedia] Folder error:', res.error);
    return;
  }
  console.log('[Procedia] Folder ready:', res.data);
});
```

---

### SKILL 4 — AE Comp API

After Effects project items are **1-indexed**. Comps, folders, and footage are all `Item` subtypes. Always verify type before use.

**Rules:**
- Items are accessed via `app.project.item(i)` where `i` starts at **1**
- Always check `item instanceof CompItem` before treating it as a comp
- Always check `app.project.numItems > 0` before iterating
- `CompItem` properties: `.name`, `.duration`, `.frameRate`, `.width`, `.height`, `.comment`
- Use `.comment` field to store Procedia metadata (UUID, node type)

**✅ Correct:**
```jsx
function findCompById(uuid) {
  var result = { ok: false, data: null, error: null };
  try {
    var proj = app.project;
    for (var i = 1; i <= proj.numItems; i++) {
      var item = proj.item(i);
      if (item instanceof CompItem && item.comment === uuid) {
        result.ok = true;
        result.data = {
          name: item.name,
          duration: item.duration,
          frameRate: item.frameRate,
          width: item.width,
          height: item.height
        };
        break;
      }
    }
    if (!result.ok) result.error = "Comp not found: " + uuid;
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
```

---

### SKILL 5 — AE Layer & Property API

Layers contain properties organized in a **property group hierarchy**. Always navigate by **match name**, never by display name or index.

**Rules:**
- Access properties via `.property("matchName")` — not `.property(1)`
- Match names are stable across AE versions and language settings; display names are not
- Layer types: `AVLayer`, `TextLayer`, `ShapeLayer`, `CameraLayer`, `LightLayer`
- Always check `layer instanceof AVLayer` before accessing source
- `layer.property("ADBE Transform Group")` → access position, scale, rotation, opacity

**✅ Correct:**
```jsx
function getLayerOpacity(compUUID, layerIndex) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = findCompByUUID(compUUID);
    var layer = comp.layer(layerIndex);
    var transform = layer.property("ADBE Transform Group");
    var opacity = transform.property("ADBE Opacity").value;
    result.ok = true;
    result.data = opacity;
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
```

**❌ Wrong:**
```jsx
var opacity = layer.property(6).property(7).value; // breaks if layer order changes
```

---

### SKILL 6 — AE Effects API

Effects on a layer are accessed via the **Effects property group**. Each effect has a unique **match name** (e.g. `"ADBE Gaussian Blur 2"`). Never use display names or positional indexes.

**Rules:**
- Access via `layer.property("ADBE Effect Parade").property("EFFECT_MATCH_NAME")`
- Use the match name from the AE Effects Reference (see Excel sheet in repo)
- Effect properties are also accessed by their own match names, not index
- Always check if effect exists before accessing: `if (effectGroup !== null)`

**✅ Correct:**
```jsx
function getGaussianBlurValue(compUUID, layerIndex) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = findCompByUUID(compUUID);
    var layer = comp.layer(layerIndex);
    var effects = layer.property("ADBE Effect Parade");
    var blur = effects.property("ADBE Gaussian Blur 2");
    if (!blur) {
      result.error = "Gaussian Blur effect not found on layer";
      return JSON.stringify(result);
    }
    var blurAmount = blur.property("ADBE Gaussian Blur 2-0001").value;
    result.ok = true;
    result.data = blurAmount;
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
```

---

### SKILL 7 — AE Project Folder API

Procedia stores all AE-created items inside a dedicated folder: `"DO NOT DELETE - Procedia"`. This folder must always exist before any write operation.

**Rules:**
- On panel init, always call `findOrCreateProcediaFolder()` first
- `FolderItem` is the AE type for project folders
- Use `item.parentFolder` to check where items live
- Move items into the folder via `item.parentFolder = procediaFolder`
- Never create comps or items at project root — always parent to Procedia folder

**✅ Correct — find-or-create pattern:**
```jsx
function findOrCreateProcediaFolder() {
  var folderName = "DO NOT DELETE - Procedia";
  var proj = app.project;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof FolderItem && item.name === folderName) {
      return item;
    }
  }
  return proj.items.addFolder(folderName);
}
```

---

### SKILL 8 — Node Data Model

Every Procedia node maps 1-to-1 to an AE object. The link between them is a **UUID** stored in the AE object's `.comment` field.

**Rules:**
- Generate UUIDs on the panel JS side (not ExtendScript)
- UUID format: `PROC-{timestamp}-{random4}` e.g. `PROC-1714900000000-a3f2`
- Store UUID in `compItem.comment` for comp nodes
- Node display label is human-readable and separate from UUID
- The panel maintains a `nodeMap: { [uuid]: nodeData }` object in memory
- Never use `comp.name` as an identifier — names can be changed by the user

**✅ Correct — UUID generation (Panel JS):**
```javascript
function generateNodeId() {
  var rand = Math.random().toString(36).substr(2, 4);
  return 'PROC-' + Date.now() + '-' + rand;
}
```

**✅ Correct — node registry structure:**
```javascript
var nodeMap = {
  'PROC-1714900000000-a3f2': {
    id: 'PROC-1714900000000-a3f2',
    type: 'comp',
    label: 'Intro Animation',
    inputs: [],
    outputs: [],
    position: { x: 120, y: 240 }
  }
};
```

---

### SKILL 9 — Node State Management

The panel JS owns node graph state. AE is the source of truth for composition data. These two must stay in sync — but only when AE is idle.

**Rules:**
- Node graph state (positions, connections, labels) lives in panel JS memory
- AE comp data (duration, framerate, size) is always re-fetched from AE — never cached permanently
- Never call `evalScript` during AE render or when `app.isRenderEngineRunning` is true
- The comp checker polls AE every 2 seconds when panel is visible — pause on render
- On panel close/reopen, re-fetch all comp data by iterating UUIDs in `nodeMap`
- Use `app.project.autoSaveEnabled` check before heavy write operations

**✅ Correct — polling pattern (Panel JS):**
```javascript
var pollInterval = null;

function startCompChecker() {
  pollInterval = setInterval(function() {
    callExtendScript('isAEIdle()').then(function(res) {
      if (!res.ok || !res.data) return;
      syncAllNodes();
    });
  }, 2000);
}

function stopCompChecker() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
```

---

### SKILL 10 — Task Execution Protocol

Claude Code must never chain multiple tasks without verifying each one works inside After Effects first.

**Rules:**
- Every task starts with: read the relevant section of CLAUDE.md
- Implement **one logical unit** at a time (one function, one feature)
- After implementation, output a **testing checklist** — do not proceed until items are checked
- If a task touches `.jsx`, test the raw ExtendScript output first via `evalScript` before wiring UI
- Always commit working code before starting the next task
- If uncertain about an AE API, use the AE Effects Excel reference in the repo before guessing

**✅ Task structure Claude Code should follow:**
```
1. State what you are building (1 sentence)
2. List files you will touch
3. Write the code
4. Output verification checklist:
   - [ ] Panel loads without console errors
   - [ ] evalScript returns { ok: true }
   - [ ] AE object created/modified as expected
   - [ ] Edge case handled (not found, AE busy, etc.)
5. STOP. Wait for confirmation before next task.
```

**❌ Wrong behavior:**
```
Implement Task 1, Task 2, Task 3, and Task 4 in sequence automatically.
```
Claude Code must stop and verify after every single task.

---

### SKILL 11 — Plain-Script File Splitting

This project has **no bundler and no ES modules**. Files are loaded via `<script>` tags in `index.html` in exact top-to-bottom order. Splitting a large file is safe and encouraged — but only when every rule below is followed.

---

**When to split:**
- A panel JS file exceeds ~150 lines and contains two or more distinct responsibilities
- A `.jsx` file exceeds ~150 lines and mixes unrelated AE domains (e.g. comp operations + layer operations + effects in one file)
- A file is hard to navigate because functions from different concerns are interleaved

**When NOT to split:**
- A file is under ~80 lines — splitting adds overhead with no benefit
- All functions in the file are tightly coupled and always called together
- You are mid-task — only split at the start of a task as a planned, declared step

---

**Rule 1 — Every file must declare its dependencies at the top.**

No exceptions. This comment is the manual equivalent of an `import` statement. Without a bundler, it is the only way to communicate load-order requirements to anyone reading the code.

```javascript
// graph/wireRenderer.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js
```

```jsx
// jsx/layerOps.jsx
// DEPENDS ON: jsx/utils.jsx
// MUST LOAD BEFORE: jsx/compOps.jsx
```

**Rule 2 — `index.html` is the source of truth for load order.**

When a file is created or split, `index.html` must be updated in the same task. The `<script>` tags must reflect the dependency order declared in the file headers. Never leave a new file unregistered in `index.html`.

✅ Correct order in `index.html`:
```html
<!-- Core infrastructure — no dependencies -->
<script src="graph/graphState.js"></script>
<script src="graph/nodeRegistry.js"></script>

<!-- Node definitions — depend on nodeRegistry.js -->
<script src="graph/nodes/categories/core/Comp.js"></script>
<script src="graph/nodes/categories/core/Layer.js"></script>

<!-- Renderers — depend on graphState + nodeRegistry -->
<script src="graph/nodeRenderer.js"></script>
<script src="graph/wireRenderer.js"></script>

<!-- Entry point — depends on everything above -->
<script src="index.js"></script>
```

**Rule 3 — Every split creates a folder named after the original file.**

The split files live inside that folder. The original file is deleted. The folder is the replacement.

```
Before:
  graph/canvasRenderer.js

After:
  graph/canvasRenderer/
    nodeRenderer.js
    wireRenderer.js
```

This applies to every split, always — including 2-file splits. Never leave split files flat next to the original's former location.

**Rule 4 — Split by responsibility domain, not by line count alone.**

A split is only valid if each resulting file has a single, nameable responsibility. If you cannot name what a file does in 4 words or fewer, the split boundary is wrong.

✅ Valid splits:
- `canvasRenderer.js` → `canvasRenderer/nodeRenderer.js` + `canvasRenderer/wireRenderer.js`
- `aeOps.jsx` → `aeOps/compOps.jsx` + `aeOps/layerOps.jsx` + `aeOps/effectOps.jsx`
- `inspector.js` → `inspector/inspectorState.js` + `inspector/inspectorUI.js`

❌ Invalid splits:
- `nodeRegistry.js` → `nodeRegistry1.js` + `nodeRegistry2.js` (split by line count, not domain)
- Splitting one function across two files

**Rule 5 — Never split mid-task.**

Splitting is a structural change. It must be declared as its own task step before any code is written. Never decide to split a file while implementing a feature — finish the feature first, then split in a dedicated step.

✅ Correct task declaration:
```
APPROACH: Split canvasRenderer.js — create canvasRenderer/ folder with nodeRenderer.js
and wireRenderer.js, update index.html, delete canvasRenderer.js.
Then implement wire hit-testing in wireRenderer.js.
```

❌ Wrong:
```
[halfway through implementing wire hit-testing]
Actually, I'll move this to a new wireRenderer.js file...
```

**Rule 6 — After any split, the first verification checklist item is always:**
```
- [ ] Panel loads without console errors (open browser dev tools, check console tab)
```

A missing or misordered `<script>` tag produces a silent `undefined` reference — not a loud error. This checklist item catches it immediately.

---

**✅ Correct — full split example:**

Splitting `graph/canvasRenderer.js` into two files:

```
graph/
  canvasRenderer/          ← new folder, named after the original file
    nodeRenderer.js
    wireRenderer.js
                           ← canvasRenderer.js deleted
```

```javascript
// graph/canvasRenderer/nodeRenderer.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js
// MUST LOAD BEFORE: graph/canvasRenderer/wireRenderer.js, index.js

function drawNode(ctx, node) { /* ... */ }
function drawAllNodes(ctx) { /* ... */ }
```

```javascript
// graph/canvasRenderer/wireRenderer.js
// DEPENDS ON: graph/graphState.js, graph/canvasRenderer/nodeRenderer.js
// MUST LOAD BEFORE: index.js

function drawWire(ctx, wire) { /* ... */ }
function drawAllWires(ctx) { /* ... */ }
```

Updated `index.html`:
```html
<script src="graph/graphState.js"></script>
<script src="graph/nodeRegistry.js"></script>
<!-- canvasRenderer/ replaces canvasRenderer.js -->
<script src="graph/canvasRenderer/nodeRenderer.js"></script>
<script src="graph/canvasRenderer/wireRenderer.js"></script>
<script src="index.js"></script>
```

Then delete `graph/canvasRenderer.js` — the folder is its replacement, not an addition.

**❌ Wrong — two common mistakes:**
```javascript
// graph/wireRenderer.js          ← wrong: flat placement, not inside a folder
// (no dependency header)         ← wrong: no DEPENDS ON / MUST LOAD BEFORE declared

function drawWire(ctx, wire) {
  var nodes = graphState.nodeMap; // graphState may not be loaded yet — silent undefined
}
```

---

### SKILL 13 — Parent Port Geometry

Every affected node has exactly two parent ports: `parent_in` (left rectangle tab) and `child_out` (right rectangle tab). All other ports are circles on the top or bottom edge. These are strictly separate visual systems — never mix them.

**Rules:**
- `nodeGeometry.inputPortPositions()` and `outputPortPositions()` filter out `parent` type ports — they only return circle ports
- `nodeGeometry.parentInPortPosition()` and `childOutPortPosition()` return rectangle tab positions only
- Never include a `parent` port in `inputPortPositions` / `outputPortPositions` iteration
- Never compute port screen coordinates inline — always call `nodeGeometry.*`
- Parent wires use horizontal S-curve bezier; layer/data wires use vertical S-curve bezier
- `nodeGeometry.js` owns all constants: `NODE_WIDTH`, `NODE_HEIGHT`, `RECT_W`, `RECT_H`, `PORT_COLOR`
- `nodeHitTest.js` owns all hit testing; never write hit-radius math in renderer or input files

**Module load order dependency:**
```
nodeRegistry.js → nodeGeometry.js → nodeHitTest.js → nodeRenderer.js
```

**✅ Correct — reading a parent port position:**
```javascript
var tabPos = nodeGeometry.parentInPortPosition(nodeData, transform);
if (tabPos) { /* draw or hit-test at tabPos.x, tabPos.y */ }
```

**❌ Wrong — mixing parent into circle loop:**
```javascript
// nodeGeometry.inputPortPositions() already filters parent — don't add parent back
var ports = nodeGeometry.inputPortPositions(nodeData, transform);
ports.push({ port: 'parent_in', type: 'parent', x: ..., y: ... }); // never do this
```

---

### SKILL 12 — Grounded Decision Protocol

Claude Code must never oscillate between approaches, rewrite working code speculatively, or attempt to resolve ambiguity by trying multiple paths at once. Every decision is made once and locked.

---

#### RULE A — DECIDE-ONCE

Before writing any code, state the chosen approach in one sentence:

```
APPROACH: I will use [X] because [one reason].
```

That decision is **frozen** for the duration of the task. Do not revisit it unless the user explicitly changes the requirement.

**✅ Correct:**
```
APPROACH: I will store node positions in panel JS memory (not AE) because AE has no
suitable field for arbitrary graph layout data.
```

**❌ Wrong:**
```
I'll store positions in AE... actually, panel memory is better... let me try both.
```

---

#### RULE B — ESCALATION LADDER

When stuck, follow this exact sequence — no skipping:

```
STEP 1 → Re-read the relevant CLAUDE.md skill section
STEP 2 → Check the AE Effects Excel reference in the repo
STEP 3 → State what is unknown and ask the user ONE specific question
STOP.
```

Output format when reaching step 3:
```
STUCK: [one sentence describing what is unknown]
TRIED: [one sentence describing what was already attempted]
NEED: [one specific question for the user]
```

---

#### RULE C — AMBIGUITY GATE

If a task is underspecified, stop **before touching any file** and ask one clarifying question. Never resolve ambiguity by attempting both approaches.

**✅ Correct:**
```
AMBIGUOUS: "connect nodes" — I need to know the connection data format before writing.
QUESTION: Should a connection store { fromId, toId } or { fromId, fromPort, toId, toPort }?
```

---

| Situation | Required action | Forbidden action |
|---|---|---|
| Before writing code | State APPROACH in one sentence | Starting to code without a declared approach |
| Hitting an error | Follow escalation ladder, stop at step 3 | Rewriting from scratch or switching approaches |
| Vague task | Ask ONE clarifying question, wait | Attempting both interpretations simultaneously |

---

*Last updated: May 2026 — Procedia v3 (CEP, AE 2025+, Windows) — parent/child native ports, nodeGeometry/nodeHitTest modules*
