// graph/nodes/nodeGeometry.js
// DEPENDS ON: graph/nodes/nodeRegistry.js
// MUST LOAD BEFORE: graph/nodes/nodeRenderer.js, graph/nodes/nodeHitTest.js, graph/Wire/wireRenderer.js

var nodeGeometry = (function() {

  var NODE_WIDTH  = 160;
  var NODE_HEIGHT = 60;
  var PORT_COLOR  = { layer: '#5b8dd9', data: '#d4a04a', parent: '#c8922a' };

  // Width of the rectangle tab that sticks out from each side (world px)
  var RECT_W = 8;
  // Height of the rectangle tab (world px)
  var RECT_H = 16;

  // Top-edge circles — only non-parent inputs
  function inputPortPositions(nodeData, transform) {
    var def = nodeRegistry.getByType(nodeData.type);
    if (!def || !def.inputs || def.inputs.length === 0) return [];

    var sx  = nodeData.position.x * transform.scale + transform.offsetX;
    var sy  = nodeData.position.y * transform.scale + transform.offsetY;
    var sw  = NODE_WIDTH * transform.scale;
    var filtered = [];
    for (var i = 0; i < def.inputs.length; i++) {
      if (def.inputs[i].type !== 'parent') filtered.push(def.inputs[i]);
    }
    var count     = filtered.length;
    var positions = [];
    for (var j = 0; j < count; j++) {
      positions.push({
        x:    sx + (sw / (count + 1)) * (j + 1),
        y:    sy - 4 * transform.scale,
        port: filtered[j].name,
        type: filtered[j].type
      });
    }
    return positions;
  }

  // Bottom-edge circles — only non-parent outputs
  function outputPortPositions(nodeData, transform) {
    var def = nodeRegistry.getByType(nodeData.type);
    if (!def || !def.outputs || def.outputs.length === 0) return [];

    var sx  = nodeData.position.x * transform.scale + transform.offsetX;
    var sy  = nodeData.position.y * transform.scale + transform.offsetY;
    var sw  = NODE_WIDTH  * transform.scale;
    var sh  = NODE_HEIGHT * transform.scale;
    var filtered = [];
    for (var i = 0; i < def.outputs.length; i++) {
      if (def.outputs[i].type !== 'parent') filtered.push(def.outputs[i]);
    }
    var count     = filtered.length;
    var positions = [];
    for (var j = 0; j < count; j++) {
      positions.push({
        x:    sx + (sw / (count + 1)) * (j + 1),
        y:    sy + sh + 4 * transform.scale,
        port: filtered[j].port,
        type: filtered[j].type
      });
    }
    return positions;
  }

  // Left-side rectangle tab — first parent-type INPUT port (parent_in)
  // Returns { x, y, port, type } where x/y is the outer connection tip.
  function parentInPortPosition(nodeData, transform) {
    var def = nodeRegistry.getByType(nodeData.type);
    if (!def || !def.inputs) return null;
    for (var i = 0; i < def.inputs.length; i++) {
      if (def.inputs[i].type === 'parent') {
        var sx = nodeData.position.x * transform.scale + transform.offsetX;
        var sy = nodeData.position.y * transform.scale + transform.offsetY;
        var sh = NODE_HEIGHT * transform.scale;
        return {
          x:    sx - RECT_W * transform.scale,
          y:    sy + sh / 2,
          port: def.inputs[i].port || def.inputs[i].name,
          type: 'parent'
        };
      }
    }
    return null;
  }

  // Right-side rectangle tab — first parent-type OUTPUT port (child_out)
  // Returns { x, y, port, type } where x/y is the outer connection tip.
  function childOutPortPosition(nodeData, transform) {
    var def = nodeRegistry.getByType(nodeData.type);
    if (!def || !def.outputs) return null;
    for (var i = 0; i < def.outputs.length; i++) {
      if (def.outputs[i].type === 'parent') {
        var sx = nodeData.position.x * transform.scale + transform.offsetX;
        var sy = nodeData.position.y * transform.scale + transform.offsetY;
        var sw = NODE_WIDTH  * transform.scale;
        var sh = NODE_HEIGHT * transform.scale;
        return {
          x:    sx + sw + RECT_W * transform.scale,
          y:    sy + sh / 2,
          port: def.outputs[i].port || def.outputs[i].name,
          type: 'parent'
        };
      }
    }
    return null;
  }

  // Returns position of the 'output' port (or first port), kept for backward compat.
  function outputPortPos(nodeData, transform) {
    var positions = outputPortPositions(nodeData, transform);
    for (var i = 0; i < positions.length; i++) {
      if (positions[i].port === 'output') return positions[i];
    }
    if (positions.length > 0) return positions[0];
    // Fallback for nodes with no non-parent outputs
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
    NODE_WIDTH:             NODE_WIDTH,
    NODE_HEIGHT:            NODE_HEIGHT,
    PORT_COLOR:             PORT_COLOR,
    RECT_W:                 RECT_W,
    RECT_H:                 RECT_H,
    inputPortPositions:     inputPortPositions,
    outputPortPositions:    outputPortPositions,
    parentInPortPosition:   parentInPortPosition,
    childOutPortPosition:   childOutPortPosition,
    outputPortPos:          outputPortPos
  };

}());
