/**
 * @fileoverview DOM builder for node cards on the graph canvas.
 * Constructs and updates the HTML structure for node elements (header, params, ports).
 * @dependencies graph/graphState.js, graph/nodeRegistry.js,
 *               renderer/categories.js, renderer/helpers.js
 * @exports __r_bld { buildNodeCard, updateNodeCard }
 */

// graph/canvas/renderer/builder.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js,
//             renderer/categories.js, renderer/helpers.js
// MUST LOAD BEFORE: renderer/index.js

var __r_bld = (function() {
  var cat = __r_cat;
  var hlp = __r_hlp;

  /**
   * Builds a single parameter row DOM element (key label + value + optional port dot).
   * @param {string} nodeId
   * @param {object} param - Parameter definition { key, type, label? }.
   * @param {*} value - Current parameter value.
   * @param {string} [portId] - Port ID if this param has a connection dot.
   * @returns {HTMLElement}
   */
  function buildParamRow(nodeId, param, value, portId) {
    var row = document.createElement('div');
    row.className = 'node-param';

    if (portId) {
      var dot = document.createElement('div');
      dot.className = 'port-dot data';
      dot.setAttribute('data-node-id', nodeId);
      dot.setAttribute('data-port-id', portId);
      row.appendChild(dot);
    }

    var keySpan = document.createElement('span');
    keySpan.className = 'node-param-key';
    keySpan.textContent = param.label || param.key;
    row.appendChild(keySpan);

    var valSpan = document.createElement('span');
    hlp.fillParamValue(valSpan, nodeId, param, value);
    row.appendChild(valSpan);

    return row;
  }

  /**
   * Builds the parameter body section of a node card.
   * Handles both static and dynamic parameter schemas.
   * @param {string} nodeId
   * @param {object} nodeData
   * @param {object} def - Node definition.
   * @returns {HTMLElement}
   */
  function buildParamBody(nodeId, nodeData, def) {
    var body = document.createElement('div');
    body.className = 'node-body';

    if (def.params === 'dynamic') {
      if (!nodeData.dynamicSchema || !nodeData.dynamicSchema.properties ||
          nodeData.dynamicSchema.properties.length === 0) {
        var loading = document.createElement('span');
        loading.className = 'node-param-loading';
        loading.textContent = 'Loading\u2026';
        body.appendChild(loading);
      } else {
        var props = nodeData.dynamicSchema.properties;
        for (var i = 0; i < props.length; i++) {
          var dynParam = { key: props[i].matchName, type: props[i].type, label: props[i].label };
          body.appendChild(buildParamRow(nodeId, dynParam, nodeData.props[props[i].matchName], props[i].matchName));
        }
      }
    } else {
      for (var j = 0; j < def.params.length; j++) {
        var param = def.params[j];
        body.appendChild(buildParamRow(nodeId, param, nodeData.props[param.key]));
      }
    }

    return body;
  }

  /**
   * Builds the output port element for a node card if the definition has an output port.
   * @param {string} nodeId
   * @param {object} def - Node definition.
   * @returns {HTMLElement|null}
   */
  function buildPortsOutput(nodeId, def) {
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

  /**
   * Builds parent hierarchy port elements (child_of / parent_of) for a node card.
   * @param {string} nodeId
   * @param {object} def - Node definition.
   * @returns {{ top: HTMLElement|null, bottom: HTMLElement|null }}
   */
  function buildParentPorts(nodeId, def) {
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

  /**
   * Builds a complete node card DOM element (header, body, output port, parent ports).
   * @param {string} nodeId
   * @param {object} nodeData
   * @param {object} def - Node definition.
   * @returns {HTMLElement}
   */
  function buildNodeCard(nodeId, nodeData, def) {
    var card = document.createElement('div');
    card.setAttribute('data-node-id', nodeId);
    card.className = hlp.getStateClasses(nodeData);
    card.style.left = (nodeData.x || 0) + 'px';
    card.style.top  = (nodeData.y || 0) + 'px';
    if (nodeData.nodeColor) {
      card.style.borderColor = nodeData.nodeColor;
    }

    var header = document.createElement('div');
    header.className = 'node-header';

    var catToken = cat.tokens[def.category] || 'utility';
    var catColor = cat.colors[catToken] || '#555';
    var catBar = document.createElement('div');
    catBar.className = 'node-cat-bar';
    catBar.style.background = catColor;
    header.appendChild(catBar);

    if (hlp.hasMainInput(def)) {
      var mainDot = document.createElement('div');
      mainDot.className = 'port-dot layer';
      mainDot.setAttribute('data-node-id', nodeId);
      mainDot.setAttribute('data-port-id', 'main_input');
      mainDot.style.flexShrink = '0';
      header.appendChild(mainDot);
    }

    var labelEl = document.createElement('span');
    labelEl.className = 'node-label';
    labelEl.textContent = (nodeData.props && nodeData.props.label) || def.label;
    header.appendChild(labelEl);

    var titleInput = document.createElement('input');
    titleInput.className = 'node-title-input';
    titleInput.type = 'text';
    titleInput.value = (nodeData.props && nodeData.props.label) || def.label;
    header.appendChild(titleInput);

    var stateDot = document.createElement('div');
    stateDot.className = 'node-state-dot';
    header.appendChild(stateDot);

    card.appendChild(header);

    card.appendChild(buildParamBody(nodeId, nodeData, def));

    var outputPorts = buildPortsOutput(nodeId, def);
    if (outputPorts) card.appendChild(outputPorts);

    var parentPorts = buildParentPorts(nodeId, def);
    if (parentPorts.top)    card.appendChild(parentPorts.top);
    if (parentPorts.bottom) card.appendChild(parentPorts.bottom);

    return card;
  }

  /**
   * Updates an existing node card element with new position, state, and parameter values.
   * Replaces the body contents in-place.
   * @param {HTMLElement} el - Existing node card element.
   * @param {string} nodeId
   * @param {object} nodeData
   * @param {object} def - Node definition.
   */
  function updateNodeCard(el, nodeId, nodeData, def) {
    el.style.left = (nodeData.x || 0) + 'px';
    el.style.top  = (nodeData.y || 0) + 'px';
    el.className = hlp.getStateClasses(nodeData);
    if (nodeData.nodeColor) {
      el.style.borderColor = nodeData.nodeColor;
    } else {
      el.style.borderColor = '';
    }

    var labelEl = el.querySelector('.node-label');
    if (labelEl) {
      labelEl.textContent = (nodeData.props && nodeData.props.label) || def.label;
    }

    var oldBody = el.querySelector('.node-body');
    var newBody = buildParamBody(nodeId, nodeData, def);
    if (oldBody) {
      el.replaceChild(newBody, oldBody);
    } else {
      el.appendChild(newBody);
    }

    var oldInputPorts = el.querySelector('.ports-input');
    if (oldInputPorts) oldInputPorts.parentNode.removeChild(oldInputPorts);
  }

  return {
    buildNodeCard:   buildNodeCard,
    updateNodeCard:  updateNodeCard
  };
})();
