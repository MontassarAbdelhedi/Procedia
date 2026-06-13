/**
 * graph/wire/wire.js
 *
 * Interactive wire drawing tool. Handles mouse events for dragging wires from
 * source ports to target ports on the canvas, managing the drag state and
 * delegating wire creation to the engine.
 *
 * Dependencies: graphState, nodeRegistry, engine/index.js, canvas/renderer,
 *               canvas/viewport, wire/wireRenderer.js
 * Load before: index.js
 *
 * Exports: init
 */
// graph/wire/wire.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/engine/index.js,
//             graph/canvas/renderer/index.js, graph/canvas/viewport.js, graph/wire/wireRenderer.js
// MUST LOAD BEFORE: index.js

var wireTool = (function () {
  var _drag = {
    active: false,
    fromNode: null,
    fromPort: null,
    wireType: null,
    fromPos: null
  };
  /**
   * Finds a port definition by ID, first checking the node definition's ports
   * array, then falling back to secondary ports on the node data.
   *
   * @param {Object} def - Node definition from registry
   * @param {Object} nodeData - Runtime node data
   * @param {string} portId - Port ID to find
   * @returns {Object|null} The port definition, or null
   */
  function _findPortDef(def, nodeData, portId) {
    if (def && def.ports) {
      var i;
      for (i = 0; i < def.ports.length; i++) {
        if (def.ports[i].id === portId) return def.ports[i];
      }
    }
    if (nodeData && nodeData.secondaryPorts) {
      for (var s = 0; s < nodeData.secondaryPorts.length; s++) {
        if (nodeData.secondaryPorts[s].id === portId) return nodeData.secondaryPorts[s];
      }
    }
    return null;
  }
  /**
   * Determines if a port definition represents a source (output) port.
   *
   * @param {Object} portDef - Port definition object
   * @returns {boolean} True if the port is an output or parent-role port
   */
  function _isSourcePort(portDef) {
    if (!portDef) return false;
    if (portDef.category === 'output') return true;
    if (portDef.category === 'parent' && portDef.role === 'parent') return true;
    return false;
  }
  /**
   * Determines if a port definition represents a target (input) port.
   *
   * @param {Object} portDef - Port definition object
   * @returns {boolean} True if the port is an input or child-role port
   */
  function _isTargetPort(portDef) {
    if (!portDef) return false;
    if (portDef.category === 'mainInput' || portDef.category === 'secondaryInput') return true;
    if (portDef.category === 'parent' && portDef.role === 'child') return true;
    return false;
  }
  /**
   * Extracts the canvas-wrap-relative position from a mouse event.
   *
   * @param {Event} e - Mouse event
   * @returns {Object|null} Position object with x, y, or null
   */
  function _wrapPosFromEvent(e) {
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return null;
    var wr = wrap.getBoundingClientRect();
    return { x: e.clientX - wr.left, y: e.clientY - wr.top };
  }
  /**
   * Calculates the canvas-wrap-relative position of a node port.
   *
   * @param {string} nodeId - Node ID
   * @param {string} portId - Port ID
   * @returns {Object|null} Position object with x, y, or null
   */
  function _portPosInWrap(nodeId, portId) {
    var el = renderer.getNodeElement(nodeId);
    if (!el) return null;
    var dot = el.querySelector('[data-port-id="' + portId + '"]');
    if (!dot) return null;
    var dotRect = dot.getBoundingClientRect();
    var wrap = document.getElementById('canvas-wrap');
    var wr = wrap.getBoundingClientRect();
    return {
      x: dotRect.left + dotRect.width / 2 - wr.left,
      y: dotRect.top + dotRect.height / 2 - wr.top
    };
  }
  /**
   * Handles mousedown on port dots to start a wire drag operation.
   *
   * @param {Event} e - Mouse event
   */
  function _onMouseDown(e) {
    if (e.button !== 0) return;
    var target = e.target;
    var portEl = null;
    while (target && target !== document.body) {
      if (target.classList && target.classList.contains('port-dot')) {
        portEl = target;
        break;
      }
      target = target.parentElement;
    }
    if (!portEl) return;
    var nodeId = portEl.getAttribute('data-node-id');
    var portId = portEl.getAttribute('data-port-id');
    if (!nodeId || !portId) return;
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;
    var def = nodeRegistry.getDefinition(nodeData.type);
    var portDef = _findPortDef(def, nodeData, portId);
    if (!_isSourcePort(portDef)) return;
    e.preventDefault();
    e.stopPropagation();
    _drag.active = true;
    _drag.fromNode = nodeId;
    _drag.fromPort = portDef.id;
    _drag.wireType = portDef.type;
    _drag.fromPos = _portPosInWrap(nodeId, portId);
    wireRenderer.render({
      from: _drag.fromPos,
      to: _wrapPosFromEvent(e)
    });
  }
  /**
   * Handles mousemove during a wire drag to update the preview render.
   *
   * @param {Event} e - Mouse event
   */
  function _onMouseMove(e) {
    if (!_drag.active) return;
    wireRenderer.render({
      from: _drag.fromPos,
      to: _wrapPosFromEvent(e)
    });
  }
  /**
   * Handles mouseup to complete or cancel a wire drag. If released on a valid
   * target port, creates the wire via the engine. If released on empty canvas,
   * shows the node picker.
   *
   * @param {Event} e - Mouse event
   */
  function _onMouseUp(e) {
    if (!_drag.active) return;
    var fromNode = _drag.fromNode;
    var fromPort = _drag.fromPort;
    _drag.active = false;
    _drag.fromNode = null;
    _drag.fromPort = null;
    _drag.fromPos = null;
    var target = e.target;
    var portEl = null;
    while (target && target !== document.body) {
      if (target.classList && target.classList.contains('port-dot')) {
        portEl = target;
        break;
      }
      target = target.parentElement;
    }
    wireRenderer.render(null);
    if (!portEl) {
      // Empty canvas drop — show node picker if inside canvas-wrap bounds
      if (typeof nodePicker !== 'undefined' && nodePicker.show) {
        var wrap = document.getElementById('canvas-wrap');
        if (wrap) {
          var wr = wrap.getBoundingClientRect();
          if (e.clientX >= wr.left && e.clientX <= wr.right &&
            e.clientY >= wr.top && e.clientY <= wr.bottom) {
            nodePicker.show(e.clientX, e.clientY, fromNode, fromPort, _drag.wireType);
          }
        }
      }
      return;
    }
    var toNodeId = portEl.getAttribute('data-node-id');
    var toPort = portEl.getAttribute('data-port-id');
    if (!toNodeId || !toPort || toNodeId === fromNode) return;
    var toNodeData = graphState.getNode(toNodeId);
    if (!toNodeData) return;
    var toDef = nodeRegistry.getDefinition(toNodeData.type);
    var toPortDef = _findPortDef(toDef, toNodeData, toPort);
    if (!_isTargetPort(toPortDef)) return;
    engine.connectWire(fromNode, fromPort, toNodeId, toPort);
    wireRenderer.render(null);
  }
  /**
   * Initializes the wire tool by attaching event listeners to the canvas wrap
   * and document for mouse-based wire dragging.
   */
  var _initialized = false;

  function _onResize() {
    wireRenderer.render(null);
  }

  function init() {
    if (_initialized) return;
    _initialized = true;
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return;
    wrap.addEventListener('mousedown', _onMouseDown, true);
    document.addEventListener('mousemove', _onMouseMove);
    document.addEventListener('mouseup', _onMouseUp);
    window.addEventListener('resize', _onResize);
  }
  return {
    init: init
  };
})();
