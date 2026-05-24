// ui/drag.js
// DEPENDS ON: graph/nodeRegistry.js, graph/engine.js, graph/graphState.js,
//             graph/portManager.js, graph/canvas/viewport.js,
//             graph/canvas/renderer.js, graph/wire/wireRenderer.js
// MUST LOAD BEFORE: index.js

var drag = (function() {

  var _activeDragType = null;

  var autoWireSuggestState = {
    active: false,
    wireId: null,
    midX:   0,
    midY:   0
  };

  function _clearSuggest() {
    autoWireSuggestState.active = false;
    autoWireSuggestState.wireId = null;
  }

  // Strip trailing _N slot index: 'layer_in_0' → 'layer_in', 'output' → 'output'
  function _basePortId(portId) {
    var m = portId.match(/^(.+)_(\d+)$/);
    return (m && m[1]) ? m[1] : portId;
  }

  function _doAutoWireDrop(nodeType, wire, wireId, canvasPos) {
    var def = nodeRegistry.getDefinition(nodeType);
    if (!def) return false;

    // Find the first input port that matches the wire type
    var inPort = null;
    for (var i = 0; i < def.ports.length; i++) {
      if (def.ports[i].category === 'input' && def.ports[i].type === wire.type) {
        inPort = def.ports[i];
        break;
      }
    }
    if (!inPort) return false;

    // Find the first output port that matches the wire type
    var outPort = null;
    for (var j = 0; j < def.ports.length; j++) {
      if (def.ports[j].category === 'output' && def.ports[j].type === wire.type) {
        outPort = def.ports[j];
        break;
      }
    }
    if (!outPort) return false;

    // Center node on drop cursor (approximate half node dimensions)
    var wx = canvasPos.x - 70;
    var wy = canvasPos.y - 40;

    // 1. For an active path: graph-only removal that keeps the source node alive in AE.
    //    _transplantLayerUUID lets _firePathCreation re-stamp the existing layer instead of
    //    doing a park/unpark round-trip, which avoids a race between the two async batches.
    //    For a dormant path (no active AE layer): fall through to full engine.disconnectWire.
    var oldPathLayerUUID = wire._pathLayerUUID;
    if (oldPathLayerUUID) {
      graphState.removeWire(wireId);
      portManager.afterDisconnect(wire.toNode, _basePortId(wire.toPort));
      graphState.updateNode(wire.fromNode, { _transplantLayerUUID: oldPathLayerUUID });
    } else {
      engine.disconnectWire(wireId);
    }

    // 2. Create the effector node
    var newNodeData = engine.dropNode(nodeType, wx, wy);
    if (!newNodeData) return false;

    // 3. Wire A: original fromNode output → new effector input (slot 0)
    var inSlot = inPort.extendable ? (inPort.id + '_0') : inPort.id;
    engine.connectWire(wire.fromNode, wire.fromPort, newNodeData.id, inSlot, null);

    // 4. Wire B: new effector output → original toNode input
    //    Uses the exact same toPort as the removed wire so it lands in the right slot.
    engine.connectWire(newNodeData.id, outPort.id, wire.toNode, wire.toPort, null);

    return true;
  }

  function init() {
    var items = document.querySelectorAll('.palette-item');
    var i;
    for (i = 0; i < items.length; i++) {
      items[i].addEventListener('dragstart', function(e) {
        var nodeType = e.currentTarget.getAttribute('data-node-type');
        if (!nodeType) return;
        _activeDragType = nodeType;
        e.dataTransfer.setData('text/plain', nodeType);
        e.dataTransfer.effectAllowed = 'copy';
      });
    }

    // dragend fires on the source element whether the drop succeeded or was cancelled
    document.addEventListener('dragend', function() {
      _activeDragType = null;
      if (autoWireSuggestState.active) {
        _clearSuggest();
        wireRenderer.render();
      }
    });

    var canvasWrap = document.getElementById('canvas-wrap');
    if (!canvasWrap) return;

    canvasWrap.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';

      // Auto-wire suggestion: effectors only
      if (!_activeDragType) {
        if (autoWireSuggestState.active) { _clearSuggest(); wireRenderer.render(); }
        return;
      }
      var def = nodeRegistry.getDefinition(_activeDragType);
      if (!def || def.nodeKind !== 'effector') {
        if (autoWireSuggestState.active) { _clearSuggest(); wireRenderer.render(); }
        return;
      }

      var wrap     = document.getElementById('canvas-wrap');
      var wrapRect = wrap.getBoundingClientRect();
      var screenX  = e.clientX - wrapRect.left;
      var screenY  = e.clientY - wrapRect.top;

      var hitWireId = wireRenderer.hitTestNearest(screenX, screenY);

      if (!hitWireId) {
        if (autoWireSuggestState.active) { _clearSuggest(); wireRenderer.render(); }
        return;
      }

      var wire = graphState.getWire(hitWireId);
      if (!wire) {
        if (autoWireSuggestState.active) { _clearSuggest(); wireRenderer.render(); }
        return;
      }

      // Compatibility: effector must have a matching input AND output port for wire.type
      var hasIn  = false;
      var hasOut = false;
      for (var p = 0; p < def.ports.length; p++) {
        if (def.ports[p].category === 'input'  && def.ports[p].type === wire.type) hasIn  = true;
        if (def.ports[p].category === 'output' && def.ports[p].type === wire.type) hasOut = true;
      }
      if (!hasIn || !hasOut) {
        if (autoWireSuggestState.active) { _clearSuggest(); wireRenderer.render(); }
        return;
      }

      var cached   = wireRenderer.getWireCache(hitWireId);
      var changed  = !autoWireSuggestState.active || autoWireSuggestState.wireId !== hitWireId;

      autoWireSuggestState.active = true;
      autoWireSuggestState.wireId = hitWireId;
      autoWireSuggestState.midX   = cached ? cached.midX : 0;
      autoWireSuggestState.midY   = cached ? cached.midY : 0;

      if (changed) wireRenderer.render();
    });

    canvasWrap.addEventListener('drop', function(e) {
      e.preventDefault();
      var nodeType = e.dataTransfer.getData('text/plain') || _activeDragType;
      if (!nodeType) { _clearSuggest(); return; }
      if (!nodeRegistry.getDefinition(nodeType)) {
        console.error('[drag] Unknown node type: ' + nodeType);
        _clearSuggest();
        return;
      }

      var wrap     = document.getElementById('canvas-wrap');
      var wrapRect = wrap.getBoundingClientRect();
      var canvasPos = viewport.screenToCanvas(
        e.clientX - wrapRect.left,
        e.clientY - wrapRect.top
      );

      if (autoWireSuggestState.active) {
        var wireId = autoWireSuggestState.wireId;
        var wire   = graphState.getWire(wireId);
        _clearSuggest();
        if (wire) {
          var ok = _doAutoWireDrop(nodeType, wire, wireId, canvasPos);
          renderer.render();
          wireRenderer.render();
          if (ok) return;
          // Fall through to normal drop if insertion failed
        }
      }

      engine.dropNode(nodeType, canvasPos.x, canvasPos.y);
      renderer.render();
      wireRenderer.render();
    });
  }

  return {
    init:               init,
    getAutoWireSuggest: function() { return autoWireSuggestState; }
  };

})();
