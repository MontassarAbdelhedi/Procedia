// jsx/nodeLifeCycle/nodeLayerOps/nodeLayerPark.jsx
// DEPENDS ON: jsx/json.jsx,
//             nodeLayerLookup.jsx (findCompByUUID, findLayerByUUID, findReservedComp,
//                                  readGhostUUIDs, writeGhostUUIDs)
// Provides: parkLayer, unparkLayer, deleteParkedLayer
// ES3 — var only, named functions, for loops, string concat

// ─── parkLayer ────────────────────────────────────────────────────────────────
// Moves an affected node's layer from hostingComp to the reserved comp.
// Keyframes survive natively — copyToComp preserves all layer data.
// The parked layer is locked and UUID is appended to GHOST_LAYERS registry.

function parkLayer(uuid, hostingCompUUID) {
  var result = { ok: false, data: null, error: null };
  try {
    app.beginUndoGroup('Procedia: park layer');

    var hostComp = findCompByUUID(hostingCompUUID);
    if (!hostComp) {
      result.error = 'parkLayer: hosting comp not found: ' + hostingCompUUID;
      return JSON.stringify(result);
    }

    var layer = findLayerByUUID(hostComp, uuid);
    if (!layer) {
      result.error = 'parkLayer: layer not found in comp: ' + uuid;
      return JSON.stringify(result);
    }

    var reservedComp = findReservedComp();
    if (!reservedComp) {
      result.error = 'parkLayer: reserved comp not found';
      return JSON.stringify(result);
    }

    // AE cannot copyToComp a layer that has a parent in a different comp.
    // Clear the parent link first — the layer is leaving this comp anyway.
    if (layer.parent !== null) {
      layer.parent = null;
    }

    // Save index before copyToComp can stale the layer reference.
    var srcIndex = layer.index;

    // Copy layer into reserved comp (adds at position 1).
    layer.copyToComp(reservedComp);
    var parkedLayer = reservedComp.layer(1);
    parkedLayer.comment = uuid;

    // Remove original from hosting comp by saved index.
    hostComp.layer(srcIndex).remove();

    // Register UUID in GHOST_LAYERS.
    var uuids = readGhostUUIDs(reservedComp);
    var alreadyIn = false;
    for (var i = 0; i < uuids.length; i++) {
      if (uuids[i] === uuid) { alreadyIn = true; break; }
    }
    if (!alreadyIn) uuids.push(uuid);
    writeGhostUUIDs(reservedComp, uuids);

    app.endUndoGroup();
    result.ok   = true;
    result.data = { uuid: uuid };
  } catch (e) {
    result.error = e.toString();
    try { app.endUndoGroup(); } catch (ignored) {}
  }
  return JSON.stringify(result);
}

// ─── unparkLayer ──────────────────────────────────────────────────────────────
// Moves a parked layer from the reserved comp back to the given hostingComp.
// Keyframes survive — copyToComp preserves all layer data.

function unparkLayer(uuid, hostingCompUUID) {
  var result = { ok: false, data: null, error: null };
  try {
    app.beginUndoGroup('Procedia: unpark layer');

    var reservedComp = findReservedComp();
    if (!reservedComp) {
      result.error = 'unparkLayer: reserved comp not found';
      return JSON.stringify(result);
    }

    var parkedLayer = findLayerByUUID(reservedComp, uuid);
    if (!parkedLayer) {
      result.error = 'unparkLayer: layer not found in reserved comp: ' + uuid;
      return JSON.stringify(result);
    }

    var hostComp = findCompByUUID(hostingCompUUID);
    if (!hostComp) {
      result.error = 'unparkLayer: hosting comp not found: ' + hostingCompUUID;
      return JSON.stringify(result);
    }

    // Save index before copyToComp stales the reference.
    var parkedIndex = parkedLayer.index;

    // Copy to hosting comp (adds at position 1).
    parkedLayer.copyToComp(hostComp);
    var restoredLayer = hostComp.layer(1);
    restoredLayer.comment = uuid;

    // Remove original from reserved comp by saved index — comment lookup is
    // unreliable after copyToComp (AE may clear the source layer's comment).
    reservedComp.layer(parkedIndex).remove();

    // Remove UUID from GHOST_LAYERS registry.
    var uuids = readGhostUUIDs(reservedComp);
    var filtered = [];
    for (var i = 0; i < uuids.length; i++) {
      if (uuids[i] !== uuid) filtered.push(uuids[i]);
    }
    writeGhostUUIDs(reservedComp, filtered);

    app.endUndoGroup();
    result.ok   = true;
    result.data = { layerIndex: restoredLayer.index };
  } catch (e) {
    result.error = e.toString();
    try { app.endUndoGroup(); } catch (ignored) {}
  }
  return JSON.stringify(result);
}

// ─── deleteParkedLayer ────────────────────────────────────────────────────────
// Permanently deletes the parked layer for uuid from the reserved comp.
// Called when a ghost node is fully deleted (no chance of revival).

function deleteParkedLayer(uuid) {
  var result = { ok: false, data: null, error: null };
  try {
    app.beginUndoGroup('Procedia: delete parked layer');

    var reservedComp = findReservedComp();
    if (!reservedComp) {
      result.error = 'deleteParkedLayer: reserved comp not found';
      return JSON.stringify(result);
    }

    var layer = findLayerByUUID(reservedComp, uuid);
    if (!layer) {
      // Already gone — treat as success (idempotent).
      result.ok   = true;
      result.data = { uuid: uuid, wasPresent: false };
      return JSON.stringify(result);
    }

    layer.remove();

    // Remove UUID from GHOST_LAYERS registry.
    var uuids = readGhostUUIDs(reservedComp);
    var filtered = [];
    for (var i = 0; i < uuids.length; i++) {
      if (uuids[i] !== uuid) filtered.push(uuids[i]);
    }
    writeGhostUUIDs(reservedComp, filtered);

    app.endUndoGroup();
    result.ok   = true;
    result.data = { uuid: uuid, wasPresent: true };
  } catch (e) {
    result.error = e.toString();
    try { app.endUndoGroup(); } catch (ignored) {}
  }
  return JSON.stringify(result);
}
