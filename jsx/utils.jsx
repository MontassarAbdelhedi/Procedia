/**
 * @fileoverview Shared utility functions for ExtendScript (ES3-safe).
 * REQUIRES: json.jsx (must be loaded before this file in the preamble)
 * Exports: findCompByUUID, findLayerByUUID, findReservedComp,
 *          findOrCreateProcediaFolder, _validatePluginPath
 */
// utils.jsx — Shared utility functions for ExtendScript (ES3-safe)
// REQUIRES: json.jsx (must be loaded before this file in the preamble)

/**
 * Returns a CompItem whose .comment matches uuid, or null.
 * @param {string} uuid The UUID to match.
 * @return {CompItem|null} The matching composition, or null.
 */
function findCompByUUID(uuid) {
  var proj = app.project;
  if (proj.numItems === 0) return null;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof CompItem && item.comment === uuid) return item;
  }
  return null;
}

/**
 * Returns a layer in comp whose .comment matches uuid, or null.
 * @param {CompItem} comp The composition to search.
 * @param {string} uuid The UUID to match.
 * @return {Layer|null} The matching layer, or null.
 */
function findLayerByUUID(comp, uuid) {
  for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer.comment === uuid) return layer;
  }
  return null;
}

/**
 * Returns the first CompItem whose name starts with 'DO NOT DELETE', or null.
 * @return {CompItem|null} The reserved composition, or null.
 */
function findReservedComp() {
  var proj = app.project;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof CompItem && item.name.indexOf('DO NOT DELETE') === 0) return item;
  }
  return null;
}

/**
 * Returns the Procedia project folder, creating it if it does not exist.
 * @return {FolderItem} The existing or newly created folder.
 */
function findOrCreateProcediaFolder() {
  var name = 'DO NOT DELETE — Procedia Reserved';
  var proj = app.project;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof FolderItem && item.name === name) return item;
  }
  return proj.items.addFolder(name);
}

/**
 * Validates a relative path and joins it with the plugin root.
 * Rejects absolute paths, drive-letter paths, and traversal sequences.
 * @param {string} pluginRoot  The plugin root directory (e.g. _pluginRootFolder().fsName)
 * @param {string} relativePath  Path relative to the plugin root
 * @return {string} Safe full path, or empty string if invalid
 */
function _validatePluginPath(pluginRoot, relativePath) {
  if (!relativePath || typeof relativePath !== 'string' || relativePath.length === 0) return '';
  if (relativePath.charAt(0) === '/' || relativePath.charAt(0) === '\\') return '';
  if (relativePath.indexOf(':') !== -1) return '';
  if (relativePath.indexOf('..') !== -1) return '';
  return pluginRoot + '/' + relativePath;
}
