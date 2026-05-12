# SKILL-NODE-AUTHORING.md — Procedia
## How to Add, Test, and Debug a Node

**Prerequisite:** Read `CLAUDE.md` in full before using this skill. All 10 skills in CLAUDE.md apply — especially SKILL 1 (ES3 syntax), SKILL 2 (bridge pattern), and SKILL 3 (error handling). This skill does not repeat those rules — it builds on top of them.

---

## What a Node Is

In Procedia, a node is **a self-contained JavaScript object** that defines:
- What it is (identity)
- What connects to it (ports)
- What the user can configure (params)
- What it tells After Effects to do (apply)

Every node type lives in **exactly one file**. That file is the single source of truth for that node. Nothing about the node is defined anywhere else.

---

## The Node Definition Contract

Every node file must export a default object with **all eight fields**. No exceptions.

```javascript
// graph/nodes/categories/{category}/{NodeName}.js

export default {

  // ── 1. IDENTITY ──────────────────────────────────────────────────
  type:     'category/node-name',   // string, unique across all nodes, kebab-case
  label:    'Human Label',          // string, shown in the UI node palette
  category: 'Category',            // string, must match the folder name exactly
  version:  '1.0.0',               // string, semver — bump on any breaking param change

  // ── 2. PORTS ─────────────────────────────────────────────────────
  // Ports define what can be wired to this node.
  // type options: 'layer' | 'comp' | 'number' | 'color' | 'bool' | 'string'
  inputs: [
    { name: 'inputName', type: 'layer', required: true }
  ],
  outputs: [
    { name: 'outputName', type: 'layer' }
  ],

  // ── 3. PARAMS ────────────────────────────────────────────────────
  // Params are the inspector panel fields the user can edit.
  // type options: 'float' | 'int' | 'bool' | 'color' | 'enum' | 'string'
  params: [
    {
      key:     'paramKey',          // string, camelCase, used in apply() and AE scripts
      label:   'Param Label',       // string, shown in inspector
      type:    'float',             // see type options above
      default: 0,                   // must match the type
      min:     0,                   // only for float and int
      max:     100                  // only for float and int
    }
  ],

  // ── 4. APPLY ─────────────────────────────────────────────────────
  // Returns an ExtendScript string to be sent via evalScript.
  // Must follow SKILL 1 (ES3) and SKILL 2 (bridge pattern) from CLAUDE.md.
  // Return empty string '' if this node has no direct AE operation.
  apply: function(nodeData) {
    return (
      'myExtendScriptFunction(' +
      '"' + nodeData.id + '",' +
      nodeData.params.paramKey +
      ')'
    );
  }

};
```

---

## Field Rules

### type
- Format: `'category/node-name'` — always two segments, always kebab-case
- Examples: `'effects/gaussian-blur'`, `'core/comp'`, `'utility/math-add'`
- Must be unique across the entire registry — the registry will warn on duplicates
- Never change a type string after shipping — it breaks saved node graphs

### label
- Human-readable, title case
- Shown in the node palette and on the node header in the graph
- Can be changed freely without breaking anything

### category
- Must match the folder name under `graph/nodes/categories/` exactly
- Valid values: `'Core'`, `'Effects'`, `'Generators'`, `'Utility'`
- Used by `nodeRegistry.getByCategory()` to build the palette

### version
- Semver string: `'1.0.0'`
- Bump **patch** (`1.0.1`) for bug fixes that don't change param keys or port names
- Bump **minor** (`1.1.0`) for adding new optional params
- Bump **major** (`2.0.0`) for renaming/removing params or ports — this is a breaking change

### inputs / outputs
- Each port is `{ name, type, required }`
- `required` is optional and defaults to `false`
- Port `name` must be unique within the node's inputs array and within outputs array
- Port `type` must be one of: `'layer'`, `'comp'`, `'number'`, `'color'`, `'bool'`, `'string'`

### params
- `key` is camelCase and used directly in `apply()` via `nodeData.params.key`
- `default` must match the declared `type` — e.g. a `'bool'` default must be `true` or `false`, not `1` or `0`
- `min` and `max` are only valid on `'float'` and `'int'` types — omit them on all others
- For `'enum'` type, add an `options` array: `options: ['Option A', 'Option B']`
- For `'color'` type, default is an array: `default: [1, 1, 1, 1]` (RGBA, 0–1 range)

### apply
- Takes one argument: `nodeData` — the live node state object from the panel
- `nodeData.id` — the node UUID
- `nodeData.params` — object with all current param values keyed by `key`
- `nodeData.inputs` — array of connected input port data
- Must return a **string** — an ExtendScript function call, not an object
- String must be valid ES3-compatible ExtendScript (SKILL 1)
- Return `''` for orchestrator nodes (Comp, Layer) that don't directly apply AE operations

---

## Step-by-Step: Adding a New Node

### Step 1 — Decide identity

Answer these before writing a line:
- What category? (`Effects`, `Generators`, `Utility`, `Core`)
- What is the `type` string? (e.g. `'effects/gaussian-blur'`)
- What does it consume? (inputs)
- What does it produce? (outputs)
- What parameters does the user control?
- What ExtendScript function will it call?

### Step 2 — Create the file

File path: `graph/nodes/categories/{folder}/{NodeName}.js`

Use the contract template above. Fill every field. Do not skip `version` or `apply`.

### Step 3 — Register the node

Open `graph/nodeRegistry.js`. Add exactly two lines:

```javascript
// At the top with other imports:
import GaussianBlur from './nodes/categories/effects/GaussianBlur.js';

// In the registration block:
register(GaussianBlur);
```

No other file needs to change.

### Step 4 — Verify registration

Add this temporary line in panel init, open the panel in AE, check the browser console:

```javascript
console.log('[Registry] gaussian-blur:', nodeRegistry.getDefinition('effects/gaussian-blur'));
```

Expected output: the full definition object, not `null`.
Remove the debug line after confirming.

### Step 5 — Write the ExtendScript function

In the appropriate `.jsx` file, write the function that `apply()` calls. Follow SKILL 1 (ES3), SKILL 2 (bridge), and SKILL 3 (error handling) from `CLAUDE.md`.

The function signature must match what `apply()` returns. Example:

```jsx
// In effects.jsx or a relevant .jsx file
function applyGaussianBlur(nodeId, blurriness, dimensions, repeatEdge) {
  var result = { ok: false, data: null, error: null };
  try {
    // AE operations here
    result.ok = true;
    result.data = 'applied';
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
```

### Step 6 — Test end-to-end

See the Testing section below.

---

## Testing a Node

### Level 1 — Definition test (no AE needed)

Open the browser console in the CEP panel. Run:

```javascript
var def = nodeRegistry.getDefinition('effects/gaussian-blur');

// Check identity
console.assert(def !== null, 'Node not registered');
console.assert(def.type === 'effects/gaussian-blur', 'Wrong type');
console.assert(def.category === 'Effects', 'Wrong category');

// Check params have defaults
def.params.forEach(function(p) {
  console.assert(p.default !== undefined, 'Param missing default: ' + p.key);
});

// Check apply returns a string
var fakeNodeData = {
  id: 'PROC-TEST-0000',
  params: { blurriness: 10, dimensions: 0, repeatEdge: false },
  inputs: []
};
var script = def.apply(fakeNodeData);
console.assert(typeof script === 'string', 'apply() must return string');
console.assert(script.length > 0, 'apply() returned empty string');
console.log('[Test] apply() output:', script);
```

Expected: no assertion failures, script string logged correctly.

### Level 2 — ExtendScript test (AE required)

Take the string from `def.apply(fakeNodeData)` and run it directly via evalScript to verify the ExtendScript function exists and responds correctly:

```javascript
var script = def.apply(fakeNodeData);
csInterface.evalScript(script, function(result) {
  var parsed = JSON.parse(result);
  console.log('[Test] ExtendScript result:', parsed);
  console.assert(parsed.ok === true, 'ExtendScript returned ok: false — error: ' + parsed.error);
});
```

Expected: `{ ok: true, data: ..., error: null }`.

### Level 3 — Integration test (full graph)

1. Open the Procedia panel in AE with an active project
2. Add the new node from the palette
3. Wire it to a valid input (e.g. a Layer node connected to a Comp node)
4. Change a param in the inspector
5. Trigger the graph evaluation
6. Open AE timeline and confirm the effect was applied to the correct layer with the correct value
7. Check the AE browser console for any `[Procedia]` error messages

---

## Debugging a Node

### Problem: Node doesn't appear in the palette

**Check:**
1. Is `import` line present in `nodeRegistry.js`?
2. Is `register(NodeName)` line present in `nodeRegistry.js`?
3. Does `getDefinition('your/type')` return the object or `null`?
4. Is `category` spelled exactly the same as what the palette filters on?

### Problem: `apply()` output is malformed

**Check:**
1. Log `def.apply(fakeNodeData)` and read the raw string carefully
2. Are all string arguments wrapped in escaped quotes? `'"' + value + '"'`
3. Are numbers passed without quotes? `nodeData.params.blurriness` not `'"' + nodeData.params.blurriness + '"'`
4. Does the function name in the string exactly match the function name in the `.jsx` file?

### Problem: ExtendScript returns `ok: false`

**Check:**
1. Log `parsed.error` — read the actual AE error message
2. Does the `.jsx` function exist and is it loaded by the panel?
3. Are the argument types correct? (AE is strict about type mismatches)
4. Is the target comp or layer accessible? (UUID lookup returning null?)

### Problem: AE applies the wrong value

**Check:**
1. Log `nodeData.params` before calling `apply()` — are the values what you expect?
2. Check unit conversion — AE uses 0–255 for some properties, 0–1 for others
3. Check if the effect match name in the `.jsx` function is correct (refer to the AE Effects Excel reference in the repo)

### Problem: Console shows `[Registry] Duplicate node type`

**Cause:** Two node files registered with the same `type` string.
**Fix:** One of them has the wrong type — check both files and correct the string.

---

## Node File Checklist (before committing)

- [ ] File is at the correct path under `graph/nodes/categories/{folder}/`
- [ ] `type` is unique, follows `'category/node-name'` format
- [ ] `category` matches the folder name
- [ ] `version` is set to `'1.0.0'`
- [ ] All params have a `default` value matching their `type`
- [ ] `apply()` returns a string, not an object
- [ ] `apply()` string uses ES3-compatible ExtendScript (no `const`, no arrows)
- [ ] Import line added to `nodeRegistry.js`
- [ ] `register()` line added to `nodeRegistry.js`
- [ ] Level 1 test passes (definition test)
- [ ] Level 2 test passes (ExtendScript test)
- [ ] No debug `console.log` lines left in production code

---

*Last updated: May 2026 — Procedia v2 (CEP, AE 2025+, Windows)*
*This skill covers node authoring only. For ES3 rules, bridge patterns, and error handling — read CLAUDE.md.*
