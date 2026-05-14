// jsx/nodeLifeCycle/nodeWireOps.jsx
// ES3 - var only, named functions, for loops, string concat
// DEPENDS ON: jsx/json.jsx, jsx/persistence.jsx

// ── removeLayerFromComp ────────────────────────────────────────────────────
// Removes a non-comp node's layer from one specific comp while the node
// stays alive in other comps. Also purges the entry from dataLayer.

function removeLayerFromComp(uuid, hostCompUUID) {
  var result = { ok: false, data: null, error: null };
  try {
    app.beginUndoGroup('Procedia: removeLayerFromComp');

    var hostComp = findCompByUUID(hostCompUUID);
    if (hostComp) {
      for (var i = 1; i <= hostComp.numLayers; i++) {
        if (hostComp.layer(i).comment === uuid) {
          hostComp.layer(i).remove();
          break;
        }
      }
    }

    var reserved = findReservedComp();
    if (reserved) {
      reserved.locked = false;
      var dataLyr = findLayerByName(reserved, '__PROCEDIA_DATA__');
      if (dataLyr) {
        dataLyr.locked = false;
        var data = JSON.parse(readLayerText(dataLyr));
        if (data.project && data.project[hostCompUUID]) {
          var compEntry = data.project[hostCompUUID];
          if (compEntry.nodes) delete compEntry.nodes[uuid];
          var newOrder = [];
          for (var lo = 0; lo < (compEntry.layerOrder || []).length; lo++) {
            if (compEntry.layerOrder[lo] !== uuid) newOrder.push(compEntry.layerOrder[lo]);
          }
          compEntry.layerOrder = newOrder;
        }
        writeLayerText(dataLyr, JSON.stringify(data));
        dataLyr.locked = true;
      }
      reserved.locked = true;
    }

    app.endUndoGroup();
    result.ok = true;
  } catch (e) {
    result.error = e.toString();
    try { app.endUndoGroup(); } catch (ignored) {}
  }
  return JSON.stringify(result);
}

// ── addCompAsLayer ─────────────────────────────────────────────────────────
// Called when a core/comp node is wired into another core/comp.
// Adds the source comp as a layer inside the host comp (no-op if already present).

function addCompAsLayer(sourceCompUUID, hostCompUUID) {
  var result = { ok: false, data: null, error: null };
  try {
    app.beginUndoGroup('Procedia: addCompAsLayer');
    var sourceComp = findCompByUUID(sourceCompUUID);
    if (!sourceComp) {
      result.error = 'addCompAsLayer: source comp not found: ' + sourceCompUUID;
      app.endUndoGroup();
      return JSON.stringify(result);
    }
    var hostComp = findCompByUUID(hostCompUUID);
    if (!hostComp) {
      result.error = 'addCompAsLayer: host comp not found: ' + hostCompUUID;
      app.endUndoGroup();
      return JSON.stringify(result);
    }
    // Idempotent — skip if already a layer in this comp
    for (var i = 1; i <= hostComp.numLayers; i++) {
      if (hostComp.layer(i).comment === sourceCompUUID) {
        result.ok = true;
        result.data = { alreadyPresent: true };
        app.endUndoGroup();
        return JSON.stringify(result);
      }
    }
    var layer = hostComp.layers.add(sourceComp);
    layer.comment = sourceCompUUID;
    app.endUndoGroup();
    result.ok   = true;
    result.data = { layerIndex: layer.index };
  } catch (e) {
    result.error = e.toString();
    try { app.endUndoGroup(); } catch (ignored) {}
  }
  return JSON.stringify(result);
}

// ── removeCompLayerFromComp ────────────────────────────────────────────────
// Removes the source comp layer from the host comp when a comp-to-comp wire
// is deleted.

function removeCompLayerFromComp(sourceCompUUID, hostCompUUID) {
  var result = { ok: false, data: null, error: null };
  try {
    app.beginUndoGroup('Procedia: removeCompLayerFromComp');
    var hostComp = findCompByUUID(hostCompUUID);
    if (!hostComp) {
      result.ok = true;
      app.endUndoGroup();
      return JSON.stringify(result);
    }
    for (var i = 1; i <= hostComp.numLayers; i++) {
      if (hostComp.layer(i).comment === sourceCompUUID) {
        hostComp.layer(i).remove();
        break;
      }
    }
    app.endUndoGroup();
    result.ok = true;
  } catch (e) {
    result.error = e.toString();
    try { app.endUndoGroup(); } catch (ignored) {}
  }
  return JSON.stringify(result);
}
