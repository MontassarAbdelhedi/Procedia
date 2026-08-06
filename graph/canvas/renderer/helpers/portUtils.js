/**
 * @fileoverview Port introspection utilities for the renderer.
 * Checks for main_input port presence and collects explicit input port definitions.
 * @exports __r_hlp_port { hasMainInput, getExplicitInputPorts }
 */

// graph/canvas/renderer/helpers/portUtils.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: helpers.js, renderer/index.js

var __r_hlp_port = (function() {

  function hasMainInput(def) {
    for (var mi = 0; mi < def.ports.length; mi++) {
      if (def.ports[mi].id === 'main_input') return true;
    }
    return false;
  }

  function getExplicitInputPorts(def) {
    var paramKeys = {};
    if (def.params) {
      for (var k = 0; k < def.params.length; k++) {
        paramKeys[def.params[k].key] = true;
      }
    }
    var ports = [];
    for (var i = 0; i < def.ports.length; i++) {
      var p = def.ports[i];
      if (p.category === 'mainInput' && p.id !== 'main_input') {
        ports.push(p);
      } else if (p.category === 'secondaryInput' && !paramKeys[p.id]) {
        ports.push(p);
      }
    }
    return ports;
  }

  return {
    hasMainInput:          hasMainInput,
    getExplicitInputPorts: getExplicitInputPorts
  };
})();
