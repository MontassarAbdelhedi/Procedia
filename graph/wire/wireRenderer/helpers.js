/**
 * graph/wire/wireRenderer/helpers.js
 *
 * Canvas state, wire color constants, animation state, and internal helper
 * functions for port/node positioning and settings queries. Also declares the
 * wireRenderer container.
 *
 * Dependencies: graphState, canvas/renderer, ui/settings
 * Load before: wire/wireRenderer/draw.js, wire/wireRenderer/render.js
 */
// graph/wire/wireRenderer/helpers.js
// DEPENDS ON: graph/graphState.js, graph/canvas/renderer/index.js, ui/settings.js
// MUST LOAD BEFORE: graph/wire/wireRenderer/draw.js, graph/wire/wireRenderer/render.js, graph/wire/wire.js

var wireRenderer = (function() {

  var _s = {}; // shared state object (mutable by ref)

  _s._canvas = null;
  _s._ctx = null;
  _s._WIRE_COLORS = {
    layer:  '#06D6A0',
    data:   '#6B7280',
    parent: '#E07B39'
  };
  _s._animOffset = 0;
  _s._animFrameId = null;

  _s._resize = function() {
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap || !_s._canvas) return;
    var w = wrap.clientWidth;
    var h = wrap.clientHeight;
    if (_s._canvas.width !== w || _s._canvas.height !== h) {
      _s._canvas.width = w;
      _s._canvas.height = h;
    }
  };

  _s._portPosInWrap = function(nodeId, portId) {
    var el = renderer.getNodeElement(nodeId);
    if (!el) return null;

    var dot = el.querySelector('[data-port-id="' + portId + '"]');

    if (dot) {
      var nodeData = graphState.getNode(nodeId);
      if (nodeData && nodeData.collapsed) {
        var corePorts = ['main_input', 'output', 'child_of', 'parent_of'];
        if (corePorts.indexOf(portId) === -1) {
          var mainDot = el.querySelector('[data-port-id="main_input"]');
          if (mainDot) dot = mainDot;
        }
      }
    }

    if (!dot) return null;

    var dotRect = dot.getBoundingClientRect();
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return null;
    var wr = wrap.getBoundingClientRect();

    return {
      x: dotRect.left + dotRect.width / 2 - wr.left,
      y: dotRect.top + dotRect.height / 2 - wr.top
    };
  };

  _s._getStyle = function() {
    if (typeof settings !== 'undefined' && settings.get) {
      return settings.get('wireStyle');
    }
    return 'bezier';
  };

  _s._getAnimDash = function() {
    if (typeof settings !== 'undefined' && settings.get) {
      return settings.get('animatedDash') === true;
    }
    return false;
  };

  _s._isNodeDisabled = function(nodeId) {
    var node = graphState.getNode(nodeId);
    return node ? !!node.disabled : false;
  };

  _s._nodeCenterInWrap = function(nodeId) {
    var el = renderer.getNodeElement(nodeId);
    if (!el) return null;

    var rect = el.getBoundingClientRect();
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return null;
    var wr = wrap.getBoundingClientRect();

    return {
      x: rect.left + rect.width / 2 - wr.left,
      y: rect.top + rect.height / 2 - wr.top
    };
  };

  _s._wireMidpoint = function(wire) {
    var from = _s._portPosInWrap(wire.fromNode, wire.fromPort);
    if (!from) return null;
    var to = _s._portPosInWrap(wire.toNode, wire.toPort);
    if (!to) return null;
    return {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2
    };
  };

  return _s;

})();
