/**
 * @fileoverview Reads the full graph (nodes + wires + keyframes) from chunked text layers
 *              in the Reserved Comp.
 * REQUIRES: json.jsx, utils.jsx, persistence/chunkUtils.jsx
 * Exports: _persistenceReadGraph
 */
// jsx/persistence/readGraph.jsx — readGraph implementation (ES3-safe)

/**
 * Reads the full graph (nodes + wires + keyframes) from chunked text layers in the Reserved Comp.
 * Also collects parked node UUIDs from layers whose name matches a UUID pattern.
 * @return {Object} Result with .ok, .data (containing .nodes, .wires, .keyframes, .parkedNodeUUIDs), .error.
 */
function _persistenceReadGraph() {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = _pc_reservedComp();
    if (!comp) {
      result.ok = true;
      result.data = { nodes: {}, wires: {}, keyframes: {} };
      return result;
    }

    var nodesStr = _pc_readChunks(comp, '__PROCEDIA_NODES__');
    var wiresStr = _pc_readChunks(comp, '__PROCEDIA_WIRES__');
    var kfStr = _pc_readChunks(comp, '__PROCEDIA_KEYFRAMES__');

    var nodes = {};
    var wires = {};
    var keyframes = {};
    var parsed;

    if (nodesStr) {
      try { parsed = JSON.parse(nodesStr); } catch (e) { $.writeln('[Procedia] Corrupt nodes chunk: ' + e.toString()); }
      if (parsed && typeof parsed === 'object') nodes = parsed;
    }
    if (wiresStr) {
      try { parsed = JSON.parse(wiresStr); } catch (e) { $.writeln('[Procedia] Corrupt wires chunk: ' + e.toString()); }
      if (parsed && typeof parsed === 'object') wires = parsed;
    }
    if (kfStr) {
      try { parsed = JSON.parse(kfStr); } catch (e) { $.writeln('[Procedia] Corrupt keyframes chunk: ' + e.toString()); }
      if (parsed && typeof parsed === 'object') keyframes = parsed;
    }

    var parkedNodeUUIDs = [];
    var _uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (var pi = 1; pi <= comp.numLayers; pi++) {
      var PL = comp.layer(pi);
      if (PL.name.indexOf('__PROCEDIA_') !== 0 && _uuidRe.test(PL.name)) {
        parkedNodeUUIDs.push(PL.name);
      }
    }

    result.ok = true;
    result.data = { nodes: nodes, wires: wires, keyframes: keyframes, parkedNodeUUIDs: parkedNodeUUIDs };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
