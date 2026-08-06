/**
 * @fileoverview Parameter row and body builders for node cards.
 * Constructs the HTML structure for node parameter sections.
 * @dependencies renderer/helpers.js, graph/graphState.js
 * @exports __r_bld_params { buildParamRow, buildParamBody }
 */

// graph/canvas/renderer/builder/params.js
// DEPENDS ON: renderer/helpers.js, graph/graphState.js
// MUST LOAD BEFORE: renderer/builder.js, renderer/index.js

var __r_bld_params = (function() {
  var hlp = __r_hlp;

  function _getPortLabel(def, portId) {
    if (!def || !def.ports) return portId;
    for (var i = 0; i < def.ports.length; i++) {
      if (def.ports[i].id === portId) {
        return def.ports[i].label || def.ports[i].id;
      }
    }
    return portId;
  }

  function buildParamRow(nodeId, param, value, portId) {
    var row = document.createElement('div');
    row.className = 'node-param';

    if (portId) {
      var dot = document.createElement('div');
      dot.className = 'port-dot data';
      dot.setAttribute('data-node-id', nodeId);
      dot.setAttribute('data-port-id', portId);
      dot.setAttribute('data-label', param.label || param.key || portId);
      row.appendChild(dot);
    }

    var keySpan = document.createElement('span');
    keySpan.className = 'node-param-key';
    var isKeyframed = hlp.isParamKeyframed(nodeId, param.key);
    if (isKeyframed) {
      keySpan.classList.add('keyframed');
    }
    keySpan.textContent = param.label || param.key;
    row.appendChild(keySpan);

    if (isKeyframed) {
      var kfInd = document.createElement('span');
      kfInd.className = 'node-param-kf';
      row.appendChild(kfInd);
    }

    var valSpan = document.createElement('span');
    hlp.fillParamValue(valSpan, nodeId, param, value);
    row.appendChild(valSpan);

    return row;
  }

  function buildParamBody(nodeId, nodeData, def) {
    var body = document.createElement('div');
    body.className = 'node-body';

    if (def.params === 'dynamic') {
      if (!nodeData.dynamicSchema) {
        var loading = document.createElement('span');
        loading.className = 'node-param-loading';
        loading.textContent = 'Loading\u2026';
        body.appendChild(loading);
      } else if (!nodeData.dynamicSchema.properties || nodeData.dynamicSchema.properties.length === 0) {
        var empty = document.createElement('span');
        empty.className = 'node-param-loading';
        empty.textContent = 'No properties';
        body.appendChild(empty);
      } else {
        var props = nodeData.dynamicSchema.properties;
        for (var i = 0; i < props.length; i++) {
          var dynParam = { key: props[i].matchName, type: props[i].type, label: props[i].label };
          body.appendChild(buildParamRow(nodeId, dynParam, nodeData.props[props[i].matchName], props[i].matchName));
        }
      }
    } else {
      var secondaryPortMap = {};
      if (def.ports) {
        for (var p = 0; p < def.ports.length; p++) {
          if (def.ports[p].category === 'secondaryInput') secondaryPortMap[def.ports[p].id] = true;
        }
      }
      for (var j = 0; j < def.params.length; j++) {
        var param = def.params[j];
        if (param.hidden) continue;
        var portId = secondaryPortMap[param.key] ? param.key : null;
        body.appendChild(buildParamRow(nodeId, param, nodeData.props[param.key], portId));
      }
    }

    return body;
  }

  return {
    getPortLabel:   _getPortLabel,
    buildParamRow:  buildParamRow,
    buildParamBody: buildParamBody
  };
})();
