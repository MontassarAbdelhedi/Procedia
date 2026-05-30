// jsx/persistence.jsx — readGraph, writeGraph, chunking logic (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
//
// Persists graph state as text layers in the Reserved Comp.
// Data is chunked into multiple layers if it exceeds the per-layer character limit.
//
// Layer naming:
//   Nodes:  __PROCEDIA_NODES__{chunkIndex}
//   Wires:  __PROCEDIA_WIRES__{chunkIndex}
//   Chunk 0 has no index suffix.

var PERSISTENCE = (function() {

  var CHUNK_MAX = 15000;

  function _reservedComp() {
    return findReservedComp();
  }

  function _findLayerByName(comp, name) {
    var li;
    for (li = 1; li <= comp.numLayers; li++) {
      var layer = comp.layer(li);
      if (layer.name === name) return layer;
    }
    return null;
  }

  function _removeOldLayers(comp, prefix) {
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

  function _chunkData(jsonStr, prefix) {
    var chunks = [];
    var len = jsonStr.length;
    if (len === 0) {
      chunks.push(prefix);
      return chunks;
    }
    var start = 0;
    var idx = 0;
    while (start < len) {
      var end = Math.min(start + CHUNK_MAX, len);
      var name = prefix + (idx === 0 ? '' : String(idx));
      chunks.push(name);
      chunks.push(jsonStr.substring(start, end));
      start = end;
      idx++;
    }
    return chunks;
  }

  function writeGraph(graphData) {
    var result = { ok: false, data: null, error: null };
    try {
      var comp = _reservedComp();
      if (!comp) { result.error = 'writeGraph: Reserved Comp not found'; return result; }

      _removeOldLayers(comp, '__PROCEDIA_NODES__');
      _removeOldLayers(comp, '__PROCEDIA_WIRES__');

      var nodesJSON = JSON.stringify(graphData.nodes || {});
      var wiresJSON = JSON.stringify(graphData.wires || {});

      var nodeChunks = _chunkData(nodesJSON, '__PROCEDIA_NODES__');
      var wireChunks = _chunkData(wiresJSON, '__PROCEDIA_WIRES__');

      var i;
      for (i = 0; i < nodeChunks.length; i += 2) {
        var layer = comp.layers.addText('');
        layer.name = nodeChunks[i];
        var textDoc = layer.text.sourceText.value;
        textDoc.text = nodeChunks[i + 1];
        layer.text.sourceText.setValue(textDoc);
        layer.enabled = false;
      }

      for (i = 0; i < wireChunks.length; i += 2) {
        layer = comp.layers.addText('');
        layer.name = wireChunks[i];
        textDoc = layer.text.sourceText.value;
        textDoc.text = wireChunks[i + 1];
        layer.text.sourceText.setValue(textDoc);
        layer.enabled = false;
      }

      result.ok = true;
      result.data = { nodeChunks: nodeChunks.length / 2, wireChunks: wireChunks.length / 2 };
    } catch (e) {
      result.error = e.toString();
    }
    return result;
  }

  function readGraph() {
    var result = { ok: false, data: null, error: null };
    try {
      var comp = _reservedComp();
      if (!comp) {
        result.ok = true;
        result.data = { nodes: {}, wires: {} };
        return result;
      }

      var nodesStr = _readChunks(comp, '__PROCEDIA_NODES__');
      var wiresStr = _readChunks(comp, '__PROCEDIA_WIRES__');

      var nodes = {};
      var wires = {};

      if (nodesStr) {
        var parsed = JSON.parse(nodesStr);
        if (parsed && typeof parsed === 'object') nodes = parsed;
      }
      if (wiresStr) {
        parsed = JSON.parse(wiresStr);
        if (parsed && typeof parsed === 'object') wires = parsed;
      }

      result.ok = true;
      result.data = { nodes: nodes, wires: wires };
    } catch (e) {
      result.error = e.toString();
    }
    return result;
  }

  function _readChunks(comp, prefix) {
    var parts = [];
    var idx = 0;
    while (true) {
      var name = prefix + (idx === 0 ? '' : String(idx));
      var layer = _findLayerByName(comp, name);
      if (!layer) break;
      var textDoc = layer.text.sourceText.value;
      parts.push(textDoc.text);
      idx++;
    }
    if (parts.length === 0) return null;
    return parts.join('');
  }

  return {
    writeGraph: writeGraph,
    readGraph:  readGraph
  };

}());
