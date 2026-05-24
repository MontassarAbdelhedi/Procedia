# FEATURE — Dynamic Effect Schema Cache
*Procedia v4 · CEP · After Effects 2025+ · Windows · ExtendScript ES3*
*Prerequisite reading: CLAUDE.md (all 14 skills), PROCEDIA-V4-ARCHITECTURE.md*

---

## What This Feature Does

Effect nodes (FillEffect, GaussianBlur, DropShadow, etc.) currently require hardcoded
param declarations in their node definition files. This feature eliminates that requirement.

After this feature is built:
- An effect node declares only its `matchName` and `params: 'dynamic'`
- On first drop, Procedia queries AE for the effect's full property schema at runtime
- The schema is cached to `effectSchemaCache.json` inside the plugin directory
- Every subsequent drop of the same node type reads from cache — zero bridge calls
- When AE updates and a new version is detected on panel load, only changed schemas
  are re-introspected — unchanged schemas are preserved

This feature touches: one new panel JS file, one new dispatcher action, one new
utility function, engine.js (one new hook call), and all effect node definitions
(simplified to two fields). It does not touch cascadeAlgorithm.js, graphState.js,
wireValidator.js, or any non-effect node.

---

## Deliverables Checklist

- [ ] `graph/schemaCache.js` — new file — in-memory cache + disk read/write + diff logic
- [ ] `jsx/utils.jsx` — new function: `getAEVersion()`
- [ ] `jsx/dispatcher.jsx` — new action: `introspectEffect`
- [ ] `engine.js` — call `schemaCache.getSchema()` on node drop when `params: 'dynamic'`
- [ ] `effectSchemaCache.json` — new file — empty cache, ships with plugin
- [ ] `index.html` — add `<script>` tag for `schemaCache.js` in correct load order
- [ ] Effect node definitions — simplified (FillEffect.js shown as reference implementation)

---

## Phase Execution Plan

Each phase is a hard stop. Claude Code must complete the phase, output the
verification checklist, and wait for explicit developer confirmation before
proceeding to the next phase.

---

### PHASE 1 — Audit

Read and report on the following before touching any file:

1. Open `jsx/dispatcher.jsx` — list all existing action handler function names.
   Report the exact line number where a new action handler should be inserted.

2. Open `jsx/utils.jsx` — confirm whether `getAEVersion` already exists.
   Report the exact line number where a new utility function should be added.

3. Open `engine.js` — find the function that fires on node drop (the `onDrop` path).
   Report its exact name and line number.

4. Open `index.html` — find where panel JS files under `graph/` are loaded.
   Report the exact line number where the `schemaCache.js` script tag should be inserted
   (it must load after `nodeRegistry.js` and before `engine.js`).

5. Confirm that `effectSchemaCache.json` does NOT already exist in the plugin directory.

6. Open `graph/nodes/categories/effects/FillEffect.js` if it exists.
   If it does not exist, report that and note that the reference implementation in
   Phase 7 will be the first effect node file.

Output:
```
AUDIT COMPLETE
dispatcher.jsx — new action insertion line: [N]
utils.jsx — getAEVersion exists: [yes/no] — insertion line if no: [N]
engine.js — onDrop function name: [name] — line: [N]
index.html — schemaCache.js insertion line: [N]
effectSchemaCache.json — exists: [yes/no]
FillEffect.js — exists: [yes/no]
```

STOP. Wait for confirmation.

---

### PHASE 2 — Create `effectSchemaCache.json`

Create `effectSchemaCache.json` in the plugin root directory with this exact content:

```json
{
  "aeVersion": "",
  "schemas": {}
}
```

`aeVersion` is an empty string. This signals to `schemaCache.js` on panel load that
no cache exists yet — even if the file is present. The file ships with the plugin
pre-created so the write path never needs to create it from scratch.

Verification:
- [ ] `effectSchemaCache.json` exists in plugin root
- [ ] File contains exactly the structure above — no extra fields
- [ ] File is valid JSON (parseable without error)

STOP. Wait for confirmation.

---

### PHASE 3 — Add `getAEVersion` to `jsx/utils.jsx`

If `getAEVersion` already exists (from Phase 1 audit), skip this phase and report skip.

Add this function to `jsx/utils.jsx`:

```jsx
function getAEVersion() {
  var result = { ok: false, data: null, error: null };
  try {
    var version = app.version;
    result.ok = true;
    result.data = { version: version };
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
```

Rules:
- ES3 strict — `var` only, named function, no arrow functions
- Returns `JSON.stringify({ ok, data, error })` — never raw value
- `app.version` in AE 2025+ returns a string like `"25.1.0 (Build 73)"` —
  the full string is the version key. Do not attempt to parse or truncate it.
  Store the full string verbatim. Comparison is always full string equality.

Verification:
- [ ] Function added to `utils.jsx`
- [ ] ES3 compliant — no `const`, `let`, arrow functions, template literals
- [ ] Returns `JSON.stringify({ ok, data, error })` on both success and failure paths
- [ ] Panel DevTools console: `evalBridge.dispatch({ action: 'getAEVersion' })` —
  but wait — this is not a dispatcher action yet. Verify by checking the file only.
  Full integration test happens in Phase 8.

STOP. Wait for confirmation.

---

### PHASE 4 — Add `introspectEffect` to `jsx/dispatcher.jsx`

Add a new action handler `introspectEffect` to the dispatcher's action routing table.

**What this action does in AE (the algorithm):**

1. Find the Reserved Comp by UUID or by name prefix `"DO NOT DELETE"`
2. If Reserved Comp is not found: return `{ ok: false, error: 'Reserved Comp not found' }`
   — do NOT attempt to create it. Procedia never auto-repairs the Reserved Comp.
3. Add a temporary solid layer to the Reserved Comp:
   - Color: `[0, 0, 0]` (black)
   - Width/height: 100 × 100
   - Name: `"__PROCEDIA_INTROSPECT_TEMP__"`
   - Video switch: off (`layer.enabled = false`)
4. Apply the effect to the temp layer by match name:
   `var effect = tempLayer.Effects.addProperty(params.matchName)`
   If this throws (match name not found in AE): clean up temp layer, return
   `{ ok: false, error: 'Effect not found: ' + params.matchName }`
5. Walk all properties of the effect. For each property:
   - Read: `name`, `matchName`, `propertyValueType`
   - Only include properties whose `propertyValueType` is in the whitelist below
   - Read `defaultValue` for whitelisted properties
   - Build a schema entry object for each included property
6. Remove the effect from the temp layer: `effect.remove()`
7. Delete the temp layer: `tempLayer.remove()`
8. Return the collected schema array

**Property type whitelist — only introspect these AE property value types:**

```jsx
var ALLOWED_TYPES = [
  PropertyValueType.COLOR,
  PropertyValueType.TwoD,
  PropertyValueType.ThreeD,
  PropertyValueType.SCALAR,
  PropertyValueType.ANGLE,
  PropertyValueType.NO_VALUE   // boolean checkboxes in AE
];
```

Skip any property whose `propertyValueType` is not in this list. This filters out
`CUSTOM_VALUE`, `ONESHOT`, `GROUP`, `SHAPE`, `MARKER`, `LAYER_INDEX`, `MASK_INDEX`.

**Type mapping — convert AE enum to Procedia param type string:**

```jsx
function mapAETypeToProcediaType(pvt) {
  if (pvt === PropertyValueType.COLOR)    return 'color';
  if (pvt === PropertyValueType.TwoD)     return 'vector2';
  if (pvt === PropertyValueType.ThreeD)   return 'vector3';
  if (pvt === PropertyValueType.SCALAR)   return 'number';
  if (pvt === PropertyValueType.ANGLE)    return 'number';
  if (pvt === PropertyValueType.NO_VALUE) return 'boolean';
  return null;
}
```

**Schema entry object shape (one per property):**

```jsx
{
  matchName:    property.matchName,
  label:        property.name,
  type:         mappedType,       // 'color' | 'vector2' | 'vector3' | 'number' | 'boolean'
  defaultValue: property.defaultValue
}
```

**Complete action handler in ES3:**

```jsx
function actionIntrospectEffect(params) {
  var result = { ok: false, data: null, error: null };
  try {
    var reservedComp = findReservedComp();
    if (!reservedComp) {
      result.error = 'Reserved Comp not found — cannot introspect';
      return result;
    }

    var tempLayer = reservedComp.layers.addSolid(
      [0, 0, 0], '__PROCEDIA_INTROSPECT_TEMP__', 100, 100, 1
    );
    tempLayer.enabled = false;

    var effect;
    try {
      effect = tempLayer.Effects.addProperty(params.matchName);
    } catch (addErr) {
      tempLayer.remove();
      result.error = 'Effect not found in AE: ' + params.matchName;
      return result;
    }

    var schema = [];
    for (var i = 1; i <= effect.numProperties; i++) {
      var prop = effect.property(i);
      var pvt = prop.propertyValueType;
      var mappedType = mapAETypeToProcediaType(pvt);
      if (!mappedType) continue;
      var entry = {
        matchName:    prop.matchName,
        label:        prop.name,
        type:         mappedType,
        defaultValue: prop.defaultValue
      };
      schema.push(entry);
    }

    effect.remove();
    tempLayer.remove();

    result.ok = true;
    result.data = { matchName: params.matchName, properties: schema };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
```

Register this in the dispatcher's routing table under the key `'introspectEffect'`.

**Critical ES3 rules for this phase:**
- Use `for (var i = 1; ...)` — never `.forEach()` or `.map()`
- Use `var` — never `const` or `let`
- Named functions only — never arrow functions
- `findReservedComp()` already exists in `utils.jsx` — call it directly

Verification:
- [ ] `introspectEffect` action handler added to `dispatcher.jsx`
- [ ] Registered in dispatcher routing table
- [ ] ES3 compliant throughout — no modern JS
- [ ] Returns `{ ok, data, error }` on all paths including error paths
- [ ] Temp layer cleanup happens on BOTH success and failure paths
- [ ] Type whitelist applied — GROUP and CUSTOM_VALUE properties skipped

STOP. Wait for confirmation.

---

### PHASE 5 — Create `graph/schemaCache.js`

This is the new panel JS file that owns the entire schema cache system:
- In-memory cache (loaded at panel start)
- Disk read/write via `evalBridge`
- AE version detection and diff logic
- Public API for engine.js to consume

**Full file specification:**

```javascript
// graph/schemaCache.js
// Dependency: evalBridge.js, nodeRegistry.js
// Loaded after: nodeRegistry.js
// Loaded before: engine.js

var schemaCache = (function() {

  // --- Internal state ---
  var _memoryCache = {};      // { [matchName]: { properties: [...] } }
  var _aeVersion   = '';      // AE version string from last cache write
  var _ready       = false;   // true after init() completes

  // --- Public API ---

  function init() {
    // Called once on panel load, before any node drop.
    // 1. Read cache file from disk via dispatcher action 'readSchemaCache'
    // 2. Get AE version via dispatcher action 'getAEVersion'  (note: add this to dispatcher)
    // 3. Compare versions
    // 4. If match: load cache into memory, set _ready = true
    // 5. If mismatch: run diff, update cache, write to disk, set _ready = true
    // 6. If Reserved Comp missing during diff: skip diff, use existing cache as-is
    return evalBridge.dispatch({ action: 'readSchemaCache' })
      .then(function(res) {
        if (!res.ok) {
          console.warn('[schemaCache] Could not read cache file:', res.error);
          _ready = true;
          return;
        }
        var cached = res.data;
        _aeVersion   = cached.aeVersion   || '';
        _memoryCache = cached.schemas     || {};

        return evalBridge.dispatch({ action: 'getAEVersion' });
      })
      .then(function(res) {
        if (!res || !res.ok) {
          console.warn('[schemaCache] Could not get AE version:', res ? res.error : 'no response');
          _ready = true;
          return;
        }
        var currentVersion = res.data.version;

        if (currentVersion === _aeVersion) {
          // Versions match — cache is valid
          _ready = true;
          return;
        }

        // Version mismatch — run diff
        console.log('[schemaCache] AE version changed from "' + _aeVersion +
                    '" to "' + currentVersion + '" — running schema diff');
        return _runVersionDiff(currentVersion);
      })
      .catch(function(err) {
        console.error('[schemaCache] init error:', err);
        _ready = true;
      });
  }

  function hasSchema(matchName) {
    return !!_memoryCache[matchName];
  }

  function getSchema(matchName) {
    return _memoryCache[matchName] || null;
  }

  function storeSchema(matchName, schemaData) {
    // Called by engine.js after a successful introspect bridge call.
    // Stores in memory AND writes to disk immediately.
    _memoryCache[matchName] = schemaData;
    _writeToDisk();
  }

  function isReady() {
    return _ready;
  }

  // --- Internal helpers ---

  function _runVersionDiff(newVersion) {
    // Re-introspect all known match names.
    // Compare returned schema against cached schema.
    // Update only entries that changed.
    // Write updated cache to disk with new version string.
    // If Reserved Comp is missing for any introspect call, skip that entry silently.

    var knownMatchNames = Object.keys(_memoryCache);
    if (knownMatchNames.length === 0) {
      // Nothing cached yet — nothing to diff
      _aeVersion = newVersion;
      _ready = true;
      _writeToDisk();
      return;
    }

    var introspectPromises = knownMatchNames.map(function(matchName) {
      return evalBridge.dispatch({
        action: 'introspectEffect',
        params: { matchName: matchName }
      }).then(function(res) {
        return { matchName: matchName, res: res };
      });
    });

    return Promise.all(introspectPromises).then(function(results) {
      var changed = 0;
      for (var i = 0; i < results.length; i++) {
        var matchName = results[i].matchName;
        var res       = results[i].res;

        if (!res.ok) {
          // Effect no longer exists in this AE version — remove from cache
          console.warn('[schemaCache] Effect removed in new AE version:', matchName);
          delete _memoryCache[matchName];
          changed++;
          continue;
        }

        var newSchema    = res.data;
        var cachedSchema = _memoryCache[matchName];

        if (_schemasAreDifferent(cachedSchema, newSchema)) {
          console.log('[schemaCache] Schema changed for:', matchName);
          _memoryCache[matchName] = newSchema;
          changed++;
        }
      }

      _aeVersion = newVersion;
      _ready     = true;

      if (changed > 0) {
        console.log('[schemaCache] Diff complete — ' + changed + ' schema(s) updated');
        _writeToDisk();
      } else {
        console.log('[schemaCache] Diff complete — no changes');
        _writeToDisk(); // still write to update the aeVersion field
      }
    });
  }

  function _schemasAreDifferent(cachedSchema, newSchema) {
    // Compare property arrays by matchName and type.
    // If any property added, removed, or type-changed: schemas are different.
    var cached = cachedSchema.properties || [];
    var fresh  = newSchema.properties    || [];

    if (cached.length !== fresh.length) return true;

    var cachedIndex = {};
    for (var i = 0; i < cached.length; i++) {
      cachedIndex[cached[i].matchName] = cached[i];
    }

    for (var j = 0; j < fresh.length; j++) {
      var prop = fresh[j];
      if (!cachedIndex[prop.matchName])               return true;
      if (cachedIndex[prop.matchName].type !== prop.type) return true;
    }

    return false;
  }

  function _writeToDisk() {
    var payload = {
      aeVersion: _aeVersion,
      schemas:   _memoryCache
    };
    evalBridge.dispatch({
      action: 'writeSchemaCache',
      params: { cache: payload }
    }).then(function(res) {
      if (!res.ok) {
        console.error('[schemaCache] Failed to write cache to disk:', res.error);
      }
    });
  }

  return {
    init:        init,
    hasSchema:   hasSchema,
    getSchema:   getSchema,
    storeSchema: storeSchema,
    isReady:     isReady
  };

})();
```

**Important note on `Object.keys`:** This is panel JS (Chromium), not ExtendScript.
`Object.keys` is valid here. Do not use it in any `.jsx` file.

Verification:
- [ ] `graph/schemaCache.js` created with exact structure above
- [ ] Public API exposes: `init`, `hasSchema`, `getSchema`, `storeSchema`, `isReady`
- [ ] `init()` returns a Promise
- [ ] `_runVersionDiff` re-introspects all known match names
- [ ] `_schemasAreDifferent` compares by property count, matchName presence, and type
- [ ] `_writeToDisk` calls `writeSchemaCache` dispatcher action (to be added in Phase 6)
- [ ] No AE API calls in this file — it is panel JS only

STOP. Wait for confirmation.

---

### PHASE 6 — Add `readSchemaCache` and `writeSchemaCache` to `jsx/dispatcher.jsx`

Two new action handlers are needed for disk I/O on the `effectSchemaCache.json` file.

**`readSchemaCache`** — reads the file and returns its parsed contents:

```jsx
function actionReadSchemaCache(params) {
  var result = { ok: false, data: null, error: null };
  try {
    var pluginFolder = new Folder($.fileName).parent;
    var cacheFile    = new File(pluginFolder.fsName + '/effectSchemaCache.json');

    if (!cacheFile.exists) {
      result.ok   = true;
      result.data = { aeVersion: '', schemas: {} };
      return result;
    }

    cacheFile.open('r');
    var raw = cacheFile.read();
    cacheFile.close();

    var parsed = JSON.parse(raw);
    result.ok   = true;
    result.data = parsed;
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
```

**`writeSchemaCache`** — serializes the cache object and writes it to disk:

```jsx
function actionWriteSchemaCache(params) {
  var result = { ok: false, data: null, error: null };
  try {
    var pluginFolder = new Folder($.fileName).parent;
    var cacheFile    = new File(pluginFolder.fsName + '/effectSchemaCache.json');

    cacheFile.open('w');
    cacheFile.write(JSON.stringify(params.cache));
    cacheFile.close();

    result.ok   = true;
    result.data = { written: true };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
```

**`getAEVersion`** — returns the running AE version string:

```jsx
function actionGetAEVersion(params) {
  var result = { ok: false, data: null, error: null };
  try {
    result.ok   = true;
    result.data = { version: app.version };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
```

Register all three in the dispatcher routing table under keys:
`'readSchemaCache'`, `'writeSchemaCache'`, `'getAEVersion'`

**Critical note on `$.fileName`:**
In a CEP ExtendScript context, `$.fileName` returns the path of the currently
executing ExtendScript file. The cache file lives in the plugin root directory,
which is the parent of the `jsx/` folder where `dispatcher.jsx` lives.
`new Folder($.fileName).parent` gives the `jsx/` folder.
`new Folder($.fileName).parent.parent` gives the plugin root.
Verify which level is correct based on actual directory structure from Phase 1 audit.

**ES3 rules:**
- `Folder` and `File` are AE/ExtendScript built-ins — use them directly
- `JSON.parse` and `JSON.stringify` — valid because `json.jsx` polyfill is loaded first
- `var` only, named functions, `for` loops

Verification:
- [ ] `readSchemaCache` handler added and registered
- [ ] `writeSchemaCache` handler added and registered
- [ ] `getAEVersion` handler added and registered
- [ ] All three are ES3 compliant
- [ ] `$.fileName` path resolves to the correct directory (verify by logging during test)
- [ ] `readSchemaCache` returns empty schema object — not an error — when file is missing

STOP. Wait for confirmation.

---

### PHASE 7 — Update `engine.js` — Dynamic Schema Hook on Node Drop

Add schema resolution logic to the node drop path inside `engine.js`.

The engine's drop handler currently calls `node.onDrop(nodeData)` and adds the node
to `nodeMap`. After this phase it must also:

1. Check if the dropped node's definition has `params: 'dynamic'`
2. If `params` is not `'dynamic'` — proceed as normal (no change for non-effect nodes)
3. If `params === 'dynamic'`:
   a. Read `matchName` from the node definition
   b. Call `schemaCache.hasSchema(matchName)`
   c. If `true` — schema is in cache. Read it with `schemaCache.getSchema(matchName)`.
      Store schema on the node instance in `nodeMap` under key `dynamicSchema`.
      Call `inspector.render(nodeData)` with the schema-enriched node data.
      Done.
   d. If `false` — cache miss. Fire the introspect bridge call:
      `evalBridge.dispatch({ action: 'introspectEffect', params: { matchName } })`
      On success: call `schemaCache.storeSchema(matchName, res.data)`.
      Store schema on the node instance in `nodeMap` under key `dynamicSchema`.
      Call `inspector.render(nodeData)` with the schema-enriched node data.
      On failure: log the error. The node stays in the graph with no inspector params.
      Do not remove the node — let the user see it as a ghost with no schema.

**Where in `nodeMap` the schema is stored:**

The `dynamicSchema` key is a runtime-only field on the node instance — it is never
written to `tempGraph` and never persisted. It is populated fresh on every drop
(from cache or from AE) and on every panel load that restores alive dynamic nodes.

**Schema stored shape in `nodeMap`:**

```javascript
nodeMap['PROC-abc'].dynamicSchema = {
  matchName: 'ADBE Fill',
  properties: [
    { matchName: 'ADBE Fill-0002', label: 'Color',   type: 'color',  defaultValue: [1,0,0,1] },
    { matchName: 'ADBE Fill-0003', label: 'Opacity', type: 'number', defaultValue: 100 }
  ]
};
```

**Panel load restoration:**
When the panel loads and restores nodes from persistence, any node with `params: 'dynamic'`
must also trigger the schema resolution path (step 3 above) — even though the node is
being restored rather than freshly dropped. The schema is not persisted. It must always
be resolved fresh: from cache first, from AE second.

Verification:
- [ ] `engine.js` — node drop path checks for `params: 'dynamic'`
- [ ] Cache hit path: reads from `schemaCache.getSchema()`, stores to `nodeMap`, renders inspector
- [ ] Cache miss path: fires `introspectEffect` bridge call, stores on success, logs on failure
- [ ] Panel load restoration path: applies same schema resolution to restored dynamic nodes
- [ ] Non-dynamic nodes are completely unaffected — no change to their drop path
- [ ] `dynamicSchema` is stored on node instance in `nodeMap`, not in `tempGraph`

STOP. Wait for confirmation.

---

### PHASE 8 — Update `inspector.js` — Render Dynamic Schema

The inspector currently renders params from the static `params` array on the node
definition. After this phase it must also handle `params: 'dynamic'` nodes.

**Logic:**

```javascript
function renderInspector(nodeData, nodeDef) {
  if (nodeDef.params === 'dynamic') {
    // Dynamic node — render from nodeMap dynamicSchema
    var schema = nodeData.dynamicSchema;
    if (!schema || !schema.properties || schema.properties.length === 0) {
      // Schema not yet resolved — show loading state
      _renderLoadingState();
      return;
    }
    _renderDynamicParams(nodeData, schema.properties);
  } else {
    // Static node — render from nodeDef.params array as before
    _renderStaticParams(nodeData, nodeDef.params);
  }
}
```

**`_renderDynamicParams`** — builds inspector UI from schema properties:

Each property in `schema.properties` maps to an inspector field:
- `type: 'color'`   → color picker
- `type: 'number'`  → number input
- `type: 'vector2'` → two number inputs (X, Y)
- `type: 'vector3'` → three number inputs (X, Y, Z)
- `type: 'boolean'` → checkbox

The value is read from `nodeData.props[property.matchName]` —
stored under the property's match name, not a short key.
If no stored value exists for a property, display the `property.defaultValue`.

When the user changes a value in the inspector, call:
`graphState.updateProp(nodeData.id, property.matchName, newValue)`

This stores the value in `nodeData.props[property.matchName]` — keyed by match name.
The dirty flusher picks it up and calls `onPropertyChange` on the node definition.

Verification:
- [ ] Inspector renders dynamic schema params correctly for all five param types
- [ ] Inspector shows loading state when `dynamicSchema` is not yet resolved
- [ ] Value reads from `nodeData.props[property.matchName]`
- [ ] Falls back to `property.defaultValue` when no stored value exists
- [ ] Inspector change fires `graphState.updateProp` with `property.matchName` as key
- [ ] Static node rendering is completely unaffected

STOP. Wait for confirmation.

---

### PHASE 9 — Reference Implementation: `FillEffect.js`

Write or rewrite `graph/nodes/categories/effects/FillEffect.js` as the canonical
example of a dynamic effect node.

```javascript
// graph/nodes/categories/effects/FillEffect.js
// Dependency: nodeRegistry.js
// Dynamic effect node — params are introspected from AE at runtime

nodeRegistry.register({

  type:      'effects/fill',
  label:     'Fill',
  category:  'Effects',
  version:   '1.0.0',

  nodeKind:  'effector',
  dedicated: false,

  matchName: 'ADBE Fill',
  params:    'dynamic',

  ports: [
    { id: 'layer_in', category: 'input',  type: 'layer', extendable: true, required: true },
    { id: 'output',   category: 'output', type: 'layer', extendable: false }
  ],

  onDrop: function(nodeData) {
    return null;
  },

  onAlive: function(nodeData, hostingCompUUID) {
    // Apply the effect to the hosted layer.
    // All param values are stored in nodeData.props keyed by property matchName.
    // The dispatcher applies them by matchName — never by index.
    return {
      action: 'applyDynamicEffect',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        matchName:       'ADBE Fill',
        props:           nodeData.props
      }
    };
  },

  onGhost: function(nodeData, hostingCompUUID) {
    return {
      action: 'removeEffect',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        matchName:       'ADBE Fill'
      }
    };
  },

  onDelete: function(nodeData) {
    return null; // effector — no standalone AE object to delete
  },

  onPropertyChange: function(key, value, nodeData, hostingCompUUID) {
    // key is a property matchName (e.g. 'ADBE Fill-0002')
    // value is the new value
    return {
      action: 'setEffectProperty',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        effectMatchName: 'ADBE Fill',
        propMatchName:   key,
        value:           value
      }
    };
  }

});
```

This file is complete. Adding a new effect node (DropShadow, GaussianBlur, etc.)
means duplicating this file, changing `type`, `label`, and `matchName`. Nothing else.

**New dispatcher actions needed by this node:**

`applyDynamicEffect` — applies an effect and sets all its properties from a props map:

```jsx
function actionApplyDynamicEffect(params) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'Comp not found'; return result; }
    var layer = findLayerByUUID(comp, params.nodeUUID);
    if (!layer) { result.error = 'Layer not found'; return result; }

    // Find or create the effect by match name
    var effect = null;
    for (var i = 1; i <= layer.Effects.numProperties; i++) {
      if (layer.Effects.property(i).matchName === params.matchName) {
        effect = layer.Effects.property(i);
        break;
      }
    }
    if (!effect) {
      effect = layer.Effects.addProperty(params.matchName);
    }

    // Apply all stored prop values by matchName
    var props = params.props;
    for (var i = 1; i <= effect.numProperties; i++) {
      var prop = effect.property(i);
      if (props[prop.matchName] !== undefined) {
        try {
          prop.setValue(props[prop.matchName]);
        } catch (setErr) {
          // Property may be read-only or type mismatch — log and continue
          $.writeln('[Procedia] setEffectProp skipped: ' + prop.matchName + ' — ' + setErr);
        }
      }
    }

    result.ok   = true;
    result.data = { applied: params.matchName };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
```

`setEffectProperty` — updates a single property on a live effect:

```jsx
function actionSetEffectProperty(params) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) { result.error = 'Comp not found'; return result; }
    var layer = findLayerByUUID(comp, params.nodeUUID);
    if (!layer) { result.error = 'Layer not found'; return result; }

    var effect = null;
    for (var i = 1; i <= layer.Effects.numProperties; i++) {
      if (layer.Effects.property(i).matchName === params.effectMatchName) {
        effect = layer.Effects.property(i);
        break;
      }
    }
    if (!effect) { result.error = 'Effect not found: ' + params.effectMatchName; return result; }

    var prop = null;
    for (var j = 1; j <= effect.numProperties; j++) {
      if (effect.property(j).matchName === params.propMatchName) {
        prop = effect.property(j);
        break;
      }
    }
    if (!prop) {
      // Property not found — may have been removed in an AE update
      // Fall back to default silently
      result.ok   = true;
      result.data = { skipped: params.propMatchName };
      return result;
    }

    prop.setValue(params.value);
    result.ok   = true;
    result.data = { set: params.propMatchName };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
```

Add both to `dispatcher.jsx` and register under keys `'applyDynamicEffect'` and
`'setEffectProperty'`.

Verification:
- [ ] `FillEffect.js` written with exact structure above
- [ ] `<script>` tag added to `index.html` in the effects group
- [ ] `applyDynamicEffect` added to `dispatcher.jsx` and registered
- [ ] `setEffectProperty` added to `dispatcher.jsx` and registered
- [ ] Both dispatcher actions are ES3 compliant
- [ ] Both use match name navigation — never index navigation
- [ ] `setEffectProperty` handles missing property gracefully (fallback, not error)

STOP. Wait for confirmation.

---

### PHASE 10 — Add `schemaCache.js` to `index.html`

Add the script tag for `schemaCache.js` to `index.html`.

Load order requirement:
- Must load AFTER `nodeRegistry.js`
- Must load BEFORE `engine.js`

```html
<script src="graph/schemaCache.js"></script>
```

Insert it at the exact line identified in Phase 1 audit.

Verification:
- [ ] Script tag added at correct position in `index.html`
- [ ] `schemaCache.js` loads after `nodeRegistry.js` in DOM order
- [ ] `schemaCache.js` loads before `engine.js` in DOM order
- [ ] Panel loads without `schemaCache is not defined` errors in browser console

STOP. Wait for confirmation.

---

### PHASE 11 — Call `schemaCache.init()` on Panel Load

In `index.js` (panel entry point), add the `schemaCache.init()` call to the panel
startup sequence.

`schemaCache.init()` must be called after `evalBridge` is ready but before any node
drop can occur. It returns a Promise. The panel should not enable the node palette
(drag-to-canvas) until `schemaCache.isReady()` returns `true`.

Pattern:

```javascript
// In panel startup sequence, after evalBridge is ready:
schemaCache.init().then(function() {
  console.log('[Procedia] Schema cache ready');
  // Enable node palette, restore graph, etc.
});
```

If the init Promise rejects or the Reserved Comp is missing, log the error and
continue panel load — the schema cache degrades gracefully to introspect-on-demand.

Verification:
- [ ] `schemaCache.init()` called in `index.js` startup sequence
- [ ] Panel waits for init Promise before enabling node palette
- [ ] Error case handled — panel loads even if cache init fails
- [ ] Browser console shows `[Procedia] Schema cache ready` on panel open

STOP. Wait for confirmation.

---

### PHASE 12 — Integration Test

Run all five scenarios below. Report results per scenario. Do not proceed past a
failing scenario without developer instruction.

**Setup:** Open AE. Open the Procedia panel. Open browser DevTools console.

---

**SCENARIO 1 — First drop, cache miss**

```
Clear effectSchemaCache.json to: { "aeVersion": "", "schemas": {} }
Reload panel
Drop a FillEffect node onto canvas
Expected:
  - Console: '[schemaCache] cache miss — introspecting ADBE Fill'
  - Console: '[schemaCache] schema stored for ADBE Fill'
  - Inspector renders Fill effect params (Color, Opacity, etc.)
  - effectSchemaCache.json now contains ADBE Fill schema
  - aeVersion field in cache matches app.version string
```

---

**SCENARIO 2 — Second drop, cache hit**

```
(continuing from Scenario 1 — cache now contains ADBE Fill)
Drop a second FillEffect node
Expected:
  - NO introspect bridge call (no temp layer flash in Reserved Comp)
  - Console: '[schemaCache] cache hit — ADBE Fill'
  - Inspector renders immediately
  - effectSchemaCache.json unchanged
```

---

**SCENARIO 3 — Panel reload, cache survives**

```
Reload the panel
Drop a FillEffect node
Expected:
  - Cache loaded from disk on panel init
  - No introspect call on drop
  - Inspector renders correctly
```

---

**SCENARIO 4 — Param change applies to AE**

```
Drop FillEffect → wire it to a TextNode → wire TextNode to a CompNode
FillEffect goes alive
In inspector: change Fill color to blue [0, 0, 1, 1]
Expected:
  - After 300ms debounce: Fill effect on the TextNode layer updates to blue in AE
  - nodeMap props for this FillEffect contain { 'ADBE Fill-0002': [0,0,1,1] }
```

---

**SCENARIO 5 — Version diff (simulated)**

```
In effectSchemaCache.json, manually change "aeVersion" to "99.0.0 (fake)"
Reload panel
Expected:
  - Console: '[schemaCache] AE version changed from "99.0.0 (fake)" to "[real version]"'
  - Console: '[schemaCache] Diff complete — 0 changes' (assuming AE hasn't changed)
  - effectSchemaCache.json aeVersion updated to real AE version string
  - All cached schemas preserved
```

STOP. Report all five scenario results before proceeding.

---

### PHASE 13 — Commit

```
git add -A
git commit -m "feat: dynamic effect schema cache — introspect AE params on drop, cache to disk, diff on version change"
git push
```

Confirm push success. Report branch name and commit hash.

---

## Rules Reminder for Claude Code

These rules apply to every phase without exception. Do not rationalize exceptions.

1. ES3 in all `.jsx` files — `var`, named functions, string concat, `for` loops only
2. Every `.jsx` function returns `JSON.stringify({ ok, data, error })`
3. `evalBridge.js` is the only file that calls `csInterface.evalScript()`
4. `graphState.js` is the only file that mutates `nodeMap` and `wireMap`
5. `dispatcher.jsx` is the only file that writes AE API calls
6. `engine.js` contains zero node-type conditionals
7. Navigate AE properties by match name — never by index
8. Temp layer in Reserved Comp must be cleaned up on both success AND failure paths
9. One phase = one stop. Never chain phases without explicit developer confirmation
10. `Object.keys` is valid in panel JS (Chromium) — forbidden in `.jsx` files

---

*FEATURE-DYNAMIC-SCHEMA-CACHE.md — Procedia v4 — May 2026*
*Prerequisite: CLAUDE.md, PROCEDIA-V4-ARCHITECTURE.md*
*This brief is complete and ready to hand to Claude Code.*
