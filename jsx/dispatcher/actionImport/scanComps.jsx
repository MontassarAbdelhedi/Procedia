/**
 * @fileoverview Scans all compositions in the AE project for import.
 * Excludes the reserved Procedia comp.
 * (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 * Exports: _handleImportScanComps
 */
// actionImport/scanComps.jsx — Import comp scanner (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

function _handleImportScanComps(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var comps = [];
    var proj = app.project;
    for (var i = 1; i <= proj.numItems; i++) {
      try {
        var item = proj.item(i);
        if (!(item instanceof CompItem)) continue;
        if (item.name.indexOf('DO NOT DELETE') === 0) continue;

        var bg = item.bgColor;
        var bgArr = [bg[0], bg[1], bg[2]];
        if (bg.length >= 4) bgArr.push(bg[3]);

        comps.push({
          name:       item.name,
          width:      item.width,
          height:     item.height,
          frameRate:  item.frameRate,
          duration:   item.duration,
          bgColor:    bgArr,
          comment:    item.comment || ''
        });
      } catch (e) {}
    }
    result.ok = true;
    result.data = comps;
  } catch (e) {
    result.error = 'importScanComps: ' + e.toString();
  }
  return result;
}
