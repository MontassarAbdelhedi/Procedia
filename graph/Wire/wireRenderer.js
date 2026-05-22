// graph/wire/wireRenderer.js
// DEPENDS ON: graph/graphState.js, graph/canvas/viewport.js
// MUST LOAD BEFORE: graph/wire/wire.js

var wireRenderer = (function() {

  var _dragWireEl = null;
  var MIN_CP_OFFSET = 60;

  function _getPortPosition(nodeId, portId) {
    var el = document.querySelector(
      '#canvas-viewport .port[data-node-id="' + nodeId + '"][data-port-id="' + portId + '"]'
    );
    if (!el) return null;
    var wrap     = document.getElementById('canvas-wrap');
    var wrapRect = wrap ? wrap.getBoundingClientRect() : { left: 0, top: 0 };
    var rect     = el.getBoundingClientRect();
    var center   = {
      x: rect.left - wrapRect.left + rect.width  / 2,
      y: rect.top  - wrapRect.top  + rect.height / 2
    };
    return viewport.screenToCanvas(center.x, center.y);
  }

  function _isParentWire(wireType) {
    return wireType === 'parent';
  }

  function _makePath(fromPos, toPos, wireType) {
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    var d;

    if (_isParentWire(wireType)) {
      // Vertical flow — child_of (top) to parent_of (bottom)
      var dy = Math.abs(toPos.y - fromPos.y) * 0.5;
      if (dy < MIN_CP_OFFSET) dy = MIN_CP_OFFSET;
      d = 'M '  + fromPos.x + ' ' + fromPos.y +
          ' C ' + fromPos.x + ' ' + (fromPos.y - dy) +
          ', '  + toPos.x   + ' ' + (toPos.y   + dy) +
          ', '  + toPos.x   + ' ' + toPos.y;
    } else {
      // Horizontal flow — layer and data wires (left to right)
      var dx = Math.abs(toPos.x - fromPos.x) * 0.5;
      if (dx < MIN_CP_OFFSET) dx = MIN_CP_OFFSET;
      d = 'M '  + fromPos.x           + ' ' + fromPos.y +
          ' C ' + (fromPos.x + dx)    + ' ' + fromPos.y +
          ', '  + (toPos.x   - dx)    + ' ' + toPos.y   +
          ', '  + toPos.x             + ' ' + toPos.y;
    }

    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('pointer-events', 'stroke');

    if (wireType === 'layer') {
      path.setAttribute('stroke', 'var(--wire-layer)');
      path.setAttribute('stroke-width', '1.5');
      path.style.opacity = '0.8';
    } else if (wireType === 'data') {
      path.setAttribute('stroke', 'var(--wire-data)');
      path.setAttribute('stroke-width', '1.5');
      path.style.opacity = '0.8';
    } else if (wireType === 'parent') {
      path.setAttribute('stroke', 'var(--wire-parent)');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('stroke-dasharray', '5 3');
      path.style.opacity = '0.8';
    }

    return path;
  }

  function render() {
    var layer = document.getElementById('wire-layer');
    if (!layer) return;

    // Remove all existing wire paths (not the drag wire)
    var existing = layer.querySelectorAll('.wire-path:not(.drag-wire)');
    for (var i = 0; i < existing.length; i++) {
      layer.removeChild(existing[i]);
    }

    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      var wire    = wires[wireId];
      var fromPos = _getPortPosition(wire.fromNode, wire.fromPort);
      var toPos   = _getPortPosition(wire.toNode,   wire.toPort);
      if (!fromPos || !toPos) continue;

      var path = _makePath(fromPos, toPos, wire.type);
      path.setAttribute('data-wire-id', wireId);
      path.classList.add('wire-path', wire.type);

      // Apply selected state
      if (typeof wireInteraction !== 'undefined' &&
          wireInteraction.getSelectedWire() === wireId) {
        path.setAttribute('stroke-width', '3');
        path.style.opacity = '1';
      }

      layer.appendChild(path);
    }
  }

  function renderDragWire(fromPos, toPos, wireType) {
    var layer = document.getElementById('wire-layer');
    if (!layer) return;
    clearDragWire();
    var path = _makePath(fromPos, toPos, wireType || 'layer');
    path.classList.add('wire-path', wireType || 'layer', 'drag-wire');
    path.style.opacity = '0.5';
    path.style.strokeDasharray = '6 3';
    _dragWireEl = path;
    layer.appendChild(path);
  }

  function clearDragWire() {
    if (_dragWireEl && _dragWireEl.parentNode) {
      _dragWireEl.parentNode.removeChild(_dragWireEl);
    }
    _dragWireEl = null;
  }

  return {
    render:         render,
    renderDragWire: renderDragWire,
    clearDragWire:  clearDragWire
  };

})();
