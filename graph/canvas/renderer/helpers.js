/**
 * @fileoverview Helper utilities for the canvas node renderer.
 * Provides DOM access, wire-state queries, colour conversion, and DOM building helpers.
 * @dependencies graph/graphState.js
 * @exports __r_hlp { getViewport, isParamWired, rgbaToHex, fillParamValue, getStateClasses, hasMainInput }
 */

// graph/canvas/renderer/helpers.js
// DEPENDS ON: graph/graphState.js
// MUST LOAD BEFORE: renderer/builder.js, renderer/index.js

var __r_hlp = (function() {

  var _wireParamMap = null;

  /**
   * Builds a lookup map: {nodeId: {paramKey: true}} from all data wires.
   * Called once per render cycle.
   */
  function _buildWireParamMap() {
    var map = {};
    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      if (!wires.hasOwnProperty(wireId)) continue;
      var wire = wires[wireId];
      if (wire.type !== 'data') continue;
      if (!map[wire.toNode]) map[wire.toNode] = {};
      var key = wire.boundParam || wire.toPort;
      if (key) map[wire.toNode][key] = true;
    }
    return map;
  }

  /**
   * Clears the wire param cache so it is rebuilt on next render.
   */
  function clearWireParamCache() {
    _wireParamMap = null;
  }

  /**
   * Returns the canvas-nodes DOM element (the viewport for nodes).
   * @returns {HTMLElement|null}
   */
  function getViewport() {
    return document.getElementById('canvas-nodes');
  }

  /**
   * Checks whether a specific parameter of a node has an incoming wire.
   * Uses a cached lookup map built once per render cycle.
   * @param {string} nodeId
   * @param {string} paramKey
   * @returns {boolean}
   */
  function isParamWired(nodeId, paramKey) {
    if (!_wireParamMap) _wireParamMap = _buildWireParamMap();
    return !!(paramKey && _wireParamMap[nodeId] && _wireParamMap[nodeId][paramKey]);
  }

  /**
   * Converts an RGBA array (values 0-1) to a hex colour string.
   * @param {number[]} rgba - [r, g, b, a] each in [0, 1].
   * @returns {string} Hex colour e.g. "#ff00aa".
   */
  function rgbaToHex(rgba) {
    function toHex(n) {
      var h = Math.round((n || 0) * 255).toString(16);
      return h.length === 1 ? '0' + h : h;
    }
    return '#' + toHex(rgba[0]) + toHex(rgba[1]) + toHex(rgba[2]);
  }

  /**
   * Fills a span element with the formatted value of a node parameter.
   * Handles colour (with swatch), vector2, string, and default types.
   * @param {HTMLElement} span - The target span to populate.
   * @param {string} nodeId
   * @param {object} param - Parameter definition with { type, key, label? }.
   * @param {*} value - The parameter value.
   */
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
      span.textContent = (value[0] !== undefined ? value[0] : 0) + ', ' + (value[1] !== undefined ? value[1] : 0);
    } else if (param.type === 'string') {
      var str = String(value !== undefined ? value : '');
      span.textContent = str.length > 18 ? str.substr(0, 18) + '\u2026' : str;
    } else {
      span.textContent = String(value !== undefined ? value : '');
    }

    span.className = 'node-param-value' + (isParamWired(nodeId, param.key) ? ' is-wired' : '');
  }

  /**
   * Returns a space-separated class string for a node element based on its state.
   * Includes "node", nodeKind, state class, "selected", "collapsed", and "disabled".
   * @param {object} nodeData
   * @returns {string}
   */
  function getStateClasses(nodeData) {
    var classes = ['node', nodeData.nodeKind];
    classes.push(nodeData.state || 'ghost');
    if (graphState.isSelected(nodeData.id)) classes.push('selected');
    if (nodeData.collapsed) classes.push('node--collapsed');
    if (nodeData.disabled) classes.push('disabled');
    return classes.join(' ');
  }

  /**
   * Checks whether a node definition has a port with category 'mainInput'.
   * @param {object} def - Node definition.
   * @returns {boolean}
   */
  function hasMainInput(def) {
    for (var mi = 0; mi < def.ports.length; mi++) {
      if (def.ports[mi].id === 'main_input') return true;
    }
    return false;
  }

  /**
   * Returns all ports in the definition with category 'mainInput' that are NOT named 'main_input'.
   * Used to render additional input port dots for nodes with multiple explicit inputs (e.g. Merge).
   * @param {object} def - Node definition.
   * @returns {Array} Array of port definition objects.
   */
  function getExplicitInputPorts(def) {
    var ports = [];
    for (var i = 0; i < def.ports.length; i++) {
      if (def.ports[i].category === 'mainInput' && def.ports[i].id !== 'main_input') {
        ports.push(def.ports[i]);
      }
    }
    return ports;
  }

  return {
    getViewport:     getViewport,
    isParamWired:    isParamWired,
    clearWireParamCache: clearWireParamCache,
    rgbaToHex:       rgbaToHex,
    fillParamValue:  fillParamValue,
    getStateClasses: getStateClasses,
    hasMainInput:    hasMainInput,
    getExplicitInputPorts: getExplicitInputPorts
  };
})();
