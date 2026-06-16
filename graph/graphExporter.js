var graphExporter = (function() {

  var _debounceTimer = null;
  var _debounceDelay = 300;
  var _ready = false;

  function _isCompNode(n) {
    return n && n.type === 'core/comp';
  }

  function _countDownstreamComps(nodeId, visited) {
    if (!visited) visited = {};
    if (visited[nodeId]) return 0;
    visited[nodeId] = true;

    var count = 0;
    var allWires = graphState.getAllWires();

    for (var wid in allWires) {
      if (!allWires.hasOwnProperty(wid)) continue;
      var w = allWires[wid];
      if (w.type !== 'layer') continue;
      if (w.fromNode !== nodeId) continue;

      var targetNode = graphState.getNode(w.toNode);
      if (targetNode && _isCompNode(targetNode)) {
        count++;
      } else if (targetNode) {
        count += _countDownstreamComps(w.toNode, visited);
      }
    }

    return count;
  }

  function _getTitle(node) {
    var title = null;
    if (node.props && node.props.label) {
      title = node.props.label;
    }
    if (!title) {
      if (typeof nodeRegistry !== 'undefined' && nodeRegistry.getDefinition) {
        var def = nodeRegistry.getDefinition(node.type);
        if (def && def.label) {
          title = def.label;
        }
      }
    }
    return title || node.type || 'unknown';
  }

  function _buildExportGraph() {
    var reservedComp = {};

    var parkedLayers = [];
    var allNodes = graphState.getAllNodes();
    var ghostCount = 0;
    for (var id in allNodes) {
      if (allNodes.hasOwnProperty(id)) {
        var n = allNodes[id];
        if (n && n.id) {
          if (n.hasParkedLayer) {
            parkedLayers.push(n.id);
          }
          ghostCount++;
        }
      }
    }

    reservedComp.parkedLayers = parkedLayers;

    var nodes = [];
    for (var id2 in allNodes) {
      if (allNodes.hasOwnProperty(id2)) {
        var n2 = allNodes[id2];
        if (n2 && n2.id) {
          nodes.push({
            uuid: n2.id,
            title: _getTitle(n2),
            kind: n2.nodeKind || 'unknown',
            compCount: _countDownstreamComps(n2.id)
          });
        }
      }
    }

    var wires = [];
    var allWires = graphState.getAllWires();
    for (var wid in allWires) {
      if (allWires.hasOwnProperty(wid)) {
        var w = allWires[wid];
        if (w && w.id) {
          wires.push({
            uuid: w.id,
            from: w.fromNode || null,
            to: w.toNode || null
          });
        }
      }
    }

    return { reservedComp: reservedComp, nodes: nodes, wires: wires };
  }

  function _writeExport() {

    try {
      var graph = _buildExportGraph();
      if (typeof evalBridge !== 'undefined' && evalBridge.dispatch) {
        evalBridge.dispatch({ action: 'writeGraphExport', params: { graph: graph } })
          .then(function(res) {
            if (!res.ok) {
              console.warn('[graphExporter] write failed: ' + (res.error || 'unknown'));
            }
          })
          .catch(function(err) {
            console.warn('[graphExporter] dispatch error:', err);
          });
      } else {
        console.warn('[graphExporter] evalBridge not available');
      }
    } catch (e) {
      console.error('[graphExporter] write error:', e);
    }
  }

  function _onChange() {

    if (_debounceTimer) {
      clearTimeout(_debounceTimer);
    }
    _debounceTimer = setTimeout(_writeExport, _debounceDelay);
  }

  function init() {
    if (_ready) return;
    _ready = true;

    graphState.onGraphChange(_onChange);
    _writeExport();
  }

  function destroy() {
    _ready = false;
    if (_debounceTimer) {
      clearTimeout(_debounceTimer);
      _debounceTimer = null;
    }
    graphState.offGraphChange(_onChange);
  }

  return {
    init: init,
    destroy: destroy
  };

})();
