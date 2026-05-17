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

  function hitTestOutputPort(nodeData, transform, screenX, screenY) {
    var pos  = nodeGeometry.outputPortPos(nodeData, transform);
    var hitR = 8 * transform.scale;
    var dx   = screenX - pos.x;
    var dy   = screenY - pos.y;
    return (dx * dx + dy * dy <= hitR * hitR) ? pos : null;
  }

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

  return {
    hitTest:           hitTest,
    hitTestOutputPort: hitTestOutputPort,
    hitTestInputPort:  hitTestInputPort
  };

}());
