// ─── Reserved-comp init guard ─────────────────────────────────────────────────

var procediaReady = false;

function ensureProcediaReady() {
  if (procediaReady || !csInterface) {
    return Promise.resolve();
  }
  return evalBridge.evalScript('initReservedComp()').then(function(res) {
    if (res.ok) {
      procediaReady = true;
    } else {
      console.error('[Procedia] initReservedComp failed:', res.error);
      throw new Error('initReservedComp: ' + res.error);
    }
  });
  // No .catch here — let failures propagate so callers can skip AE writes.
}

// ─── findHostingCompUUID ──────────────────────────────────────────────────────
// Walk output wires downstream from uuid until a core/comp node is found.
// Returns the comp node's UUID, or null if no comp is reachable.

function findHostingCompUUID(uuid) {
  var visited = {};
  function dfs(id) {
    if (visited[id]) return null;
    visited[id] = true;
    var n = graphState.getNode(id);
    if (!n) return null;
    if (n.type === 'core/comp') return n.id;
    var allWires = graphState.getAllWires();
    for (var wid in allWires) {
      if (allWires.hasOwnProperty(wid) && allWires[wid].fromNode === id) {
        var found = dfs(allWires[wid].toNode);
        if (found) return found;
      }
    }
    return null;
  }
  return dfs(uuid);
}

// ─── callMakeNodeAlive ────────────────────────────────────────────────────────

function callMakeNodeAlive(uuid) {
  if (!csInterface) return;
  var n = graphState.getNode(uuid);
  if (!n) return;
  var hostingCompUUID = (n.type === 'core/comp') ? null : findHostingCompUUID(uuid);

  // Persist hostingCompUUID in node data so callMakeNodeGhost can use it later
  // when the wires are already gone and traversal is no longer possible.
  // _hostingCompUUIDs is the authoritative list; _hostingCompUUID is kept as
  // a fallback for makeNodeGhost (last comp this node was alive in).
  if (hostingCompUUID) {
    graphState.updateNode(uuid, {
      _hostingCompUUID:  hostingCompUUID,
      _hostingCompUUIDs: [hostingCompUUID]
    });
  }

  var propsStr  = JSON.stringify(n.properties || {});
  var nodeLabel = n.label || '';

  ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript(
        'makeNodeAlive(' +
          JSON.stringify(uuid) + ', ' +
          JSON.stringify(n.type) + ', ' +
          JSON.stringify(hostingCompUUID) + ', ' +
          JSON.stringify(propsStr) + ', ' +
          JSON.stringify(nodeLabel) +
        ')'
      );
    })
    .then(function(res) {
      if (!res.ok) {
        console.error('[Procedia] makeNodeAlive failed for ' + uuid + ':', res.error);
      }
    })
    .catch(function(err) {
      console.error('[Procedia] makeNodeAlive error:', err.message);
    });
}

function callMakeNodeGhost(uuid) {
  if (!csInterface) return;
  var n = graphState.getNode(uuid);
  if (!n) return;
  // _hostingCompUUID was stored when the node went alive (see callMakeNodeAlive)
  var hostingCompUUID = n._hostingCompUUID || null;

  ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript(
        'makeNodeGhost(' +
          JSON.stringify(uuid) + ', ' +
          JSON.stringify(hostingCompUUID) +
        ')'
      );
    })
    .then(function(res) {
      if (!res.ok) {
        console.error('[Procedia] makeNodeGhost failed for ' + uuid + ':', res.error);
      }
    })
    .catch(function(err) {
      console.error('[Procedia] makeNodeGhost error:', err.message);
    });
}

// ─── callAddLayerToComp ───────────────────────────────────────────────────────
// Called when an already-alive non-comp node is wired to an additional comp.
// Reuses makeNodeAlive JSX (idempotent) with the new hosting comp.

function callAddLayerToComp(uuid, compUUID) {
  if (!csInterface) return;
  var n = graphState.getNode(uuid);
  if (!n) return;

  var existing = n._hostingCompUUIDs || (n._hostingCompUUID ? [n._hostingCompUUID] : []);
  for (var i = 0; i < existing.length; i++) {
    if (existing[i] === compUUID) return; // already tracked
  }
  var updated = existing.slice();
  updated.push(compUUID);
  graphState.updateNode(uuid, { _hostingCompUUIDs: updated });

  var propsStr  = JSON.stringify(n.properties || {});
  var nodeLabel = n.label || '';
  ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript(
        'makeNodeAlive(' +
          JSON.stringify(uuid)      + ', ' +
          JSON.stringify(n.type)    + ', ' +
          JSON.stringify(compUUID)  + ', ' +
          JSON.stringify(propsStr)  + ', ' +
          JSON.stringify(nodeLabel) +
        ')'
      );
    })
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] callAddLayerToComp failed:', res.error);
    })
    .catch(function(err) {
      console.error('[Procedia] callAddLayerToComp error:', err.message);
    });
}

// ─── callRemoveLayerFromComp ──────────────────────────────────────────────────
// Called when a wire from an alive non-comp node to a comp is deleted.
// Removes the layer from that comp only. If it was the last comp, transitions
// the node to ghost (which triggers callMakeNodeGhost for final AE cleanup).

function callRemoveLayerFromComp(uuid, compUUID) {
  if (!csInterface) return;
  var n = graphState.getNode(uuid);
  if (!n || n.state !== 'alive') return;

  var existing = n._hostingCompUUIDs || (n._hostingCompUUID ? [n._hostingCompUUID] : []);
  var remaining = [];
  for (var i = 0; i < existing.length; i++) {
    if (existing[i] !== compUUID) remaining.push(existing[i]);
  }

  if (remaining.length === 0) {
    // Last comp — go ghost; callMakeNodeGhost (fired by onNodeStateChange) handles AE removal
    graphState.updateNode(uuid, {
      _hostingCompUUIDs: remaining,
      _hostingCompUUID:  compUUID,
      state: 'ghost'
    });
  } else {
    // Still alive in other comps — remove layer from this comp only
    graphState.updateNode(uuid, { _hostingCompUUIDs: remaining });
    ensureProcediaReady()
      .then(function() {
        return evalBridge.evalScript(
          'removeLayerFromComp(' + JSON.stringify(uuid) + ', ' + JSON.stringify(compUUID) + ')'
        );
      })
      .then(function(res) {
        if (!res.ok) console.error('[Procedia] removeLayerFromComp failed:', res.error);
      })
      .catch(function(err) {
        console.error('[Procedia] removeLayerFromComp error:', err.message);
      });
  }
}

// ─── callDeleteComp ───────────────────────────────────────────────────────────

function callDeleteComp(uuid) {
  if (!csInterface) return;
  ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript('deleteComp(' + JSON.stringify(uuid) + ')');
    })
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] deleteComp failed for ' + uuid + ':', res.error);
    })
    .catch(function(err) {
      console.error('[Procedia] deleteComp error:', err.message);
    });
}

function callRenameNode(uuid, newName) {
  if (!csInterface) return;
  ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript(
        'renameNode(' + JSON.stringify(uuid) + ', ' + JSON.stringify(newName) + ')'
      );
    })
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] renameNode failed for ' + uuid + ':', res.error);
    })
    .catch(function(err) {
      console.error('[Procedia] renameNode error:', err.message);
    });
}

// ─── callFocusCompInAE ────────────────────────────────────────────────────────

function callFocusCompInAE(uuid) {
  if (!csInterface) return;
  var n = graphState.getNode(uuid);
  if (!n || n.type !== 'core/comp' || n.state !== 'alive') return;
  evalBridge.evalScript('focusCompInAE(' + JSON.stringify(uuid) + ')')
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] focusCompInAE failed:', res.error);
    })
    .catch(function(err) {
      console.error('[Procedia] focusCompInAE error:', err.message);
    });
}
