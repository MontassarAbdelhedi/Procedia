// graph/canvas/renderer.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/canvas/viewport.js
// MUST LOAD BEFORE: index.js

var renderer = (function() {

  var _nodeElements = {}; // { nodeId: domElement }

  var _categoryTokens = {
    'Core':    'core',
    'Layers':  'layers',
    'Effects': 'effects',
    'Data':    'data',
    'Utility': 'utility'
  };

  function _getViewport() {
    return document.getElementById('canvas-viewport');
  }

  function _isParamWired(nodeId, paramKey) {
    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      var wire = wires[wireId];
      if (wire.toNode === nodeId && wire.boundParam === paramKey) return true;
    }
    return false;
  }

  function _colorToHex(arr) {
    var r = Math.round(((arr && arr[0] !== undefined) ? arr[0] : 0) * 255);
    var g = Math.round(((arr && arr[1] !== undefined) ? arr[1] : 0) * 255);
    var b = Math.round(((arr && arr[2] !== undefined) ? arr[2] : 0) * 255);
    var rh = r.toString(16); if (rh.length < 2) rh = '0' + rh;
    var gh = g.toString(16); if (gh.length < 2) gh = '0' + gh;
    var bh = b.toString(16); if (bh.length < 2) bh = '0' + bh;
    return '#' + rh + gh + bh;
  }

  function _appendParamDisplay(valEl, param, value) {
    if (param.type === 'color') {
      var hexStr = _colorToHex(value);
      var swatch = document.createElement('span');
      swatch.className = 'color-swatch';
      swatch.style.background = hexStr;
      valEl.appendChild(swatch);
      valEl.appendChild(document.createTextNode(hexStr));
    } else if (param.type === 'vector2') {
      var vx = (value && value[0] !== undefined) ? value[0] : 0;
      var vy = (value && value[1] !== undefined) ? value[1] : 0;
      valEl.appendChild(document.createTextNode(vx + ', ' + vy));
    } else if (param.type === 'string') {
      var str = String(value !== undefined && value !== null ? value : '');
      if (str.length > 18) str = str.substr(0, 18) + '…';
      valEl.appendChild(document.createTextNode(str));
    } else {
      valEl.appendChild(document.createTextNode(
        String(value !== undefined && value !== null ? value : '')
      ));
    }
  }

  function _buildParamRow(nodeId, param, value) {
    var row = document.createElement('div');
    row.className = 'node-param-row';

    var keyEl = document.createElement('span');
    keyEl.className = 'node-param-key';
    keyEl.textContent = param.label;
    row.appendChild(keyEl);

    var isWired = _isParamWired(nodeId, param.key);
    var valEl = document.createElement('span');
    valEl.className = 'node-param-value' + (isWired ? ' wired' : '');

    if (isWired) {
      var wiredDot = document.createElement('span');
      wiredDot.className = 'wired-dot';
      valEl.appendChild(wiredDot);
    }

    _appendParamDisplay(valEl, param, value);
    row.appendChild(valEl);
    return row;
  }

  function _buildInputPortDots(nodeId, def, nodeData) {
    var dots = [];
    var slotIndex = 0;
    var i, s, portDef, dot, slotCount, slotPortId, allWires, wireId, w, boundParam, labelEl;
    var ports = def.ports;

    for (i = 0; i < ports.length; i++) {
      portDef = ports[i];
      if (portDef.category !== 'input') continue;

      if (portDef.extendable) {
        slotCount = (nodeData.portSlots && nodeData.portSlots[portDef.id])
          ? nodeData.portSlots[portDef.id] : 1;

        for (s = 0; s < slotCount; s++) {
          slotPortId = portDef.id + '_' + s;
          dot = document.createElement('div');
          dot.setAttribute('data-node-id', nodeId);
          dot.setAttribute('data-port-id', slotPortId);
          dot.style.top = (9 + slotIndex * 18) + 'px';

          if (s < slotCount - 1) {
            // Occupied slot — check for a bound data wire to label it
            boundParam = null;
            allWires = graphState.getAllWires();
            for (wireId in allWires) {
              w = allWires[wireId];
              if (w.toNode === nodeId && w.toPort === slotPortId &&
                  w.type === 'data' && w.boundParam) {
                boundParam = w.boundParam;
                break;
              }
            }
            if (boundParam !== null) {
              dot.className = 'port data bound input';
              dot.setAttribute('data-bound-param', boundParam);
              labelEl = document.createElement('span');
              labelEl.className = 'port-label';
              labelEl.textContent = boundParam;
              dot.appendChild(labelEl);
            } else {
              dot.className = 'port ' + portDef.type + ' input';
            }
          } else {
            dot.className = 'port empty input';
          }

          dots.push(dot);
          slotIndex++;
        }
      } else {
        dot = document.createElement('div');
        dot.className = 'port ' + portDef.type + ' input';
        dot.setAttribute('data-node-id', nodeId);
        dot.setAttribute('data-port-id', portDef.id);
        dot.style.top = (9 + slotIndex * 18) + 'px';
        dots.push(dot);
        slotIndex++;
      }
    }

    return dots;
  }

  function _buildOutputPortDot(nodeId, def) {
    var ports = def.ports;
    for (var i = 0; i < ports.length; i++) {
      if (ports[i].category === 'output') {
        var dot = document.createElement('div');
        dot.className = 'port ' + ports[i].type + ' output';
        dot.setAttribute('data-node-id', nodeId);
        dot.setAttribute('data-port-id', ports[i].id);
        dot.style.top = 'calc(50% - 5px)';
        return dot;
      }
    }
    return null;
  }

  function _buildParentPorts(el, nodeId, def) {
    var ports = def.ports;
    for (var i = 0; i < ports.length; i++) {
      var portDef = ports[i];
      if (portDef.category !== 'parent') continue;
      var dot = document.createElement('div');
      dot.setAttribute('data-node-id', nodeId);
      dot.setAttribute('data-port-id', portDef.id);
      dot.className = (portDef.role === 'child')
        ? 'port parent-port parent-top wire-parent'
        : 'port parent-port parent-bottom wire-parent';
      el.appendChild(dot);
    }
  }

  function _clearParentPorts(el) {
    var toRemove = [];
    var children = el.childNodes;
    for (var i = 0; i < children.length; i++) {
      if (children[i].nodeType === 1 &&
          children[i].classList &&
          children[i].classList.contains('parent-port')) {
        toRemove.push(children[i]);
      }
    }
    for (var j = 0; j < toRemove.length; j++) {
      el.removeChild(toRemove[j]);
    }
  }

  function _fillNodeBody(body, nodeId, def, nodeData) {
    var i, inputDots, outputDot;

    for (i = 0; i < def.params.length; i++) {
      body.appendChild(_buildParamRow(nodeId, def.params[i], nodeData.props[def.params[i].key]));
    }

    inputDots = _buildInputPortDots(nodeId, def, nodeData);
    for (i = 0; i < inputDots.length; i++) {
      body.appendChild(inputDots[i]);
    }

    outputDot = _buildOutputPortDot(nodeId, def);
    if (outputDot) body.appendChild(outputDot);
  }

  function _getStateClasses(nodeData) {
    var classes = ['node-card', nodeData.nodeKind];
    classes.push(nodeData.state);
    if (graphState.getSelection() === nodeData.id) classes.push('selected');
    return classes.join(' ');
  }

  function _buildNodeCard(nodeId, nodeData, def) {
    var el = document.createElement('div');
    el.className = _getStateClasses(nodeData);
    el.setAttribute('data-node-id', nodeId);
    el.style.left = nodeData.x + 'px';
    el.style.top  = nodeData.y + 'px';

    // Header
    var header = document.createElement('div');
    header.className = 'node-header';

    var catBar = document.createElement('div');
    catBar.className = 'node-cat-bar';
    catBar.style.background = 'var(--cat-' + (_categoryTokens[def.category] || 'core') + ')';
    header.appendChild(catBar);

    var labelEl = document.createElement('span');
    labelEl.className = 'node-label';
    labelEl.textContent = (nodeData.props && nodeData.props.label) ? nodeData.props.label : def.label;
    header.appendChild(labelEl);

    var stateDot = document.createElement('div');
    stateDot.className = 'node-state-dot ' + nodeData.state;
    header.appendChild(stateDot);

    el.appendChild(header);

    // Body
    var body = document.createElement('div');
    body.className = 'node-body';
    _fillNodeBody(body, nodeId, def, nodeData);
    el.appendChild(body);

    // Parent ports (direct children of node-card, positioned by CSS)
    _buildParentPorts(el, nodeId, def);

    return el;
  }

  function _updateNodeCard(el, nodeId, nodeData, def) {
    el.style.left = nodeData.x + 'px';
    el.style.top  = nodeData.y + 'px';
    el.className  = _getStateClasses(nodeData);

    var header = el.querySelector('.node-header');
    if (header) {
      var stateDot = header.querySelector('.node-state-dot');
      if (stateDot) stateDot.className = 'node-state-dot ' + nodeData.state;
      var labelEl = header.querySelector('.node-label');
      if (labelEl) labelEl.textContent = (nodeData.props && nodeData.props.label) ? nodeData.props.label : def.label;
    }

    var body = el.querySelector('.node-body');
    if (body) {
      while (body.firstChild) body.removeChild(body.firstChild);
      _fillNodeBody(body, nodeId, def, nodeData);
    }

    _clearParentPorts(el);
    _buildParentPorts(el, nodeId, def);
  }

  function render() {
    var vp = _getViewport();
    if (!vp) return;
    var nodes = graphState.getAllNodes();

    // Remove deleted nodes
    for (var id in _nodeElements) {
      if (!nodes[id]) {
        removeNode(id);
      }
    }

    // Add new or update existing
    for (var nodeId in nodes) {
      var nodeData = nodes[nodeId];
      var def = nodeRegistry.getDefinition(nodeData.type);
      if (!def) continue;

      if (_nodeElements[nodeId]) {
        _updateNodeCard(_nodeElements[nodeId], nodeId, nodeData, def);
      } else {
        var el = _buildNodeCard(nodeId, nodeData, def);
        vp.appendChild(el);
        _nodeElements[nodeId] = el;
      }
    }

    if (typeof statusBar !== 'undefined') statusBar.update();
  }

  function updateNode(nodeId) {
    var nodeData = graphState.getNode(nodeId);
    if (!nodeData) return;
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return;
    if (_nodeElements[nodeId]) {
      _updateNodeCard(_nodeElements[nodeId], nodeId, nodeData, def);
    }
  }

  function removeNode(nodeId) {
    var el = _nodeElements[nodeId];
    if (el && el.parentNode) el.parentNode.removeChild(el);
    delete _nodeElements[nodeId];
  }

  function getNodeElement(nodeId) {
    return _nodeElements[nodeId] || null;
  }

  return {
    render:         render,
    updateNode:     updateNode,
    removeNode:     removeNode,
    getNodeElement: getNodeElement
  };

})();
