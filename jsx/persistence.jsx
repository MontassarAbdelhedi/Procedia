// jsx/persistence.jsx
// ES3 - var only, named functions, for loops, string concat
// DEPENDS ON: jsx/init.jsx (findReservedComp assumes initReservedComp was called first)

function findReservedComp() {
  var compName = '__PROCEDIA_RESERVED__';
  var proj = app.project;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof CompItem && item.name === compName) {
      return item;
    }
  }
  return null;
}

function findLayerByName(comp, layerName) {
  for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer.name === layerName) {
      return layer;
    }
  }
  return null;
}

function readLayerText(layer) {
  var textProp = layer.property('ADBE Text Properties').property('ADBE Text Document');
  return textProp.value.text;
}

function writeLayerText(layer, text) {
  var textProp = layer.property('ADBE Text Properties').property('ADBE Text Document');
  var doc = textProp.value;
  doc.text = text;
  textProp.setValue(doc);
}

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

function writeGhostEntry(uuid, nodeType) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = findReservedComp();
    if (!comp) {
      result.error = 'RESERVED comp not found — call initReservedComp first';
      return JSON.stringify(result);
    }

    var dataLayer = findLayerByName(comp, '__PROCEDIA_DATA__');
    if (!dataLayer) {
      result.error = '__PROCEDIA_DATA__ layer not found';
      return JSON.stringify(result);
    }

    comp.locked = false;
    dataLayer.locked = false;

    var rawText = readLayerText(dataLayer);
    var data = JSON.parse(rawText);

    // Skip if already present
    for (var i = 0; i < data.ghost.length; i++) {
      if (data.ghost[i].id === uuid) {
        dataLayer.locked = true;
        comp.locked = true;
        result.ok = true;
        result.data = 'exists';
        return JSON.stringify(result);
      }
    }

    data.ghost.push({ id: uuid, type: nodeType });
    writeLayerText(dataLayer, JSON.stringify(data));

    dataLayer.locked = true;
    comp.locked = true;

    result.ok = true;
    result.data = 'written';
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
