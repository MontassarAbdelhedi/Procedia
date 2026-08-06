/**
 * @fileoverview Helper utilities for the canvas node renderer.
 * Aggregates display, wire-state, and port-introspection sub-modules.
 * @dependencies graph/graphState.js,
 *               helpers/wireState.js, helpers/display.js, helpers/portUtils.js
 * @exports __r_hlp
 */

// graph/canvas/renderer/helpers.js
// DEPENDS ON: graph/graphState.js,
//             helpers/wireState.js, helpers/display.js, helpers/portUtils.js
// MUST LOAD BEFORE: renderer/builder.js, renderer/index.js

var __r_hlp = (function() {

  return {
    getViewport:          __r_hlp_disp.getViewport,
    isParamWired:         __r_hlp_wire.isParamWired,
    isParamKeyframed:     __r_hlp_wire.isParamKeyframed,
    clearWireParamCache:  __r_hlp_wire.clearWireParamCache,
    rgbaToHex:            __r_hlp_disp.rgbaToHex,
    fillParamValue:       __r_hlp_disp.fillParamValue,
    getStateClasses:      __r_hlp_disp.getStateClasses,
    hasMainInput:         __r_hlp_port.hasMainInput,
    getExplicitInputPorts: __r_hlp_port.getExplicitInputPorts
  };
})();
