// jsx/nodeLifeCycle/nodeLayerOps.jsx
// DEPENDS ON: jsx/json.jsx, jsx/init.jsx  (findOrCreateProcediaFolder, findCompByUUID)
// Commands: makeLayerAlive, makeNodeAlive (alias), unparkLayer, parkLayer,
//           deleteParkedLayer, removeLayerFromComp, deleteComp, renameNode
// ES3 — var only, named functions, for loops, string concat

// ─── findCompByUUID ────────────────────────────────────────────────────────────
// Searches all project items for a CompItem whose .comment equals uuid.

function findCompByUUID(uuid) {
  var proj = app.project;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof CompItem && item.comment === uuid) {
      return item;
    }
  }
  return null;
}

// ─── findLayerByUUID ───────────────────────────────────────────────────────────
// Searches all layers of a comp for a layer whose .comment equals uuid.

function findLayerByUUID(comp, uuid) {
  for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer.comment === uuid) {
      return layer;
    }
  }
  return null;
}

// ─── findReservedComp ─────────────────────────────────────────────────────────

function findReservedComp() {
  var proj = app.project;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof CompItem && item.name === '__PROCEDIA_RESERVED__') {
      return item;
    }
  }
  return null;
}

// ─── makeLayerAlive ────────────────────────────────────────────────────────────
// Creates the AE object for a node going alive.
// CompNode  → creates a new CompItem (is itself a hosting comp).
// All other → creates a layer inside the hosting comp.
// Sets layer/comp .comment = uuid for future lookups.

function makeLayerAlive(uuid, nodeType, hostingCompUUID, propsJson) {
  var result = { ok: false, data: null, error: null };
  try {
    var props = {};
    try { props = JSON.parse(propsJson); } catch (pe) { /* empty props */ }

    // ── CompNode: create a new AE comp ──────────────────────────────────────
    if (nodeType === 'CompNode' || nodeType === 'core/comp') {
      var compName = props.name      || 'New Comp';
      var width    = props.width     || 1920;
      var height   = props.height    || 1080;
      var fps      = props.frameRate || 24;
      var dur      = props.duration  || 5;
      var folder   = findOrCreateProcediaFolder();
      var newComp  = app.project.items.addComp(compName, width, height, 1, dur, fps);
      newComp.parentFolder = folder;
      newComp.comment      = uuid;
      result.ok   = true;
      result.data = { compId: uuid };
      return JSON.stringify(result);
    }

    // ── Non-comp: if parked in reserved comp, unpark instead of creating new ──
    var reservedComp0 = findReservedComp();
    if (reservedComp0) {
      var parkedCheck = findLayerByUUID(reservedComp0, uuid);
      if (parkedCheck) {
        return unparkLayer(uuid, hostingCompUUID);
      }
    }

    // ── All other nodes: create a layer inside the hosting comp ─────────────
    var hostComp = findCompByUUID(hostingCompUUID);
    if (!hostComp) {
      result.error = 'Hosting comp not found: ' + hostingCompUUID;
      return JSON.stringify(result);
    }

    var layer = null;

    if (nodeType === 'NullNode') {
      layer = hostComp.layers.addNull();

    } else if (nodeType === 'TextNode') {
      layer = hostComp.layers.addText(props.content || 'Text');

    } else if (nodeType === 'ShapeNode') {
      layer = hostComp.layers.addShape();

    } else if (nodeType === 'SolidNode') {
      var solidColor  = props.color || [0.5, 0.5, 0.5];
      var solidName   = props.name  || 'Solid';
      var solidSource = app.project.items.addSolid(
        solidColor, solidName, hostComp.width, hostComp.height, 1
      );
      solidSource.parentFolder = findOrCreateProcediaFolder();
      layer = hostComp.layers.add(solidSource);

    } else if (nodeType === 'AdjustmentNode') {
      // Adjustment layer — backed by a solid, adjustment flag set
      var adjSource = app.project.items.addSolid(
        [1, 1, 1], 'Adjustment', hostComp.width, hostComp.height, 1
      );
      adjSource.parentFolder = findOrCreateProcediaFolder();
      layer = hostComp.layers.add(adjSource);
      layer.adjustmentLayer = true;

    } else if (nodeType === 'FootageNode') {
      result.error = 'FootageNode: use the AE project panel to import footage, then wire it';
      return JSON.stringify(result);

    } else {
      result.error = 'makeLayerAlive: unknown nodeType: ' + nodeType;
      return JSON.stringify(result);
    }

    layer.comment = uuid;

    result.ok   = true;
    result.data = { layerIndex: layer.index };
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}

// ─── makeNodeAlive ─────────────────────────────────────────────────────────────
// Alias called by the panel (callMakeNodeAlive). Accepts optional nodeLabel arg
// (currently always '' from the panel — renaming deferred to renameNode/T7.4).

function makeNodeAlive(uuid, nodeType, hostingCompUUID, propsJson, nodeLabel) {
  return makeLayerAlive(uuid, nodeType, hostingCompUUID, propsJson);
}

// ─── Ghost layer registry helpers ─────────────────────────────────────────────

function findLayerByName(comp, layerName) {
  for (var i = 1; i <= comp.numLayers; i++) {
    if (comp.layer(i).name === layerName) return comp.layer(i);
  }
  return null;
}

function readGhostUUIDs(reservedComp) {
  var textLayer = findLayerByName(reservedComp, '__PROCEDIA_GHOST_LAYERS__');
  if (!textLayer) return [];
  try {
    var content = textLayer.property('Source Text').value.text;
    var data = JSON.parse(content);
    return data.uuids || [];
  } catch (e) {
    return [];
  }
}

function writeGhostUUIDs(reservedComp, uuids) {
  var textLayer = findLayerByName(reservedComp, '__PROCEDIA_GHOST_LAYERS__');
  if (!textLayer) return;
  textLayer.property('Source Text').setValue(new TextDocument(JSON.stringify({ uuids: uuids })));
}

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
