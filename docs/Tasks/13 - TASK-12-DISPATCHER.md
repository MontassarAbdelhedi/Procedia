# TASK-12 — dispatcher.jsx, utils.jsx, json.jsx
*Procedia v4 — Twelfth task. Builds on completed TASK-01 through TASK-11.*
*This task crosses the JS/AE boundary for the first time. ExtendScript ES3 rules are absolute.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 1, 2, 3, 4, 5, 6, 7, 8 in full — every ExtendScript skill
2. `PROCEDIA-V4-ARCHITECTURE.md` — Sections 5, 9, 11 in full

**Read Skill 1 twice.** Every rule in it will be violated if not internalized.

Confirm both files are present at repo root before starting.

---

## Context

This task implements the three `.jsx` files that handle all After Effects API calls. After this task, Procedia can create comps, create layers, park layers, delete layers, and set layer properties inside a live AE session.

**Three files in this task:**

| File | What it does |
|---|---|
| `jsx/json.jsx` | JSON polyfill for ExtendScript. Must load before everything else. |
| `jsx/utils.jsx` | AE object lookup utilities. Used by dispatcher action handlers. |
| `jsx/dispatcher/dispatcher.jsx` | The only file that writes AE API calls. Routes commands to action handlers. |

**Testing** requires After Effects to be open and the panel loaded as a CEP extension. Browser-only testing is not possible for this task. All verifications are done inside AE.

---

## What This Task Does NOT Do

- No persistence (`jsx/persistence.jsx` is TASK-13)
- No polling (`jsx/polling.jsx` is TASK-13)
- No new node definition files
- No panel JS changes

Files written: `jsx/json.jsx`, `jsx/utils.jsx`, `jsx/dispatcher/dispatcher.jsx`.

---

## CRITICAL: ExtendScript Rules — No Exceptions

Before writing a single line, internalize these. Any violation causes silent failures in AE.

1. **`var` only.** No `const`, no `let`.
2. **Named functions only.** No arrow functions `() =>`.
3. **String concatenation only.** No template literals `` `${}` ``.
4. **`for` loops only.** No `.forEach`, `.map`, `.filter`, `.reduce`.
5. **No destructuring.** No `var { x } = obj`. Access by property name.
6. **No spread.** No `...args`.
7. **No default parameters.** Guard inside function body.
8. **No `Promise`, `async`, `await`.** All code is synchronous.
9. **`JSON` is NOT native.** `jsx/json.jsx` must be loaded first. Never use `JSON.parse` or `JSON.stringify` without the polyfill.
10. **Every function returns `JSON.stringify({ ok, data, error })`.** Always. Even on error paths.
11. **All AE item access is 1-based.** `app.project.item(1)` is the first item, not `item(0)`.
12. **Always wrap AE calls in try/catch.** AE throws on missing objects, locked comps, render-in-progress, and many other conditions.

---

## PHASE 1 — `jsx/json.jsx`

### What it is

A JSON polyfill that provides `JSON.parse` and `JSON.stringify` for ExtendScript's ES3 engine. ExtendScript does not have native JSON — it must be loaded explicitly.

### Implementation

Useouglas Crockford's original `json2.js` implementation, adapted for ExtendScript. The key requirement: it must define `JSON` as a global object with `parse` and `stringify` methods, and it must not throw if `JSON` is already defined.

**Implement the guard at the top:**

```jsx
// jsx/json.jsx
// JSON polyfill for ExtendScript
// MUST be the first file evaluated in any evalBridge preamble.
// DEPENDS ON: none

if (typeof JSON === 'undefined') {
  JSON = {};
}

if (typeof JSON.stringify !== 'function') {
  // ... implement JSON.stringify ...
}

if (typeof JSON.parse !== 'function') {
  // ... implement JSON.parse ...
}
```

**Source:** Implement a complete, production-correct JSON polyfill. It must handle:
- Strings (with escape sequences: `\"`, `\\`, `\/`, `\b`, `\f`, `\n`, `\r`, `\t`, unicode `\uXXXX`)
- Numbers (integers and floats, including negative)
- Booleans (`true`, `false`)
- `null`
- Arrays (nested)
- Objects (nested, keys must be strings)
- Circular reference detection in `stringify` (throw `TypeError`)

Do not use a third-party library file. Implement the polyfill directly. It must be complete and self-contained.

**Test the polyfill by running this in the AE Script Editor (`File → Scripts → Run Script File...` or the ESTK):**

```jsx
#include "jsx/json.jsx"

var obj = { action: "test", params: { uuid: "PROC-abc-1234", value: 42, flag: true, arr: [1, 2, 3] } };
var str = JSON.stringify(obj);
var back = JSON.parse(str);

$.writeln("Stringified: " + str);
$.writeln("Parsed action: " + back.action);
$.writeln("Parsed value: " + back.params.value);
$.writeln("Parsed arr[2]: " + back.params.arr[2]);
$.writeln("PASS: " + (back.action === "test" && back.params.value === 42 && back.params.arr[2] === 3));
```

Expected output: `PASS: true`

---

### Phase 1 verification

Run the test script above in the AE Script Editor or ESTK.

- [ ] Output includes `PASS: true`
- [ ] Stringified output is valid JSON
- [ ] Nested objects and arrays round-trip correctly

**STOP. Paste the ESTK output. Wait for confirmation.**

---

## PHASE 2 — `jsx/utils.jsx`

### What it is

Utility functions used by dispatcher action handlers. Provides AE object lookup by UUID, Reserved Comp management, and layer movement between comps.

### Naming convention

The Reserved Comp name: `'DO NOT DELETE \u2014 Procedia Reserved'` (em dash, not double hyphen). This must be exact — it is the string used to identify the comp in every lookup.

### Public functions

Implement each of the following as a named function in file scope. They are called directly by name from `dispatcher.jsx` — no module pattern, no exports.

---

**`findCompByUUID(uuid)`**

```
Find and return the CompItem whose .comment property equals uuid.
Return null if not found.
Never return the Reserved Comp — skip any comp whose name starts with 'DO NOT DELETE'.
```

```jsx
function findCompByUUID(uuid) {
  var proj = app.project;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof CompItem) {
      if (item.name.indexOf('DO NOT DELETE') === 0) continue; // skip Reserved Comp
      if (item.comment === uuid) return item;
    }
  }
  return null;
}
```

---

**`findLayerByUUID(comp, uuid)`**

```
Find and return the layer in comp whose .comment property equals uuid.
Return null if not found.
comp is a CompItem.
```

```jsx
function findLayerByUUID(comp, uuid) {
  for (var i = 1; i <= comp.numLayers; i++) {
    if (comp.layer(i).comment === uuid) return comp.layer(i);
  }
  return null;
}
```

---

**`findReservedComp()`**

```
Find and return the Reserved Comp.
Return null if not found — never create it here.
```

```jsx
function findReservedComp() {
  var proj = app.project;
  var name = 'DO NOT DELETE \u2014 Procedia Reserved';
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof CompItem && item.name === name) return item;
  }
  return null;
}
```

---

**`findOrCreateReservedComp()`**

```
Find the Reserved Comp. If not found, create it inside the Procedia folder.
Always returns a CompItem — never returns null.
Creates the Procedia folder if it does not exist.
```

Reserved Comp properties when created:
- Name: `'DO NOT DELETE \u2014 Procedia Reserved'`
- Width: 1, Height: 1 (minimal — it is never rendered)
- Frame rate: 24
- Duration: 1 second
- Pixel aspect ratio: 1.0

```jsx
function findOrCreateReservedComp() {
  var existing = findReservedComp();
  if (existing) return existing;

  // Find or create the Procedia folder
  var proj = app.project;
  var folder = null;
  var folderName = 'DO NOT DELETE \u2014 Procedia Reserved';
  for (var i = 1; i <= proj.numItems; i++) {
    if (proj.item(i) instanceof FolderItem && proj.item(i).name === folderName) {
      folder = proj.item(i);
      break;
    }
  }
  if (!folder) folder = proj.items.addFolder(folderName);

  // Create the Reserved Comp inside the folder
  var comp = proj.items.addComp(folderName, 1, 1, 1.0, 1, 24);
  comp.parentFolder = folder;
  return comp;
}
```

---

**`findLayerInReserved(uuid)`**

```
Find a layer in the Reserved Comp whose .comment equals uuid.
Return null if Reserved Comp does not exist or layer not found.
```

```jsx
function findLayerInReserved(uuid) {
  var reserved = findReservedComp();
  if (!reserved) return null;
  return findLayerByUUID(reserved, uuid);
}
```

---

**`moveLayerToComp(layer, targetComp)`**

```
Move a layer from its current comp to targetComp.
AE does not have a native "move layer between comps" API.
The correct approach:
  1. Get the source comp from layer.containingComp
  2. Duplicate the layer into targetComp using layer.copyToComp(targetComp)
  3. Set the new layer's .comment to match the original
  4. Delete the original layer
Return the new layer in targetComp, or null on failure.
```

```jsx
function moveLayerToComp(layer, targetComp) {
  var sourceComp = layer.containingComp;
  var uuid = layer.comment;
  layer.copyToComp(targetComp);
  // The copy is the last layer added to targetComp
  var newLayer = targetComp.layer(targetComp.numLayers);
  newLayer.comment = uuid;
  layer.remove();
  return newLayer;
}
```

---

**`setPropertyByKey(layer, key, value)`**

Routes a property key string to the correct AE property and sets its value. Used by `setLayerProperty` action handler.

Property key map — implement as a routing function using if/else (no switch, no object map — must be ES3 `if` chains):

```
'label'    → layer.name = value
'opacity'  → layer.property('ADBE Transform Group').property('ADBE Opacity').setValue(value)
'position' → layer.property('ADBE Transform Group').property('ADBE Position').setValue(value)
'rotation' → layer.property('ADBE Transform Group').property('ADBE Rotate Z').setValue(value)
'scale'    → layer.property('ADBE Transform Group').property('ADBE Scale').setValue(value)
'content'  → (TextLayer only) layer.property('ADBE Text Properties').property('ADBE Text Document').setValue(
               layer.property('ADBE Text Properties').property('ADBE Text Document').value
               — set .text on the TextDocument, then setValue back)
'fontSize' → same path as content but set .fontSize
'color'    → same path as content but set .fillColor (array [r,g,b] range 0-1)
```

For `content` and `fontSize` and `color`: AE text properties require getting the `TextDocument` object, modifying it, and setting it back. Example:

```jsx
// Setting text content:
var textProp = layer.property('ADBE Text Properties').property('ADBE Text Document');
var doc = textProp.value;
doc.text = value;
textProp.setValue(doc);
```

For unrecognized keys: log to `$.writeln` and return without error.

---

### Phase 2 verification

Test `utils.jsx` functions in the AE Script Editor with an open project:

```jsx
#include "jsx/json.jsx"
#include "jsx/utils.jsx"

// Test findOrCreateReservedComp
var reserved = findOrCreateReservedComp();
$.writeln("Reserved comp: " + (reserved ? reserved.name : "NULL"));
$.writeln("PASS reserved: " + (reserved !== null && reserved.name.indexOf("DO NOT DELETE") === 0));

// Test findCompByUUID — create a test comp
var testComp = app.project.items.addComp("_test_proc", 1920, 1080, 1.0, 10, 24);
testComp.comment = "PROC-TEST-utils-0001";
var found = findCompByUUID("PROC-TEST-utils-0001");
$.writeln("findCompByUUID: " + (found ? found.name : "NULL"));
$.writeln("PASS findCompByUUID: " + (found !== null && found.comment === "PROC-TEST-utils-0001"));

// Test findCompByUUID does not return Reserved Comp
var foundReserved = findCompByUUID(reserved.comment);
$.writeln("PASS reserved not findable: " + (foundReserved === null));

// Test findLayerByUUID
var testLayer = testComp.layers.addNull(10);
testLayer.comment = "PROC-TEST-layer-0001";
var foundLayer = findLayerByUUID(testComp, "PROC-TEST-layer-0001");
$.writeln("findLayerByUUID: " + (foundLayer ? foundLayer.comment : "NULL"));
$.writeln("PASS findLayerByUUID: " + (foundLayer !== null));

// Test moveLayerToComp
var targetComp = app.project.items.addComp("_test_target", 1920, 1080, 1.0, 10, 24);
var movedLayer = moveLayerToComp(foundLayer, targetComp);
$.writeln("PASS moveLayerToComp: " + (movedLayer !== null && movedLayer.comment === "PROC-TEST-layer-0001"));
$.writeln("Layer removed from source: " + (findLayerByUUID(testComp, "PROC-TEST-layer-0001") === null));

// Cleanup
testComp.remove();
targetComp.remove();
$.writeln("Utils tests complete.");
```

- [ ] All `PASS` lines output `true`
- [ ] Reserved Comp created in project panel under the correct folder
- [ ] No AE errors or exceptions

**STOP. Paste ESTK output. Wait for confirmation.**

---

## PHASE 3 — `jsx/dispatcher/dispatcher.jsx`

### Structure

The dispatcher is a single file with three parts:

1. **Preamble** — `#include` statements for `json.jsx` and `utils.jsx`
2. **Action handler functions** — one named function per action
3. **Routing** — `dispatch()` and `dispatchBatch()` entry points

### Preamble

```jsx
// jsx/dispatcher/dispatcher.jsx
// DEPENDS ON: jsx/json.jsx, jsx/utils.jsx
// THE ONLY EXTENDSCRIPT WRITER. The only file with AE API calls.

#include "../json.jsx"
#include "../utils.jsx"
```

### Entry points

```jsx
function dispatch(commandJSON) {
  var result = { ok: false, data: null, error: null };
  try {
    var cmd = JSON.parse(commandJSON);
    result = _route(cmd.action, cmd.params);
  } catch (e) {
    result.error = 'dispatch error: ' + e.toString();
  }
  return JSON.stringify(result);
}

function dispatchBatch(commandArrayJSON) {
  var result = { ok: true, data: [], error: null };
  try {
    var commands = JSON.parse(commandArrayJSON);
    for (var i = 0; i < commands.length; i++) {
      var r = _route(commands[i].action, commands[i].params);
      result.data.push(r);
      if (!r.ok) {
        result.ok = false;
        result.error = 'Batch item ' + i + ' failed: ' + r.error;
        // Do not break — continue processing remaining commands
      }
    }
  } catch (e) {
    result.ok = false;
    result.error = 'dispatchBatch error: ' + e.toString();
  }
  return JSON.stringify(result);
}

function _route(action, params) {
  if (action === 'createComp')        return actionCreateComp(params);
  if (action === 'createTextLayer')   return actionCreateTextLayer(params);
  if (action === 'createNullLayer')   return actionCreateNullLayer(params);
  if (action === 'addCompAsLayer')    return actionAddCompAsLayer(params);
  if (action === 'parkLayer')         return actionParkLayer(params);
  if (action === 'unparkLayer')       return actionUnparkLayer(params);
  if (action === 'deleteParkedLayer') return actionDeleteParkedLayer(params);
  if (action === 'deleteComp')        return actionDeleteComp(params);
  if (action === 'setLayerProperty')  return actionSetLayerProperty(params);
  if (action === 'setCompProperty')   return actionSetCompProperty(params);
  if (action === 'setLayerParent')    return actionSetLayerParent(params);
  if (action === 'clearLayerParent')  return actionClearLayerParent(params);
  if (action === 'setLayerOrder')     return actionSetLayerOrder(params);
  if (action === 'renameNode')        return actionRenameNode(params);
  if (action === 'focusComp')         return actionFocusComp(params);
  return { ok: false, data: null, error: 'Unknown action: ' + action };
}
```

### Action handler implementations

Implement each as a named function. All return `{ ok, data, error }` — never `JSON.stringify`. The entry points handle serialization.

---

**`actionCreateComp(params)`**

```
params: { nodeUUID, label, width, height, fps, duration, bgColor }
bgColor: [r, g, b] range 0-1

1. findOrCreateReservedComp() — ensures the Procedia folder exists
2. folder = find Procedia folder (first FolderItem named 'DO NOT DELETE...')
3. comp = app.project.items.addComp(label, width, height, 1.0, duration, fps)
4. comp.comment = nodeUUID
5. comp.bgColor = bgColor  (AE accepts [r,g,b] array, range 0-1)
6. comp.parentFolder = folder
7. Return { ok: true, data: { compName: comp.name } }
```

---

**`actionCreateTextLayer(params)`**

```
params: { nodeUUID, hostingCompUUID, content, fontSize, color, position, rotation, opacity, label }
color: [r, g, b, a] range 0-1

1. comp = findCompByUUID(hostingCompUUID) — if null: return error
2. textLayer = comp.layers.addText(content)
3. textLayer.comment = nodeUUID
4. textLayer.name = label

5. Set text properties:
   var textProp = textLayer.property('ADBE Text Properties').property('ADBE Text Document');
   var doc = textProp.value;
   doc.fontSize = fontSize;
   doc.fillColor = [color[0], color[1], color[2]];  // AE text fillColor is RGB, no alpha
   textProp.setValue(doc);

6. Set transform:
   var xform = textLayer.property('ADBE Transform Group');
   xform.property('ADBE Position').setValue(position);    // [x, y]
   xform.property('ADBE Rotate Z').setValue(rotation);    // degrees
   xform.property('ADBE Opacity').setValue(opacity);      // 0-100

7. Return { ok: true, data: { layerName: textLayer.name } }
```

---

**`actionCreateNullLayer(params)`**

```
params: { nodeUUID, hostingCompUUID, position, rotation, opacity, scale, label }

NullNode is dedicated: true — it requires a FootageItem (solid) in the project panel.
AE null layers created via comp.layers.addNull() do NOT need a separate FootageItem.
The 'dedicated' flag means the null layer has a corresponding project item tracked by Procedia,
but AE's addNull() handles this internally.

1. comp = findCompByUUID(hostingCompUUID) — if null: return error
2. nullLayer = comp.layers.addNull(10)  (duration: 10 seconds default)
3. nullLayer.comment = nodeUUID
4. nullLayer.name = label

5. Set transform:
   var xform = nullLayer.property('ADBE Transform Group');
   xform.property('ADBE Position').setValue(position);
   xform.property('ADBE Rotate Z').setValue(rotation);
   xform.property('ADBE Opacity').setValue(opacity);
   xform.property('ADBE Scale').setValue(scale);    // [x%, y%]

6. Return { ok: true, data: { layerName: nullLayer.name } }
```

---

**`actionAddCompAsLayer(params)`**

```
params: { nodeUUID, hostingCompUUID }
Used when a CompNode is wired into another comp as a pre-comp layer.

1. sourceComp = findCompByUUID(nodeUUID)
   — Note: nodeUUID IS the UUID of the comp, stored in comp.comment
   — if null: return error

2. hostingComp = findCompByUUID(hostingCompUUID) — if null: return error

3. preCompLayer = hostingComp.layers.add(sourceComp)
   — Adds sourceComp as a pre-comp layer in hostingComp
4. preCompLayer.comment = nodeUUID
5. preCompLayer.name = sourceComp.name

6. Return { ok: true, data: { layerName: preCompLayer.name } }
```

---

**`actionParkLayer(params)`**

```
params: { nodeUUID, hostingCompUUID }

1. comp = findCompByUUID(hostingCompUUID) — if null: return error
2. layer = findLayerByUUID(comp, nodeUUID) — if null: return error
3. reserved = findOrCreateReservedComp()
4. movedLayer = moveLayerToComp(layer, reserved)
5. Return { ok: true, data: { parked: nodeUUID } }
```

---

**`actionUnparkLayer(params)`**

```
params: { nodeUUID, hostingCompUUID }

1. reserved = findReservedComp() — if null: return error 'Reserved Comp not found'
2. layer = findLayerByUUID(reserved, nodeUUID) — if null: return error
3. comp = findCompByUUID(hostingCompUUID) — if null: return error
4. movedLayer = moveLayerToComp(layer, comp)
5. Return { ok: true, data: { unparked: nodeUUID } }
```

---

**`actionDeleteParkedLayer(params)`**

```
params: { nodeUUID }

1. reserved = findReservedComp()
   — if null: return { ok: true, data: { deleted: nodeUUID } }
     (Reserved Comp gone — layer is already gone, treat as success)
2. layer = findLayerByUUID(reserved, nodeUUID)
   — if null: return { ok: true, data: { deleted: nodeUUID } }
     (Layer already gone — treat as success)
3. layer.remove()
4. Return { ok: true, data: { deleted: nodeUUID } }
```

---

**`actionDeleteComp(params)`**

```
params: { nodeUUID }

1. comp = findCompByUUID(nodeUUID) — if null: return { ok: true } (already gone)
2. comp.remove()
3. Return { ok: true, data: { deleted: nodeUUID } }
```

---

**`actionSetLayerProperty(params)`**

```
params: { nodeUUID, hostingCompUUID, key, value }

1. comp = findCompByUUID(hostingCompUUID) — if null: return error
2. layer = findLayerByUUID(comp, nodeUUID) — if null: return error
3. Call setPropertyByKey(layer, key, value)
4. Return { ok: true, data: { key: key } }
```

---

**`actionSetCompProperty(params)`**

```
params: { nodeUUID, key, value }

1. comp = findCompByUUID(nodeUUID) — if null: return error

2. Route by key:
   'label'    → comp.name = value
   'width'    → comp.width = value
   'height'   → comp.height = value
   'fps'      → comp.frameRate = value
   'duration' → comp.duration = value   (in seconds)
   'bgColor'  → comp.bgColor = value    ([r,g,b] range 0-1)

3. Return { ok: true, data: { key: key } }
```

---

**`actionSetLayerParent(params)`**

```
params: { childNodeUUID, parentNodeUUID, hostingCompUUID }

1. comp = findCompByUUID(hostingCompUUID) — if null: return error
2. childLayer  = findLayerByUUID(comp, childNodeUUID)  — if null: return error
3. parentLayer = findLayerByUUID(comp, parentNodeUUID) — if null: return error
4. childLayer.parent = parentLayer
5. Return { ok: true, data: { child: childNodeUUID, parent: parentNodeUUID } }
```

---

**`actionClearLayerParent(params)`**

```
params: { nodeUUID }
Clears the parent of the layer identified by nodeUUID.
The layer may be in any comp — search all comps.

1. Find the layer by UUID across all comps:
   for each comp in project (skip Reserved):
     layer = findLayerByUUID(comp, nodeUUID)
     if found: break

2. If not found: return { ok: true } (already gone, treat as success)
3. layer.parent = null
4. Return { ok: true, data: { cleared: nodeUUID } }
```

---

**`actionSetLayerOrder(params)`**

```
params: { nodeUUID, hostingCompUUID, order }
order: 0-based index. 0 = top of stack in AE (layer index 1).

1. comp = findCompByUUID(hostingCompUUID) — if null: return error
2. layer = findLayerByUUID(comp, nodeUUID) — if null: return error
3. AE layers are 1-based. Target AE index = order + 1.
4. layer.moveToBeginning()  (moves to index 1)
   Then move down by (order) steps:
   for (var i = 0; i < order; i++) { layer.moveAfter(comp.layer(i + 1)); }
   — This positions the layer at AE index (order + 1).
5. Return { ok: true, data: { order: order } }
```

---

**`actionRenameNode(params)`**

```
params: { nodeUUID, label }
Renames the AE layer or comp corresponding to nodeUUID.

1. Try finding as a layer first (search all comps):
   found = false
   for each comp (skip Reserved):
     layer = findLayerByUUID(comp, nodeUUID)
     if found: layer.name = label; found = true; break

2. If not found as layer, try as comp:
   comp = findCompByUUID(nodeUUID)
   if comp: comp.name = label

3. Return { ok: true, data: { label: label } }
```

---

**`actionFocusComp(params)`**

```
params: { nodeUUID }

1. comp = findCompByUUID(nodeUUID) — if null: return error
2. app.project.activeItem = comp
3. Return { ok: true, data: { focused: nodeUUID } }
```

---

### Phase 3 verification — in After Effects

Install the CEP extension (symlink the repo into the AE extensions folder, enable debug mode via `.debug` file). Open AE. Open the panel via `Window → Extensions → Procedia`.

**Test sequence:**

1. **Drop a Comp node** — confirm an AE comp appears in the project panel
2. **Drop a Text node, wire it to the Comp** — confirm a text layer appears inside the comp
3. **Drop a Null node, wire it to the Comp** — confirm a null layer appears
4. **Change the text node's content in the inspector** — confirm the AE text layer updates after 300ms
5. **Disconnect the Text node from the Comp** — confirm the text layer moves to the Reserved Comp
6. **Reconnect the Text node to the Comp** — confirm the text layer returns from the Reserved Comp
7. **Delete the Text node** — confirm the layer is removed from the Reserved Comp permanently
8. **Delete the Comp node** — confirm the AE comp is removed from the project panel

**Checklist:**
- [ ] All 8 steps complete without AE errors or JS console errors
- [ ] The Reserved Comp is never visible to the user as an active comp (it exists in the folder but is not focused)
- [ ] Layer UUIDs are stored in `.comment` fields — verify by clicking a layer and checking its comment in the AE Info panel or ESTK
- [ ] `dispatchBatch` works — connect Text + Null to the same Comp, then disconnect the Comp wire — both layers should park in one bridge crossing

**STOP. Describe what you see in AE. Wait for confirmation.**

---

## Additional Rules for This Task

**`#include` paths are relative to the file being run.** `dispatcher.jsx` is in `jsx/dispatcher/`. Its includes must be `#include "../json.jsx"` and `#include "../utils.jsx"` — not absolute paths.

**`comp.layers.addNull(duration)` takes duration in seconds.** Pass `10` as the duration. This is independent of the comp's duration — the null layer duration can exceed the comp duration without error.

**`comp.layers.add(sourceComp)` is the correct API for pre-comp layers.** Not `addText`, not `addNull`. Passing a `CompItem` to `layers.add()` adds it as a pre-comp layer.

**`layer.copyToComp(targetComp)` does not return the new layer.** It copies the layer but the return value is unreliable across AE versions. Always access the copy via `targetComp.layer(targetComp.numLayers)` immediately after the call — the copy is always added as the last layer.

**`comp.bgColor` accepts `[r, g, b]` — not `[r, g, b, a]`.** AE comps have no alpha background. Pass exactly three channels.

**`TextDocument.fillColor` accepts `[r, g, b]` — not `[r, g, b, a]`.** Strip the alpha channel when setting text color. `color` in the panel is RGBA — use only `[color[0], color[1], color[2]]`.

**`setPropertyByKey` for `'color'` on a text layer uses `fillColor`, not `textColor`.** The AE API property is `fillColor`.

**`actionDeleteParkedLayer` and `actionDeleteComp` treat missing objects as success.** If the layer or comp is already gone (user deleted it manually in AE), return `{ ok: true }`. These are idempotent operations.

**`dispatchBatch` never stops on failure.** It processes all commands in order and accumulates results. One failed `parkLayer` in a cascade does not prevent the remaining `parkLayer` commands from running. `result.ok` is set to `false` if any command fails, but processing continues.

**Never use `$.writeln` in production code.** Use it only in test scripts. Remove all debug logging from `dispatcher.jsx` before task completion.

---

## On Completion

When all AE integration tests pass, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-12 COMPLETE

jsx/json.jsx                     ✅  ESTK verified
jsx/utils.jsx                    ✅  ESTK verified
jsx/dispatcher/dispatcher.jsx    ✅  AE integration verified

All 8 AE integration tests passed.
Park/unpark cycle confirmed.
dispatchBatch confirmed (multi-node cascade).

Next task: TASK-13 — persistence.jsx + polling.jsx
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-12-DISPATCHER.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 1–8 (read Skill 1 twice) — PROCEDIA-V4-ARCHITECTURE.md Sections 5, 9, 11*
*WARNING: All code in this task is ExtendScript ES3. Any ES5+ syntax causes silent failure in AE.*
