/**
 * @fileoverview Drag interaction for the graph canvas.
 * Provides hit-testing for wires and inserting nodes onto existing wires.
 * Also manages preview state for dragging nodes over wires.
 * @dependencies graph/graphState.js, graph/nodeRegistry.js, graph/engine/index.js,
 *               graph/wire/wireRenderer.js, data/uuidGenerator.js
 * @exports canvasDrag { findWireAt, hitTestWire, insertNodeOnWire,
 *                       canInsertOnWire, setWirePreview, getWirePreview, clearWirePreview }
 */

// graph/canvas/drag.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/engine/index.js,
//             graph/wire/wireRenderer.js, data/uuidGenerator.js
// MUST LOAD BEFORE: index.js

var canvasDrag = (function() {

  var HIT_THRESHOLD = 8;
  var _previewState = null;

  /**
   * Evaluates a cubic Bézier curve at parameter t.
   * @param {number} t - Parameter in [0, 1].
   * @param {number} p0 - Start control point coordinate.
   * @param {number} p1 - First control point coordinate.
   * @param {number} p2 - Second control point coordinate.
   * @param {number} p3 - End control point coordinate.
   * @returns {number} The interpolated value at t.
   */
  function _bezierPoint(t, p0, p1, p2, p3) {
    var mt = 1 - t;
    return mt*mt*mt*p0 + 3*mt*mt*t*p1 + 3*mt*t*t*p2 + t*t*t*p3;
  }

  /**
   * Computes the squared distance from a point to a line segment.
   * @param {number} px - Point x.
   * @param {number} py - Point y.
   * @param {number} ax - Segment start x.
   * @param {number} ay - Segment start y.
   * @param {number} bx - Segment end x.
   * @param {number} by - Segment end y.
   * @returns {number} Squared distance.
   */
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

  /**
   * Samples a cubic Bézier curve at 13 points and returns the minimum squared distance to a point.
   * @param {number} ax - Start x.
   * @param {number} ay - Start y.
   * @param {number} bx - Control point 1 x.
   * @param {number} by - Control point 1 y.
   * @param {number} cx - Control point 2 x.
   * @param {number} cy - Control point 2 y.
   * @param {number} dx - End x.
   * @param {number} dy - End y.
   * @param {number} px - Query point x.
   * @param {number} py - Query point y.
   * @returns {number} Minimum squared distance.
   */
  function _sampleBezier(ax, ay, bx, by, cx, cy, dx, dy, px, py) {
    var minDist = Infinity;
    var prevX = _bezierPoint(0, ax, bx, cx, dx);
    var prevY = _bezierPoint(0, ay, by, cy, dy);
    for (var i = 1; i <= 12; i++) {
      var t = i / 12;
      var curX = _bezierPoint(t, ax, bx, cx, dx);
      var curY = _bezierPoint(t, ay, by, cy, dy);
      var d = _distToSegmentSq(px, py, prevX, prevY, curX, curY);
      if (d < minDist) minDist = d;
      prevX = curX;
      prevY = curY;
    }
    return minDist;
  }

  /**
   * Gets wrap-relative position of a port dot element.
   * @param {string} nodeId
   * @param {string} portId
   * @returns {{x:number,y:number}|null}
   */
  function _portPosInWrap(nodeId, portId) {
    var el = renderer.getNodeElement(nodeId);
    if (!el) return null;
    var dot = el.querySelector('[data-port-id="' + portId + '"]');
    if (!dot) return null;
    var dotRect = dot.getBoundingClientRect();
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return null;
    var wr = wrap.getBoundingClientRect();
    return {
      x: dotRect.left + dotRect.width / 2 - wr.left,
      y: dotRect.top + dotRect.height / 2 - wr.top
    };
  }

  /**
   * Tests whether a wrap-relative point hits a wire (bezier, direct, or stepped style).
   * Uses actual port dot positions (same as the wire renderer).
   * @param {number} wrapX - Wrap-relative x.
   * @param {number} wrapY - Wrap-relative y.
   * @param {object} wire - Wire object with fromNode, toNode.
   * @returns {boolean} True if point is within hit threshold.
   */
  function hitTestWire(wrapX, wrapY, wire) {
    var from = _portPosInWrap(wire.fromNode, wire.fromPort);
    var to   = _portPosInWrap(wire.toNode, wire.toPort);
    if (!from || !to) return false;

    var x1 = from.x, y1 = from.y;
    var x2 = to.x, y2 = to.y;

    var style = (typeof settings !== 'undefined' && settings.get) ? settings.get('wireStyle') : 'bezier';

    if (style === 'direct') {
      return _distToSegmentSq(wrapX, wrapY, x1, y1, x2, y2) <= HIT_THRESHOLD * HIT_THRESHOLD;
    }

    if (style === 'stepped') {
      var mx = (x1 + x2) / 2;
      var d1 = _distToSegmentSq(wrapX, wrapY, x1, y1, mx, y1);
      var d2 = _distToSegmentSq(wrapX, wrapY, mx, y1, mx, y2);
      var d3 = _distToSegmentSq(wrapX, wrapY, mx, y2, x2, y2);
      var minD = Math.min(d1, d2, d3);
      return minD <= HIT_THRESHOLD * HIT_THRESHOLD;
    }

    var dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
    var distSq = _sampleBezier(x1, y1, x1 + dx, y1, x2 - dx, y2, x2, y2, wrapX, wrapY);
    return distSq <= HIT_THRESHOLD * HIT_THRESHOLD;
  }

  /**
   * Finds the first wire under a given screen point.
   * Accepts client-coordinates and converts to wrap-relative internally.
   * @param {number} clientX - Client/viewport x.
   * @param {number} clientY - Client/viewport y.
   * @returns {object|null} The wire object or null.
   */
  function findWireAt(clientX, clientY) {
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return null;
    var wr = wrap.getBoundingClientRect();
    var wrapX = clientX - wr.left;
    var wrapY = clientY - wr.top;

    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      if (!wires.hasOwnProperty(wireId)) continue;
      if (hitTestWire(wrapX, wrapY, wires[wireId])) {
        return wires[wireId];
      }
    }
    return null;
  }

  /**
   * Splits a wire by inserting a new node at the given canvas position.
   * The original wire is removed and two new wires connect the new node.
   * @param {string} wireId - ID of the wire to split.
   * @param {object} def - Node definition from the registry.
   * @param {number} canvasX - Canvas-space x for the new node.
   * @param {number} canvasY - Canvas-space y for the new node.
   * @returns {object|null} The created node data or null on failure.
   */
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

    if (def.params === 'dynamic' && def.matchName && typeof __e_hlp !== 'undefined') {
      __e_hlp.resolveDynamicSchema(nodeId, def.matchName);
    }

    graphState.removeWire(wireId);

    engine.connectWire(wire.fromNode, wire.fromPort, nodeId, 'main_input');

    engine.connectWire(nodeId, 'output', wire.toNode, wire.toPort);

    return nodeData;
  }

  /**
   * Checks whether a node definition can be inserted onto a wire.
   * Requires both 'main_input' and 'output' ports of type 'layer'.
   * @param {string} wireId - ID of the wire to test.
   * @param {object} def - Node definition to check.
   * @returns {boolean} True if the node can be inserted.
   */
  function canInsertOnWire(wireId, def) {
    if (!def || !def.ports) return false;
    var hasMainInput = false;
    var hasOutput = false;
    for (var i = 0; i < def.ports.length; i++) {
      if (def.ports[i].id === 'main_input') hasMainInput = true;
      if (def.ports[i].id === 'output')     hasOutput = true;
    }
    return hasMainInput && hasOutput;
  }

  /**
   * Sets the preview state for dragging a node over a wire.
   * Stores the wire's port positions and the cursor insertion point.
   * @param {string} wireId - The wire being hovered.
   * @param {number} clientX - Cursor client x.
   * @param {number} clientY - Cursor client y.
   */
  function setWirePreview(wireId, clientX, clientY) {
    var wire = graphState.getWire(wireId);
    if (!wire) { clearWirePreview(); return; }
    var from = _portPosInWrap(wire.fromNode, wire.fromPort);
    var to   = _portPosInWrap(wire.toNode, wire.toPort);
    if (!from || !to) { clearWirePreview(); return; }
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) { clearWirePreview(); return; }
    var wr = wrap.getBoundingClientRect();
    _previewState = {
      wireId:     wireId,
      fromPos:    from,
      toPos:      to,
      insertPos:  { x: clientX - wr.left, y: clientY - wr.top }
    };
  }

  /**
   * Returns the current wire preview state, or null.
   * @returns {object|null} { wireId, fromPos, toPos, insertPos }
   */
  function getWirePreview() {
    return _previewState;
  }

  /**
   * Clears the current wire preview state.
   */
  function clearWirePreview() {
    _previewState = null;
  }

  return {
    findWireAt:       findWireAt,
    hitTestWire:      hitTestWire,
    insertNodeOnWire: insertNodeOnWire,
    canInsertOnWire:  canInsertOnWire,
    setWirePreview:   setWirePreview,
    getWirePreview:   getWirePreview,
    clearWirePreview: clearWirePreview
  };

})();
