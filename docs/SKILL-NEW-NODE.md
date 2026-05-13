# SKILL-NEW-NODE.md — Procedia
## How to Build a New Node from a Brief

**Prerequisites — read in this order before starting:**
1. `CLAUDE.md` — all 11 skills, especially SKILL 1 (ES3), SKILL 2 (bridge), SKILL 3 (error handling), SKILL 11 (file splitting)
2. `docs/SKILL-NODE-AUTHORING.md` — the node definition contract
3. This file — the execution protocol

---

## What You Will Receive

For every new node, the developer provides a brief in this format:

```
Node: [NodeName]
Description: [one sentence — what it does in AE]
Category: [Core | Effects | Generators | Utility]
Properties:
  - [paramKey]: [type] — [description]
  - [paramKey]: [type] — [description]
Exceptions/Rules: [optional — any special handling, constraints, or AE API notes]
```

Your job is to turn that brief into a working, tested, committed node — nothing more, nothing less.

---

## Execution Protocol

Execute these phases in order. **Stop after every phase and wait for confirmation before proceeding.**

---

### PHASE 1 — Commit and push current branch

Before creating anything, preserve the current branch state.

```bash
git add -A
git commit -m "chore: checkpoint before adding [NodeName] node"
git push origin HEAD
```

**Rules:**
- Always commit ALL changes (`-A`), not just tracked files
- Commit message must name the node being added next
- Remote is always `origin` — never infer a different remote
- If `git push` fails due to no upstream, run: `git push --set-upstream origin [current-branch-name]`
- Do not proceed if there are merge conflicts — surface them and stop

**Verification checklist:**
- [ ] `git status` shows clean working tree after commit
- [ ] `git push` completed without errors
- [ ] Current branch is confirmed clean

---

### PHASE 2 — Create and switch to new branch

```bash
git checkout -b [node-name-kebab-case]
```

Branch naming rules:
- Always kebab-case
- Always matches the node `type` slug — not the label
- Examples: `effect-gaussian-blur`, `utility-math-add`, `generator-solid-shape`

**Verification checklist:**
- [ ] `git branch` shows the new branch as active
- [ ] Branch name matches the node type slug

---

### PHASE 3 — Read the brief and plan

Before writing any code, state your plan in plain language:

1. **File to create:** `graph/nodes/categories/[category]/[NodeName].js`
2. **ExtendScript function name** the `apply()` will call
3. **Params list** — key, type, default, min/max where relevant
4. **Port list** — inputs and outputs with types
5. **Any exceptions or special handling** from the brief
6. **Files to modify:** always `index.html` only — the node self-registers via `nodeRegistry.register()` on load, no changes to `graph/nodeRegistry.js` needed

Stop here. Wait for confirmation before writing code.

---

### PHASE 4 — Write the node file

Create `graph/nodes/categories/[category]/[NodeName].js`.

Follow the node definition contract from `docs/SKILL-NODE-AUTHORING.md` exactly. Every field is required.

**Additional rules specific to this workflow:**

**Rule A — The ExtendScript function lives in `apply()` directly.**
Do not reference an external `.jsx` file. Write the ExtendScript function body as a string returned by `apply()`. The function must be self-contained and follow SKILL 1 (ES3) from `CLAUDE.md`.

```javascript
// ✅ Correct
apply: function(nodeData) {
  return (
    'var result = { ok: false, data: null, error: null };' +
    'try {' +
    '  var comp = findCompByUUID("' + nodeData.id + '");' +
    '  result.ok = true;' +
    '} catch(e) {' +
    '  result.error = e.toString();' +
    '}' +
    'JSON.stringify(result);'
  );
}
```

**Rule B — Every param must have a valid default.**
Check the brief — if no default is specified, use the most conservative safe value (e.g. `0` for numbers, `false` for bools, first option for enums).

**Rule C — Exceptions/Rules from the brief take priority.**
If the brief specifies a constraint that conflicts with the standard contract, follow the brief. Note the deviation in a comment directly above the affected field.

**Rule D — No syntax errors are acceptable.**
Before moving to Phase 5, mentally trace the entire file. Every string must be closed. Every object must have matching braces. Every function must have a closing `}`.

**Verification checklist:**
- [ ] File exists at the correct path
- [ ] File starts with `// DEPENDS ON: graph/nodeRegistry.js` and `// MUST LOAD BEFORE: index.js`
- [ ] All 8 contract fields present: `type`, `label`, `category`, `version`, `inputs`, `outputs`, `params`, `apply`
- [ ] `type` follows `'category/node-name'` format
- [ ] `category` matches the folder name exactly
- [ ] `version` is `'1.0.0'`
- [ ] All params have defaults matching their declared type
- [ ] `apply()` returns a string, not an object
- [ ] No `const`, `let`, arrow functions, or template literals anywhere in the file
- [ ] No syntax errors (trace the file manually)

---

### PHASE 5 — Register the node

This project uses the **self-registering plain-script pattern**. The node file calls `nodeRegistry.register(def)` itself. No changes to `nodeRegistry.js` are needed — only the node file and `index.html`.

**Every node file must start with dependency headers, then register at the bottom:**
```javascript
// graph/nodes/categories/[category]/[NodeName].js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var [NodeName]Node = {
  type: 'category/node-name',
  // ... full definition
};
nodeRegistry.register([NodeName]Node);
```

OR inline directly without a named `var`:
```javascript
// graph/nodes/categories/effects/GaussianBlur.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

nodeRegistry.register({
  type: 'effects/gaussian-blur',
  // ...
});
```

**Verification checklist:**
- [ ] File header has `// DEPENDS ON: graph/nodeRegistry.js` and `// MUST LOAD BEFORE: index.js`
- [ ] `nodeRegistry.register()` is called at the bottom of the node file
- [ ] No import/export statements anywhere

---

### PHASE 6 — Update `index.html`

Add the new node's `<script>` tag in the correct load position — after `nodeRegistry.js`, before `index.js`.

```html
<!-- Node definitions — depend on nodeRegistry.js -->
<script src="graph/nodes/categories/core/Comp.js"></script>
<script src="graph/nodes/categories/core/Layer.js"></script>
<script src="graph/nodes/categories/[category]/[NodeName].js"></script>  <!-- new -->
```

**Rules:**
- Always after `nodeRegistry.js`
- Always before `index.js`
- Group by category — keep Core, Effects, Generators, Utility together

**Verification checklist:**
- [ ] `<script>` tag added in correct position
- [ ] Tag path matches the actual file path exactly (case-sensitive)
- [ ] No other `<script>` tags moved or modified

---

### PHASE 7 — Level 1 test (definition — no AE needed)

Open the browser dev tools console in the CEP panel. Run this test block — replace `'category/node-name'` with the actual type string:

```javascript
// Paste into browser console
(function() {
  var type = 'category/node-name';
  var def = nodeRegistry.getDefinition(type);

  if (!def) { console.error('[TEST FAIL] Node not registered:', type); return; }
  console.log('[TEST PASS] Node registered:', type);

  // Check all required fields
  var required = ['type', 'label', 'category', 'version', 'inputs', 'outputs', 'params', 'apply'];
  required.forEach(function(field) {
    if (def[field] === undefined) {
      console.error('[TEST FAIL] Missing field:', field);
    } else {
      console.log('[TEST PASS] Field present:', field);
    }
  });

  // Check params have defaults
  def.params.forEach(function(p) {
    if (p.default === undefined) {
      console.error('[TEST FAIL] Param missing default:', p.key);
    } else {
      console.log('[TEST PASS] Param default ok:', p.key, '=', p.default);
    }
  });

  // Check apply returns a string
  var fakeNodeData = { id: 'PROC-TEST-0000', params: {}, inputs: [] };
  def.params.forEach(function(p) { fakeNodeData.params[p.key] = p.default; });
  var script = def.apply(fakeNodeData);
  if (typeof script !== 'string') {
    console.error('[TEST FAIL] apply() must return string, got:', typeof script);
  } else {
    console.log('[TEST PASS] apply() returns string, length:', script.length);
    console.log('[TEST INFO] apply() output:', script);
  }
})();
```

**Verification checklist:**
- [ ] No `[TEST FAIL]` lines in console
- [ ] All fields logged as `[TEST PASS]`
- [ ] `apply()` output string is logged and looks correct

---

### PHASE 8 — Level 2 test (ExtendScript bridge — AE must be open)

Take the `apply()` output string from Phase 7 and run it through `evalBridge`. After pasting, **click the AE window** to give it focus — the Promise will not resolve until AE is in the foreground. Then switch back to the console to read the result.

```javascript
// Paste into browser console
(function() {
  var def = nodeRegistry.getDefinition('category/node-name');
  var fakeNodeData = { id: 'PROC-TEST-0000', params: {}, inputs: [] };
  def.params.forEach(function(p) { fakeNodeData.params[p.key] = p.default; });

  var script = def.apply(fakeNodeData);
  evalBridge.evalScript(script).then(function(parsed) {
    if (parsed.ok) {
      console.log('[TEST PASS] ExtendScript returned ok:true, data:', parsed.data);
    } else {
      console.error('[TEST FAIL] ExtendScript returned ok:false, error:', parsed.error);
    }
  }).catch(function(e) {
    console.error('[TEST FAIL] Bridge error:', e.message);
  });
})();
```

**Verification checklist:**
- [ ] `[TEST PASS] ExtendScript returned ok:true` appears in console
- [ ] No `[TEST FAIL]` lines
- [ ] AE performed the expected operation (check AE timeline/project panel)

---

### PHASE 9 — Level 3 test (full integration — you drive this)

Claude Code stops here and hands control back to the developer.

Output this message verbatim:

```
─────────────────────────────────────────
PHASE 9 — INTEGRATION TEST
Ready for manual testing.

Node: [NodeName] ([type string])
Branch: [current branch name]

Please test the node in AE as you see fit:
  1. Open the Procedia panel
  2. Add the [NodeName] node from the palette
  3. Wire it and configure params in the inspector
  4. Verify the AE output matches expected behaviour
  5. Check the browser console for any [Procedia] errors

Reply with:
  ✅ PASS — to proceed to commit
  ❌ FAIL: [describe issue] — to fix and retest
─────────────────────────────────────────
```

Do not proceed to Phase 10 until the developer replies with ✅ PASS.

---

### PHASE 10 — Commit the new node

Only after ✅ PASS from Phase 9:

```bash
git add -A
git commit -m "feat: add [NodeName] node ([type string])"
git push origin HEAD
```

Commit message format: `feat: add [NodeName] node ([type string])`
Examples:
- `feat: add GaussianBlur node (effects/gaussian-blur)`
- `feat: add MathAdd node (utility/math-add)`

**Verification checklist:**
- [ ] `git status` is clean after commit
- [ ] `git push` completed without errors
- [ ] Commit message follows the format above

---

### PHASE 11 — Done. Confirm and hand back.

Output this message verbatim:

```
─────────────────────────────────────────
NODE COMPLETE

Node:    [NodeName]
Type:    [type string]
Branch:  [branch name]
Commit:  [short commit hash]

Ready for the next node brief.
─────────────────────────────────────────
```

---

## Quick Checklist — Full Phase Summary

```
PHASE 1  — git add -A && commit && push current branch
PHASE 2  — git checkout -b [node-name-kebab-case]
PHASE 3  — read brief, state plan, STOP for confirmation
PHASE 4  — write node file (contract + apply() + ES3)
PHASE 5  — self-register at bottom of node file
PHASE 6  — add <script> tag to index.html
PHASE 7  — Level 1 test in browser console (no AE)
PHASE 8  — Level 2 test via csInterface.evalScript (AE open)
PHASE 9  — STOP. hand to developer for integration test
PHASE 10 — git add -A && commit feat: && push
PHASE 11 — confirm complete, await next brief
```

Each phase is a hard stop. Never chain phases without explicit output and confirmation.

---

## Node Brief Template (for the developer to fill in)

```
Node: [NodeName]
Description: [one sentence]
Category: [Core | Effects | Generators | Utility]
Properties:
  - [paramKey]: [float | int | bool | color | enum | string] — [description] — default: [value]
  - [paramKey]: [float | int | bool | color | enum | string] — [description] — default: [value]
Inputs:
  - [portName]: [layer | comp | number | color | bool | string] — required: [yes | no]
Outputs:
  - [portName]: [layer | comp | number | color | bool | string]
Exceptions/Rules: [optional]
```

---

*Last updated: May 2026 — Procedia v2 (CEP, AE 2025+, Windows)*
*This skill covers new node authoring workflow. For the node definition contract — read `docs/SKILL-NODE-AUTHORING.md`. For ES3 rules — read `CLAUDE.md`.*
