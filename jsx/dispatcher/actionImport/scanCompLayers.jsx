/**
 * @fileoverview Scans all layers in a given composition for import.
 * Coordinates comp lookup, map building, layer iteration, and delegates
 * per-layer entry construction to scanCompLayers/buildEntry.jsx. (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx, scanCompLayers/maps.jsx, buildEntry.jsx
 * Load BEFORE: dispatcher.jsx
 * Exports: _handleImportScanCompLayers
 */
// actionImport/scanCompLayers.jsx — Import comp layer scanner (ES3-safe)
// REQUIRES: json.jsx, utils.jsx, scanCompLayers/maps.jsx, buildEntry.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

function _handleImportScanCompLayers(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    if (!params || !params.compName) {
      result.error = 'importScanCompLayers: compName required';
      return result;
    }
    var compName = String(params.compName);

    // Find comp by name (no UUID yet — this is a non-Procedia project)
    var comp = null;
    var proj = app.project;
    for (var i = 1; i <= proj.numItems; i++) {
      var item = proj.item(i);
      if (item instanceof CompItem && item.name === compName) {
        comp = item;
        break;
      }
    }
    if (!comp) {
      result.error = 'importScanCompLayers: comp not found: ' + compName;
      return result;
    }

    var blendMap = _buildBlendMap();
    var matteMap = _buildMatteMap();

    var layers = [];
    for (var li = 1; li <= comp.numLayers; li++) {
      var layer = comp.layer(li);
      if (!layer) continue;
      layers.push(_buildLayerEntry(layer, li, blendMap, matteMap));
    }

    result.ok = true;
    result.data = { compName: compName, layers: layers, numLayers: comp.numLayers };
  } catch (e) {
    result.error = 'importScanCompLayers: ' + e.toString();
  }
  return result;
}
