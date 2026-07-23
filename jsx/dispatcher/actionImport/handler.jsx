/**
 * @fileoverview Import handler — enumerates the entire AE project and returns
 * its structure as JSON (comps, layers, effects, footage). (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx, actionImport/helpers.jsx, actionImport/read.jsx
 * Load BEFORE: dispatcher.jsx (function becomes global for _handlers map)
 */
// actionImport/handler.jsx — Import project handler (ES3-safe)
// REQUIRES: json.jsx, utils.jsx, actionImport/helpers.jsx, actionImport/read.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

function _handleImportProject(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    findOrCreateReservedComp();
    var comps = [];
    var i;
    for (i = 1; i <= app.project.numItems; i++) {
      try {
        var item = app.project.item(i);
        if (item instanceof CompItem) {
          if (item.name.indexOf('DO NOT DELETE') === 0) continue;
          comps.push(_readComp(item));
        }
      } catch (e) {}
    }
    var footage = _readFootageItems();
    result.ok = true;
    result.data = {
      comps:   comps,
      footage: footage
    };
  } catch (e) {
    result.error = 'importProject: ' + e.toString();
  }
  return result;
}
