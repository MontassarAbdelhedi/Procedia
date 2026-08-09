/**
 * @fileoverview Writes the full graph (nodes + wires + keyframes) as chunked text layers
 *              in the Reserved Comp.
 * REQUIRES: json.jsx, utils.jsx, persistence/chunkUtils.jsx
 * Exports: _persistenceWriteGraph
 */
// jsx/persistence/writeGraph.jsx — writeGraph implementation (ES3-safe)

/**
 * Writes the full graph (nodes + wires + keyframes) to the Reserved Comp as chunked text layers.
 * @param {Object} graphData Object with .nodes, .wires, and .keyframes properties.
 * @return {Object} Result with .ok, .data (chunk counts), .error.
 */
function _persistenceWriteGraph(graphData) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = _pc_reservedComp();
    if (!comp) { result.error = 'writeGraph: Reserved Comp not found'; return result; }

    _pc_removeOldLayers(comp, '__PROCEDIA_NODES__');
    _pc_removeOldLayers(comp, '__PROCEDIA_WIRES__');
    _pc_removeOldLayers(comp, '__PROCEDIA_KEYFRAMES__');

    var nodesJSON = JSON.stringify(graphData.nodes || {});
    var wiresJSON = JSON.stringify(graphData.wires || {});
    var keyframesJSON = JSON.stringify(graphData.keyframes || {});

    var nodeChunks = _pc_chunkData(nodesJSON, '__PROCEDIA_NODES__');
    var wireChunks = _pc_chunkData(wiresJSON, '__PROCEDIA_WIRES__');
    var kfChunks = _pc_chunkData(keyframesJSON, '__PROCEDIA_KEYFRAMES__');

    _pc_writeChunksToLayers(comp, nodeChunks);
    _pc_writeChunksToLayers(comp, wireChunks);
    _pc_writeChunksToLayers(comp, kfChunks);

    result.ok = true;
    result.data = { nodeChunks: nodeChunks.length / 2, wireChunks: wireChunks.length / 2, kfChunks: kfChunks.length / 2 };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
