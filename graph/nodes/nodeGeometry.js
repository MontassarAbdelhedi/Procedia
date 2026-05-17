// graph/nodes/nodeGeometry.js
// DEPENDS ON: graph/nodes/nodeRegistry.js
// MUST LOAD BEFORE: graph/nodes/nodeRenderer.js, graph/nodes/nodeHitTest.js, graph/Wire/wireRenderer.js

var nodeGeometry = (function() {

  var NODE_WIDTH  = 160;
  var NODE_HEIGHT = 60;
  var PORT_COLOR  = { layer: '#5b8dd9', data: '#d4a04a' };

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

  function outputPortPos(nodeData, transform) {
    var sx = nodeData.position.x * transform.scale + transform.offsetX;
    var sy = nodeData.position.y * transform.scale + transform.offsetY;
    var sw = NODE_WIDTH  * transform.scale;
    var sh = NODE_HEIGHT * transform.scale;
    return {
      x: sx + sw / 2,
      y: sy + sh + 4 * transform.scale
    };
  }

  return {
    NODE_WIDTH:         NODE_WIDTH,
    NODE_HEIGHT:        NODE_HEIGHT,
    PORT_COLOR:         PORT_COLOR,
    inputPortPositions: inputPortPositions,
    outputPortPos:      outputPortPos
  };

}());
