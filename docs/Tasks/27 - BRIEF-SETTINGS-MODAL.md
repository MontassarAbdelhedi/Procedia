# BRIEF-SETTINGS-MODAL
*Procedia v4 — Settings Modal (UI Shell + Persistence)*
*Scope: UI only. Wire rendering and minimap toggling are covered in BRIEF-SETTINGS-WIRE and BRIEF-SETTINGS-MINIMAP.*

---

## What This Brief Covers

1. A `settings.js` module — persistent key/value store, single localStorage key
2. A `settingsModal.js` module — DOM build, open/close, two controls wired to settings
3. A gear icon button added to the existing toolbar area
4. CSS in `styles/main.css`

This brief intentionally does **not** touch `wireRenderer.js` or `minimap.js`. Those integrations are gated behind their own briefs. After this brief, `settings.get('wireStyle')` and `settings.get('minimap')` exist and return correct values — but nothing reads them yet.

---

## Data Model — `settings.js`

**localStorage key:** `procedia_settings`

**Shape:**
```javascript
{
  minimap:   true,           // boolean
  wireStyle: 'bezier'        // 'bezier' | 'direct' | 'stepped'
}
```

**API — public surface:**
```javascript
settings.get(key)          // returns current value for key
settings.set(key, value)   // writes value, persists to localStorage immediately
settings.getAll()          // returns a shallow copy of the full settings object
```

**Defaults:** if `procedia_settings` is absent from localStorage (first launch), use:
```javascript
{ minimap: true, wireStyle: 'bezier' }
```

**Implementation rules:**
- Load from localStorage on module init (IIFE, runs once at parse time)
- `set()` writes the entire object back to localStorage on every call — no debounce needed, settings changes are rare
- `getAll()` returns a copy — never expose the internal reference
- No events, no pub/sub — consumers poll `settings.get()` directly

---

## The Gear Icon Button

### Placement in `index.html`

The gear button lives **inside `#canvas-column`**, absolutely positioned top-right. It does not sit in a toolbar bar element (there is no top bar in the current layout). It floats over the canvas just like `#minimap-canvas`.

```html
<!-- Inside #canvas-column, after #main-canvas and #minimap-canvas -->
<button id="settings-btn" title="Settings">⚙</button>
```

### CSS for the button

```css
#settings-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 100;
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  color: #888888;
  font-size: 14px;
  width: 26px;
  height: 26px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

#settings-btn:hover {
  background: #333333;
  color: #cccccc;
}
```

---

## The Modal — DOM Structure

The modal is injected by `settingsModal.js` at init time. It always exists in the DOM — `open()` and `close()` toggle a CSS class.

### HTML injected by `settingsModal.js`

```html
<div id="settings-overlay" class="settings-overlay hidden">
  <div id="settings-modal" class="settings-modal">

    <div class="settings-header">
      <span class="settings-title">Settings</span>
      <button class="settings-close" id="settings-close-btn">✕</button>
    </div>

    <div class="settings-body">

      <!-- Section: Canvas -->
      <div class="settings-section-label">Canvas</div>

      <div class="settings-row">
        <span class="settings-row-label">Minimap</span>
        <label class="settings-toggle">
          <input type="checkbox" id="setting-minimap">
          <span class="settings-toggle-slider"></span>
        </label>
      </div>

      <!-- Section: Wires -->
      <div class="settings-section-label">Wires</div>

      <div class="settings-row">
        <span class="settings-row-label">Style</span>
        <select class="settings-select" id="setting-wire-style">
          <option value="bezier">Bezier</option>
          <option value="direct">Direct</option>
          <option value="stepped">Stepped</option>
        </select>
      </div>

    </div><!-- /.settings-body -->

  </div><!-- /#settings-modal -->
</div><!-- /#settings-overlay -->
```

This HTML is created programmatically in `settingsModal.js` via `document.createElement` — **not hardcoded in `index.html`**. `settingsModal.init()` builds and appends it to `document.body`.

---

## CSS — Full Modal Styles

Add these to `styles/main.css`:

```css
/* ─── Settings overlay ──────────────────────────────────────── */

.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-overlay.hidden {
  display: none;
}

/* ─── Settings modal box ────────────────────────────────────── */

.settings-modal {
  background: #222222;
  border: 1px solid #383838;
  border-radius: 6px;
  width: 280px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ─── Header ────────────────────────────────────────────────── */

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #2e2e2e;
  flex-shrink: 0;
}

.settings-title {
  font-size: 12px;
  color: #cccccc;
  letter-spacing: 0.04em;
}

.settings-close {
  background: none;
  border: none;
  color: #666666;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.settings-close:hover {
  color: #cccccc;
}

/* ─── Body ──────────────────────────────────────────────────── */

.settings-body {
  padding: 8px 0 12px;
}

/* ─── Section label ─────────────────────────────────────────── */

.settings-section-label {
  padding: 8px 14px 4px;
  font-size: 10px;
  color: #555555;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  user-select: none;
}

/* ─── Row ───────────────────────────────────────────────────── */

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 14px;
  min-height: 30px;
}

.settings-row-label {
  font-size: 11px;
  color: #aaaaaa;
  user-select: none;
}

/* ─── Toggle (reuses existing inspector-toggle pattern) ─────── */

.settings-toggle {
  position: relative;
  display: inline-block;
  width: 32px;
  height: 18px;
  cursor: pointer;
  flex-shrink: 0;
}

.settings-toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.settings-toggle-slider {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: #3a3a3a;
  border-radius: 18px;
  transition: background 0.15s;
}

.settings-toggle-slider::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  left: 3px;
  top: 3px;
  background: #777777;
  border-radius: 50%;
  transition: transform 0.15s, background 0.15s;
}

.settings-toggle input:checked + .settings-toggle-slider {
  background: #2a4a2a;
}

.settings-toggle input:checked + .settings-toggle-slider::before {
  transform: translateX(14px);
  background: #7ec98f;
}

/* ─── Select ────────────────────────────────────────────────── */

.settings-select {
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 3px;
  color: #cccccc;
  font-family: monospace, "Courier New", Courier;
  font-size: 11px;
  padding: 3px 6px;
  outline: none;
  cursor: pointer;
  min-width: 110px;
}

.settings-select:focus {
  border-color: #5b8dd9;
}
```

---

## `settings.js` — Full Implementation

**Location:** `ui/settings.js`
**Depends on:** nothing
**Must load before:** `ui/settingsModal.js`, `index.js`

```javascript
// ui/settings.js
// DEPENDS ON: nothing
// MUST LOAD BEFORE: ui/settingsModal.js, index.js

var settings = (function () {

  var STORAGE_KEY = 'procedia_settings';

  var DEFAULTS = {
    minimap:   true,
    wireStyle: 'bezier'
  };

  var _state = {};

  function _load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        // Merge with defaults — new keys added in future are never undefined
        for (var key in DEFAULTS) {
          if (DEFAULTS.hasOwnProperty(key)) {
            _state[key] = parsed.hasOwnProperty(key) ? parsed[key] : DEFAULTS[key];
          }
        }
      } else {
        // First launch — copy defaults
        for (var k in DEFAULTS) {
          if (DEFAULTS.hasOwnProperty(k)) _state[k] = DEFAULTS[k];
        }
      }
    } catch (e) {
      console.warn('[settings] Failed to load from localStorage, using defaults.', e);
      for (var dk in DEFAULTS) {
        if (DEFAULTS.hasOwnProperty(dk)) _state[dk] = DEFAULTS[dk];
      }
    }
  }

  function _persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
    } catch (e) {
      console.warn('[settings] Failed to persist to localStorage.', e);
    }
  }

  function get(key) {
    return _state.hasOwnProperty(key) ? _state[key] : undefined;
  }

  function set(key, value) {
    if (!DEFAULTS.hasOwnProperty(key)) {
      console.warn('[settings] Unknown key:', key);
      return;
    }
    _state[key] = value;
    _persist();
  }

  function getAll() {
    var copy = {};
    for (var key in _state) {
      if (_state.hasOwnProperty(key)) copy[key] = _state[key];
    }
    return copy;
  }

  // Init on parse
  _load();

  return { get: get, set: set, getAll: getAll };

}());
```

---

## `settingsModal.js` — Full Implementation

**Location:** `ui/settingsModal.js`
**Depends on:** `ui/settings.js`
**Must load before:** `index.js`

```javascript
// ui/settingsModal.js
// DEPENDS ON: ui/settings.js
// MUST LOAD BEFORE: index.js

var settingsModal = (function () {

  var _overlay  = null;
  var _isOpen   = false;

  function _buildDOM() {
    // Overlay
    _overlay = document.createElement('div');
    _overlay.id        = 'settings-overlay';
    _overlay.className = 'settings-overlay hidden';

    // Modal box
    var modal = document.createElement('div');
    modal.id        = 'settings-modal';
    modal.className = 'settings-modal';

    // Header
    var header    = document.createElement('div');
    header.className = 'settings-header';

    var title = document.createElement('span');
    title.className   = 'settings-title';
    title.textContent = 'Settings';

    var closeBtn = document.createElement('button');
    closeBtn.id        = 'settings-close-btn';
    closeBtn.className = 'settings-close';
    closeBtn.textContent = '✕';

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Body
    var body = document.createElement('div');
    body.className = 'settings-body';

    // — Section: Canvas —
    var canvasLabel = document.createElement('div');
    canvasLabel.className   = 'settings-section-label';
    canvasLabel.textContent = 'Canvas';
    body.appendChild(canvasLabel);

    // Minimap toggle row
    body.appendChild(_buildToggleRow('Minimap', 'setting-minimap', 'minimap'));

    // — Section: Wires —
    var wiresLabel = document.createElement('div');
    wiresLabel.className   = 'settings-section-label';
    wiresLabel.textContent = 'Wires';
    body.appendChild(wiresLabel);

    // Wire style select row
    body.appendChild(_buildSelectRow(
      'Style',
      'setting-wire-style',
      'wireStyle',
      [
        { value: 'bezier',  label: 'Bezier'  },
        { value: 'direct',  label: 'Direct'  },
        { value: 'stepped', label: 'Stepped' }
      ]
    ));

    // Assemble
    modal.appendChild(header);
    modal.appendChild(body);
    _overlay.appendChild(modal);
    document.body.appendChild(_overlay);

    // Events
    closeBtn.addEventListener('click', close);

    _overlay.addEventListener('click', function (e) {
      if (e.target === _overlay) close();
    });

    document.addEventListener('keydown', function (e) {
      if (_isOpen && e.key === 'Escape') close();
    });
  }

  function _buildToggleRow(labelText, inputId, settingKey) {
    var row = document.createElement('div');
    row.className = 'settings-row';

    var label = document.createElement('span');
    label.className   = 'settings-row-label';
    label.textContent = labelText;

    var toggle = document.createElement('label');
    toggle.className = 'settings-toggle';

    var checkbox = document.createElement('input');
    checkbox.type    = 'checkbox';
    checkbox.id      = inputId;
    checkbox.checked = !!settings.get(settingKey);

    var slider = document.createElement('span');
    slider.className = 'settings-toggle-slider';

    checkbox.addEventListener('change', function () {
      settings.set(settingKey, checkbox.checked);
    });

    toggle.appendChild(checkbox);
    toggle.appendChild(slider);

    row.appendChild(label);
    row.appendChild(toggle);
    return row;
  }

  function _buildSelectRow(labelText, selectId, settingKey, optionsList) {
    var row = document.createElement('div');
    row.className = 'settings-row';

    var label = document.createElement('span');
    label.className   = 'settings-row-label';
    label.textContent = labelText;

    var select = document.createElement('select');
    select.id        = selectId;
    select.className = 'settings-select';

    var currentVal = settings.get(settingKey);
    for (var i = 0; i < optionsList.length; i++) {
      var opt      = document.createElement('option');
      opt.value    = optionsList[i].value;
      opt.textContent = optionsList[i].label;
      if (optionsList[i].value === currentVal) opt.selected = true;
      select.appendChild(opt);
    }

    select.addEventListener('change', function () {
      settings.set(settingKey, select.value);
    });

    row.appendChild(label);
    row.appendChild(select);
    return row;
  }

  function open() {
    if (!_overlay) return;
    // Sync controls to current settings state before showing
    var minimapEl = document.getElementById('setting-minimap');
    if (minimapEl) minimapEl.checked = !!settings.get('minimap');

    var wireStyleEl = document.getElementById('setting-wire-style');
    if (wireStyleEl) wireStyleEl.value = settings.get('wireStyle') || 'bezier';

    _overlay.classList.remove('hidden');
    _isOpen = true;
  }

  function close() {
    if (!_overlay) return;
    _overlay.classList.add('hidden');
    _isOpen = false;
  }

  function init() {
    _buildDOM();

    var gearBtn = document.getElementById('settings-btn');
    if (gearBtn) {
      gearBtn.addEventListener('click', open);
    }
  }

  return { init: init, open: open, close: close };

}());
```

---

## Changes to `index.html`

### 1. Add the gear button inside `#canvas-column`

```html
<!-- Center: Canvas -->
<div id="canvas-column">
  <canvas id="main-canvas"></canvas>
  <canvas id="minimap-canvas"></canvas>
  <button id="settings-btn" title="Settings">⚙</button>   <!-- ADD THIS LINE -->
  <div id="node-picker" class="node-picker hidden">
    ...
  </div>
</div>
```

### 2. Add `<script>` tags — load order matters

Add **before** `index.js`, in this exact order relative to existing `ui/` tags:

```html
<script src="ui/settings.js"></script>        <!-- before settingsModal -->
<script src="ui/settingsModal.js"></script>   <!-- before index.js -->
```

Full placement context (existing tags shown for reference):
```html
  <script src="ui/nodeList.js"></script>
  <script src="ui/drag.js"></script>
  <script src="ui/nodePicker.js"></script>
  <script src="ui/keyboard.js"></script>
  <script src="ui/devTools.js"></script>
  <script src="ui/settings.js"></script>        ← ADD
  <script src="ui/settingsModal.js"></script>   ← ADD
  <script src="index.js"></script>
```

---

## Changes to `index.js`

Add `settingsModal.init()` at the bottom of the existing init sequence. No new logic — just call init.

```javascript
// At the end of the init block in index.js:
settingsModal.init();
```

---

## Files Summary

| Action | File |
|--------|------|
| **Create** | `ui/settings.js` |
| **Create** | `ui/settingsModal.js` |
| **Edit** | `index.html` — gear button in `#canvas-column`, two `<script>` tags |
| **Edit** | `styles/main.css` — gear button styles + full modal styles |
| **Edit** | `index.js` — one line: `settingsModal.init()` |

**No other files are touched.** `wireRenderer.js` and `minimap.js` are untouched in this brief.

---

## Verification Checklist

- [ ] Panel loads without console errors
- [ ] Gear icon (⚙) is visible top-right of the canvas area
- [ ] Clicking the gear opens the modal over a dark overlay
- [ ] Modal shows two sections: Canvas (Minimap toggle) and Wires (Style select)
- [ ] Minimap toggle reflects `settings.get('minimap')` on open (default: ON)
- [ ] Wire style select reflects `settings.get('wireStyle')` on open (default: Bezier)
- [ ] Toggling Minimap calls `settings.set('minimap', ...)` — verify in DevTools: `settings.getAll()`
- [ ] Changing wire style select calls `settings.set('wireStyle', ...)` — verify in DevTools
- [ ] Values persist across panel reload — open DevTools, change a setting, reload panel, open modal, confirm values survived
- [ ] Clicking the overlay (outside modal box) closes the modal
- [ ] Clicking ✕ button closes the modal
- [ ] ESC key closes the modal
- [ ] Canvas pan/zoom/node interaction is unaffected when modal is closed
- [ ] `wireRenderer.js` and `minimap.js` are untouched (no regressions)

**STOP. Do not proceed to BRIEF-SETTINGS-WIRE until every checkbox above is confirmed.**
