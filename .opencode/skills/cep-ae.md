# CEP Extension for After Effects — Skill

> Adobe CEP (Common Extensibility Platform) panel for After Effects
> Platforms: **Windows + macOS** · AE 2020+ · CSXS 9.0+

**Always load this skill when working on a CEP extension for After Effects.** Read this file before writing any code.

---

## Self-Review Checklist (Ask Before Writing Code)

Before adding any function, class, or line, answer:

1. **Can this be done in one line of code?** — If yes, don't write more.
2. **Is this code necessary?** — Delete dead code, unused imports, redundant guards. Zero tolerance.
3. **If I am writing two functions: can I write one function that serves both results?** — Combine. Use parameters or options objects.
4. **Can I avoid `if`/`else`?** — Use ternary, early return, lookup tables (`Map`, object dict), polymorphism, or optional chaining.
5. **Is this code modular or am I writing very specific code for this specific scenario?** — Abstract into reusable helpers. A function should solve a category of problems, not one isolated case.
6. **If the script is larger than 200 lines, can I split it into multiple scripts?** — Yes. One responsibility per file. CEP panels already use `<script>` tags for loading.
7. **Will this code break another code?** — Consider all callers, dependencies, and shared state. No change should silently break another module.
8. **Will this code introduce a new bug?** — Think through edge cases, error paths, and side effects before writing.
9. **Don't second-guess yourself** — if stuck between two approaches, ask a relevant question to clarify.

---

## CEP Architecture

| Component | Technology | Notes |
|-----------|-----------|-------|
| Panel UI | **HTML + CSS + vanilla JS** | Runs in Chromium Embedded Framework (CEF) — modern JS OK |
| AE scripting | **ExtendScript (.jsx)** | **Strict ES3** — no `const`/`let`/arrow/`forEach`/template literals/`Promise`/destructuring/spread/default params/`Object.keys` |
| Bridge | `CSInterface` | `csInterface.evalScript(script, callback)` — string in, string out, always async |
| Debugging | DevTools | `http://localhost:8088` (CEF remote debug) or `~/.csxs` DevTools |
| CEF version | Depends on CSXS | CSXS 9 = CEF 3770 (≈Chrome 72), CSXS 11 = CEF 4638 (≈Chrome 96) |

### CSXS Manifest (`CSXS/manifest.xml`)

```xml
<ExtensionBundle Id="com.yourcompany.extension" Version="1.0.0">
  <ExtensionList>
    <Extension Id="com.yourcompany.extension.panel" Version="1.0.0" />
  </ExtensionList>
  <DispatchInfoList>
    <Extension Id="com.yourcompany.extension.panel">
      <DispatchInfo>
        <Host Name="AEFT" Port="5542" />
        <Lifecycle>
          <ValidateOnInstall>true</ValidateOnInstall>
        </Lifecycle>
        <UI>
          <Type>Panel</Type>
          <Menu>Your Panel Name</Menu>
          <Geometry>
            <Size>
              <Width>400</Width>
              <Height>600</Height>
            </Size>
            <MinSize>
              <Width>300</Width>
              <Height>400</Height>
            </MinSize>
            <MaxSize>
              <Width>600</Width>
              <Height>800</Height>
            </MaxSize>
          </Geometry>
          <CEF>
            <Parameters>
              <Parameter Key="disable-web-security">yes</Parameter>
            </Parameters>
          </CEF>
        </UI>
      </DispatchInfo>
    </Extension>
  </DispatchInfoList>
</ExtensionBundle>
```

## ExtendScript Rules (ES3 — `.jsx` Files)

- Only: `var`, named functions, `for` loops, string concatenation (`+`), `===`/`!==`, `if`/`else`, `switch`
- No: `const`/`let`/arrow functions/`Array.forEach`/`Array.map`/template literals/`Promise`/`async`/`await`/destructuring/spread operator/default parameters/`Object.keys`/`Object.values`/`Object.entries`
- No native `JSON` — include and use `json.jsx` or polyfill
- Always return `JSON.stringify({ ok: true/false, data: ..., error: ... })` from any function called via evalScript
- Use `for...in` to enumerate object keys
- Use `for (var i = 0; i < arr.length; i++)` to iterate arrays
- Store references with `var self = this;` for closure callbacks
- AE API calls only go in one dispatcher file (never scattered)

## Panel JS Rules (Modern JS — `.js` Files in `src/` or `js/`)

- CEF supports modern JS (ES6+, depending on CSXS version). Use `let`/`const`, arrow functions, template literals, `Promise`, `async`/`await`, destructuring, spreads, `Map`, `Set`, `Object.keys/values/entries`
- No bundler by default — manage `<script>` tags manually in `index.html`
- Every script file has a `// DEPENDS ON:` header comment listing its dependencies
- `index.html` is the single source of truth for load order
- Single Responsibility: one file = one concern

## Bridge Pattern (Panel ↔ AE)

```
Panel JS ──csInterface.evalScript()──> ExtendScript (.jsx)
Panel JS <──callback(string)──────── ExtendScript (.jsx)
```

- **Only one file** may call `csInterface.evalScript()` — typically `bridge/evalBridge.js`
- Always return serialized JSON from ExtendScript: `JSON.stringify({ ok: true, data: result })`
- Always parse and error-check in the callback

```js
// bridge/evalBridge.js — the ONLY file calling evalScript
csInterface.evalScript(script, function (raw) {
  try {
    var result = JSON.parse(raw);
    if (result.ok) {
      resolve(result.data);
    } else {
      reject(new Error(result.error));
    }
  } catch (e) {
    reject(new Error('Bridge parse error: ' + e.message));
  }
});
```

## Project Structure Template

```
ext-root/
├── CSXS/
│   ├── manifest.xml              # Extension registration
│   └── debug                   # (optional) CEF debug flags
├── index.html                    # Entry point + script tag order
├── index.js                      # Panel init
├── css/
│   └── style.css
├── bridge/
│   └── evalBridge.js             # ONLY evalScript caller
├── jsx/
│   ├── dispatcher/
│   │   └── dispatcher.jsx        # ONLY AE API writer
│   ├── json.jsx                  # JSON polyfill for ES3
│   └── utils.jsx                 # Shared ExtendScript helpers
├── js/
│   ├── state/                    # State management
│   ├── components/               # UI components
│   ├── utils/                    # Shared helpers
│   └── ...
├── assets/
│   └── icons/
└── README.md
```

## Critical Rules

1. **ES3 in ALL `.jsx` files** — zero exceptions
2. Every `.jsx` function called via evalScript returns `JSON.stringify({ ok: bool, data: ..., error: ... })`
3. One bridge file — only that file calls `csInterface.evalScript()`
4. One dispatcher file — only that file contains AE API calls
5. No `alert()` or `$.writeln()` in production ExtendScript — use `CEPSLogger` or a log queue
6. Panel JS is source of truth for graph/topology/state; AE is source of truth for layer properties, keyframes
7. Always handle AE being busy (`app.isRunning()` check or try/catch around API calls)
8. Never hardcode paths — use `Folder.desktop`, `Folder.userData`, or extension relative paths
9. Cleanup temp layers/solids on both success AND failure paths
10. Always guard against null/undefined in callback chains — CEF + evalScript can return empty strings on timeout
11. **Shape path must be the first element in AE layer's Contents group** — when building shape layers via ExtendScript, always add the path element (Rect/Ellipse/Polystar/Group) before any Fill or Stroke elements. AE applies fills/strokes in declaration order, and the path must come first for correct rendering

## Common Gotchas

- **evalScript callbacks only fire when AE has window focus** — testing may require clicking AE window
- **No DOM in ExtendScript** — separate panel UI from AE scripting completely
- **`Folder` and `File` objects** in ExtendScript are ES3, no `Map`/`Set`
- **CSXS debug flags**: create `CSXS/debug` file to enable CEF DevTools
- **CEF remote debug URL**: `http://localhost:8088` (use `--remote-debugging-port=8088`)
- **`$.evalFile()`** to load other `.jsx` files from ExtendScript
- **`app.project` can be null** when no project is open — always guard

## Verification Checklist

- [ ] Panel loads without console errors
- [ ] evalScript round-trip works (panel ↔ AE)
- [ ] ES3 compatibility verified in all `.jsx` files
- [ ] Dead code / unused imports removed
- [ ] Self-review checklist answered before every new function
- [ ] Edge cases handled: AE busy, null project, empty selection, network timeout
