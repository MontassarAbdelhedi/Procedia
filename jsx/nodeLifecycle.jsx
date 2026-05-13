// jsx/nodeLifecycle.jsx
// ES3 - var only, named functions, for loops, string concat
// DEPENDS ON: jsx/json.jsx, jsx/init.jsx, jsx/persistence.jsx

// ── Shared helper ──────────────────────────────────────────────────────────

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

// ── Keyframe helpers ───────────────────────────────────────────────────────

// Serialise the keyframes of a single AE property into a plain array.
// Supports number values and array values (Position, Scale, etc.).
// TextDocument and other complex types are skipped gracefully.
function readPropKeyframes(prop) {
  var kfs = [];
  for (var k = 1; k <= prop.numKeys; k++) {
    var val = prop.keyValue(k);
    var serialized;
    if (val instanceof Array) {
      var arr = [];
      for (var ai = 0; ai < val.length; ai++) arr.push(val[ai]);
      serialized = arr;
    } else if (typeof val === 'number') {
      serialized = val;
    } else {
      continue; // skip TextDocument, MarkerValue, etc.
    }
    kfs.push({ time: prop.keyTime(k), value: serialized });
  }
  return kfs;
}

// Walk the ADBE Transform Group and collect any properties that have keyframes.
function readLayerKeyframes(layer) {
  var keyframes = {};
  var transform = layer.property('ADBE Transform Group');
  if (!transform) return keyframes;

  var tProps = [
    'ADBE Anchor Point',
    'ADBE Position',
    'ADBE Scale',
    'ADBE Rotate Z',
    'ADBE Opacity'
  ];
  for (var ti = 0; ti < tProps.length; ti++) {
    var prop = null;
    try { prop = transform.property(tProps[ti]); } catch (e) {}
    if (prop && prop.numKeys > 0) {
      var kfs = readPropKeyframes(prop);
      if (kfs.length > 0) {
        keyframes['ADBE Transform Group/' + tProps[ti]] = kfs;
      }
    }
  }
  return keyframes;
}

// Read the keyframes stored on a ghost entry in dataLayer (written by makeNodeGhost).
// Returns the keyframes object, or null if the ghost entry has none.
function readGhostKeyframes(uuid) {
  var reserved = findReservedComp();
  if (!reserved) return null;
  var dataLyr = findLayerByName(reserved, '__PROCEDIA_DATA__');
  if (!dataLyr) return null;
  var data = JSON.parse(readLayerText(dataLyr));
  for (var g = 0; g < data.ghost.length; g++) {
    if (data.ghost[g].id === uuid) {
      return data.ghost[g].keyframes || null;
    }
  }
  return null;
}

// Apply a keyframes object (from readLayerKeyframes) back onto a freshly-created layer.
function applyLayerKeyframes(layer, keyframes) {
  for (var path in keyframes) {
    if (!keyframes.hasOwnProperty(path)) continue;
    var parts = path.split('/');
    if (parts.length !== 2) continue;
    var group = null;
    try { group = layer.property(parts[0]); } catch (e) {}
    if (!group) continue;
    var prop = null;
    try { prop = group.property(parts[1]); } catch (e) {}
    if (!prop) continue;
    var kfs = keyframes[path];
    for (var k = 0; k < kfs.length; k++) {
      try { prop.setValueAtTime(kfs[k].time, kfs[k].value); } catch (ke) {}
    }
  }
}

// ── DataLayer helpers ──────────────────────────────────────────────────────

// Removes uuid from ghost list → adds to project[hostingCompUUID].nodes.
// For CompNode, creates project[uuid] entry directly.
function updateDataLayerOnAlive(uuid, nodeType, hostingCompUUID, props) {
  var reserved = findReservedComp();
  if (!reserved) return;

  reserved.locked = false;
  var dataLyr = findLayerByName(reserved, '__PROCEDIA_DATA__');
  if (!dataLyr) { reserved.locked = true; return; }

  dataLyr.locked = false;
  var data = JSON.parse(readLayerText(dataLyr));

  // Remove from ghost list
  var newGhost = [];
  for (var g = 0; g < data.ghost.length; g++) {
    if (data.ghost[g].id !== uuid) newGhost.push(data.ghost[g]);
  }
  data.ghost = newGhost;

  if (!data.project) data.project = {};

  if (nodeType === 'core/comp') {
    if (!data.project[uuid]) {
      data.project[uuid] = {
        type: 'core/comp', state: 'alive',
        properties: props, layerOrder: [], nodes: {}
      };
    } else {
      data.project[uuid].state      = 'alive';
      data.project[uuid].properties = props;
    }
  } else {
    if (!data.project[hostingCompUUID]) {
      data.project[hostingCompUUID] = {
        type: 'core/comp', state: 'alive',
        properties: {}, layerOrder: [], nodes: {}
      };
    }
    if (!data.project[hostingCompUUID].nodes) data.project[hostingCompUUID].nodes = {};
    data.project[hostingCompUUID].nodes[uuid] = {
      type: nodeType, state: 'alive',
      properties: props, keyframes: {}
    };
    var order = data.project[hostingCompUUID].layerOrder || [];
    var inOrder = false;
    for (var lo = 0; lo < order.length; lo++) {
      if (order[lo] === uuid) { inOrder = true; break; }
    }
    if (!inOrder) order.push(uuid);
    data.project[hostingCompUUID].layerOrder = order;
  }

  writeLayerText(dataLyr, JSON.stringify(data));
  dataLyr.locked = true;
  reserved.locked = true;
}

// Removes uuid from project[hostingCompUUID].nodes → adds back to ghost list
// with the supplied keyframes object.
function updateDataLayerOnGhost(uuid, hostingCompUUID, keyframes) {
  var reserved = findReservedComp();
  if (!reserved) return;

  reserved.locked = false;
  var dataLyr = findLayerByName(reserved, '__PROCEDIA_DATA__');
  if (!dataLyr) { reserved.locked = true; return; }

  dataLyr.locked = false;
  var data = JSON.parse(readLayerText(dataLyr));

  // Remove from project comp tree and capture nodeType
  var nodeType = 'unknown';
  if (data.project && hostingCompUUID && data.project[hostingCompUUID]) {
    var compEntry = data.project[hostingCompUUID];
    if (compEntry.nodes && compEntry.nodes[uuid]) {
      nodeType = compEntry.nodes[uuid].type || 'unknown';
      delete compEntry.nodes[uuid];
    }
    var newOrder = [];
    for (var lo = 0; lo < (compEntry.layerOrder || []).length; lo++) {
      if (compEntry.layerOrder[lo] !== uuid) newOrder.push(compEntry.layerOrder[lo]);
    }
    compEntry.layerOrder = newOrder;
  }

  // Add/update ghost list entry
  var found = false;
  for (var g = 0; g < data.ghost.length; g++) {
    if (data.ghost[g].id === uuid) {
      data.ghost[g].keyframes = keyframes;
      found = true;
      break;
    }
  }
  if (!found) {
    data.ghost.push({ id: uuid, type: nodeType, keyframes: keyframes });
  }

  writeLayerText(dataLyr, JSON.stringify(data));
  dataLyr.locked = true;
  reserved.locked = true;
}

// ── makeNodeAlive ──────────────────────────────────────────────────────────
// Creates the AE object for a node transitioning ghost → alive.
// If the ghost entry in dataLayer has a keyframes field, those keyframes
// are restored onto the freshly-created layer.

function makeNodeAlive(uuid, nodeType, hostingCompUUID, propertiesJSON) {
  var result = { ok: false, data: null, error: null };
  try {
    app.beginUndoGroup('Procedia: makeNodeAlive');

    var props = {};
    if (propertiesJSON && typeof propertiesJSON === 'string') {
      try { props = JSON.parse(propertiesJSON); } catch (pe) { props = {}; }
    }

    // Read any stored keyframes BEFORE updateDataLayerOnAlive removes the ghost entry
    var savedKeyframes = readGhostKeyframes(uuid);

    var layerIndex = null;

    // ── CompNode ──────────────────────────────────────────────────────────
    if (nodeType === 'core/comp') {
      var w  = (typeof props.width     === 'number') ? props.width     : 1920;
      var h  = (typeof props.height    === 'number') ? props.height    : 1080;
      var d  = (typeof props.duration  === 'number') ? props.duration  : 10;
      var fr = (typeof props.frameRate === 'number') ? props.frameRate : 24;

      var existingComp = findCompByUUID(uuid);
      if (!existingComp) {
        var folder   = findOrCreateProcediaFolder();
        var compName = 'Comp-' + uuid.substr(5, 13);
        existingComp = app.project.items.addComp(compName, w, h, 1, d, fr);
        existingComp.parentFolder = folder;
      }
      existingComp.comment = uuid;

      updateDataLayerOnAlive(uuid, nodeType, null, props);
      result.ok   = true;
      result.data = { layerIndex: null };

    // ── Non-comp nodes ────────────────────────────────────────────────────
    } else {
      var hostComp = findCompByUUID(hostingCompUUID);
      if (!hostComp) {
        result.error = 'makeNodeAlive: hosting comp not found (' + hostingCompUUID + ')';
        app.endUndoGroup();
        return JSON.stringify(result);
      }

      var layer = null;

      if (nodeType === 'NullNode') {
        layer      = hostComp.layers.addNull(hostComp.duration);
        layer.name = 'Null-' + uuid.substr(5, 8);

      } else if (nodeType === 'AdjustmentNode') {
        layer      = hostComp.layers.addSolid([1, 1, 1], 'Adj-' + uuid.substr(5, 8), hostComp.width, hostComp.height, 1);
        layer.adjustmentLayer = true;

      } else if (nodeType === 'SolidNode') {
        var solidColor = [0.5, 0.5, 0.5];
        if (props.color && props.color.length >= 3) {
          solidColor = [props.color[0], props.color[1], props.color[2]];
        }
        var solidItem = app.project.items.addSolid(solidColor, 'Solid-' + uuid.substr(5, 8), hostComp.width, hostComp.height, 1);
        solidItem.parentFolder = findOrCreateProcediaFolder();
        layer      = hostComp.layers.add(solidItem);
        layer.name = 'Solid-' + uuid.substr(5, 8);

      } else if (nodeType === 'TextNode') {
        var textContent = (typeof props.content === 'string') ? props.content : '';
        layer      = hostComp.layers.addText(textContent);
        layer.name = 'Text-' + uuid.substr(5, 8);
        if (typeof props.fontSize === 'number') {
          var textDocProp = layer.property('ADBE Text Properties').property('ADBE Text Document');
          var doc         = textDocProp.value;
          doc.fontSize    = props.fontSize;
          if (props.color && props.color.length >= 3) {
            doc.fillColor = [props.color[0], props.color[1], props.color[2]];
          }
          textDocProp.setValue(doc);
        }

      } else if (nodeType === 'ShapeNode') {
        layer      = hostComp.layers.addShape();
        layer.name = 'Shape-' + uuid.substr(5, 8);

      } else {
        result.error = 'makeNodeAlive: node type not yet implemented: ' + nodeType;
        app.endUndoGroup();
        return JSON.stringify(result);
      }

      if (!layer) {
        result.error = 'makeNodeAlive: layer creation returned null for type: ' + nodeType;
        app.endUndoGroup();
        return JSON.stringify(result);
      }

      layer.comment = uuid;

      // Restore keyframes from previous ghost entry if present
      if (savedKeyframes) {
        applyLayerKeyframes(layer, savedKeyframes);
      }

      layerIndex = layer.index;
      updateDataLayerOnAlive(uuid, nodeType, hostingCompUUID, props);
      result.ok   = true;
      result.data = { layerIndex: layerIndex };
    }

    app.endUndoGroup();
  } catch (e) {
    result.error = e.toString();
    try { app.endUndoGroup(); } catch (ignored) {}
  }
  return JSON.stringify(result);
}

// ── makeNodeGhost ──────────────────────────────────────────────────────────
// Deletes the AE layer for an alive node transitioning alive → ghost.
// Reads transform keyframes before deletion and stores them in the dataLayer
// ghost entry so they can be restored when the node goes alive again.

function makeNodeGhost(uuid, hostingCompUUID) {
  var result = { ok: false, data: null, error: null };
  try {
    app.beginUndoGroup('Procedia: makeNodeGhost');

    // Find layer — try the supplied hosting comp first, then search all comps
    var hostComp = null;
    var layer    = null;

    if (hostingCompUUID) {
      hostComp = findCompByUUID(hostingCompUUID);
      if (hostComp) {
        for (var i = 1; i <= hostComp.numLayers; i++) {
          if (hostComp.layer(i).comment === uuid) {
            layer = hostComp.layer(i);
            break;
          }
        }
      }
    }

    // Fallback: scan every comp in the project
    if (!layer) {
      var proj = app.project;
      for (var pi = 1; pi <= proj.numItems; pi++) {
        var item = proj.item(pi);
        if (!(item instanceof CompItem)) continue;
        for (var li = 1; li <= item.numLayers; li++) {
          if (item.layer(li).comment === uuid) {
            hostComp = item;
            layer    = item.layer(li);
            break;
          }
        }
        if (layer) break;
      }
    }

    var keyframes = {};

    if (layer) {
      keyframes = readLayerKeyframes(layer);
      layer.remove();
    }
    // If no layer was found (data-only node or already gone), proceed silently.

    var resolvedHostUUID = hostingCompUUID || (hostComp ? hostComp.comment : null);
    updateDataLayerOnGhost(uuid, resolvedHostUUID, keyframes);

    app.endUndoGroup();
    result.ok   = true;
    result.data = { keyframesJSON: JSON.stringify(keyframes) };
  } catch (e) {
    result.error = e.toString();
    try { app.endUndoGroup(); } catch (ignored) {}
  }
  return JSON.stringify(result);
}
