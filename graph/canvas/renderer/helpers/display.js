/**
 * @fileoverview Display and formatting utilities for the renderer.
 * Viewport access, colour conversion, param value formatting, state classes.
 * @dependencies graph/graphState.js
 * @exports __r_hlp_disp { getViewport, rgbaToHex, fillParamValue, getStateClasses }
 */

// graph/canvas/renderer/helpers/display.js
// DEPENDS ON: graph/graphState.js, helpers/wireState.js
// MUST LOAD BEFORE: helpers.js, renderer/index.js

var __r_hlp_disp = (function() {

  function getViewport() {
    return document.getElementById('canvas-nodes');
  }

  function rgbaToHex(rgba) {
    function toHex(n) {
      var h = Math.round((n || 0) * 255).toString(16);
      return h.length === 1 ? '0' + h : h;
    }
    return '#' + toHex(rgba[0]) + toHex(rgba[1]) + toHex(rgba[2]);
  }

  function fillParamValue(span, nodeId, param, value) {
    while (span.firstChild) span.removeChild(span.firstChild);

    if (param.type === 'color' && Array.isArray(value)) {
      var swatch = document.createElement('div');
      swatch.className = 'node-param-swatch';
      swatch.style.background = 'rgb(' +
        Math.round((value[0] || 0) * 255) + ',' +
        Math.round((value[1] || 0) * 255) + ',' +
        Math.round((value[2] || 0) * 255) + ')';
      span.appendChild(swatch);
      span.appendChild(document.createTextNode(rgbaToHex(value)));
    } else if (param.type === 'vector2' && Array.isArray(value)) {
      span.textContent = (value[0] !== undefined ? Number(value[0]).toFixed(1) : '0.0') + ', ' + (value[1] !== undefined ? Number(value[1]).toFixed(1) : '0.0');
    } else if (param.type === 'string') {
      var str = String(value !== undefined ? value : '');
      span.textContent = str.length > 18 ? str.substr(0, 18) + '\u2026' : str;
    } else {
      span.textContent = typeof value === 'number' ? value.toFixed(1) : String(value !== undefined ? value : '');
    }

    span.className = 'node-param-value' + (__r_hlp_wire.isParamWired(nodeId, param.key) ? ' is-wired' : '');
  }

  function getStateClasses(nodeData) {
    var classes = ['node', nodeData.nodeKind];
    classes.push(nodeData.state || 'ghost');
    if (graphState.isSelected(nodeData.id)) classes.push('selected');
    if (nodeData.collapsed) classes.push('node--collapsed');
    if (nodeData.disabled) classes.push('disabled');
    if (window.__graphSearchMatches && window.__graphSearchMatches[nodeData.id]) classes.push('search-highlight');
    return classes.join(' ');
  }

  return {
    getViewport:     getViewport,
    rgbaToHex:       rgbaToHex,
    fillParamValue:  fillParamValue,
    getStateClasses: getStateClasses
  };
})();
