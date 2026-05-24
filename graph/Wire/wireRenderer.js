// graph/wire/wireRenderer.js
// DEPENDS ON: graph/graphState.js, graph/canvas/viewport.js
// MUST LOAD BEFORE: graph/wire/wire.js

var wireRenderer = (function() {

  var _dragWireEl = null;
  var MIN_CP_OFFSET = 60;

  // Canvas-space midpoint cache, rebuilt every render()
  // { wireId: { fromPos, toPos, midX, midY } }
  var _wireCache = {};

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
      var dy = Math.abs(toPos.y - fromPos.y) * 0.5;
      if (dy < MIN_CP_OFFSET) dy = MIN_CP_OFFSET;
      d = 'M '  + fromPos.x + ' ' + fromPos.y +
          ' C ' + fromPos.x + ' ' + (fromPos.y - dy) +
          ', '  + toPos.x   + ' ' + (toPos.y   + dy) +
          ', '  + toPos.x   + ' ' + toPos.y;
    } else {
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

  // Builds a horizontal bezier SVG path without wire-type styling (caller styles it)
  function _makeHorizBezier(x1, y1, x2, y2) {
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    var dx = Math.abs(x2 - x1) * 0.5;
    if (dx < MIN_CP_OFFSET) dx = MIN_CP_OFFSET;
    var d = 'M '  + x1           + ' ' + y1 +
            ' C ' + (x1 + dx)    + ' ' + y1 +
            ', '  + (x2 - dx)    + ' ' + y2 +
            ', '  + x2           + ' ' + y2;
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    return path;
  }

  function _drawSuggestion(layer, suggest) {
    var cached = _wireCache[suggest.wireId];
    var wire   = graphState.getWire(suggest.wireId);
    if (!cached || !wire) return;

    var fPos = cached.fromPos;
    var tPos = cached.toPos;
    var mx   = cached.midX;
    var my   = cached.midY;

    // 1. Highlight target wire — solid white on top
    var hl = _makePath(fPos, tPos, wire.type);
    hl.setAttribute('stroke', '#ffffff');
    hl.setAttribute('stroke-width', '2.5');
    hl.removeAttribute('stroke-dasharray');
    hl.style.opacity = '1';
    hl.classList.add('wire-path', 'wire-suggest');
    layer.appendChild(hl);

    // 2. Ghost wire A: fromPos → midpoint
    var ghostA = _makeHorizBezier(fPos.x, fPos.y, mx, my);
    ghostA.setAttribute('stroke', 'rgba(255,255,255,0.4)');
    ghostA.setAttribute('stroke-width', '1.5');
    ghostA.setAttribute('stroke-dasharray', '3 3');
    ghostA.classList.add('wire-path', 'wire-suggest');
    layer.appendChild(ghostA);

    // 3. Ghost wire B: midpoint → toPos
    var ghostB = _makeHorizBezier(mx, my, tPos.x, tPos.y);
    ghostB.setAttribute('stroke', 'rgba(255,255,255,0.4)');
    ghostB.setAttribute('stroke-width', '1.5');
    ghostB.setAttribute('stroke-dasharray', '3 3');
    ghostB.classList.add('wire-path', 'wire-suggest');
    layer.appendChild(ghostB);

    // 4. Insertion circle at midpoint
    var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', mx);
    circle.setAttribute('cy', my);
    circle.setAttribute('r', '6');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', '#ffffff');
    circle.setAttribute('stroke-width', '1.5');
    circle.setAttribute('stroke-dasharray', '3 3');
    circle.classList.add('wire-path', 'wire-suggest');
    layer.appendChild(circle);
  }

  function render() {
    var layer = document.getElementById('wire-layer');
    if (!layer) return;

    _wireCache = {};

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

      // Cache canvas-space positions for hit-testing and suggestion rendering
      _wireCache[wireId] = {
        fromPos: fromPos,
        toPos:   toPos,
        midX:    (fromPos.x + toPos.x) / 2,
        midY:    (fromPos.y + toPos.y) / 2
      };

      var path = _makePath(fromPos, toPos, wire.type);
      path.setAttribute('data-wire-id', wireId);
      path.setAttribute('pointer-events', 'none');
      path.classList.add('wire-path', wire.type);

      if (typeof wireInteraction !== 'undefined' &&
          wireInteraction.getSelectedWire() === wireId) {
        path.setAttribute('stroke-width', '3');
        path.style.opacity = '1';
      }

      layer.appendChild(path);

      var hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hitPath.setAttribute('d',              path.getAttribute('d'));
      hitPath.setAttribute('fill',           'none');
      hitPath.setAttribute('stroke',         'transparent');
      hitPath.setAttribute('stroke-width',   '14');
      hitPath.setAttribute('stroke-linecap', 'round');
      hitPath.setAttribute('pointer-events', 'stroke');
      hitPath.setAttribute('data-wire-id',   wireId);
      hitPath.classList.add('wire-path', 'wire-hit');
      layer.appendChild(hitPath);
    }

    // Auto-wire suggestion overlay (checked at runtime — drag.js loads after this file)
    if (typeof drag !== 'undefined' && drag.getAutoWireSuggest) {
      var suggest = drag.getAutoWireSuggest();
      if (suggest && suggest.active) {
        _drawSuggestion(layer, suggest);
      }
    }
  }

  // Returns the wireId whose midpoint is nearest to (screenX, screenY) within threshold,
  // or null if none. screenX/Y are relative to #canvas-wrap.
  function hitTestNearest(screenX, screenY) {
    var canvasPos  = viewport.screenToCanvas(screenX, screenY);
    var transform  = viewport.getTransform();
    var threshold  = 40 / transform.zoom; // 40 screen-px converted to canvas units
    var best       = null;
    var bestDist   = threshold;
    for (var wireId in _wireCache) {
      var cached = _wireCache[wireId];
      var dx = canvasPos.x - cached.midX;
      var dy = canvasPos.y - cached.midY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = wireId;
      }
    }
    return best;
  }

  function getWireCache(wireId) {
    return _wireCache[wireId] || null;
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
    clearDragWire:  clearDragWire,
    hitTestNearest: hitTestNearest,
    getWireCache:   getWireCache
  };

})();
