// jsx/nodeLifeCycle/nodeLifecycle.jsx
// ES3 - var only, named functions, for loops, string concat
// DEPENDS ON: jsx/json.jsx, jsx/persistence.jsx,
//             jsx/nodeLifeCycle/nodeKeyframes.jsx,
//             jsx/nodeLifeCycle/nodeDataLayer.jsx

// ── makeNodeAlive ──────────────────────────────────────────────────────────
// Creates the AE object for a node transitioning ghost → alive.
// If the ghost entry in dataLayer has a keyframes field, those keyframes
// are restored onto the freshly-created layer.

function makeNodeAlive(uuid, nodeType, hostingCompUUID, propertiesJSON, nodeLabel) {
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

      var baseName = (nodeLabel && nodeLabel.length > 0) ? nodeLabel : null;

      if (nodeType === 'NullNode') {
        layer      = hostComp.layers.addNull(hostComp.duration);
        layer.name = baseName || ('Null-' + uuid.substr(5, 8));

      } else if (nodeType === 'AdjustmentNode') {
        layer      = hostComp.layers.addSolid([1, 1, 1], baseName || ('Adj-' + uuid.substr(5, 8)), hostComp.width, hostComp.height, 1);
        layer.adjustmentLayer = true;

      } else if (nodeType === 'SolidNode') {
        var solidColor = [0.5, 0.5, 0.5];
        if (props.color && props.color.length >= 3) {
          solidColor = [props.color[0], props.color[1], props.color[2]];
        }
        var solidItem = app.project.items.addSolid(solidColor, baseName || ('Solid-' + uuid.substr(5, 8)), hostComp.width, hostComp.height, 1);
        solidItem.parentFolder = findOrCreateProcediaFolder();
        layer      = hostComp.layers.add(solidItem);
        layer.name = baseName || ('Solid-' + uuid.substr(5, 8));

      } else if (nodeType === 'TextNode') {
        var textContent = (typeof props.content === 'string') ? props.content : '';
        layer      = hostComp.layers.addText(textContent);
        layer.name = baseName || ('Text-' + uuid.substr(5, 8));
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
        layer.name = baseName || ('Shape-' + uuid.substr(5, 8));

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

    // Scan ALL comps — remove every layer tagged with this uuid.
    // A node alive in multiple comps will have one layer per comp; we remove all.
    // Keyframes are captured from the first layer found.
    var keyframes        = {};
    var keyframesCaptured = false;
    var resolvedHostComp = null;
    var proj = app.project;

    for (var pi = 1; pi <= proj.numItems; pi++) {
      var item = proj.item(pi);
      if (!(item instanceof CompItem)) continue;
      for (var li = item.numLayers; li >= 1; li--) {
        if (item.layer(li).comment === uuid) {
          if (!keyframesCaptured) {
            keyframes        = readLayerKeyframes(item.layer(li));
            keyframesCaptured = true;
            resolvedHostComp  = item;
          }
          item.layer(li).remove();
          break; // at most one layer per comp carries this uuid
        }
      }
    }

    var resolvedHostUUID = hostingCompUUID || (resolvedHostComp ? resolvedHostComp.comment : null);
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

// ── deleteComp ─────────────────────────────────────────────────────────────
// Permanently removes the AE comp (and all its layers) when a CompNode is
// deleted from the graph. Also purges the comp entry from dataLayer so no
// orphaned project tree entries remain.

function deleteComp(uuid) {
  var result = { ok: false, data: null, error: null };
  try {
    app.beginUndoGroup('Procedia: deleteComp');

    var proj  = app.project;
    var found = false;
    for (var i = proj.numItems; i >= 1; i--) {
      var item = proj.item(i);
      if (item instanceof CompItem && item.comment === uuid) {
        item.locked = false;
        item.remove();
        found = true;
        break;
      }
    }

    var reserved = findReservedComp();
    if (reserved) {
      reserved.locked = false;
      var dataLyr = findLayerByName(reserved, '__PROCEDIA_DATA__');
      if (dataLyr) {
        dataLyr.locked = false;
        var data = JSON.parse(readLayerText(dataLyr));

        if (data.project && data.project[uuid]) {
          delete data.project[uuid];
        }

        var newGhost = [];
        for (var g = 0; g < data.ghost.length; g++) {
          if (data.ghost[g].id !== uuid) newGhost.push(data.ghost[g]);
        }
        data.ghost = newGhost;

        writeLayerText(dataLyr, JSON.stringify(data));
        dataLyr.locked = true;
      }
      reserved.locked = true;
    }

    app.endUndoGroup();
    result.ok   = true;
    result.data = { found: found };
  } catch (e) {
    result.error = e.toString();
    try { app.endUndoGroup(); } catch (ignored) {}
  }
  return JSON.stringify(result);
}

// ── renameNode ─────────────────────────────────────────────────────────────
// Renames the AE comp or layer that corresponds to the given node UUID.

function renameNode(uuid, newName) {
  var result = { ok: false, data: null, error: null };
  try {
    app.beginUndoGroup('Procedia: renameNode');
    var proj = app.project;
    var renamed = false;
    // Search comps first
    for (var i = 1; i <= proj.numItems; i++) {
      var item = proj.item(i);
      if (item instanceof CompItem && item.comment === uuid) {
        item.name = newName;
        renamed = true;
        break;
      }
    }
    // Then search layers inside every comp
    if (!renamed) {
      for (var pi = 1; pi <= proj.numItems; pi++) {
        var pitem = proj.item(pi);
        if (!(pitem instanceof CompItem)) continue;
        for (var li = 1; li <= pitem.numLayers; li++) {
          if (pitem.layer(li).comment === uuid) {
            pitem.layer(li).name = newName;
            renamed = true;
            break;
          }
        }
        if (renamed) break;
      }
    }
    app.endUndoGroup();
    result.ok   = true;
    result.data = { renamed: renamed };
  } catch (e) {
    result.error = e.toString();
    try { app.endUndoGroup(); } catch (ignored) {}
  }
  return JSON.stringify(result);
}
