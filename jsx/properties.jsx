// jsx/properties.jsx
// DEPENDS ON: jsx/json.jsx, jsx/nodeLifeCycle/nodeLayerOps/nodeLayerLookup.jsx (findCompByUUID, findLayerByUUID)
// Commands: updateNodeProperty, setLayerOrder, setLayerParent, clearLayerParent
// ES3 — var only, named functions, for loops, string concat

// ─── updateNodeProperty ───────────────────────────────────────────────────────
// Sets a single property on an alive AE layer identified by uuid.
//
// propertyMatchName formats:
//   "ADBE Transform Group/ADBE Position"               — group/prop path (2 segments)
//   "ADBE Text Properties/ADBE Text Document/fontSize"  — TextDocument sub-key (3 segments)
//   "ADBE Text Properties/ADBE Text Document/color"     — expects [r,g,b] array 0–1
//   "ADBE Text Properties/ADBE Text Document/content"   — text string
//
// valueJSON — JSON-serialised value: number, array, or string.

function updateNodeProperty(uuid, hostingCompUUID, propertyMatchName, valueJSON) {
  var result = { ok: false, data: null, error: null };
  try {
    var value = JSON.parse(valueJSON);

    var hostComp = findCompByUUID(hostingCompUUID);
    if (!hostComp) {
      result.error = 'updateNodeProperty: hosting comp not found: ' + hostingCompUUID;
      return JSON.stringify(result);
    }

    var layer = findLayerByUUID(hostComp, uuid);
    if (!layer) {
      result.error = 'updateNodeProperty: layer not found: ' + uuid;
      return JSON.stringify(result);
    }

    var parts = propertyMatchName.split('/');

    if (parts[0] === 'ADBE Text Properties' &&
        parts[1] === 'ADBE Text Document' &&
        parts.length === 3) {

      // TextDocument sub-property — read → modify → setValue.
      var textPropGroup = layer.property('ADBE Text Properties');
      if (!textPropGroup) {
        result.error = 'updateNodeProperty: ADBE Text Properties not found';
        return JSON.stringify(result);
      }
      var textDocProp = textPropGroup.property('ADBE Text Document');
      if (!textDocProp) {
        result.error = 'updateNodeProperty: ADBE Text Document not found';
        return JSON.stringify(result);
      }
      var doc    = textDocProp.value;
      var subKey = parts[2];

      if (subKey === 'fontSize') {
        doc.fontSize = value;
      } else if (subKey === 'color') {
        if (value instanceof Array && value.length >= 3) {
          doc.fillColor = [value[0], value[1], value[2]];
        }
      } else if (subKey === 'content') {
        doc.text = String(value);
      } else {
        result.error = 'updateNodeProperty: unknown TextDocument sub-key: ' + subKey;
        return JSON.stringify(result);
      }
      textDocProp.setValue(doc);

    } else if (parts.length === 2) {

      // Standard group/property path.
      var group = layer.property(parts[0]);
      if (!group) {
        result.error = 'updateNodeProperty: property group not found: ' + parts[0];
        return JSON.stringify(result);
      }
      var prop = group.property(parts[1]);
      if (!prop) {
        result.error = 'updateNodeProperty: property not found: ' + parts[1];
        return JSON.stringify(result);
      }
      prop.setValue(value);

    } else {
      result.error = 'updateNodeProperty: unsupported path format: ' + propertyMatchName;
      return JSON.stringify(result);
    }

    result.ok   = true;
    result.data = { uuid: uuid, propertyMatchName: propertyMatchName };
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}

// ─── setLayerOrder ────────────────────────────────────────────────────────────
// Reorders layers in hostingComp to match orderedUUIDs (index 0 = AE top = layer 1).
// Walk array in reverse so the last moveToBeginning call places index 0 at the top.
// Uses moveToBeginning — AE layers have no moveTo(index).

function setLayerOrder(hostingCompUUID, orderedUUIDsJSON) {
  var result = { ok: false, data: null, error: null };
  try {
    var orderedUUIDs = JSON.parse(orderedUUIDsJSON);

    var hostComp = findCompByUUID(hostingCompUUID);
    if (!hostComp) {
      result.error = 'setLayerOrder: comp not found: ' + hostingCompUUID;
      return JSON.stringify(result);
    }

    app.beginUndoGroup('Procedia: setLayerOrder');

    // Reverse walk: last item gets moveToBeginning first, first item last → correct order.
    for (var i = orderedUUIDs.length - 1; i >= 0; i--) {
      var layer = findLayerByUUID(hostComp, orderedUUIDs[i]);
      if (layer) layer.moveToBeginning();
    }

    app.endUndoGroup();
    result.ok   = true;
    result.data = { hostingCompUUID: hostingCompUUID, count: orderedUUIDs.length };
  } catch (e) {
    result.error = e.toString();
    try { app.endUndoGroup(); } catch (ignored) {}
  }
  return JSON.stringify(result);
}

// ─── setLayerParent ───────────────────────────────────────────────────────────
// Sets childLayer.parent = parentLayer inside hostingComp.
// Both layers must be in the same comp.

function setLayerParent(childUUID, parentUUID, hostingCompUUID) {
  var result = { ok: false, data: null, error: null };
  try {
    var hostComp = findCompByUUID(hostingCompUUID);
    if (!hostComp) {
      result.error = 'setLayerParent: hosting comp not found: ' + hostingCompUUID;
      return JSON.stringify(result);
    }

    var childLayer = findLayerByUUID(hostComp, childUUID);
    if (!childLayer) {
      result.error = 'setLayerParent: child layer not found: ' + childUUID;
      return JSON.stringify(result);
    }

    var parentLayer = findLayerByUUID(hostComp, parentUUID);
    if (!parentLayer) {
      result.error = 'null not ready';
      return JSON.stringify(result);
    }

    childLayer.parent = parentLayer;

    result.ok   = true;
    result.data = { childUUID: childUUID, parentUUID: parentUUID };
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}

// ─── clearLayerParent ─────────────────────────────────────────────────────────
// Removes the parent link from childLayer. Layer transforms become absolute.

function clearLayerParent(childUUID, hostingCompUUID) {
  var result = { ok: false, data: null, error: null };
  try {
    var hostComp = findCompByUUID(hostingCompUUID);
    if (!hostComp) {
      result.error = 'clearLayerParent: hosting comp not found: ' + hostingCompUUID;
      return JSON.stringify(result);
    }

    var childLayer = findLayerByUUID(hostComp, childUUID);
    if (!childLayer) {
      result.error = 'clearLayerParent: child layer not found: ' + childUUID;
      return JSON.stringify(result);
    }

    childLayer.parent = null;

    result.ok   = true;
    result.data = { childUUID: childUUID };
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
