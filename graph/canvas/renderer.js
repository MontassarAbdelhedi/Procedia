// graph/canvas/renderer.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/canvas/viewport.js
// MUST LOAD BEFORE: graph/canvas/input.js, index.js

var renderer = (function() {

  var _nodeElements = {}; // { nodeId: domElement }

  var _categoryTokens = {
    'Core':    'core',
    'Layers':  'layers',
    'Effects': 'effects',
    'Data':    'data',
    'Utility': 'utility'
  };

  // Hardcoded because CEP CSS variable support is inconsistent
  var _categoryColors = {
    'core':    '#534AB7',
    'layers':  '#2E86C1',
    'effects': '#27AE60',
    'data':    '#D4AC0D',
    'utility': '#E07B39'
  };

  function _getViewport() {
    // #canvas-nodes is the transform target and node card container
    return document.getElementById('canvas-nodes');
  }

  function _isParamWired(nodeId, paramKey) {
    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      if (!wires.hasOwnProperty(wireId)) continue;
      var wire = wires[wireId];
      if (wire.toNode !== nodeId) continue;
      if (wire.boundParam === paramKey || wire.toPort === paramKey) return true;
    }
    return false;
  }

  function _rgbaToHex(rgba) {
    function toHex(n) {
      var h = Math.round((n || 0) * 255).toString(16);
      return h.length === 1 ? '0' + h : h;
    }
    return '#' + toHex(rgba[0]) + toHex(rgba[1]) + toHex(rgba[2]);
  }

  function _fillParamValue(span, nodeId, param, value) {
    while (span.firstChild) span.removeChild(span.firstChild);

    if (param.type === 'color' && Array.isArray(value)) {
      var swatch = document.createElement('div');
      swatch.className = 'node-param-swatch';
      swatch.style.background = 'rgb(' +
        Math.round((value[0] || 0) * 255) + ',' +
        Math.round((value[1] || 0) * 255) + ',' +
        Math.round((value[2] || 0) * 255) + ')';
      span.appendChild(swatch);
      span.appendChild(document.createTextNode(_rgbaToHex(value)));
    } else if (param.type === 'vector2' && Array.isArray(value)) {
      span.textContent = (value[0] !== undefined ? value[0] : 0) + ', ' + (value[1] !== undefined ? value[1] : 0);
    } else if (param.type === 'string') {
      var str = String(value !== undefined ? value : '');
      span.textContent = str.length > 18 ? str.substr(0, 18) + '…' : str;
    } else {
      span.textContent = String(value !== undefined ? value : '');
    }

    span.className = 'node-param-value' + (_isParamWired(nodeId, param.key) ? ' is-wired' : '');
  }

  function _buildParamRow(nodeId, param, value) {
    var row = document.createElement('div');
    row.className = 'node-param';

    var keySpan = document.createElement('span');
    keySpan.className = 'node-param-key';
    keySpan.textContent = param.label || param.key;
    row.appendChild(keySpan);

    var valSpan = document.createElement('span');
    _fillParamValue(valSpan, nodeId, param, value);
    row.appendChild(valSpan);

    return row;
  }

  function _buildParamBody(nodeId, nodeData, def) {
    var body = document.createElement('div');
    body.className = 'node-body';

    if (def.params === 'dynamic') {
      if (!nodeData.dynamicSchema || !nodeData.dynamicSchema.properties ||
          nodeData.dynamicSchema.properties.length === 0) {
        var loading = document.createElement('span');
        loading.className = 'node-param-loading';
        loading.textContent = 'Loading…';
        body.appendChild(loading);
      } else {
        var props = nodeData.dynamicSchema.properties;
        for (var i = 0; i < props.length; i++) {
          var dynParam = { key: props[i].matchName, type: props[i].type, label: props[i].label };
          body.appendChild(_buildParamRow(nodeId, dynParam, nodeData.props[props[i].matchName]));
        }
      }
    } else {
      for (var j = 0; j < def.params.length; j++) {
        var param = def.params[j];
        body.appendChild(_buildParamRow(nodeId, param, nodeData.props[param.key]));
      }
    }

    return body;
  }

  function _appendPortDot(container, nodeId, port) {
    var dot = document.createElement('div');
    dot.className = 'port-dot ' + (port.type || 'layer');
    dot.setAttribute('data-node-id', nodeId);
    dot.setAttribute('data-port-id', port.id);
    if (port.label) dot.setAttribute('title', port.label);
    container.appendChild(dot);
  }

  function _buildPortsInput(nodeId, def, nodeData) {
    var container = document.createElement('div');
    container.className = 'ports-input';

    var ports = def.ports;
    var pi;
    for (pi = 0; pi < ports.length; pi++) {
      var port = ports[pi];
      if (port.category === 'mainInput') {
        _appendPortDot(container, nodeId, port);
      } else if (port.category === 'secondaryInput') {
        _appendPortDot(container, nodeId, port);
      }
    }

    if (nodeData.secondaryPorts && nodeData.secondaryPorts.length) {
      for (var si = 0; si < nodeData.secondaryPorts.length; si++) {
        _appendPortDot(container, nodeId, nodeData.secondaryPorts[si]);
      }
    }

    return container;
  }

  function _buildPortsOutput(nodeId, def) {
    var outputPort = null;
    for (var i = 0; i < def.ports.length; i++) {
      if (def.ports[i].category === 'output') { outputPort = def.ports[i]; break; }
    }
    if (!outputPort) return null;

    var container = document.createElement('div');
    container.className = 'ports-output';

    var dot = document.createElement('div');
    dot.className = 'port-dot ' + (outputPort.type || 'layer');
    dot.setAttribute('data-node-id', nodeId);
    dot.setAttribute('data-port-id', 'output');
    container.appendChild(dot);

    return container;
  }

  function _buildParentPorts(nodeId, def) {
    var topEl = null;
    var bottomEl = null;

    for (var i = 0; i < def.ports.length; i++) {
      var port = def.ports[i];

      if (port.id === 'child_of') {
        var topContainer = document.createElement('div');
        topContainer.className = 'port-parent-top';
        var topDot = document.createElement('div');
        topDot.className = 'port-dot parent';
        topDot.setAttribute('data-node-id', nodeId);
        topDot.setAttribute('data-port-id', 'child_of');
        topContainer.appendChild(topDot);
        topEl = topContainer;
      }

      if (port.id === 'parent_of') {
        var bottomContainer = document.createElement('div');
        bottomContainer.className = 'port-parent-bottom';
        var bottomDot = document.createElement('div');
        bottomDot.className = 'port-dot parent';
        bottomDot.setAttribute('data-node-id', nodeId);
        bottomDot.setAttribute('data-port-id', 'parent_of');
        bottomContainer.appendChild(bottomDot);
        bottomEl = bottomContainer;
      }
    }

    return { top: topEl, bottom: bottomEl };
  }

  function _getStateClasses(nodeData) {
    var classes = ['node', nodeData.nodeKind];
    classes.push(nodeData.state || 'ghost');
    if (graphState.getSelection() === nodeData.id) classes.push('selected');
    return classes.join(' ');
  }

  function _buildNodeCard(nodeId, nodeData, def) {
    var card = document.createElement('div');
    card.setAttribute('data-node-id', nodeId);
    card.className = _getStateClasses(nodeData);
    card.style.left = (nodeData.x || 0) + 'px';
    card.style.top  = (nodeData.y || 0) + 'px';

    // Header
    var header = document.createElement('div');
    header.className = 'node-header';

    var catToken = _categoryTokens[def.category] || 'utility';
    var catColor = _categoryColors[catToken] || '#555';
    var catBar = document.createElement('div');
    catBar.className = 'node-cat-bar';
    catBar.style.background = catColor;
    header.appendChild(catBar);

    var labelEl = document.createElement('span');
    labelEl.className = 'node-label';
    labelEl.textContent = (nodeData.props && nodeData.props.label) || def.label;
    header.appendChild(labelEl);

    var stateDot = document.createElement('div');
    stateDot.className = 'node-state-dot';
    header.appendChild(stateDot);

    card.appendChild(header);

    // Body
    card.appendChild(_buildParamBody(nodeId, nodeData, def));

    // Input ports
    card.appendChild(_buildPortsInput(nodeId, def, nodeData));

    // Output port
    var outputPorts = _buildPortsOutput(nodeId, def);
    if (outputPorts) card.appendChild(outputPorts);

    // Parent ports
    var parentPorts = _buildParentPorts(nodeId, def);
    if (parentPorts.top)    card.appendChild(parentPorts.top);
    if (parentPorts.bottom) card.appendChild(parentPorts.bottom);

    return card;
  }

  function _updateNodeCard(el, nodeId, nodeData, def) {
    el.style.left = (nodeData.x || 0) + 'px';
    el.style.top  = (nodeData.y || 0) + 'px';
    el.className = _getStateClasses(nodeData);

    var labelEl = el.querySelector('.node-label');
    if (labelEl) {
      labelEl.textContent = (nodeData.props && nodeData.props.label) || def.label;
    }

    var oldBody = el.querySelector('.node-body');
    var newBody = _buildParamBody(nodeId, nodeData, def);
    if (oldBody) {
      el.replaceChild(newBody, oldBody);
    } else {
      el.appendChild(newBody);
    }

    var oldInputPorts = el.querySelector('.ports-input');
    var newInputPorts = _buildPortsInput(nodeId, def, nodeData);
    if (oldInputPorts) {
      el.replaceChild(newInputPorts, oldInputPorts);
    } else {
      el.appendChild(newInputPorts);
    }
  }

  function render() {
    var vp = _getViewport();
    if (!vp) return;
    var nodes = graphState.getAllNodes();

    // Remove deleted nodes
    for (var id in _nodeElements) {
      if (_nodeElements.hasOwnProperty(id) && !nodes[id]) {
        removeNode(id);
      }
    }

    // Add new or update existing
    for (var nodeId in nodes) {
      if (!nodes.hasOwnProperty(nodeId)) continue;
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
