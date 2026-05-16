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

function isCompNode(n) {
  return n && (n.type === 'CompNode' || n.type === 'core/comp');
}

function findHostingCompUUID(uuid) {
  var visited = {};
  function dfs(id) {
    if (visited[id]) return null;
    visited[id] = true;
    var n = graphState.getNode(id);
    if (!n) return null;
    if (isCompNode(n)) return n.id;
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
  var hostingCompUUID = isCompNode(n) ? null : findHostingCompUUID(uuid);

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
  // Only affected non-comp nodes park to reserved comp.
  // Effectors are handled by cascadeGhost (removeEffector — T8.x).
  // CompNode never ghosts.
  if (isCompNode(n)) return;
  if (n.nodeKind !== 'affected') return;

  // Prefer hostingComps array; fall back to _hostingCompUUID stored on alive.
  var hostingCompUUID = null;
  if (n.hostingComps && n.hostingComps.length > 0) {
    hostingCompUUID = n.hostingComps[0];
  }
  if (!hostingCompUUID) hostingCompUUID = n._hostingCompUUID || null;
  if (!hostingCompUUID) return;

  ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript(
        'parkLayer(' + JSON.stringify(uuid) + ', ' + JSON.stringify(hostingCompUUID) + ')'
      );
    })
    .then(function(res) {
      if (!res.ok) {
        console.error('[Procedia] parkLayer failed for ' + uuid + ':', res.error);
      }
    })
    .catch(function(err) {
      console.error('[Procedia] parkLayer error:', err.message);
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

// ─── callDeleteParkedLayer ────────────────────────────────────────────────────

function callDeleteParkedLayer(uuid) {
  if (!csInterface) return;
  ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript('deleteParkedLayer(' + JSON.stringify(uuid) + ')');
    })
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] deleteParkedLayer failed for ' + uuid + ':', res.error);
    })
    .catch(function(err) {
      console.error('[Procedia] deleteParkedLayer error:', err.message);
    });
}

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
  if (!n || !isCompNode(n) || n.state !== 'alive') return;
  evalBridge.evalScript('focusCompInAE(' + JSON.stringify(uuid) + ')')
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] focusCompInAE failed:', res.error);
    })
    .catch(function(err) {
      console.error('[Procedia] focusCompInAE error:', err.message);
    });
}

// ─── callApplyEffector ────────────────────────────────────────────────────────

function callApplyEffector(effectorUUID, hostLayerUUID, hostingCompUUID, propsObj) {
  if (!csInterface) return;
  var propsStr = JSON.stringify(propsObj || {});
  ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript(
        'applyEffector(' +
          JSON.stringify(effectorUUID)    + ', ' +
          JSON.stringify(hostLayerUUID)   + ', ' +
          JSON.stringify(hostingCompUUID) + ', ' +
          JSON.stringify(propsStr)        +
        ')'
      );
    })
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] applyEffector failed for ' + effectorUUID + ':', res.error);
    })
    .catch(function(err) {
      console.error('[Procedia] applyEffector error:', err.message);
    });
}

// ─── callRemoveEffector ───────────────────────────────────────────────────────

function callRemoveEffector(effectorUUID, hostLayerUUID, hostingCompUUID) {
  if (!csInterface) return;
  ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript(
        'removeEffector(' +
          JSON.stringify(effectorUUID)    + ', ' +
          JSON.stringify(hostLayerUUID)   + ', ' +
          JSON.stringify(hostingCompUUID) +
        ')'
      );
    })
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] removeEffector failed for ' + effectorUUID + ':', res.error);
    })
    .catch(function(err) {
      console.error('[Procedia] removeEffector error:', err.message);
    });
}

// ─── callUpdateNodeProperty ───────────────────────────────────────────────────

function callUpdateNodeProperty(uuid, hostingCompUUID, propertyMatchName, value) {
  if (!csInterface) return;
  var valueStr = JSON.stringify(value);
  ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript(
        'updateNodeProperty(' +
          JSON.stringify(uuid)               + ', ' +
          JSON.stringify(hostingCompUUID)    + ', ' +
          JSON.stringify(propertyMatchName)  + ', ' +
          JSON.stringify(valueStr)           +
        ')'
      );
    })
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] updateNodeProperty failed for ' + uuid + ':', res.error);
    })
    .catch(function(err) {
      console.error('[Procedia] updateNodeProperty error:', err.message);
    });
}

// ─── callSetLayerOrder ────────────────────────────────────────────────────────

function callSetLayerOrder(hostingCompUUID, orderedUUIDs) {
  if (!csInterface) return;
  var listStr = JSON.stringify(orderedUUIDs);
  ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript(
        'setLayerOrder(' + JSON.stringify(hostingCompUUID) + ', ' + JSON.stringify(listStr) + ')'
      );
    })
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] setLayerOrder failed:', res.error);
    })
    .catch(function(err) {
      console.error('[Procedia] setLayerOrder error:', err.message);
    });
}

// ─── callSetLayerParent / callClearLayerParent ────────────────────────────────

function callSetLayerParent(childUUID, parentUUID, hostingCompUUID) {
  if (!csInterface) return;
  ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript(
        'setLayerParent(' +
          JSON.stringify(childUUID)       + ', ' +
          JSON.stringify(parentUUID)      + ', ' +
          JSON.stringify(hostingCompUUID) +
        ')'
      );
    })
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] setLayerParent failed:', res.error);
    })
    .catch(function(err) {
      console.error('[Procedia] setLayerParent error:', err.message);
    });
}

function callClearLayerParent(childUUID, hostingCompUUID) {
  if (!csInterface) return;
  ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript(
        'clearLayerParent(' + JSON.stringify(childUUID) + ', ' + JSON.stringify(hostingCompUUID) + ')'
      );
    })
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] clearLayerParent failed:', res.error);
    })
    .catch(function(err) {
      console.error('[Procedia] clearLayerParent error:', err.message);
    });
}

// ─── Persistence call* wrappers ───────────────────────────────────────────────

function callWriteNodeRegistry(jsonString) {
  if (!csInterface) return Promise.resolve(null);
  return ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript('writeNodeRegistry(' + JSON.stringify(jsonString) + ')');
    })
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] writeNodeRegistry failed:', res.error);
      return res;
    })
    .catch(function(err) {
      console.error('[Procedia] writeNodeRegistry error:', err.message);
    });
}

function callWriteWireRegistry(jsonString) {
  if (!csInterface) return Promise.resolve(null);
  return ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript('writeWireRegistry(' + JSON.stringify(jsonString) + ')');
    })
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] writeWireRegistry failed:', res.error);
      return res;
    })
    .catch(function(err) {
      console.error('[Procedia] writeWireRegistry error:', err.message);
    });
}

function callReadNodeRegistry() {
  if (!csInterface) return Promise.resolve(null);
  return ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript('readNodeRegistry()');
    })
    .then(function(res) {
      if (!res.ok) { console.error('[Procedia] readNodeRegistry failed:', res.error); return null; }
      return res.data;
    })
    .catch(function(err) {
      console.error('[Procedia] readNodeRegistry error:', err.message);
      return null;
    });
}

function callReadWireRegistry() {
  if (!csInterface) return Promise.resolve(null);
  return ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript('readWireRegistry()');
    })
    .then(function(res) {
      if (!res.ok) { console.error('[Procedia] readWireRegistry failed:', res.error); return null; }
      return res.data;
    })
    .catch(function(err) {
      console.error('[Procedia] readWireRegistry error:', err.message);
      return null;
    });
}

function callWriteCompMembership(compUUID, jsonString) {
  if (!csInterface) return Promise.resolve(null);
  return ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript(
        'writeCompMembership(' + JSON.stringify(compUUID) + ', ' + JSON.stringify(jsonString) + ')'
      );
    })
    .then(function(res) {
      if (!res.ok) console.error('[Procedia] writeCompMembership failed:', res.error);
      return res;
    })
    .catch(function(err) {
      console.error('[Procedia] writeCompMembership error:', err.message);
    });
}

// ─── callPollAliveNodes ───────────────────────────────────────────────────────
// Returns a Promise that resolves with the results array, or null on failure.
// Used by polling/poller.js — the only call* function that returns its Promise.

function callPollAliveNodes(uuids) {
  if (!csInterface) return Promise.resolve(null);
  var listStr = JSON.stringify(uuids);
  return ensureProcediaReady()
    .then(function() {
      return evalBridge.evalScript('pollAliveNodes(' + JSON.stringify(listStr) + ')');
    })
    .then(function(res) {
      if (!res.ok) {
        console.error('[Procedia] pollAliveNodes failed:', res.error);
        return null;
      }
      return res.data;
    })
    .catch(function(err) {
      console.error('[Procedia] pollAliveNodes error:', err.message);
      return null;
    });
}
