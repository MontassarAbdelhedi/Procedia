/**
 * @fileoverview Port element builders for node cards.
 * Constructs output ports, main input ports, and parent hierarchy ports.
 * @dependencies renderer/helpers.js, renderer/builder/params.js
 * @exports __r_bld_ports { buildPortsOutput, buildMainInputPorts, buildParentPorts }
 */

// graph/canvas/renderer/builder/ports.js
// DEPENDS ON: renderer/helpers.js, renderer/builder/params.js
// MUST LOAD BEFORE: renderer/builder.js, renderer/index.js

var __r_bld_ports = (function() {
  var hlp = __r_hlp;
  var prm = __r_bld_params;

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
    dot.setAttribute('data-label', outputPort.label || 'output');
    container.appendChild(dot);

    return container;
  }

  function buildMainInputPorts(nodeId, def) {
    var ports = hlp.getExplicitInputPorts(def);
    if (ports.length === 0) return null;

    var container = document.createElement('div');
    container.className = 'node-input-ports';

    for (var i = 0; i < ports.length; i++) {
      var port = ports[i];
      var row = document.createElement('div');
      row.className = 'node-input-port-row';

      var dot = document.createElement('div');
      dot.className = 'port-dot ' + (port.type || 'layer');
      dot.setAttribute('data-node-id', nodeId);
      dot.setAttribute('data-port-id', port.id);
      dot.setAttribute('data-label', port.label || port.id);
      row.appendChild(dot);

      var label = document.createElement('span');
      label.className = 'node-input-port-label';
      label.textContent = port.label || port.id;
      row.appendChild(label);

      container.appendChild(row);
    }

    return container;
  }

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
        topDot.setAttribute('data-label', port.label || port.id);
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
        bottomDot.setAttribute('data-label', port.label || port.id);
        bottomContainer.appendChild(bottomDot);
        bottomEl = bottomContainer;
      }
    }

    return { top: topEl, bottom: bottomEl };
  }

  return {
    buildPortsOutput:    buildPortsOutput,
    buildMainInputPorts: buildMainInputPorts,
    buildParentPorts:    buildParentPorts
  };
})();
