// jsx/persistence.jsx
// DEPENDS ON: jsx/json.jsx, jsx/nodeLifeCycle/nodeLayerOps.jsx
//   (findReservedComp, findLayerByName, findCompByUUID already defined there)
// Commands: writeNodeRegistry, writeWireRegistry, readNodeRegistry, readWireRegistry,
//           writeCompMembership, readCompMembership
// ES3 — var only, named functions, for loops, string concat

// ─── Layer text helpers ───────────────────────────────────────────────────────

function readLayerText(layer) {
  return layer.property('ADBE Text Properties').property('ADBE Text Document').value.text;
}

function writeLayerText(layer, text) {
  var textProp = layer.property('ADBE Text Properties').property('ADBE Text Document');
  var doc = textProp.value;
  doc.text = text;
  textProp.setValue(doc);
}

// ─── findOrCreateCompMembershipLayer ─────────────────────────────────────────
// Finds or creates a text layer named __PROCEDIA_COMP_{uuid}__ inside the given comp.

function findOrCreateCompMembershipLayer(comp, compUUID) {
  var layerName = '__PROCEDIA_COMP_' + compUUID + '__';
  for (var i = 1; i <= comp.numLayers; i++) {
    if (comp.layer(i).name === layerName) return comp.layer(i);
  }
  var newLayer = comp.layers.addText('{}');
  newLayer.name = layerName;
  return newLayer;
}

// ─── writeNodeRegistry ────────────────────────────────────────────────────────
// Overwrites the __PROCEDIA_NODES__ text layer in the reserved comp.

function writeNodeRegistry(jsonString) {
  var result = { ok: false, data: null, error: null };
  try {
    var reserved = findReservedComp();
    if (!reserved) {
      result.error = 'writeNodeRegistry: reserved comp not found';
      return JSON.stringify(result);
    }
    var layer = findLayerByName(reserved, '__PROCEDIA_NODES__');
    if (!layer) {
      result.error = 'writeNodeRegistry: __PROCEDIA_NODES__ layer not found';
      return JSON.stringify(result);
    }
    writeLayerText(layer, jsonString);
    result.ok   = true;
    result.data = 'written';
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}

// ─── writeWireRegistry ────────────────────────────────────────────────────────
// Overwrites the __PROCEDIA_WIRES__ text layer in the reserved comp.

function writeWireRegistry(jsonString) {
  var result = { ok: false, data: null, error: null };
  try {
    var reserved = findReservedComp();
    if (!reserved) {
      result.error = 'writeWireRegistry: reserved comp not found';
      return JSON.stringify(result);
    }
    var layer = findLayerByName(reserved, '__PROCEDIA_WIRES__');
    if (!layer) {
      result.error = 'writeWireRegistry: __PROCEDIA_WIRES__ layer not found';
      return JSON.stringify(result);
    }
    writeLayerText(layer, jsonString);
    result.ok   = true;
    result.data = 'written';
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}

// ─── readNodeRegistry ─────────────────────────────────────────────────────────
// Returns text content of __PROCEDIA_NODES__. Returns empty schema if not found.

function readNodeRegistry() {
  var result = { ok: false, data: null, error: null };
  try {
    var reserved = findReservedComp();
    if (!reserved) {
      result.ok   = true;
      result.data = '{"version":"2.0","nodes":{}}';
      return JSON.stringify(result);
    }
    var layer = findLayerByName(reserved, '__PROCEDIA_NODES__');
    if (!layer) {
      result.ok   = true;
      result.data = '{"version":"2.0","nodes":{}}';
      return JSON.stringify(result);
    }
    result.ok   = true;
    result.data = readLayerText(layer);
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}

// ─── readWireRegistry ─────────────────────────────────────────────────────────
// Returns text content of __PROCEDIA_WIRES__. Returns empty schema if not found.

function readWireRegistry() {
  var result = { ok: false, data: null, error: null };
  try {
    var reserved = findReservedComp();
    if (!reserved) {
      result.ok   = true;
      result.data = '{"version":"2.0","wires":[]}';
      return JSON.stringify(result);
    }
    var layer = findLayerByName(reserved, '__PROCEDIA_WIRES__');
    if (!layer) {
      result.ok   = true;
      result.data = '{"version":"2.0","wires":[]}';
      return JSON.stringify(result);
    }
    result.ok   = true;
    result.data = readLayerText(layer);
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}

// ─── writeCompMembership ──────────────────────────────────────────────────────
// Finds or creates __PROCEDIA_COMP_{compUUID}__ text layer inside that comp
// and overwrites its content with jsonString.

function writeCompMembership(compUUID, jsonString) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = findCompByUUID(compUUID);
    if (!comp) {
      result.error = 'writeCompMembership: comp not found: ' + compUUID;
      return JSON.stringify(result);
    }
    var layer = findOrCreateCompMembershipLayer(comp, compUUID);
    writeLayerText(layer, jsonString);
    result.ok   = true;
    result.data = 'written';
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}

// ─── readCompMembership ───────────────────────────────────────────────────────
// Reads __PROCEDIA_COMP_{compUUID}__ from that comp. Returns '{}' if not found.

function readCompMembership(compUUID) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = findCompByUUID(compUUID);
    if (!comp) {
      result.ok   = true;
      result.data = '{}';
      return JSON.stringify(result);
    }
    var layerName = '__PROCEDIA_COMP_' + compUUID + '__';
    var layer = findLayerByName(comp, layerName);
    if (!layer) {
      result.ok   = true;
      result.data = '{}';
      return JSON.stringify(result);
    }
    result.ok   = true;
    result.data = readLayerText(layer);
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
