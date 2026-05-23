# TASK-20 — Expression.js Utility Node Definition
*Procedia v4 — Twentieth task. Builds on completed TASK-01 through TASK-19.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 1, 9, 10, 12 in full
2. `PROCEDIA-V4-ARCHITECTURE.md` — Sections 1a (effector nodeKind), 3b (effector port rule), 4, 5b in full
3. `TASK-16-EFFECT-NODES.md` — the effector pattern, especially `upstreamNodeUUID` resolution and the engine/cascadeAlgorithm updates

Confirm both files are present at repo root before starting.

---

## Context

The Expression node applies an AE expression string to a property on the upstream layer. It is an **effector** node — same nodeKind, same port pattern, same lifecycle as FillEffect and GaussianBlur.

Key differences from effect nodes:

| Property | Effect nodes (Fill, Blur) | Expression node |
|---|---|---|
| AE mechanism | `layer.Effects.addProperty(matchName)` | `property.expression = expressionString` |
| AE identifier | `effect.comment = nodeUUID` | `property.expressionEnabled = true` + UUID stored separately |
| `onGhost` | Remove the effect | Disable the expression on the property |
| `onDelete` | Remove the effect | Disable the expression on the property |
| Params | Effect-specific (color, blurriness) | `targetProperty` (string match name), `expression` (JS string) |

---

## What This Task Does NOT Do

- No other node files
- No canvas or UI changes
- No persistence changes

Files written: `graph/nodes/categories/utility/Expression.js`

Files modified: `jsx/dispatcher/dispatcher.jsx` — add `applyExpression` and `removeExpression` action handlers.

---

## Expression Node — AE Mechanism

In After Effects, expressions are applied to individual **properties** — not to layers or effects. A property is accessed by its match name string. Examples:

```
Opacity:   layer.property('ADBE Transform Group').property('ADBE Opacity')
Position:  layer.property('ADBE Transform Group').property('ADBE Position')
Rotation:  layer.property('ADBE Transform Group').property('ADBE Rotate Z')
Scale:     layer.property('ADBE Transform Group').property('ADBE Scale')
```

Applying an expression:
```jsx
var prop = layer.property('ADBE Transform Group').property('ADBE Opacity');
prop.expression = 'wiggle(2, 30)';
prop.expressionEnabled = true;
```

Removing an expression:
```jsx
prop.expressionEnabled = false;
prop.expression = '';
```

### Storing the expression UUID on the property

AE properties do not have a `.comment` field. To track which expression was applied by Procedia (so it can be removed later), a convention is used:

The expression string itself is prefixed with a UUID comment:

```
// PROC:PROC-abc-1234
wiggle(2, 30)
```

When removing the expression, `removeExpression` searches the layer's properties for a property whose `.expression` starts with `// PROC:{nodeUUID}`. This is the lookup mechanism.

**The `applyExpression` dispatcher action prepends this prefix automatically.** The node definition only stores the user's expression string — the prefix is added by the dispatcher.

---

## PHASE 1 — `graph/nodes/categories/utility/Expression.js`

### Identity and classification

| Field | Value |
|---|---|
| `type` | `'utility/expression'` |
| `label` | `'Expression'` |
| `category` | `'Utility'` |
| `version` | `'1.0.0'` |
| `nodeKind` | `'effector'` |
| `dedicated` | `false` |

### Ports — standard effector pattern

```javascript
ports: [
  { id: 'layer_in', category: 'input',  type: 'layer', extendable: true, required: true },
  { id: 'output',   category: 'output', type: 'layer', extendable: false }
  // NO parent ports — effector rule
]
```

**Port count: 2. Exactly 2.**

### Params

```javascript
params: [
  { key: 'label',          type: 'string', default: 'Expression',
    label: 'Label' },
  { key: 'targetProperty', type: 'string', default: 'ADBE Opacity',
    label: 'Property' },
  { key: 'expression',     type: 'string', default: 'value',
    label: 'Expression' }
]
```

Notes:
- `targetProperty` is an AE property match name string — the user types the match name of the property they want to apply the expression to (e.g. `'ADBE Opacity'`, `'ADBE Position'`, `'ADBE Rotate Z'`).
- `expression` is the expression body — pure JavaScript string. The user writes the expression here (e.g. `'wiggle(2, 30)'`, `'time * 90'`).
- Default `expression: 'value'` — the identity expression. `value` in AE expressions returns the current property value unchanged. Safe default — applying it has no visible effect.
- Default `targetProperty: 'ADBE Opacity'` — opacity is a safe, always-present property.

### Lifecycle hooks

**`onDrop`** — returns `null`.

**`onAlive`**

```javascript
onAlive: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
  return {
    action: 'applyExpression',
    params: {
      nodeUUID:         nodeData.id,
      hostingCompUUID:  hostingCompUUID,
      layerNodeUUID:    upstreamNodeUUID,
      targetProperty:   nodeData.props.targetProperty,
      expression:       nodeData.props.expression
    }
  };
}
```

**`onGhost`**

```javascript
onGhost: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
  return {
    action: 'removeExpression',
    params: {
      nodeUUID:        nodeData.id,
      hostingCompUUID: hostingCompUUID,
      layerNodeUUID:   upstreamNodeUUID
    }
  };
}
```

**`onDelete`**

```javascript
onDelete: function(nodeData) {
  if (nodeData.state === 'ghost') return null;
  return {
    action: 'removeExpression',
    params: {
      nodeUUID:        nodeData.id,
      hostingCompUUID: nodeData.hostingComps[0] || null,
      layerNodeUUID:   null   // engine resolves before dispatch
    }
  };
}
```

**`onPropertyChange`**

```javascript
onPropertyChange: function(key, value, nodeData, hostingCompUUID, upstreamNodeUUID) {
  if (key === 'label') return null; // label changes don't affect AE
  // Re-apply the expression with the updated value
  return {
    action: 'applyExpression',
    params: {
      nodeUUID:        nodeData.id,
      hostingCompUUID: hostingCompUUID,
      layerNodeUUID:   upstreamNodeUUID,
      targetProperty:  nodeData.props.targetProperty,
      expression:      nodeData.props.expression
    }
  };
}
```

Note: `onPropertyChange` re-applies the full expression rather than updating in place. This handles both the case where the user changes `expression` (new expression body) and `targetProperty` (new target — must remove from old property and apply to new one).

### Self-registration

```javascript
nodeRegistry.register(ExpressionNode);
```

---

## PHASE 2 — Dispatcher actions: `applyExpression` and `removeExpression`

Add to `jsx/dispatcher/dispatcher.jsx`.

**To `_route`:**
```jsx
if (action === 'applyExpression')  return actionApplyExpression(params);
if (action === 'removeExpression') return actionRemoveExpression(params);
```

---

### `actionApplyExpression(params)`

```
params: { nodeUUID, hostingCompUUID, layerNodeUUID, targetProperty, expression }

1. comp  = findCompByUUID(hostingCompUUID) — if null: return error
2. layer = findLayerByUUID(comp, layerNodeUUID) — if null: return error

3. First: remove any existing Procedia expression for this nodeUUID on this layer
   (the property may have changed — clean up the old one first)
   _removeExpressionFromLayer(layer, nodeUUID)

4. Navigate to the target property:
   var prop = _findPropertyByMatchName(layer, targetProperty)
   if prop is null: return error 'Property not found: ' + targetProperty

5. Build the prefixed expression string:
   var prefixed = '// PROC:' + nodeUUID + '\n' + expression

6. Apply:
   prop.expression = prefixed
   prop.expressionEnabled = true

7. Return { ok: true, data: { applied: nodeUUID, targetProperty: targetProperty } }
```

### `actionRemoveExpression(params)`

```
params: { nodeUUID, hostingCompUUID, layerNodeUUID }

1. comp  = findCompByUUID(hostingCompUUID) — if null: return { ok: true } (already gone)
2. layer = findLayerByUUID(comp, layerNodeUUID) — if null: return { ok: true } (already gone)
3. _removeExpressionFromLayer(layer, nodeUUID)
4. Return { ok: true, data: { removed: nodeUUID } }
```

### Internal helpers (add to `dispatcher.jsx`)

**`_findPropertyByMatchName(layer, matchName)`**

AE properties are nested in groups. Navigate using a two-level approach — first check top-level properties, then check within known groups:

```jsx
function _findPropertyByMatchName(layer, matchName) {
  // Check transform group first (most common)
  var xform = layer.property('ADBE Transform Group');
  if (xform) {
    for (var i = 1; i <= xform.numProperties; i++) {
      var p = xform.property(i);
      if (p.matchName === matchName) return p;
    }
  }
  // Check top-level layer properties
  for (var j = 1; j <= layer.numProperties; j++) {
    var lp = layer.property(j);
    if (lp.matchName === matchName) return lp;
    // Check one level deep in property groups
    if (lp.numProperties) {
      for (var k = 1; k <= lp.numProperties; k++) {
        var sub = lp.property(k);
        if (sub.matchName === matchName) return sub;
      }
    }
  }
  return null;
}
```

**`_removeExpressionFromLayer(layer, nodeUUID)`**

Search all properties of the layer for an expression prefixed with `// PROC:{nodeUUID}` and remove it:

```jsx
function _removeExpressionFromLayer(layer, nodeUUID) {
  var prefix = '// PROC:' + nodeUUID;

  function _checkProp(prop) {
    try {
      if (prop.canSetExpression && prop.expressionEnabled) {
        if (prop.expression.indexOf(prefix) === 0) {
          prop.expressionEnabled = false;
          prop.expression = '';
        }
      }
    } catch(e) { /* some properties throw on access — skip silently */ }
  }

  function _walkGroup(group) {
    for (var i = 1; i <= group.numProperties; i++) {
      var p = group.property(i);
      _checkProp(p);
      try {
        if (p.numProperties) _walkGroup(p);
      } catch(e) { /* not a group — skip */ }
    }
  }

  _walkGroup(layer);
}
```

---

## PHASE 3 — `index.html` update

Add `Expression.js` script tag to `index.html` in the node definitions section:

```html
<script src="graph/nodes/categories/utility/Expression.js"></script>
```

Place after the `data/Number.js` script tag and before the graph engine scripts.

Also update `panel.css` — add the `Utility` category to the `.palette-cat-accent` color mapping. The category token `utility` already has `--cat-utility: #06D6A0` defined in the design tokens. Verify it is applied to the Expression item in the palette (should already work via the existing category color system from TASK-01).

---

## PHASE 4 — Verification

### Console test — browser

```javascript
(function() {
  var PASS = 0; var FAIL = 0;
  function assert(label, cond) {
    if (cond) { console.log('[PASS]', label); PASS++; }
    else       { console.error('[FAIL]', label); FAIL++; }
  }

  var def = nodeRegistry.getDefinition('utility/expression');
  assert('ExpressionNode registered',          def !== null);
  assert('type is utility/expression',         def && def.type === 'utility/expression');
  assert('label is Expression',                def && def.label === 'Expression');
  assert('category is Utility',                def && def.category === 'Utility');
  assert('nodeKind is effector',               def && def.nodeKind === 'effector');
  assert('dedicated is false',                 def && def.dedicated === false);

  // Ports — exactly 2, effector pattern
  assert('has exactly 2 ports',                def && def.ports.length === 2);
  var ports = {};
  for (var i = 0; i < def.ports.length; i++) ports[def.ports[i].id] = def.ports[i];
  assert('has layer_in port',                  ports['layer_in'] !== undefined);
  assert('layer_in required',                  ports['layer_in'] && ports['layer_in'].required === true);
  assert('layer_in extendable',                ports['layer_in'] && ports['layer_in'].extendable === true);
  assert('layer_in type is layer',             ports['layer_in'] && ports['layer_in'].type === 'layer');
  assert('has output port',                    ports['output'] !== undefined);
  assert('output type is layer',               ports['output'] && ports['output'].type === 'layer');
  assert('no child_of port',                   ports['child_of'] === undefined);
  assert('no parent_of port',                  ports['parent_of'] === undefined);

  // Params
  var params = {};
  for (var p = 0; p < def.params.length; p++) params[def.params[p].key] = def.params[p];
  assert('has label param',                    params['label'] !== undefined);
  assert('has targetProperty param',           params['targetProperty'] !== undefined);
  assert('has expression param',               params['expression'] !== undefined);
  assert('targetProperty default is string',   typeof params['targetProperty'].default === 'string');
  assert('expression default is string',       typeof params['expression'].default === 'string');
  assert('expression default is value',        params['expression'].default === 'value');

  // All params have defaults
  var missingDefault = false;
  for (var q = 0; q < def.params.length; q++) {
    if (def.params[q].default === undefined) missingDefault = true;
  }
  assert('all params have defaults',           missingDefault === false);

  // Hooks
  assert('onDrop is function',           typeof def.onDrop === 'function');
  assert('onAlive is function',          typeof def.onAlive === 'function');
  assert('onGhost is function',          typeof def.onGhost === 'function');
  assert('onDelete is function',         typeof def.onDelete === 'function');
  assert('onPropertyChange is function', typeof def.onPropertyChange === 'function');

  var fakeProps = { label: 'Expr', targetProperty: 'ADBE Opacity', expression: 'wiggle(2,30)' };
  var fakeNode  = { id: 'EXP-001', props: fakeProps, state: 'alive', hostingComps: ['COMP-001'] };

  // onDrop → null
  assert('onDrop returns null', def.onDrop(fakeNode) === null);

  // onAlive → applyExpression
  var aliveCmd = def.onAlive(fakeNode, 'COMP-001', 'LAYER-001');
  assert('onAlive action is applyExpression',  aliveCmd && aliveCmd.action === 'applyExpression');
  assert('onAlive has nodeUUID',               aliveCmd && aliveCmd.params.nodeUUID === 'EXP-001');
  assert('onAlive has layerNodeUUID',          aliveCmd && aliveCmd.params.layerNodeUUID === 'LAYER-001');
  assert('onAlive has targetProperty',         aliveCmd && aliveCmd.params.targetProperty === 'ADBE Opacity');
  assert('onAlive has expression',             aliveCmd && aliveCmd.params.expression === 'wiggle(2,30)');

  // onGhost → removeExpression
  var ghostCmd = def.onGhost(fakeNode, 'COMP-001', 'LAYER-001');
  assert('onGhost action is removeExpression', ghostCmd && ghostCmd.action === 'removeExpression');
  assert('onGhost has nodeUUID',               ghostCmd && ghostCmd.params.nodeUUID === 'EXP-001');
  assert('onGhost has layerNodeUUID',          ghostCmd && ghostCmd.params.layerNodeUUID === 'LAYER-001');

  // onDelete — ghost state returns null
  var fakeGhost = { id: 'EXP-001', props: fakeProps, state: 'ghost', hostingComps: [] };
  assert('onDelete ghost returns null',  def.onDelete(fakeGhost) === null);

  // onDelete — alive state returns removeExpression
  var deleteCmd = def.onDelete(fakeNode);
  assert('onDelete alive returns removeExpression', deleteCmd && deleteCmd.action === 'removeExpression');

  // onPropertyChange — label change returns null
  var labelCmd = def.onPropertyChange('label', 'New', fakeNode, 'COMP-001', 'LAYER-001');
  assert('onPropertyChange label returns null',  labelCmd === null);

  // onPropertyChange — expression change returns applyExpression
  var exprCmd = def.onPropertyChange('expression', 'time * 90', fakeNode, 'COMP-001', 'LAYER-001');
  assert('onPropertyChange expression action',   exprCmd && exprCmd.action === 'applyExpression');
  assert('onPropertyChange expression value',    exprCmd && exprCmd.params.expression === 'wiggle(2,30)');
  // Note: value from nodeData.props, not the passed value — re-read from current state

  // Utility category in registry
  var utilNodes = nodeRegistry.getByCategory('Utility');
  assert('Utility category has Expression',  utilNodes.length >= 1);

  console.log('---');
  console.log('ExpressionNode:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

**Zero failures required before AE verification.**

**STOP. Paste console output. Wait for confirmation.**

---

### AE integration verification — in After Effects

1. Drop a Text node → wire to Comp node. Text goes alive.
2. Drop an Expression node → wire its `layer_in` to Text node's `output`.
   - Expression node goes alive.
   - In AE, on the text layer, `ADBE Opacity` property now has the expression `value` applied (identity — no visible change yet).
3. In the Expression node's inspector, change `expression` to `wiggle(2, 10)`.
   - After 300ms debounce, the text layer's Opacity property in AE now has `wiggle(2, 10)`.
   - The text layer visually wiggles in AE's preview.
4. Change `targetProperty` to `'ADBE Rotate Z'`.
   - After debounce: Opacity expression is removed. Rotation property now has `wiggle(2, 10)`.
5. Change `expression` to `time * 90`.
   - Rotation now spins continuously in AE preview.
6. Disconnect the Expression node wire from the Text node.
   - Expression is removed from Rotation property. Layer stops spinning.
   - Expression node goes ghost.
7. Reconnect — expression re-applies to Rotation.
8. Delete the Expression node — expression removed from layer.

**Checklist:**
- [ ] Expression node appears in the Utility palette category
- [ ] Wire Expression → Text → Comp: expression applied in AE
- [ ] Default `value` expression has no visible effect
- [ ] Changing `expression` in inspector updates AE property after debounce
- [ ] Changing `targetProperty` removes expression from old property, applies to new one
- [ ] Disconnect wire: expression removed from layer
- [ ] Reconnect: expression re-applied
- [ ] Delete: expression removed, no AE errors
- [ ] `// PROC:{uuid}` prefix visible in AE expression editor (verifies UUID tracking)

**STOP. Describe what you see in AE. Wait for confirmation.**

---

## Additional Rules for This Task

**`_removeExpressionFromLayer` walks the full property tree.** When `targetProperty` is changed, the old expression could be on any property of the layer. The walk searches all properties and sub-groups for the `// PROC:{nodeUUID}` prefix and removes it before applying the new expression. This prevents orphaned expressions when the user changes `targetProperty`.

**`onPropertyChange` re-applies the full expression for both `expression` and `targetProperty` changes.** Both are handled the same way — re-apply. The `applyExpression` action internally calls `_removeExpressionFromLayer` first (step 3), so changing either param atomically removes the old and applies the new. No separate "move expression" action is needed.

**`onPropertyChange` returns `null` for `label` changes.** Labels are cosmetic — they update the node card and AE layer name but have no effect on expressions. The hook short-circuits early for label changes to avoid unnecessary AE dispatches.

**`prop.canSetExpression` guard in `_removeExpressionFromLayer`.** Not all properties can have expressions. Accessing `.expression` on a property that doesn't support it throws in ExtendScript. The `try/catch` in `_checkProp` silently skips these. The `canSetExpression` check is the cleaner approach — verify it is available before accessing `.expression`.

**The expression prefix `// PROC:{uuid}` is the only way to track which expression belongs to which node.** AE properties have no `.comment` field. The prefix convention is load-bearing — without it, `removeExpression` cannot find the correct expression when multiple expressions are applied to the same layer by different nodes (or by the user).

**`_findPropertyByMatchName` checks the Transform Group first** because most user-facing properties (position, rotation, opacity, scale) live there. Checking the group directly is faster than walking the full layer property tree for common cases.

**No ES6+** throughout `Expression.js` and `dispatcher.jsx` additions.

---

## On Completion

When both verification phases pass, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-20 COMPLETE

graph/nodes/categories/utility/Expression.js    ✅  [N tests passed]
jsx/dispatcher/dispatcher.jsx                   ✅  applyExpression + removeExpression added
index.html                                      ✅  Expression.js script tag added

AE integration verified — expression apply, update, disconnect, reconnect, delete.

New dispatcher actions added:
  - applyExpression
  - removeExpression

All node types now implemented:
  core/comp, layers/text, layers/null, layers/shape, layers/adjustment
  effects/fill, effects/gaussian-blur, effects/drop-shadow
  data/color, data/number
  utility/expression

Next task: TASK-21 — End-to-End QA Protocol
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-20-EXPRESSION-NODE.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 1, 9, 10, 12 — PROCEDIA-V4-ARCHITECTURE.md Sections 1a, 3b, 4, 5b — TASK-16-EFFECT-NODES.md*
