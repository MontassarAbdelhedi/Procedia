// jsx/nodeLifeCycle/nodeCompOps.jsx
// DEPENDS ON: jsx/json.jsx, jsx/nodeLifeCycle/nodeLayerOps.jsx (findCompByUUID, findLayerByUUID)
// Commands: addCompAsLayer, removeCompLayerFromComp
// ES3 — var only, named functions, for loops, string concat

// ─── addCompAsLayer ───────────────────────────────────────────────────────────
// Adds fromComp as a precomp layer inside toComp.
// Sets layer.comment = fromCompUUID so it can be found and removed later.
// Idempotent: if the layer already exists (same comment), skips creation.

function addCompAsLayer(fromCompUUID, toCompUUID) {
  var result = { ok: false, data: null, error: null };
  try {
    app.beginUndoGroup('Procedia: add comp as layer');

    var fromComp = findCompByUUID(fromCompUUID);
    if (!fromComp) {
      result.error = 'addCompAsLayer: source comp not found: ' + fromCompUUID;
      return JSON.stringify(result);
    }

    var toComp = findCompByUUID(toCompUUID);
    if (!toComp) {
      result.error = 'addCompAsLayer: target comp not found: ' + toCompUUID;
      return JSON.stringify(result);
    }

    // Idempotent: skip if already present.
    var existing = findLayerByUUID(toComp, fromCompUUID);
    if (existing) {
      result.ok   = true;
      result.data = { layerIndex: existing.index, alreadyPresent: true };
      return JSON.stringify(result);
    }

    var newLayer = toComp.layers.add(fromComp);
    newLayer.comment = fromCompUUID;

    app.endUndoGroup();
    result.ok   = true;
    result.data = { layerIndex: newLayer.index, alreadyPresent: false };
  } catch (e) {
    result.error = e.toString();
    try { app.endUndoGroup(); } catch (ignored) {}
  }
  return JSON.stringify(result);
}

// ─── removeCompLayerFromComp ──────────────────────────────────────────────────
// Removes the precomp layer (whose comment === fromCompUUID) from toComp.
// The source comp itself is NOT deleted — only the layer referencing it.
// Idempotent: if layer is already gone, returns ok:true.

function removeCompLayerFromComp(fromCompUUID, toCompUUID) {
  var result = { ok: false, data: null, error: null };
  try {
    app.beginUndoGroup('Procedia: remove comp layer from comp');

    var toComp = findCompByUUID(toCompUUID);
    if (!toComp) {
      result.error = 'removeCompLayerFromComp: target comp not found: ' + toCompUUID;
      return JSON.stringify(result);
    }

    var layer = findLayerByUUID(toComp, fromCompUUID);
    if (!layer) {
      // Already gone — idempotent success.
      result.ok   = true;
      result.data = { fromCompUUID: fromCompUUID, wasPresent: false };
      return JSON.stringify(result);
    }

    layer.remove();

    app.endUndoGroup();
    result.ok   = true;
    result.data = { fromCompUUID: fromCompUUID, wasPresent: true };
  } catch (e) {
    result.error = e.toString();
    try { app.endUndoGroup(); } catch (ignored) {}
  }
  return JSON.stringify(result);
}
