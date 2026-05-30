// graph/canvas/drag.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/engine.js,
//             graph/wire/wireRenderer.js, data/uuidGenerator.js
// MUST LOAD BEFORE: index.js

var canvasDrag = (function() {

  var HIT_THRESHOLD = 8;

  function _bezierPoint(t, p0, p1, p2, p3) {
    var mt = 1 - t;
    return mt*mt*mt*p0 + 3*mt*mt*t*p1 + 3*mt*t*t*p2 + t*t*t*p3;
  }

  function _distToSegmentSq(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var lenSq = dx*dx + dy*dy;
    if (lenSq === 0) {
      var ddx = px - ax, ddy = py - ay;
      return ddx*ddx + ddy*ddy;
    }
    var t = ((px - ax)*dx + (py - ay)*dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    var cx = ax + t*dx, cy = ay + t*dy;
    var ex = px - cx, ey = py - cy;
    return ex*ex + ey*ey;
  }

  function _sampleBezier(ax, ay, bx, by, cx, cy, dx, dy, px, py) {
    var minDist = Infinity;
    for (var i = 0; i <= 12; i++) {
      var t = i / 12;
      var bx_ = _bezierPoint(t, ax, bx, cx, dx);
      var by_ = _bezierPoint(t, ay, by, cy, dy);
      var ddx = px - bx_, ddy = py - by_;
      var d = ddx*ddx + ddy*ddy;
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  function hitTestWire(canvasX, canvasY, wire) {
    var fromNodeData = graphState.getNode(wire.fromNode);
    var toNodeData = graphState.getNode(wire.toNode);
    if (!fromNodeData || !toNodeData) return false;

    var x1 = fromNodeData.x, y1 = fromNodeData.y;
    var x2 = toNodeData.x, y2 = toNodeData.y;

    var style = (typeof settings !== 'undefined' && settings.get) ? settings.get('wireStyle') : 'bezier';

    if (style === 'direct') {
      return _distToSegmentSq(canvasX, canvasY, x1, y1, x2, y2) <= HIT_THRESHOLD * HIT_THRESHOLD;
    }

    if (style === 'stepped') {
      var mx = (x1 + x2) / 2;
      var d1 = _distToSegmentSq(canvasX, canvasY, x1, y1, mx, y1);
      var d2 = _distToSegmentSq(canvasX, canvasY, mx, y1, mx, y2);
      var d3 = _distToSegmentSq(canvasX, canvasY, mx, y2, x2, y2);
      var minD = Math.min(d1, d2, d3);
      return minD <= HIT_THRESHOLD * HIT_THRESHOLD;
    }

    var dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
    var distSq = _sampleBezier(x1, y1, x1 + dx, y1, x2 - dx, y2, x2, y2, canvasX, canvasY);
    return distSq <= HIT_THRESHOLD * HIT_THRESHOLD;
  }

  function findWireAt(canvasX, canvasY) {
    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      if (!wires.hasOwnProperty(wireId)) continue;
      if (hitTestWire(canvasX, canvasY, wires[wireId])) {
        return wires[wireId];
      }
    }
    return null;
  }

  function insertNodeOnWire(wireId, def, canvasX, canvasY) {
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
      _transplantLayerUUID: wire._pathLayerUUID
    };

    graphState.addNode(nodeData);

    if (def.params === 'dynamic' && def.matchName && typeof schemaCache !== 'undefined' && schemaCache.fetchSchema) {
      schemaCache.fetchSchema(def.matchName).then(function(schema) {
        if (typeof engine._applyDynamicSchema === 'function') {
          engine._applyDynamicSchema(nodeId, schema);
        }
      });
    }

    graphState.removeWire(wireId);

    engine.connectWire(wire.fromNode, wire.fromPort, nodeId, 'main_input');

    engine.connectWire(nodeId, 'output', wire.toNode, wire.toPort);

    return nodeData;
  }

  return {
    findWireAt:      findWireAt,
    hitTestWire:     hitTestWire,
    insertNodeOnWire: insertNodeOnWire
  };

})();
