// jsx/init.jsx
// DEPENDS ON: jsx/json.jsx (must be in preamble before this)
// ES3 — var only, named functions, for loops, string concat

// ─── findOrCreateProcediaFolder ───────────────────────────────────────────────

function findOrCreateProcediaFolder() {
  var folderName = 'DO NOT DELETE - Procedia';
  var proj = app.project;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof FolderItem && item.name === folderName) {
      return item;
    }
  }
  return proj.items.addFolder(folderName);
}

// ─── findOrCreateReservedComp ─────────────────────────────────────────────────
// Finds or creates __PROCEDIA_RESERVED__ inside the Procedia folder.
// Wide comp (4000×150) — enough width to hold long JSON strings in text layers.

function findOrCreateReservedComp(folder) {
  var compName = '__PROCEDIA_RESERVED__';
  var proj = app.project;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof CompItem && item.name === compName) {
      return item;
    }
  }
  var comp = proj.items.addComp(compName, 4000, 150, 1, 1, 1);
  comp.parentFolder = folder;
  return comp;
}

// ─── findOrCreateTextLayer ────────────────────────────────────────────────────
// Finds an existing text layer by name inside comp, or creates a new one.
// initialJSON is only written on creation — existing layer content is preserved.

function findOrCreateTextLayer(comp, layerName, initialJSON) {
  for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer.name === layerName) {
      return layer;
    }
  }
  var newLayer = comp.layers.addText(initialJSON);
  newLayer.name = layerName;
  return newLayer;
}

// ─── initReservedComp ─────────────────────────────────────────────────────────
// Entry point called by evalBridge on panel init (first node drop).
// Idempotent — safe to call when folder/comp/layers already exist.

function initReservedComp() {
  var result = { ok: false, data: null, error: null };
  try {
    app.beginUndoGroup('Procedia: init reserved comp');

    var folder = findOrCreateProcediaFolder();
    var comp   = findOrCreateReservedComp(folder);

    findOrCreateTextLayer(
      comp,
      '__PROCEDIA_NODES__',
      '{"version":"2.0","nodes":{}}'
    );
    findOrCreateTextLayer(
      comp,
      '__PROCEDIA_WIRES__',
      '{"version":"2.0","wires":[]}'
    );
    findOrCreateTextLayer(
      comp,
      '__PROCEDIA_GHOST_LAYERS__',
      '{"uuids":[]}'
    );

    app.endUndoGroup();
    result.ok   = true;
    result.data = 'initialized';
  } catch (e) {
    result.error = e.toString();
    try { app.endUndoGroup(); } catch (ignored) {}
  }
  return JSON.stringify(result);
}
