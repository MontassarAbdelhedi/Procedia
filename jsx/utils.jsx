// utils.jsx — Shared utility functions for ExtendScript (ES3-safe)
// REQUIRES: json.jsx (must be loaded before this file in the preamble)

// Returns a CompItem whose .comment matches uuid, or null.
function findCompByUUID(uuid) {
  var proj = app.project;
  if (proj.numItems === 0) return null;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof CompItem && item.comment === uuid) return item;
  }
  return null;
}

// Returns a layer in comp whose .comment matches uuid, or null.
function findLayerByUUID(comp, uuid) {
  for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer.comment === uuid) return layer;
  }
  return null;
}

// Returns the first CompItem whose name starts with 'DO NOT DELETE', or null.
function findReservedComp() {
  var proj = app.project;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof CompItem && item.name.indexOf('DO NOT DELETE') === 0) return item;
  }
  return null;
}

// Returns the Procedia project folder, creating it if it does not exist.
function findOrCreateProcediaFolder() {
  var name = 'DO NOT DELETE — Procedia Reserved';
  var proj = app.project;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof FolderItem && item.name === name) return item;
  }
  return proj.items.addFolder(name);
}
