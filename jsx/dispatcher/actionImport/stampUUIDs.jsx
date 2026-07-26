/**
 * @fileoverview Batch stamps Procedia UUIDs onto existing AE project items
 * during import. Stamps comp.comment, footage.comment, and layer.comment
 * with the assigned UUIDs from the import JSON.
 * (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 * Exports: _handleStampImportUUIDs
 */
// actionImport/stampUUIDs.jsx — Batch UUID stamper for import (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

function _handleStampImportUUIDs(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    if (!params) {
      result.error = 'stampImportUUIDs: params required';
      return result;
    }

    var stampMap = params.stampMap;
    if (!stampMap) {
      result.error = 'stampImportUUIDs: stampMap required';
      return result;
    }

    var proj = app.project;
    var stamped = { comps: 0, footage: 0, layers: 0, errors: [] };

    // Stamp comps — find by name
    if (stampMap.comps) {
      var compNames = stampMap.comps;
      for (var cn in compNames) {
        if (!compNames.hasOwnProperty(cn)) continue;
        var compUUID = compNames[cn];
        for (var i = 1; i <= proj.numItems; i++) {
          var item = proj.item(i);
          if (item instanceof CompItem && item.name === cn) {
            item.comment = compUUID;
            stamped.comps++;
            break;
          }
        }
      }
    }

    // Stamp footage — find by name
    if (stampMap.footage) {
      var footageNames = stampMap.footage;
      for (var fn in footageNames) {
        if (!footageNames.hasOwnProperty(fn)) continue;
        var footageUUID = footageNames[fn];
        for (var j = 1; j <= proj.numItems; j++) {
          var fitem = proj.item(j);
          if (fitem instanceof FootageItem && fitem.name === fn) {
            fitem.comment = footageUUID;
            stamped.footage++;
            break;
          }
        }
      }
    }

    // Stamp layers — find comp by name, then layer by index
    if (stampMap.layers) {
      var layerMap = stampMap.layers;
      for (var compName in layerMap) {
        if (!layerMap.hasOwnProperty(compName)) continue;
        // Find the comp
        var comp = null;
        for (var k = 1; k <= proj.numItems; k++) {
          var citem = proj.item(k);
          if (citem instanceof CompItem && citem.name === compName) {
            comp = citem;
            break;
          }
        }
        if (!comp) continue;

        var layerEntries = layerMap[compName];
        for (var li = 0; li < layerEntries.length; li++) {
          var entry = layerEntries[li];
          if (entry.index < 1 || entry.index > comp.numLayers) continue;
          try {
            var layer = comp.layer(entry.index);
            layer.comment = entry.uuid;
            stamped.layers++;
          } catch (e) {
            stamped.errors.push('Layer ' + entry.index + ' in ' + compName + ': ' + e.toString());
          }
        }
      }
    }

    result.ok = true;
    result.data = stamped;
  } catch (e) {
    result.error = 'stampImportUUIDs: ' + e.toString();
  }
  return result;
}
