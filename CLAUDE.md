# CLAUDE.md — Procedia v2

## What is Procedia?

Procedia is a **node-based procedural motion design plugin for Adobe After Effects**, built as a **CEP (Common Extensibility Platform) panel**. The panel UI runs in a Chromium-based environment. All After Effects operations are executed via **ExtendScript (.jsx)** bridged through `csInterface.evalScript()`.

**Stack:**
- Platform: Windows, CEP (not UXP)
- Panel language: JavaScript (modern JS is fine here)
- AE scripting language: ExtendScript — **strict ES3, no exceptions**
- Bridge: `csInterface.evalScript()` — string in, string out
- AE version: After Effects 2025+

## Architecture Reference

Before any task, read `PROCEDIA-V2-ARCHITECTURE.md` and `PROCEDIA-V2-TASKS.md` in this repo. The architecture spec is the single source of truth for behavior. The task spec is the execution order. This file (CLAUDE.md) is the discipline layer that governs HOW Claude Code implements each task.

---

## Quick Reference — 12 Skills

| # | Tier | Skill | Core Rule | Never Do |
|---|---|---|---|---|
| 1 | Critical | ExtendScript ES3 Strict | Write `.jsx` as if it's year 2000 | `const`, `let`, arrow functions, template literals, `forEach`, spread, destructuring |
| 2 | Critical | evalBridge Discipline | All evalScript calls go through `bridge/evalBridge.js` | Call `csInterface.evalScript()` from any other file |
| 3 | Critical | graphState Single-Mutator | Only `graph/graphState.js` mutates nodeMap/wireMap | Write to graphState fields from outside graphState.js |
| 4 | High | Match Name Discipline | Use `.property("matchName")` for AE properties | Use positional index or display names |
| 5 | High | UUID-Only Identity | Use `layer.comment` UUID to find layers | Use `.name` or layer index as identifier |
| 6 | High | Index Conversion | AE is 1-based, panel arrays 0-based — convert explicitly | Inline `+1` or `-1` scattered through code |
| 7 | High | Lazy Reserved Comp Init | Verify Reserved comp exists before every write | Assume previous init still holds |
| 8 | Quality | ASK / DECIDE / IMPLEMENT | State approach in 1 sentence before coding | Resolve ambiguity by writing both interpretations |
| 9 | Quality | Escalation Ladder | Stuck → re-read spec → ask one specific question | Rewrite from scratch as a way out of stuck |
| 10 | Quality | One Task at a Time | Verify checklist before next task | Chain multiple tasks in one session |
| 11 | Specialized | AE Effects Reference Pattern | Effects via `"ADBE Effect Parade"` → effect match name → property match name | Hardcode effect index or display name |
| 12 | Specialized | CEP Panel Lifecycle | Pause polling during render | Fire ExtendScript while `app.isRenderEngineRunning` |

---

## Detailed Sections

---

### SKILL 1 — ExtendScript ES3 Strict

**Tier: Critical**

ExtendScript runs on a **pre-ES5 engine**. Modern JavaScript features silently fail or throw cryptic errors inside After Effects.

**Rules:**
- Use `var` only — never `const` or `let`
- Use named functions — never arrow functions `() =>`
- Use string concatenation — never template literals `` `${}` ``
- Use `for` loops — never `.forEach()`, `.map()`, `.filter()`, `.reduce()`
- Never use destructuring `var { x } = obj`
- Never use spread `...args`
- Never use default parameters `function(x) { x = x || 0; }` instead
- Never use `Promise`, `async`, `await`
- Always use `JSON.stringify()` to return data — ExtendScript has it
- Always wrap function body in `try / catch` and return `{ ok, data, error }`

**✅ Correct:**
```jsx
function findCompByUUID(compId) {
  var result = { ok: false, data: null, error: null };
  try {
    var proj = app.project;
    for (var i = 1; i <= proj.numItems; i++) {
      var item = proj.item(i);
      if (item instanceof CompItem && item.comment === compId) {
        result.ok = true;
        result.data = { name: item.name, duration: item.duration };
        break;
      }
    }
    if (!result.ok) result.error = "Comp not found: " + compId;
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
```

**❌ Wrong:**
```jsx
const findCompByUUID = (compId) => {
  const proj = app.project;
  const found = [...Array(proj.numItems)].find(...);
  return { ok: true, data: found.name };  // returns object, not string
};
```

---

### SKILL 2 — evalBridge Discipline

**Tier: Critical**

The bridge between the CEP panel (JS) and After Effects (ExtendScript) is **string-based only**. Objects cannot cross the bridge.

**Rules:**
- `bridge/evalBridge.js` is the ONLY file allowed to call `csInterface.evalScript()`
- Every other file imports the `evalScript()` helper from evalBridge
- ExtendScript always returns `JSON.stringify({ ok, data, error })`
- Panel JS always calls `JSON.parse` and checks `res.ok` before using `res.data`
- Pass arguments by string-interpolating into the function call — never pass complex objects directly

**✅ Correct — bridge/evalBridge.js:**
```javascript
function evalScript(fnCall) {
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
```

**✅ Correct — usage in any other file:**
```javascript
evalScript('findCompByUUID("' + uuid + '")').then(function(res) {
  if (!res.ok) {
    console.error('[Procedia]', res.error);
    return;
  }
  // use res.data
});
```

**❌ Wrong:**
```javascript
// In some random file — bypassing evalBridge
csInterface.evalScript('findCompByUUID()', function(result) {
  console.log(result.data);  // result is a STRING, not an object
});
```

---

### SKILL 3 — graphState Single-Mutator Rule

**Tier: Critical**

`graph/graphState.js` is the **single source of truth** for in-memory graph data.

**Rules:**
- Only `graphState.js` writes to `nodes`, `wires`, or `selection`
- All other files dispatch actions via exposed functions: `addNode`, `removeNode`, `updateNode`, `addWire`, `removeWire`, `setSelection`
- Reading state from anywhere is fine — use `getNode`, `getAllNodes`, `getAllWires`
- Never inline-mutate a returned object: copy first, dispatch update second
- State changes fire registered callbacks — render loops subscribe instead of polling

**✅ Correct:**
```javascript
// canvas.js — needs to move a node
var node = graphState.getNode(uuid);
graphState.updateNode(uuid, { position: { x: newX, y: newY } });
```

**❌ Wrong:**
```javascript
// canvas.js — mutating returned reference
var node = graphState.getNode(uuid);
node.position.x = newX;  // graphState doesn't know this happened
```

---

### SKILL 4 — Match Name Discipline for AE Properties

**Tier: High**

Every AE property access goes through the **match name** string. Match names are stable across AE versions and language settings.

**Rules:**
- Access properties via `.property("matchName")` — never `.property(1)`
- Match names for common groups: `"ADBE Transform Group"`, `"ADBE Effect Parade"`, `"ADBE Mask Parade"`
- Match names for transform properties: `"ADBE Position"`, `"ADBE Scale"`, `"ADBE Rotate Z"`, `"ADBE Opacity"`
- Always check the property exists before accessing: `if (prop !== null && prop.canSetValue)`

**✅ Correct:**
```jsx
var transform = layer.property("ADBE Transform Group");
var position = transform.property("ADBE Position");
if (position && position.canSetValue) {
  position.setValue([960, 540]);
}
```

**❌ Wrong:**
```jsx
var position = layer.property(6).property(2);  // breaks on AE language change or layer type
```

---

### SKILL 5 — UUID-Only Identity

**Tier: High**

The link between a panel node and an AE object is the UUID stored in `.comment`. Names, indexes, and labels are user-visible and changeable — never use them as identifiers.

**Rules:**
- Set `layer.comment = uuid` IMMEDIATELY after creating the layer with `comp.layers.add()`
- Set `compItem.comment = uuid` IMMEDIATELY after creating a comp
- Find layers and comps by iterating the project or comp and matching `.comment`
- Display labels in the panel can change freely — they have nothing to do with identity

**✅ Correct:**
```jsx
function createTextLayer(compUUID, layerUUID, text) {
  var comp = findCompByUUID(compUUID);
  var layer = comp.layers.addText(text);
  layer.comment = layerUUID;  // FIRST thing after add
  return layer;
}
```

**❌ Wrong:**
```jsx
// Trying to find layer by name — breaks the moment user renames it
function findLayerByName(comp, name) {
  for (var i = 1; i <= comp.numLayers; i++) {
    if (comp.layer(i).name === name) return comp.layer(i);
  }
}
```

---

### SKILL 6 — 1-based vs 0-based Index Conversion

**Tier: High**

After Effects layer indexes are **1-based**. Panel memory arrays are **0-based**. The conversion happens in exactly one place per operation.

**Rules:**
- `comp.layer(i)` — `i` starts at 1
- `layer.moveTo(index)` — `index` is 1-based
- `layerOrder[]` array in panel memory — 0-based
- Conversion: `aeIndex = arrayIndex + 1` — always explicit, never inline math scattered through logic

**✅ Correct:**
```jsx
function setLayerOrder(compUUID, orderedUUIDs) {
  var comp = findCompByUUID(compUUID);
  for (var i = 0; i < orderedUUIDs.length; i++) {
    var layer = findLayerByUUID(comp, orderedUUIDs[i]);
    var aeIndex = i + 1;  // explicit conversion
    layer.moveTo(aeIndex);
  }
}
```

**❌ Wrong:**
```jsx
// Inline +1 buried inside a chain — easy to miss in review
layer.moveTo(orderedUUIDs.indexOf(uuid) + 1);
```

---

### SKILL 7 — Lazy Reserved Comp Init

**Tier: High**

The Reserved comp and its two text layers are the persistence backbone. The user may delete them at any time. Procedia does not auto-repair on a schedule — it detects-and-recreates at write time.

**Rules:**
- Before every write to dataLayer or dataWire, run a fast existence check
- If the folder is missing → recreate folder, recreate comp, recreate both text layers, write empty JSON, lock everything
- If only the comp is missing → recreate comp + layers
- If only a text layer is missing → recreate that text layer
- Never throw an error on missing infrastructure — silently rebuild and continue
- The user's responsibility is broken state recovery; Procedia's responsibility is not crashing

**✅ Correct:**
```jsx
function ensureReservedExists() {
  var folder = findFolder("DO NOT DELETE - Procedia");
  if (!folder) folder = createFolderAndCompAndLayers();
  var comp = findCompInFolder(folder, "__PROCEDIA_RESERVED__");
  if (!comp) comp = createCompAndLayers(folder);
  // verify both text layers, recreate any missing
  return comp;
}

function writeDataLayer(jsonString) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = ensureReservedExists();  // ALWAYS first
    var layer = findLayerByName(comp, "__PROCEDIA_DATA__");
    layer.locked = false;
    layer.property("ADBE Text Properties").property("ADBE Text Document").setValue(jsonString);
    layer.locked = true;
    result.ok = true;
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
```

---

### SKILL 8 — ASK / DECIDE / IMPLEMENT Protocol

**Tier: Quality**

Before writing any code, Claude Code must state — in one sentence — what it is about to build. That sentence is a contract. It cannot change mid-task without explicit user confirmation.

**Rules:**
- State the APPROACH in one sentence before touching any file
- If the task is ambiguous, ask ONE specific clarifying question and stop
- Never resolve ambiguity by writing both interpretations and asking the user to pick
- Never silently change approach mid-task

**✅ Correct:**
```
APPROACH: I will implement Task 2.4 by adding a drawNode(ctx, nodeData, transform) function to graph/node.js, then calling it from the canvas render loop for every node in graphState.getAllNodes().

Files I will touch:
- graph/node.js (new)
- graph/canvas.js (modify render loop)

Starting implementation now.
```

**❌ Wrong:**
```
Let me try implementing this two different ways and see which works better...
[writes 200 lines in two directions]
```

**Ambiguity example:**
```
AMBIGUOUS: Task says "node renders state via color". I need to know if the state affects fill, border, or both.
QUESTION: Should the state dot AND the border opacity both reflect state, or only the state dot?
```

---

### SKILL 9 — Escalation Ladder for Stuck States

**Tier: Quality**

When stuck, follow this exact sequence. Stop at step 3. Never rewrite from scratch as a way out.

**Step 1 — Re-read the relevant spec section.** Most "stuck" moments are caused by skipping a constraint that's already documented. Open `PROCEDIA-V2-ARCHITECTURE.md` or `PROCEDIA-V2-TASKS.md` and re-read the section relevant to the current task.

**Step 2 — Check existing patterns in the codebase.** Look at how similar functions are written in `graph/`, `jsx/`, or `inspector/`. If a pattern already exists, follow it.

**Step 3 — Ask ONE specific question in this format:**

```
STUCK: [one sentence — what specifically isn't working]
TRIED: [what I attempted and what happened]
NEED: [one specific piece of information that would unblock me]
```

**❌ Forbidden behaviors when stuck:**
```
Let me try a completely different approach...
Actually let me rewrite this whole function...
Maybe the issue is in a different file, let me refactor...
```

These are circling behaviors. The escalation ladder kills them.

---

### SKILL 10 — One Task at a Time, Verify Before Proceeding

**Tier: Quality**

The 20 tasks in `PROCEDIA-V2-TASKS.md` are 20 explicit checkpoints. Claude Code implements one task per session, outputs the verification checklist verbatim, and waits.

**Required output structure per task:**

```
1. APPROACH (one sentence — see SKILL 8)
2. FILES TOUCHED (list)
3. CODE (the actual implementation)
4. VERIFICATION CHECKLIST (copied verbatim from task spec)
5. STOP — wait for user confirmation
```

**❌ Forbidden:**
- Implementing Task 2.4 and Task 2.5 in the same response
- Skipping the checklist output
- Continuing to Task 2.5 because Task 2.4 "seemed simple enough"
- Combining multiple sub-features into one commit

The verification gate exists because AE bugs are silent. Without testing each task in real AE, bugs compound and become unfixable.

---

### SKILL 11 — AE Effects Reference Pattern

**Tier: Specialized**

Effects on a layer are accessed via the **Effects property group**. Each effect has a unique **match name**. Each effect's properties have their own match names.

**Rules:**
- Effect group accessed via `layer.property("ADBE Effect Parade")`
- Individual effect accessed via `effectGroup.property("EFFECT_MATCH_NAME")`
- Effect property accessed via `effect.property("PROPERTY_MATCH_NAME")`
- Always check effect exists before access: `if (effect !== null)`
- Match names follow a pattern but can vary — when uncertain, ask the user rather than guessing

**✅ Correct — full access pattern:**
```jsx
function setBlurAmount(compUUID, layerUUID, value) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = findCompByUUID(compUUID);
    var layer = findLayerByUUID(comp, layerUUID);
    var effects = layer.property("ADBE Effect Parade");
    var blur = effects.property("ADBE Gaussian Blur 2");
    if (!blur) {
      result.error = "Gaussian Blur not found on layer";
      return JSON.stringify(result);
    }
    var blurAmount = blur.property("ADBE Gaussian Blur 2-0001");
    if (blurAmount && blurAmount.canSetValue) {
      blurAmount.setValue(value);
      result.ok = true;
    }
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
```

**When unsure of a match name:** ask the user. Do not guess. A wrong match name fails silently — `effects.property("Wrong Name")` returns `null`, the code path skips the assignment, and no error surfaces. This is the worst class of AE bug.

---

### SKILL 12 — CEP Panel Lifecycle

**Tier: Specialized**

The panel runs inside AE's process. Anything the panel does affects AE's responsiveness. Heavy or ill-timed evalScript calls cause AE to freeze, stutter, or drop frames during render.

**Rules:**
- Before every poll tick, check `app.isRenderEngineRunning`. If true, skip the tick.
- The poller exposes `pause()` and `resume()` — call `pause()` before any write batch, `resume()` after.
- Listen for CEP lifecycle events:
  - `com.adobe.csxs.events.WorkspaceChanged` — panel may be hidden, polling should pause
  - `onPanelClosed` (via window beforeunload) — save final state, stop poller
- Never run a long-running `for` loop inside a single evalScript call. Break into chunks if needed.
- `csInterface.evalScript` is synchronous-looking but actually async. Never assume the callback fires before the next line of panel JS runs.

**✅ Correct — guard against render:**
```javascript
function pollTick() {
  evalScript('isAEIdle()').then(function(res) {
    if (!res.ok || !res.data) return;  // AE busy, skip
    runActualPoll();
  });
}
```

**✅ Correct — pause around writes:**
```javascript
function applyInspectorChange(uuid, property, value) {
  poller.pause();
  evalScript('updateNodeProperty("' + uuid + '", ...)').then(function(res) {
    poller.resume();
    if (!res.ok) handleError(res.error);
  });
}
```

---

## Task Execution Protocol

For every task in `PROCEDIA-V2-TASKS.md`:

```
1. Read the task section in PROCEDIA-V2-TASKS.md
2. Re-read any relevant section in PROCEDIA-V2-ARCHITECTURE.md
3. State APPROACH in one sentence (SKILL 8)
4. List files to touch
5. Write the code following all 12 skills
6. Output verification checklist verbatim
7. STOP — wait for user confirmation before next task
```

If at any point a skill rule conflicts with the task description, the skill rule wins. The skills exist because they prevented past failures. The task spec describes what to build; the skills describe how to build it safely.

---

*Last updated: May 2026 — Procedia v2 (CEP, AE 2025+, Windows)*
*This document governs HOW Claude Code implements every task. The architecture spec describes WHAT to build. The task spec describes the ORDER. This file describes the DISCIPLINE.*
