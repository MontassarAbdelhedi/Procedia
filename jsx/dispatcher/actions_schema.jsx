/**
 * @fileoverview Schema cache, persistence & version action handlers (ES3-safe).
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)
 * Exports: _handleReadSchemaCache, _handleWriteSchemaCache, _handleGetAEVersion,
 *          _handleReadGraph, _handleWriteGraph
 */
// actions_schema.jsx — Schema cache, persistence & version action handlers (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

/**
 * Returns the File object for the plugin root folder (three directories up from this script).
 * @return {File} The root folder file.
 */
function _pluginRootFolder() {
  var scriptFile = new File($.fileName);
  return scriptFile.parent.parent.parent;
}

/**
 * Reads the effect schema cache JSON file from disk.
 * @param {Object} cmd Command (params unused).
 * @return {Object} Result with .ok, .data (aeVersion, schemas), .error.
 */
function _handleReadSchemaCache(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var cacheFile = new File(_pluginRootFolder().fsName + '/data/effectSchemaCache.json');
    if (!cacheFile.exists) {
      result.ok = true;
      result.data = { aeVersion: '', schemas: {} };
      return result;
    }
    cacheFile.open('r');
    var raw = cacheFile.read();
    cacheFile.close();
    result.ok = true;
    result.data = JSON.parse(raw);
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

/**
 * Writes the effect schema cache JSON file to disk.
 * @param {Object} cmd Command with params: cache.
 * @return {Object} Result with .ok, .data (written), .error.
 */
function _handleWriteSchemaCache(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var cacheFile = new File(_pluginRootFolder().fsName + '/data/effectSchemaCache.json');
    cacheFile.open('w');
    cacheFile.write(JSON.stringify(params.cache));
    cacheFile.close();
    result.ok = true;
    result.data = { written: true };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

/**
 * Returns the current After Effects version string.
 * @param {Object} cmd Command (params unused).
 * @return {Object} Result with .ok, .data (version), .error.
 */
function _handleGetAEVersion(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    result.ok = true;
    result.data = { version: app.version };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

/**
 * Delegates to PERSISTENCE.readGraph() to read the full graph from the Reserved Comp.
 * @param {Object} cmd Command (params unused).
 * @return {Object} Result from PERSISTENCE.readGraph().
 */
function _handleReadGraph(cmd) {
  if (typeof PERSISTENCE === 'undefined' || !PERSISTENCE.readGraph) {
    return { ok: false, data: null, error: 'PERSISTENCE module not loaded' };
  }
  return PERSISTENCE.readGraph();
}

/**
 * Delegates to PERSISTENCE.writeGraph() to write the full graph to the Reserved Comp.
 * @param {Object} cmd Command with params containing .nodes and .wires.
 * @return {Object} Result from PERSISTENCE.writeGraph().
 */
function _handleWriteGraph(cmd) {
  if (typeof PERSISTENCE === 'undefined' || !PERSISTENCE.writeGraph) {
    return { ok: false, data: null, error: 'PERSISTENCE module not loaded' };
  }
  var params = (cmd && cmd.params) ? cmd.params : null;
  if (!params) return { ok: false, data: null, error: 'writeGraph: params required' };
  return PERSISTENCE.writeGraph(params);
}
