// graph/wire/wire.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/wireValidator.js,
//             graph/cycleChecker.js, graph/cascadeAlgorithm.js, graph/portManager.js,
//             graph/canvas/viewport.js, graph/canvas/renderer.js,
//             graph/wire/wireRenderer.js, graph/engine.js
// MUST LOAD BEFORE: index.js

var wireInteraction = (function() {

  var _dragState = {
    active:       false,
    fromNodeId:   null,
    fromPortId:   null,
    fromPortType: null,   // wire type: 'layer' | 'data' | 'parent'
    fromPos:      null    // canvas-space { x, y }
  };

  var _selectedWireId = null;

  // ── Helpers ────────────────────────────────────────────────

  // Strip trailing _N index: 'layer_in_0' → 'layer_in', 'output' → 'output'
  function _getBasePortId(portId) {
    var lastUnder = portId.lastIndexOf('_');
    if (lastUnder === -1) return portId;
    var suffix = portId.substring(lastUnder + 1);
    if (suffix.length > 0) {
      var isNum = true;
      var i, code;
      for (i = 0; i < suffix.length; i++) {
        code = suffix.charCodeAt(i);
        if (code < 48 || code > 57) { isNum = false; break; }
      }
      if (isNum) return portId.substring(0, lastUnder);
    }
    return portId;
  }

  // Same DOM lookup as wireRenderer._getPortPosition — private copy to avoid circular dep
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

  function _findPortDef(def, portId) {
    var baseId = _getBasePortId(portId);
    var i;
    for (i = 0; i < def.ports.length; i++) {
      if (def.ports[i].id === portId || def.ports[i].id === baseId) {
        return def.ports[i];
      }
    }
    return null;
  }

  function _clearDropTargets() {
    var dots = document.querySelectorAll('.port.drop-target');
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.remove('drop-target');
    }
  }

  function _resetDragState() {
    _dragState.active       = false;
    _dragState.fromNodeId   = null;
    _dragState.fromPortId   = null;
    _dragState.fromPortType = null;
    _dragState.fromPos      = null;
  }

  // ── Wire drag lifecycle ────────────────────────────────────

  function onPortMouseDown(nodeId, portId, e) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return;

    var portDef = _findPortDef(def, portId);
    if (!portDef) return;

    var isForwardDrag = (portDef.category === 'output') ||
                        (portDef.category === 'parent' && portDef.role === 'child');

    if (isForwardDrag) {
      var fromPos = _getPortPosition(nodeId, portId);
      if (!fromPos) return;

      _dragState.active       = true;
      _dragState.fromNodeId   = nodeId;
      _dragState.fromPortId   = portId;
      _dragState.fromPortType = portDef.type;
      _dragState.fromPos      = fromPos;

    } else {
      // Input or parent_of — check for an existing wire to reroute
      var wires = graphState.getAllWires();
      var existingWire = null;
      var wireId;
      for (wireId in wires) {
        var w = wires[wireId];
        if (w.toNode === nodeId && w.toPort === portId) {
          existingWire = w;
          break;
        }
      }
      if (!existingWire) return; // empty input — nothing to do

      // Reroute: disconnect existing wire, start drag from the original source
      var sourceNodeId = existingWire.fromNode;
      var sourcePortId = existingWire.fromPort;
      engine.disconnectWire(existingWire.id);
      renderer.render();
      wireRenderer.render();

      var sourcePos = _getPortPosition(sourceNodeId, sourcePortId);
      if (!sourcePos) return;

      var sourceNode = graphState.getNode(sourceNodeId);
      if (!sourceNode) return;
      var sourceDef = nodeRegistry.getDefinition(sourceNode.type);
      if (!sourceDef) return;
      var sourcePortDef = _findPortDef(sourceDef, sourcePortId);
      if (!sourcePortDef) return;

      _dragState.active       = true;
      _dragState.fromNodeId   = sourceNodeId;
      _dragState.fromPortId   = sourcePortId;
      _dragState.fromPortType = sourcePortDef.type;
      _dragState.fromPos      = sourcePos;
    }

    e.stopPropagation();
    e.preventDefault();
  }

  function onWireMouseMove(e) {
    if (!_dragState.active) return;

    var wrap       = document.getElementById('canvas-wrap');
    var wrapRect   = wrap ? wrap.getBoundingClientRect() : { left: 0, top: 0 };
    var currentPos = viewport.screenToCanvas(
      e.clientX - wrapRect.left,
      e.clientY - wrapRect.top
    );
    wireRenderer.renderDragWire(_dragState.fromPos, currentPos, _dragState.fromPortType);

    // Highlight valid drop targets
    var dots = document.querySelectorAll('#canvas-viewport .port');
    for (var i = 0; i < dots.length; i++) {
      var dot          = dots[i];
      var targetNodeId = dot.getAttribute('data-node-id');
      var targetPortId = dot.getAttribute('data-port-id');
      if (!targetNodeId || !targetPortId) {
        dot.classList.remove('drop-target');
        continue;
      }
      var result = wireValidator.validate(
        _dragState.fromNodeId, _dragState.fromPortId,
        targetNodeId, targetPortId,
        _dragState.fromPortType
      );
      if (result.valid) {
        dot.classList.add('drop-target');
      } else {
        dot.classList.remove('drop-target');
      }
    }
  }

  function onWireMouseUp(e) {
    wireRenderer.clearDragWire();
    _clearDropTargets();

    if (!_dragState.active) {
      _resetDragState();
      return;
    }

    // Find if mouse was released on a port dot
    var el     = document.elementFromPoint(e.clientX, e.clientY);
    var portEl = null;
    var target = el;
    while (target && target !== document.body) {
      if (target.classList && target.classList.contains('port')) {
        portEl = target;
        break;
      }
      target = target.parentElement;
    }

    if (portEl) {
      var targetNodeId = portEl.getAttribute('data-node-id');
      var targetPortId = portEl.getAttribute('data-port-id');

      if (targetNodeId && targetPortId) {
        var validation = wireValidator.validate(
          _dragState.fromNodeId, _dragState.fromPortId,
          targetNodeId, targetPortId,
          _dragState.fromPortType
        );

        if (validation.valid) {
          var basePortId = _getBasePortId(targetPortId);
          var isNewbornSlot = (basePortId !== targetPortId) &&
                              (portManager.getOpenSlot(targetNodeId, basePortId) === targetPortId);
          var isDataWire    = (_dragState.fromPortType === 'data');

          if (isNewbornSlot && isDataWire) {
            showPicker(
              _dragState.fromNodeId, _dragState.fromPortId,
              targetNodeId, targetPortId, e
            );
          } else {
            engine.connectWire(
              _dragState.fromNodeId, _dragState.fromPortId,
              targetNodeId, targetPortId, null
            );
            renderer.render();
            wireRenderer.render();
          }
        } else {
          console.log('[wireInteraction] Drop rejected: ' + validation.reason);
        }
      }
    }

    _resetDragState();
  }

  // ── Picker UI ──────────────────────────────────────────────

  function showPicker(fromNodeId, fromPortId, targetNodeId, targetPortId, e) {
    var params = wireValidator.getPickerParams(targetNodeId, _dragState.fromPortType);
    if (!params || params.length === 0) return;

    var picker = document.createElement('div');
    picker.className  = 'wire-picker';
    picker.style.left = e.clientX + 'px';
    picker.style.top  = e.clientY + 'px';

    var header = document.createElement('div');
    header.className   = 'wire-picker-header';
    header.textContent = 'Bind to param';
    picker.appendChild(header);

    var i;
    for (i = 0; i < params.length; i++) {
      (function(param) {
        var item = document.createElement('div');
        item.className = 'wire-picker-item';

        var dot = document.createElement('span');
        dot.className = 'wire-picker-dot';
        item.appendChild(dot);

        var name = document.createElement('span');
        name.className   = 'wire-picker-name';
        name.textContent = param.label;
        item.appendChild(name);

        var type = document.createElement('span');
        type.className   = 'wire-picker-type';
        type.textContent = param.type;
        item.appendChild(type);

        item.addEventListener('click', function() {
          if (picker.parentNode) picker.parentNode.removeChild(picker);
          engine.connectWire(fromNodeId, fromPortId, targetNodeId, targetPortId, param.key);
          renderer.render();
          wireRenderer.render();
        });

        picker.appendChild(item);
      })(params[i]);
    }

    document.body.appendChild(picker);

    // Dismiss on outside mousedown
    setTimeout(function() {
      function onOutsideClick(ev) {
        if (!picker.contains(ev.target)) {
          if (picker.parentNode) picker.parentNode.removeChild(picker);
          document.removeEventListener('mousedown', onOutsideClick);
        }
      }
      document.addEventListener('mousedown', onOutsideClick);
    }, 0);
  }

  // ── Wire select / delete ───────────────────────────────────

  function _onWireLayerMouseDown(e) {
    var target = e.target;
    if (target && target.hasAttribute && target.hasAttribute('data-wire-id')) {
      var wireId = target.getAttribute('data-wire-id');
      _selectedWireId = (_selectedWireId === wireId) ? null : wireId;
      wireRenderer.render();
      e.stopPropagation(); // prevent canvas background-click from deselecting the node
    } else {
      _selectedWireId = null;
      wireRenderer.render();
      // no stopPropagation — let canvasInput handle background click normally
    }
  }

  function _onKeyDown(e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && _selectedWireId) {
      engine.disconnectWire(_selectedWireId);
      _selectedWireId = null;
      renderer.render();
      wireRenderer.render();
      e.preventDefault();
    }
  }

  function getSelectedWire() {
    return _selectedWireId;
  }

  // ── Init ───────────────────────────────────────────────────

  function init() {
    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) { console.error('[wireInteraction] canvas-wrap not found'); return; }
    wrap.addEventListener('mousemove', onWireMouseMove);
    wrap.addEventListener('mouseup',   onWireMouseUp);

    var wireLayer = document.getElementById('wire-layer');
    if (wireLayer) wireLayer.addEventListener('mousedown', _onWireLayerMouseDown);

    document.addEventListener('keydown', _onKeyDown);
  }

  return {
    onPortMouseDown: onPortMouseDown,
    getSelectedWire: getSelectedWire,
    init:            init
  };

})();
