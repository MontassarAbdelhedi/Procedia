/**
 * @fileoverview Graph export action handlers (ES3-safe).
 * Writes graph snapshot JSON to disk in real-time.
 * REQUIRES: json.jsx, actions_schema.jsx
 * Load BEFORE: dispatcher.jsx
 * Exports: _handleWriteGraphExport
 */

function _handleWriteGraphExport(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var exportFile = new File(_pluginRootFolder().fsName + '/data/graphExport.json');
    exportFile.open('w');
    exportFile.write(JSON.stringify(params.graph));
    exportFile.close();
    result.ok = true;
    result.data = { written: true };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
