/**
 * @fileoverview Wire-insertion logic: splitting a wire by dropping a node onto it.
 * @dependencies graph/graphState.js, graph/nodeRegistry.js, graph/engine/index.js,
 *               data/uuidGenerator.js
 */

// graph/canvas/drag/insert.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/engine/index.js,
//             data/uuidGenerator.js
// MUST LOAD AFTER: graph/canvas/drag/helpers.js
// MUST LOAD BEFORE: index.js

(function() {

  canvasDrag.insertNodeOnWire = function insertNodeOnWire(wireId, def, canvasX, canvasY) {
    var wire = graphState.getWire(wireId);
    if (!wire) return null;

    var fromNodeData = graphState.getNode(wire.fromNode);
    var toNodeData = graphState.getNode(wire.toNode);
    if (!fromNodeData || !toNodeData) return null;

    var nodeId = uuidGenerator.node();
    var initialProps = {};
    if (def.params !== 'dynamic' && def.params) {
      for (var i = 0; i < def.params.length; i++) {
        initialProps[def.params[i].key] = def.params[i]['default'];
      }
    }

    var isComp = def.type === 'core/comp';

    var nodeData = {
      id:                   nodeId,
      type:                 def.type,
      nodeKind:             def.nodeKind,
      dedicated:            def.dedicated,
      state:                'ghost',
      dirty:                false,
      x:                    canvasX,
      y:                    canvasY,
      props:                initialProps,
      hostingComps:         [],
      hasParkedLayer:       false,
      dynamicSchema:        null,
      secondaryPorts:       null,
      _transplantLayerUUID: isComp ? null : (toNodeData.type === 'core/comp' ? wire._pathLayerUUID : undefined)
    };

    graphState.addNode(nodeData);

    if (def.params === 'dynamic' && def.matchName && typeof __e_hlp !== 'undefined') {
      __e_hlp.resolveDynamicSchema(nodeId, def.matchName);
    }

    if (isComp) {
      if (def.onDrop) {
        evalBridge.dispatch(def.onDrop(nodeData));
      }
      engine.disconnectWire(wireId);
      engine.connectWire(nodeId, 'output', wire.toNode, wire.toPort);
      engine.connectWire(wire.fromNode, wire.fromPort, nodeId, 'main_input');
    } else {
      graphState.removeWire(wireId);
      engine.connectWire(wire.fromNode, wire.fromPort, nodeId, 'main_input');
      engine.connectWire(nodeId, 'output', wire.toNode, wire.toPort);
    }

    return nodeData;
  };

  canvasDrag.canInsertOnWire = function canInsertOnWire(wireId, def) {
    if (!def || !def.ports) return false;
    var hasMainInput = false;
    var hasOutput = false;
    for (var i = 0; i < def.ports.length; i++) {
      if (def.ports[i].id === 'main_input') hasMainInput = true;
      if (def.ports[i].id === 'output')     hasOutput = true;
    }
    return hasMainInput && hasOutput;
  };

})();
