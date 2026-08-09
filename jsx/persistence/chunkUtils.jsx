/**
 * @fileoverview Chunking and layer utilities for persistence.
 * REQUIRES: json.jsx, utils.jsx
 * Exports: _pc_reservedComp, _pc_findLayerByName, _pc_removeOldLayers,
 *          _pc_chunkData, _pc_readChunks, _pc_writeChunksToLayers
 */
// jsx/persistence/chunkUtils.jsx — chunking and layer utilities (ES3-safe)

var _PC_CHUNK_MAX = 15000;

/**
 * Gets the reserved composition.
 * @return {CompItem|null}
 */
function _pc_reservedComp() {
  return findReservedComp();
}

/**
 * Finds a layer by name in a composition.
 * @param {CompItem} comp The composition.
 * @param {string} name The layer name.
 * @return {Layer|null}
 */
function _pc_findLayerByName(comp, name) {
  var li;
  for (li = 1; li <= comp.numLayers; li++) {
    var layer = comp.layer(li);
    if (layer.name === name) return layer;
  }
  return null;
}

/**
 * Removes all layers whose name starts with the given prefix.
 * @param {CompItem} comp The composition.
 * @param {string} prefix The layer name prefix.
 */
function _pc_removeOldLayers(comp, prefix) {
  var toRemove = [];
  var li;
  for (li = 1; li <= comp.numLayers; li++) {
    var layer = comp.layer(li);
    if (layer.name.indexOf(prefix) === 0) {
      toRemove.push(layer);
    }
  }
  var ri;
  for (ri = 0; ri < toRemove.length; ri++) {
    toRemove[ri].remove();
  }
}

/**
 * Splits a JSON string into chunks and returns alternating [name, data] pairs.
 * @param {string} jsonStr The JSON string to chunk.
 * @param {string} prefix The layer name prefix.
 * @return {Array} Flat array of [chunkName, chunkData, ...].
 */
function _pc_chunkData(jsonStr, prefix) {
  var chunks = [];
  var len = jsonStr.length;
  if (len === 0) {
    return [];
  }
  var start = 0;
  var idx = 0;
  while (start < len) {
    var end = Math.min(start + _PC_CHUNK_MAX, len);
    var name = prefix + (idx === 0 ? '' : String(idx));
    chunks.push(name);
    chunks.push(jsonStr.substring(start, end));
    start = end;
    idx++;
  }
  return chunks;
}

/**
 * Reads and concatenates all chunks for a given prefix.
 * @param {CompItem} comp The composition to read from.
 * @param {string} prefix The chunk layer name prefix.
 * @return {string|null} The concatenated data, or null if no chunks found.
 */
function _pc_readChunks(comp, prefix) {
  var parts = [];
  var idx = 0;
  while (true) {
    var name = prefix + (idx === 0 ? '' : String(idx));
    var layer = _pc_findLayerByName(comp, name);
    if (!layer) break;
    var textDoc = layer.text.sourceText.value;
    parts.push(textDoc.text);
    idx++;
  }
  if (parts.length === 0) return null;
  return parts.join('');
}

/**
 * Writes alternating [name, data] pairs as named text layers in the comp.
 * @param {CompItem} comp The composition.
 * @param {Array} chunkPairs Alternating [chunkName, chunkData, ...] from _pc_chunkData.
 */
function _pc_writeChunksToLayers(comp, chunkPairs) {
  var i;
  for (i = 0; i < chunkPairs.length; i += 2) {
    var layer = comp.layers.addText('');
    layer.name = chunkPairs[i];
    var textDoc = layer.text.sourceText.value;
    textDoc.text = chunkPairs[i + 1];
    layer.text.sourceText.setValue(textDoc);
    layer.enabled = false;
  }
}
