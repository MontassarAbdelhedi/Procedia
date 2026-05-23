# TASK-14 — notifications/notificationBar.js
*Procedia v4 — Fourteenth task. Builds on completed TASK-01 through TASK-13.*

---

## Prerequisite Reading — Do This First

Read in this order before touching any file:

1. `CLAUDE.md` — Skills 12, 13 in full
2. `PROCEDIA-V4-ARCHITECTURE.md` — Section 2 (Node States) — specifically the `error` state and its two recovery actions
3. `TASK-01-SETUP.md` — the notification bar HTML and CSS spec (Phase 2, "Notification bar" section)

Confirm both files are present at repo root before starting.

---

## Context

After TASK-13, the poller can detect when an AE object goes missing and calls `notificationBar.showError(uuid, label)`. After TASK-09, `renderer.js` applies the `error` CSS class to node cards when `node.state === 'error'`. What's missing is the notification bar itself — the UI that surfaces the error to the user and gives them two recovery actions.

This is a focused, self-contained task. One file, two actions, clear verification.

**One file written in this task:** `notifications/notificationBar.js`

**One CSS addition** to `panel.css` — the notification entry animation (already partially specified in TASK-01 but not yet live).

---

## What This Task Does NOT Do

- No new node definitions
- No dispatcher changes
- No persistence changes
- No new canvas interactions

---

## The Two Error Recovery Actions

When a node's AE object goes missing (user deleted a layer or comp directly in AE), the node transitions to `state: 'error'`. The user sees:

1. The node card pulses with a red border on the canvas
2. A notification card appears in `#notification-bar` with two buttons:

| Button | Action | What it does |
|---|---|---|
| **Re-create in AE** | Rebuild the missing AE object | Calls the node's `onAlive` hook → dispatches the create command → sets state back to `alive` |
| **Remove from Graph** | Accept the loss and clean up | Calls `engine.deleteNode(uuid)` → removes from graph and canvas entirely |

---

## PHASE 1 — `notifications/notificationBar.js`

### Public API

| Function | Signature | Description |
|---|---|---|
| `notificationBar.showError` | `(nodeId, label)` | Shows an error notification for a node that has gone missing in AE. Safe to call multiple times for the same node — deduplicated by nodeId. |
| `notificationBar.showMessage` | `(message)` | Shows a plain informational notification (no action buttons). Used for parse errors on panel open. Auto-dismisses after 8 seconds. |
| `notificationBar.dismiss` | `(nodeId)` | Removes the notification for a given node. Called after successful recovery or removal. |
| `notificationBar.dismissAll` | `()` | Removes all notifications. |

### Internal state

```javascript
var _activeNotifications = {}; // { nodeId: domElement }
```

One notification card per node. Calling `showError` for a node that already has a card is a no-op — prevents duplicate cards from stacking if the poller fires multiple ticks before the user responds.

---

### `showError(nodeId, label)` — algorithm

```
1. If _activeNotifications[nodeId] exists: return. (Already showing.)

2. Get the #notification-bar element. If missing: log error, return.

3. Build a .notification div:

   <div class="notification" data-node-id="{nodeId}">
     <span class="notification-icon">⚠</span>
     <span class="notification-text">"{label}" was deleted outside Procedia.</span>
     <button class="notification-btn recreate-btn">Re-create in AE</button>
     <button class="notification-btn remove-btn">Remove from Graph</button>
   </div>

4. Wire the buttons:

   recreate-btn onclick:
     a. Get the node definition and nodeData from graphState
     b. If node is not found or not in 'error' state: dismiss and return
     c. For each UUID in nodeData.hostingComps:
        — Call def.onAlive(nodeData, hostingCompUUID) → command object
        — If command is not null: call evalBridge.dispatch(command)
          In .then(res):
            if res.ok: graphState.updateNode(nodeId, { state: 'alive' })
                       renderer.updateNode(nodeId)
            else: log error (do not dismiss — leave the notification so user can retry)
     d. dismiss(nodeId)

   remove-btn onclick:
     a. engine.deleteNode(nodeId)
     b. renderer.render()
     c. wireRenderer.render()
     d. inspector.updateInspector()
     e. dismiss(nodeId)

5. Append the notification div to #notification-bar.
6. Store in _activeNotifications[nodeId] = div.
```

---

### `showMessage(message)` — algorithm

```
1. Get #notification-bar. If missing: return.

2. Build a .notification.info div:

   <div class="notification info">
     <span class="notification-icon">ℹ</span>
     <span class="notification-text">{message}</span>
     <button class="notification-btn dismiss-btn">Dismiss</button>
   </div>

3. Wire dismiss-btn onclick → remove the element from the DOM.

4. Append to #notification-bar.

5. Auto-dismiss after 8000ms:
   setTimeout(function() {
     if (el.parentNode) el.parentNode.removeChild(el);
   }, 8000);
```

Note: `showMessage` notifications are not tracked in `_activeNotifications` — they are fire-and-forget with auto-dismiss.

---

### `dismiss(nodeId)` — algorithm

```
1. el = _activeNotifications[nodeId]
   If not found: return.

2. Remove el from the DOM (if still attached).

3. delete _activeNotifications[nodeId]
```

---

### `dismissAll()` — algorithm

```
For each nodeId in _activeNotifications:
  dismiss(nodeId)
```

---

### Implementation shape

```javascript
// notifications/notificationBar.js
// DEPENDS ON: none
// MUST LOAD BEFORE: index.js

var notificationBar = (function() {

  var _activeNotifications = {};

  function _getBar() {
    return document.getElementById('notification-bar');
  }

  function showError(nodeId, label) {
    // see algorithm above
  }

  function showMessage(message) {
    // see algorithm above
  }

  function dismiss(nodeId) {
    // see algorithm above
  }

  function dismissAll() {
    for (var id in _activeNotifications) {
      dismiss(id);
    }
  }

  return {
    showError:   showError,
    showMessage: showMessage,
    dismiss:     dismiss,
    dismissAll:  dismissAll
  };

})();
```

Fill every function body completely from the algorithms above.

---

## PHASE 2 — CSS additions to `panel.css`

The notification card structure and static styles were specified in TASK-01. Verify they exist. If any of the following are missing, add them now:

```css
/* Notification entry animation — slide down from above */
@keyframes notif-slide-in {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0);    }
}

.notification {
  animation: notif-slide-in 0.18s ease;
}

/* Info variant — blue border instead of red */
.notification.info {
  background:   #121820;
  border-color: var(--wire-layer);
}

.notification.info .notification-icon {
  color: var(--wire-layer);
}
```

These classes extend the existing `.notification` base styles. Do not remove or replace anything already in `panel.css`.

---

## PHASE 3 — Wire `notificationBar` into `index.js`

`notificationBar` has no `init()` function — it is ready on load. However, `dismissAll()` should be called when the graph is cleared so stale notifications from a previous session don't persist after a fresh load.

Add one line to `_finishInit` in `index.js`, after `renderer.render()`:

```javascript
function _finishInit(graphWasLoaded) {
  notificationBar.dismissAll();   // ← add this line
  renderer.render();
  wireRenderer.render();
  poller.start();
  console.log('[Procedia] Init complete. Poller started.');
}
```

Also add `notificationBar.dismissAll()` at the start of `graphState.clearGraph()` — or call it explicitly whenever `clearGraph` is called. The simplest approach: add one call to `_finishInit` as shown above — it runs on every panel open.

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

  assert('notificationBar exists',             typeof notificationBar === 'object');
  assert('showError is function',              typeof notificationBar.showError === 'function');
  assert('showMessage is function',            typeof notificationBar.showMessage === 'function');
  assert('dismiss is function',               typeof notificationBar.dismiss === 'function');
  assert('dismissAll is function',            typeof notificationBar.dismissAll === 'function');

  // showMessage — creates a notification
  notificationBar.showMessage('Test informational message.');
  var bar = document.getElementById('notification-bar');
  assert('showMessage creates notification element',
    bar !== null && bar.querySelectorAll('.notification').length >= 1);

  // showError — creates a notification with two buttons
  graphState.clearGraph();
  graphState.addNode({
    id: 'PROC-TEST-err1', type: 'layers/text', nodeKind: 'affected', dedicated: false,
    state: 'error', dirty: false, x: 0, y: 0,
    props: { label: 'Missing Layer', content: 'Hi', fontSize: 72,
             color: [1,1,1,1], position: [0,0], rotation: 0, opacity: 100 },
    hostingComps: [], portSlots: {}
  });

  notificationBar.showError('PROC-TEST-err1', 'Missing Layer');
  var notifications = bar.querySelectorAll('.notification[data-node-id="PROC-TEST-err1"]');
  assert('showError creates notification for node',  notifications.length === 1);

  var recreateBtn = notifications[0].querySelector('.recreate-btn');
  var removeBtn   = notifications[0].querySelector('.remove-btn');
  assert('notification has Re-create button',  recreateBtn !== null);
  assert('notification has Remove button',     removeBtn !== null);

  // Deduplication — calling showError again for same node is no-op
  notificationBar.showError('PROC-TEST-err1', 'Missing Layer');
  var dupeCheck = bar.querySelectorAll('.notification[data-node-id="PROC-TEST-err1"]');
  assert('showError deduplication — no duplicate card', dupeCheck.length === 1);

  // dismiss — removes the card
  notificationBar.dismiss('PROC-TEST-err1');
  var afterDismiss = bar.querySelectorAll('.notification[data-node-id="PROC-TEST-err1"]');
  assert('dismiss removes notification',  afterDismiss.length === 0);

  // dismiss unknown — no throw
  var noThrow = true;
  try { notificationBar.dismiss('PROC-DOES-NOT-EXIST'); } catch(e) { noThrow = false; }
  assert('dismiss unknown is no-op',  noThrow);

  // dismissAll
  notificationBar.showError('PROC-TEST-err1', 'A');
  notificationBar.showError('PROC-TEST-err2', 'B');
  // Need to add PROC-TEST-err2 node for dedup to allow it
  graphState.addNode({
    id: 'PROC-TEST-err2', type: 'layers/text', nodeKind: 'affected', dedicated: false,
    state: 'error', dirty: false, x: 0, y: 0, props: { label: 'B' },
    hostingComps: [], portSlots: {}
  });
  notificationBar.showError('PROC-TEST-err2', 'B');
  notificationBar.dismissAll();
  var afterAll = bar.querySelectorAll('.notification[data-node-id]');
  assert('dismissAll removes all tracked notifications', afterAll.length === 0);

  graphState.clearGraph();

  console.log('---');
  console.log('notificationBar:', PASS, 'passed,', FAIL, 'failed');
  if (FAIL > 0) console.error('FIX FAILURES BEFORE PROCEEDING');
})();
```

**Zero failures required before AE verification.**

**STOP. Paste console output. Wait for confirmation.**

---

### Visual verification — browser

Open `index.html` in a browser tab. Run this in the console:

```javascript
notificationBar.showError('PROC-VISUAL-001', 'Headline Text');
notificationBar.showMessage('Graph could not be read. Starting fresh.');
```

**Checklist:**
- [ ] Error notification appears at the top of the canvas with a red border
- [ ] Notification shows the warning icon, the label text, and both buttons
- [ ] Info notification appears below it with a blue border
- [ ] Both cards have the slide-down entry animation
- [ ] Buttons have visible hover states
- [ ] Clicking the info notification's Dismiss button removes it

**STOP. Describe what you see. Wait for confirmation.**

---

### AE integration verification — in After Effects

1. Open AE with the Procedia panel loaded.
2. Drop a Text node, wire it to a Comp node.
3. In AE, manually delete the text layer from the comp.
4. Within 1–5 seconds (one poller tick), the notification bar shows an error card for the Text node.
5. The Text node card on the canvas shows the `error` state (red pulsing border).
6. Click **Re-create in AE** — the text layer reappears in the comp, node returns to `alive` state, notification dismissed.
7. Repeat steps 3 and 4.
8. Click **Remove from Graph** — the node disappears from the canvas, notification dismissed.

**Checklist:**
- [ ] Error notification appears within one poll tick of deleting the layer in AE
- [ ] Node card shows error state (red border pulse)
- [ ] Re-create in AE: layer reappears in AE, node returns to alive, notification gone
- [ ] Remove from Graph: node removed from canvas, wires removed, inspector clears, notification gone
- [ ] No console errors during either recovery action

**STOP. Describe what you see. Wait for confirmation.**

---

## Additional Rules for This Task

**`showError` is safe to call from the poller tick on every tick until the user responds.** The deduplication guard (`_activeNotifications[nodeId]` check) ensures only one card per node exists regardless of how many times the poller fires. Without this guard, a user who ignores an error for 30 seconds would see 30 stacked notification cards.

**The Re-create action calls `def.onAlive` — not `engine.dropNode`.** The node already exists in `nodeMap` with all its props. Re-creating means reconstructing the missing AE object with the existing data. `onAlive` is exactly the hook for this — it returns the create command for the node's current props and hostingComps.

**The Re-create action does not call `dismiss` on failure.** If the dispatch fails (AE is busy, comp is locked, etc.), the notification stays visible so the user can retry. Only dismiss on a confirmed `res.ok === true`.

**The Remove action calls `engine.deleteNode`, not `graphState.removeNode`.** `engine.deleteNode` runs the full lifecycle — `onGhost` first (if there's a parked layer to clean up), then `onDelete`, then graph removal. Calling `graphState.removeNode` directly skips AE cleanup.

**`showMessage` notifications are not tracked in `_activeNotifications`.** They are ephemeral. `dismissAll` only clears error notifications tied to node UUIDs. Informational messages auto-dismiss on their own timer.

**`notificationBar` has no `init()` function.** It initializes itself at declaration. `index.js` does not call an init — it only calls `dismissAll()` on startup to clear stale state.

**No ES6+.** `var`, named functions, `for...in` loops throughout.

---

## On Completion

When all three verification phases pass, output this verbatim:

```
─────────────────────────────────────────────────────────
TASK-14 COMPLETE

notifications/notificationBar.js    ✅  console verified
                                    ✅  visual verified
                                    ✅  AE integration verified

panel.css updated: notif-slide-in animation, .info variant.
index.js updated: dismissAll() on _finishInit.

Re-create in AE and Remove from Graph both confirmed in AE.

Next task: TASK-15 — Shape.js + Adjustment.js node definitions
─────────────────────────────────────────────────────────
```

Then stop. Do not begin any next task without a new brief.

---

*TASK-14-NOTIFICATION-BAR.md — Procedia v4 — May 2026*
*Prerequisite reading: CLAUDE.md Skills 12, 13 — PROCEDIA-V4-ARCHITECTURE.md Section 2 — TASK-01-SETUP.md notification bar spec*
