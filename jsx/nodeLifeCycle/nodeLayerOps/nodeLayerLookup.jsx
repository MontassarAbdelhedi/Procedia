// jsx/nodeLifeCycle/nodeLayerOps/nodeLayerLookup.jsx
// DEPENDS ON: jsx/json.jsx, jsx/init.jsx (findOrCreateProcediaFolder)
// MUST LOAD BEFORE: nodeLayerCreate.jsx, nodeLayerPark.jsx, nodeLayerRemove.jsx
// Provides: findCompByUUID, findLayerByUUID, findReservedComp,
//           findLayerByName, readGhostUUIDs, writeGhostUUIDs
// ES3 — var only, named functions, for loops, string concat

// ─── findCompByUUID ────────────────────────────────────────────────────────────

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
