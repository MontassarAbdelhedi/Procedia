// jsx/properties.jsx
// ES3 - var only, named functions, for loops, string concat
// DEPENDS ON: jsx/json.jsx, jsx/init.jsx, jsx/persistence.jsx, jsx/nodeLifecycle.jsx
//   (uses findCompByUUID, findReservedComp, findLayerByName, readLayerText, writeLayerText)

// ── updatePropertyInDataLayer ──────────────────────────────────────────────
// Writes a new property value into project[hostingCompUUID].nodes[uuid].properties.
// Uses the last segment of propertyMatchName as the storage key so both
// "ADBE Transform Group/ADBE Position" and "…/ADBE Text Document/fontSize"
// resolve to a readable key ("ADBE Position", "fontSize").

function updatePropertyInDataLayer(uuid, hostingCompUUID, propertyMatchName, value) {
  var reserved = findReservedComp();
  if (!reserved) return;

  reserved.locked = false;
  var dataLyr = findLayerByName(reserved, '__PROCEDIA_DATA__');
  if (!dataLyr) { reserved.locked = true; return; }

  dataLyr.locked = false;
  var data = JSON.parse(readLayerText(dataLyr));

  var parts  = propertyMatchName.split('/');
  var storeKey = parts[parts.length - 1]; // last segment as property key

  if (data.project &&
      data.project[hostingCompUUID] &&
      data.project[hostingCompUUID].nodes &&
      data.project[hostingCompUUID].nodes[uuid] &&
      data.project[hostingCompUUID].nodes[uuid].properties) {
    data.project[hostingCompUUID].nodes[uuid].properties[storeKey] = value;
  }

  writeLayerText(dataLyr, JSON.stringify(data));
  dataLyr.locked = true;
  reserved.locked = true;
}

// ── updateNodeProperty ─────────────────────────────────────────────────────
// Updates a single property on an alive AE layer.
//
// propertyMatchName formats:
//   "ADBE Transform Group/ADBE Position"        — standard group/prop path
//   "ADBE Text Properties/ADBE Text Document/fontSize"  — TextDocument sub-key
//   "ADBE Text Properties/ADBE Text Document/color"
//   "ADBE Text Properties/ADBE Text Document/content"
//
// valueJSON — JSON-serialised value: number, array, or string

function updateNodeProperty(uuid, hostingCompUUID, propertyMatchName, valueJSON) {
  var result = { ok: false, data: null, error: null };
  try {
    var value = JSON.parse(valueJSON);

    // ── Find hosting comp ──────────────────────────────────────────────
    var hostComp = findCompByUUID(hostingCompUUID);
    if (!hostComp) {
      result.error = 'updateNodeProperty: hosting comp not found: ' + hostingCompUUID;
      return JSON.stringify(result);
    }

    // ── Find layer by UUID comment ─────────────────────────────────────
    var layer = null;
    for (var i = 1; i <= hostComp.numLayers; i++) {
      if (hostComp.layer(i).comment === uuid) {
        layer = hostComp.layer(i);
        break;
      }
    }
    if (!layer) {
      result.error = 'updateNodeProperty: layer not found for uuid: ' + uuid;
      return JSON.stringify(result);
    }

    // ── Navigate and set ───────────────────────────────────────────────
    var parts = propertyMatchName.split('/');

    if (parts[0] === 'ADBE Text Properties' &&
        parts[1] === 'ADBE Text Document' &&
        parts.length === 3) {

      // TextDocument sub-property — must read → modify → setValue
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
        // value expected as [r, g, b] array (0-1 range)
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

      // Standard group/property path
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

    // ── Persist to dataLayer ───────────────────────────────────────────
    updatePropertyInDataLayer(uuid, hostingCompUUID, propertyMatchName, value);

    result.ok = true;
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
