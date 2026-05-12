// jsx/init.jsx
// ES3 — var only, named functions, for loops, string concat
// Loaded once at panel startup via $.evalFile.

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

function findOrCreateReservedComp(folder) {
  var compName = '__PROCEDIA_RESERVED__';
  var proj = app.project;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof CompItem && item.name === compName) {
      return item;
    }
  }
  // 4x4px minimum safe size, pixelAspect=1, duration=1s, frameRate=1fps
  var comp = proj.items.addComp(compName, 4, 4, 1, 1, 1);
  comp.parentFolder = folder;
  return comp;
}

function findOrCreateTextLayer(comp, layerName, initialJSON) {
  for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer.name === layerName) {
      return layer;
    }
  }
  var newLayer = comp.layers.addText(initialJSON);
  newLayer.name = layerName;
  newLayer.locked = true;
  return newLayer;
}

function initReservedComp() {
  var result = { ok: false, data: null, error: null };
  try {
    app.beginUndoGroup('Procedia: init');

    var folder = findOrCreateProcediaFolder();

    var comp = findOrCreateReservedComp(folder);
    comp.locked = false;

    findOrCreateTextLayer(
      comp,
      '__PROCEDIA_DATA__',
      '{"version":"2.0","ghost":[],"project":{}}'
    );
    findOrCreateTextLayer(
      comp,
      '__PROCEDIA_WIRES__',
      '{"version":"2.0","wires":[]}'
    );

    comp.locked = true;

    app.endUndoGroup();
    result.ok   = true;
    result.data = 'initialized';
  } catch (e) {
    result.error = e.toString();
    try { app.endUndoGroup(); } catch (ignored) {}
  }
  return JSON.stringify(result);
}
