// graph/nodes/nodeGeometry.js
// DEPENDS ON: graph/nodes/nodeRegistry.js
// MUST LOAD BEFORE: graph/nodes/nodeRenderer.js, graph/nodes/nodeHitTest.js, graph/Wire/wireRenderer.js

var nodeGeometry = (function() {

  var NODE_WIDTH  = 160;
  var NODE_HEIGHT = 60;
  var PORT_COLOR  = { layer: '#5b8dd9', data: '#d4a04a', parent: '#c8922a' };

  function inputPortPositions(nodeData, transform) {
    var def = nodeRegistry.getByType(nodeData.type);
    if (!def || !def.inputs || def.inputs.length === 0) return [];

    var sx    = nodeData.position.x * transform.scale + transform.offsetX;
    var sy    = nodeData.position.y * transform.scale + transform.offsetY;
    var sw    = NODE_WIDTH * transform.scale;
    var count = def.inputs.length;
    var positions = [];

    for (var i = 0; i < count; i++) {
      positions.push({
        x:    sx + (sw / (count + 1)) * (i + 1),
        y:    sy - 4 * transform.scale,
        port: def.inputs[i].name,
        type: def.inputs[i].type
      });
    }
    return positions;
  }

  // Returns all output port positions distributed evenly along the bottom edge.
  // Each entry: { x, y, port, type }
  function outputPortPositions(nodeData, transform) {
    var def = nodeRegistry.getByType(nodeData.type);
    if (!def || !def.outputs || def.outputs.length === 0) return [];

    var sx    = nodeData.position.x * transform.scale + transform.offsetX;
    var sy    = nodeData.position.y * transform.scale + transform.offsetY;
    var sw    = NODE_WIDTH  * transform.scale;
    var sh    = NODE_HEIGHT * transform.scale;
    var count = def.outputs.length;
    var positions = [];

    for (var i = 0; i < count; i++) {
      positions.push({
        x:    sx + (sw / (count + 1)) * (i + 1),
        y:    sy + sh + 4 * transform.scale,
        port: def.outputs[i].port,
        type: def.outputs[i].type
      });
    }
    return positions;
  }

  // Returns position of the 'output' port (or first port), kept for backward compat.
  function outputPortPos(nodeData, transform) {
    var positions = outputPortPositions(nodeData, transform);
    for (var i = 0; i < positions.length; i++) {
      if (positions[i].port === 'output') return positions[i];
    }
    if (positions.length > 0) return positions[0];
    // Fallback for nodes with no outputs (CompNode)
    var sx = nodeData.position.x * transform.scale + transform.offsetX;
    var sy = nodeData.position.y * transform.scale + transform.offsetY;
    return {
      x: sx + NODE_WIDTH * transform.scale / 2,
      y: sy + NODE_HEIGHT * transform.scale + 4 * transform.scale,
      port: 'output',
      type: 'layer'
    };
  }

  return {
    NODE_WIDTH:           NODE_WIDTH,
    NODE_HEIGHT:          NODE_HEIGHT,
    PORT_COLOR:           PORT_COLOR,
    inputPortPositions:   inputPortPositions,
    outputPortPositions:  outputPortPositions,
    outputPortPos:        outputPortPos
  };

}());
