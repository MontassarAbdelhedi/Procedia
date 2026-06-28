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

function _handleSaveGraphToFile(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var graph = params.graph;
    if (!graph) {
      result.error = 'saveGraphToFile: graph data required';
      return result;
    }
    var saveFile = File.saveDialog('Save Procedia Graph', 'Procedia Graph:*.procedia.json;JSON:*.json;All Files:*.*');
    if (!saveFile) {
      result.ok = true;
      result.data = { cancelled: true };
      return result;
    }
    var jsonStr = JSON.stringify({ version: '1.0', nodes: graph.nodes, wires: graph.wires });
    saveFile.open('w');
    saveFile.write(jsonStr);
    saveFile.close();
    result.ok = true;
    result.data = { path: saveFile.fsName };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

function _handleOpenGraphFile(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var openFile = File.openDialog('Open Procedia Graph', 'Procedia Graph:*.procedia.json;JSON:*.json;All Files:*.*', false);
    if (!openFile) {
      result.ok = true;
      result.data = { cancelled: true };
      return result;
    }
    openFile.open('r');
    var jsonStr = openFile.read();
    openFile.close();
    var parsed = JSON.parse(jsonStr);
    var data = { nodes: parsed.nodes || {}, wires: parsed.wires || {} };
    result.ok = true;
    result.data = data;
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
