/**
 * @fileoverview DOM builder for node cards on the graph canvas.
 * Assembles node cards from parameter and port sub-builders.
 * @dependencies graph/graphState.js, graph/nodeRegistry.js,
 *               data/categoryColors.js, renderer/helpers.js,
 *               renderer/builder/params.js, renderer/builder/ports.js
 * @exports __r_bld { buildNodeCard, updateNodeCard }
 */

// graph/canvas/renderer/builder.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js,
//             data/categoryColors.js, renderer/helpers.js,
//             renderer/builder/params.js, renderer/builder/ports.js
// MUST LOAD BEFORE: renderer/index.js

var __r_bld = (function() {
  var hlp  = __r_hlp;
  var prm  = __r_bld_params;
  var port = __r_bld_ports;

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

    var catColor = __catColors.colors[def.category] || '#555';
    var catBar = document.createElement('div');
    catBar.className = 'node-cat-bar';
    catBar.style.background = catColor;
    header.appendChild(catBar);

    if (hlp.hasMainInput(def)) {
      var mainDot = document.createElement('div');
      mainDot.className = 'port-dot layer';
      mainDot.setAttribute('data-node-id', nodeId);
      mainDot.setAttribute('data-port-id', 'main_input');
      mainDot.setAttribute('data-label', prm.getPortLabel(def, 'main_input'));
      mainDot.style.flexShrink = '0';
      header.appendChild(mainDot);
    }

    var labelEl = document.createElement('span');
    labelEl.className = 'node-label';
    labelEl.textContent = (nodeData.props && nodeData.props.label) || def.label;
    header.appendChild(labelEl);

    var stateDot = document.createElement('div');
    stateDot.className = 'node-state-dot';
    header.appendChild(stateDot);

    card.appendChild(header);

    var inputPorts = port.buildMainInputPorts(nodeId, def);
    if (inputPorts) card.appendChild(inputPorts);

    card.appendChild(prm.buildParamBody(nodeId, nodeData, def));

    var outputPorts = port.buildPortsOutput(nodeId, def);
    if (outputPorts) card.appendChild(outputPorts);

    var parentPorts = port.buildParentPorts(nodeId, def);
    if (parentPorts.top)    card.appendChild(parentPorts.top);
    if (parentPorts.bottom) card.appendChild(parentPorts.bottom);

    return card;
  }

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

    var oldInputs = el.querySelector('.node-input-ports');
    var newInputs = port.buildMainInputPorts(nodeId, def);
    if (oldInputs) {
      if (newInputs) {
        el.replaceChild(newInputs, oldInputs);
      } else {
        el.removeChild(oldInputs);
      }
    } else if (newInputs) {
      el.insertBefore(newInputs, el.querySelector('.node-body') || null);
    }

    var oldBody = el.querySelector('.node-body');
    var newBody = prm.buildParamBody(nodeId, nodeData, def);
    if (oldBody) {
      el.replaceChild(newBody, oldBody);
    } else {
      el.appendChild(newBody);
    }

    var oldOutput = el.querySelector('.ports-output');
    if (oldOutput) el.removeChild(oldOutput);
    var newOutput = port.buildPortsOutput(nodeId, def);
    if (newOutput) el.appendChild(newOutput);

    var oldParentTop = el.querySelector('.port-parent-top');
    if (oldParentTop) el.removeChild(oldParentTop);
    var oldParentBottom = el.querySelector('.port-parent-bottom');
    if (oldParentBottom) el.removeChild(oldParentBottom);
    var newParentPorts = port.buildParentPorts(nodeId, def);
    if (newParentPorts.top) el.appendChild(newParentPorts.top);
    if (newParentPorts.bottom) el.appendChild(newParentPorts.bottom);
  }

  return {
    buildNodeCard:   buildNodeCard,
    updateNodeCard:  updateNodeCard
  };
})();
