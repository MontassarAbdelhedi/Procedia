// jsx/persistence.jsx
// DEPENDS ON: jsx/json.jsx, jsx/utils.jsx
// MUST be evaluated after json.jsx and utils.jsx in the evalBridge preamble

var PERSISTENCE_MAX_CHUNK = 25000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _setLayerText(layer, text) {
    var textProp = layer.property('ADBE Text Properties').property('ADBE Text Document');
    var doc = textProp.value;
    doc.text = text;
    textProp.setValue(doc);
}

function _createPersistenceLayer(comp, name) {
    var layer = comp.layers.addText('');
    layer.name = name;
    layer.enabled = false;
    return layer;
}

function _getLayerText(layer) {
    return layer.property('ADBE Text Properties')
                .property('ADBE Text Document').value.text;
}

function _writeChunks(comp, layerNameBase, jsonString) {
    // Remove all existing layers whose name starts with layerNameBase
    var i;
    for (i = comp.numLayers; i >= 1; i--) {
        var existing = comp.layer(i);
        if (existing.name === layerNameBase ||
            existing.name.indexOf(layerNameBase + '_') === 0) {
            existing.remove();
        }
    }

    if (jsonString.length <= PERSISTENCE_MAX_CHUNK) {
        var single = _createPersistenceLayer(comp, layerNameBase);
        _setLayerText(single, jsonString);
        return;
    }

    // Split into chunks
    var chunkIndex = 1;
    var offset = 0;
    while (offset < jsonString.length) {
        var chunk = jsonString.substring(offset, offset + PERSISTENCE_MAX_CHUNK);
        var chunkLayer = _createPersistenceLayer(comp, layerNameBase + '_' + chunkIndex);
        _setLayerText(chunkLayer, chunk);
        chunkIndex++;
        offset += PERSISTENCE_MAX_CHUNK;
    }
}

function _readChunks(comp, layerNameBase) {
    var i, layer;

    // Check for a single layer named exactly layerNameBase
    for (i = 1; i <= comp.numLayers; i++) {
        layer = comp.layer(i);
        if (layer.name === layerNameBase) {
            return _getLayerText(layer);
        }
    }

    // Check for chunked layers: layerNameBase + '_1', '_2', etc.
    var prefix = layerNameBase + '_';
    var chunks = [];
    for (i = 1; i <= comp.numLayers; i++) {
        layer = comp.layer(i);
        if (layer.name.indexOf(prefix) === 0) {
            var suffix = layer.name.substring(prefix.length);
            var num = parseInt(suffix, 10);
            if (!isNaN(num)) {
                chunks.push({ num: num, layer: layer });
            }
        }
    }

    if (chunks.length === 0) return null;

    // Sort by numeric suffix ascending
    chunks.sort(function(a, b) { return a.num - b.num; });

    var result = '';
    for (i = 0; i < chunks.length; i++) {
        result = result + _getLayerText(chunks[i].layer);
    }
    return result;
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

function writeGraph(graphJSON) {
    var result = { ok: false, data: null, error: null };
    try {
        var graph = JSON.parse(graphJSON);
        var nodesJSON = JSON.stringify(graph.nodes);
        var wiresJSON = JSON.stringify(graph.wires);

        var reserved = findOrCreateReservedComp();

        _writeChunks(reserved, '__PROCEDIA_NODES__', nodesJSON);
        _writeChunks(reserved, '__PROCEDIA_WIRES__', wiresJSON);

        result.ok   = true;
        result.data = { written: true };
    } catch (e) {
        result.error = 'writeGraph error: ' + e.toString();
    }
    return JSON.stringify(result);
}

function readGraph() {
    var result = { ok: false, data: null, error: null };
    try {
        var reserved = findReservedComp();
        if (!reserved) {
            result.ok   = true;
            result.data = { nodes: {}, wires: {}, fresh: true };
            return JSON.stringify(result);
        }

        var nodesJSON = _readChunks(reserved, '__PROCEDIA_NODES__');
        var wiresJSON  = _readChunks(reserved, '__PROCEDIA_WIRES__');

        if (!nodesJSON || !wiresJSON) {
            result.ok   = true;
            result.data = { nodes: {}, wires: {}, fresh: true };
            return JSON.stringify(result);
        }

        var nodes, wires;
        try {
            nodes = JSON.parse(nodesJSON);
            wires = JSON.parse(wiresJSON);
        } catch (parseErr) {
            result.ok    = false;
            result.error = 'Graph parse failed: ' + parseErr.toString();
            result.data  = { nodes: {}, wires: {}, parseError: true };
            return JSON.stringify(result);
        }

        result.ok   = true;
        result.data = { nodes: nodes, wires: wires, fresh: false };
    } catch (e) {
        result.error = 'readGraph error: ' + e.toString();
    }
    return JSON.stringify(result);
}
