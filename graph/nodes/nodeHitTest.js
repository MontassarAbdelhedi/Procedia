// graph/nodes/nodeHitTest.js
// DEPENDS ON: graph/nodes/nodeGeometry.js
// MUST LOAD BEFORE: graph/canvas/input/input.js

var nodeHitTest = (function() {

  function hitTest(nodeData, transform, screenX, screenY) {
    var sx = nodeData.position.x * transform.scale + transform.offsetX;
    var sy = nodeData.position.y * transform.scale + transform.offsetY;
    var sw = nodeGeometry.NODE_WIDTH  * transform.scale;
    var sh = nodeGeometry.NODE_HEIGHT * transform.scale;
    return screenX >= sx && screenX <= sx + sw &&
           screenY >= sy && screenY <= sy + sh;
  }

  // Bottom-edge circles (non-parent outputs only)
  function hitTestOutputPort(nodeData, transform, screenX, screenY) {
    var ports = nodeGeometry.outputPortPositions(nodeData, transform);
    var hitR  = 8 * transform.scale;
    for (var i = 0; i < ports.length; i++) {
      var dx = screenX - ports[i].x;
      var dy = screenY - ports[i].y;
      if (dx * dx + dy * dy <= hitR * hitR) return ports[i];
    }
    return null;
  }

  // Top-edge circles (non-parent inputs only)
  function hitTestInputPort(nodeData, transform, screenX, screenY) {
    var ports = nodeGeometry.inputPortPositions(nodeData, transform);
    var hitR  = 20 * transform.scale;
    for (var i = 0; i < ports.length; i++) {
      var dx = screenX - ports[i].x;
      var dy = screenY - ports[i].y;
      if (dx * dx + dy * dy <= hitR * hitR) {
        return ports[i];
      }
    }
    return null;
  }

  // Left rectangle tab (parent_in) — rectangular hit area with padding
  function hitTestParentInPort(nodeData, transform, screenX, screenY) {
    var pos = nodeGeometry.parentInPortPosition(nodeData, transform);
    if (!pos) return null;
    var rw  = nodeGeometry.RECT_W * transform.scale;
    var rh  = nodeGeometry.RECT_H * transform.scale;
    var pad = 4 * transform.scale;
    if (screenX >= pos.x - pad          &&
        screenX <= pos.x + rw + pad     &&
        screenY >= pos.y - rh / 2 - pad &&
        screenY <= pos.y + rh / 2 + pad) {
      return pos;
    }
    return null;
  }

  // Right rectangle tab (child_out) — rectangular hit area with padding
  function hitTestChildOutPort(nodeData, transform, screenX, screenY) {
    var pos = nodeGeometry.childOutPortPosition(nodeData, transform);
    if (!pos) return null;
    var rw  = nodeGeometry.RECT_W * transform.scale;
    var rh  = nodeGeometry.RECT_H * transform.scale;
    var pad = 4 * transform.scale;
    if (screenX >= pos.x - rw - pad     &&
        screenX <= pos.x + pad          &&
        screenY >= pos.y - rh / 2 - pad &&
        screenY <= pos.y + rh / 2 + pad) {
      return pos;
    }
    return null;
  }

  return {
    hitTest:              hitTest,
    hitTestOutputPort:    hitTestOutputPort,
    hitTestInputPort:     hitTestInputPort,
    hitTestParentInPort:  hitTestParentInPort,
    hitTestChildOutPort:  hitTestChildOutPort
  };

}());
