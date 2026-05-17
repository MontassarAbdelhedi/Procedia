// jsx/nodeLifeCycle/nodeLayerOps/nodeLayerRemove.jsx
// DEPENDS ON: jsx/json.jsx,
//             nodeLayerLookup.jsx (findCompByUUID, findLayerByUUID)
// Provides: deleteComp, renameNode, removeLayerFromComp
// ES3 — var only, named functions, for loops, string concat

// ─── deleteComp ───────────────────────────────────────────────────────────────
// Finds the CompItem whose .comment === uuid and deletes it from the project.

function deleteComp(uuid) {
  var result = { ok: false, data: null, error: null };
  try {
    app.beginUndoGroup('Procedia: delete comp');

    var proj = app.project;
    var found = null;
    for (var i = 1; i <= proj.numItems; i++) {
      var item = proj.item(i);
      if (item instanceof CompItem && item.comment === uuid) {
        found = item;
        break;
      }
    }

    if (!found) {
      // Already gone — idempotent success.
      result.ok   = true;
      result.data = { uuid: uuid, wasPresent: false };
      return JSON.stringify(result);
    }

    found.remove();

    app.endUndoGroup();
    result.ok   = true;
    result.data = { uuid: uuid, wasPresent: true };
  } catch (e) {
    result.error = e.toString();
    try { app.endUndoGroup(); } catch (ignored) {}
  }
  return JSON.stringify(result);
}

// ─── renameNode ───────────────────────────────────────────────────────────────
// Renames the AE object (comp or layer) whose .comment === uuid.
// Checks comps first; if not found, scans every layer in every comp.

function renameNode(uuid, newName) {
  var result = { ok: false, data: null, error: null };
  try {
    var proj = app.project;

    // Check comps.
    for (var i = 1; i <= proj.numItems; i++) {
      var item = proj.item(i);
      if (item instanceof CompItem && item.comment === uuid) {
        item.name = newName;
        result.ok   = true;
        result.data = { uuid: uuid, kind: 'comp', newName: newName };
        return JSON.stringify(result);
      }
    }

    // Check layers inside every comp.
    for (var j = 1; j <= proj.numItems; j++) {
      var comp = proj.item(j);
      if (!(comp instanceof CompItem)) continue;
      for (var k = 1; k <= comp.numLayers; k++) {
        var layer = comp.layer(k);
        if (layer.comment === uuid) {
          layer.name = newName;
          result.ok   = true;
          result.data = { uuid: uuid, kind: 'layer', newName: newName };
          return JSON.stringify(result);
        }
      }
    }

    result.error = 'renameNode: no comp or layer found for UUID: ' + uuid;
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}

// ─── removeLayerFromComp ──────────────────────────────────────────────────────
// Removes the layer for uuid from one specific hosting comp.
// Does NOT touch the reserved comp or GHOST_LAYERS — the node may still be
// alive in other comps; callRemoveLayerFromComp in nodeOps.js handles that logic.

function removeLayerFromComp(uuid, hostingCompUUID) {
  var result = { ok: false, data: null, error: null };
  try {
    app.beginUndoGroup('Procedia: remove layer from comp');

    var hostComp = findCompByUUID(hostingCompUUID);
    if (!hostComp) {
      result.error = 'removeLayerFromComp: hosting comp not found: ' + hostingCompUUID;
      return JSON.stringify(result);
    }

    var layer = findLayerByUUID(hostComp, uuid);
    if (!layer) {
      // Already gone — idempotent success.
      result.ok   = true;
      result.data = { uuid: uuid, wasPresent: false };
      return JSON.stringify(result);
    }

    layer.remove();

    app.endUndoGroup();
    result.ok   = true;
    result.data = { uuid: uuid, wasPresent: true };
  } catch (e) {
    result.error = e.toString();
    try { app.endUndoGroup(); } catch (ignored) {}
  }
  return JSON.stringify(result);
}
