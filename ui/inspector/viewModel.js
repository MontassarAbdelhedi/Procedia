/**
 * @fileoverview Inspector view model builder. Transforms raw node data and
 * node definition into a structured view model for the inspector renderer.
 * Depends on: graphState, nodeRegistry (globals).
 * Exports: __ins_vm.isParamWired, .stateLabel, .paramList, .formatValueForInput,
 *          .parseInputValue, .buildViewModel
 */
// ui/inspector/viewModel.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js
// MUST LOAD BEFORE: ui/inspector/index.js

var __ins_vm = (function() {

  /**
   * Checks whether a node parameter is connected to a wire.
   * @param {string} nodeId The node ID.
   * @param {string} paramKey The parameter key.
   * @return {boolean} True if wired.
   */
  function _isParamWired(nodeId, paramKey) {
    var nodeData = graphState.getNode(nodeId);
    if (nodeData && nodeData._cloneMasterId) return true;
    var wires = graphState.getAllWires();
    for (var wireId in wires) {
      if (!wires.hasOwnProperty(wireId)) continue;
      var wire = wires[wireId];
      if (wire.toNode !== nodeId) continue;
      if (wire.boundParam === paramKey || wire.toPort === paramKey) return true;
    }
    return false;
  }

  /**
   * Builds a combined state label (e.g. "alive · comp").
   * @param {Object} nodeData The node data.
   * @param {Object} def The node definition.
   * @return {string} The state label string.
   */
  function _stateLabel(nodeData, def) {
    var parts = [nodeData.state || 'ghost'];
    if (def && def.nodeKind) parts.push(def.nodeKind);
    return parts.join(' \u00b7 ');
  }

  /**
   * Extracts the parameter list from a node's definition.
   * Delegates to the definition's getParams method so each node
   * controls what it exports to the inspector.
   * @param {Object} nodeData The node data.
   * @param {Object} def The node definition.
   * @return {Array|null} Array of param objects, or null if loading.
   */
  function _paramList(nodeData, def) {
    if (typeof def.getParams === 'function') {
      return def.getParams(nodeData);
    }
    return null;
  }

  /**
   * Formats a node property value as a string for display in an input.
   * @param {Object} param The parameter definition.
   * @param {*} value The raw value.
   * @return {string} The formatted display string.
   */
  function _roundNum(v) {
    return Number(v.toFixed(2));
  }

  function _formatValueForInput(param, value) {
    if (value === undefined || value === null) {
      if (param.default !== undefined) return String(param.default);
      return '';
    }
    if (param.type === 'color' && Array.isArray(value)) {
      var r = Math.round(Math.max(0, Math.min(1, value[0])) * 255);
      var g = Math.round(Math.max(0, Math.min(1, value[1])) * 255);
      var b = Math.round(Math.max(0, Math.min(1, value[2])) * 255);
      var a = value[3] !== undefined ? value[3] : 1;
      return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
    }
    if ((param.type === 'vector2' || param.type === 'vector3') && Array.isArray(value)) {
      return value.map(_roundNum).join(', ');
    }
    if (param.type === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return _roundNum(value).toString();
    return String(value);
  }

  /**
   * Parses a raw input string back into a typed value.
   * @param {Object} param The parameter definition.
   * @param {string} raw The raw input value.
   * @return {*} The parsed typed value.
   */
  function _parseInputValue(param, raw) {
    if (param.type === 'number') return parseFloat(raw);
    if (param.type === 'boolean') return raw === 'true' || raw === true;
    if (param.type === 'color' || param.type === 'vector2' || param.type === 'vector3') {
      var str = String(raw).replace(/^rgba?\(|\)/g, '');
      var parts = str.split(',');
      var out = [];
      for (var i = 0; i < parts.length; i++) {
        var n = parseFloat(parts[i]);
        out.push(isNaN(n) ? 0 : n);
      }
      if (param.type === 'color' && out.length >= 3) {
        if (out[0] > 1 || out[1] > 1 || out[2] > 1) {
          out[0] = out[0] / 255;
          out[1] = out[1] / 255;
          out[2] = out[2] / 255;
        }
      }
      return out;
    }
    return raw;
  }

  /**
   * Builds a complete view model for the inspector from node data and definition.
   * @param {Object} nodeData The node data object.
   * @param {Object} def The node type definition.
   * @return {Object} The view model with .loading, .name, .state, .groups, etc.
   */
  function _buildViewModel(nodeData, def) {
    var params = _paramList(nodeData, def);
    if (params === null) {
      return {
        loading: true,
        name:    def.label || nodeData.type,
        state:   _stateLabel(nodeData, def),
        groups:  []
      };
    }

    var rows = [];
    for (var i = 0; i < params.length; i++) {
      var param = params[i];
      var key = param.key;
      var row = {
        key:        key,
        label:      param.label || key,
        type:       param.type,
        value:      nodeData.props[key],
        wired:      _isParamWired(nodeData.id, key),
        display:    _formatValueForInput(param, nodeData.props[key]),
        animatable: param.animatable === true,
        keyframed:  typeof keyframeState !== 'undefined' && keyframeState.isParamKeyframed(nodeData.id, key)
      };
      if (param.options) row.options = param.options;
      if (param.enableWhen) {
        var ew = param.enableWhen;
        var ctrlVal = nodeData.props[ew.key];
        row.disabled = (ctrlVal === undefined || ctrlVal === null || ctrlVal != ew.value);
      }
      rows.push(row);
    }

    return {
      loading:          false,
      nodeId:           nodeData.id,
      name:             def.label || nodeData.type,
      state:            _stateLabel(nodeData, def),
      nodeType:         nodeData.type,
      hostingCompUUID:  nodeData.hostingComps && nodeData.hostingComps.length > 0 ? nodeData.hostingComps[0] : null,
      groups:           [{ label: 'Properties', params: rows }]
    };
  }

  /**
   * Converts an RGBA float array to a hex color string (#rrggbb).
   * @param {Array} rgba RGBA float array (0-1).
   * @return {string} Hex color string.
   */
  function _rgbaToHex(rgba) {
    if (!Array.isArray(rgba) || rgba.length < 3) return '#ffffff';
    var r = Math.round(Math.max(0, Math.min(1, rgba[0])) * 255);
    var g = Math.round(Math.max(0, Math.min(1, rgba[1])) * 255);
    var b = Math.round(Math.max(0, Math.min(1, rgba[2])) * 255);
    return '#' + (256 + r).toString(16).slice(1) + (256 + g).toString(16).slice(1) + (256 + b).toString(16).slice(1);
  }

  /**
   * Converts a hex color string (#rrggbb or #rgb) to an RGBA float array.
   * @param {string} hex Hex color string.
   * @param {number} alpha Alpha value (default 1).
   * @return {Array} RGBA float array.
   */
  function _hexToRgba(hex, alpha) {
    if (typeof hex !== 'string') return [1, 1, 1, alpha !== undefined ? alpha : 1];
    if (hex.charAt(0) === '#') hex = hex.slice(1);
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    var r = parseInt(hex.slice(0, 2), 16) / 255;
    var g = parseInt(hex.slice(2, 4), 16) / 255;
    var b = parseInt(hex.slice(4, 6), 16) / 255;
    return [r, g, b, alpha !== undefined ? alpha : 1];
  }

  return {
    isParamWired:     _isParamWired,
    stateLabel:       _stateLabel,
    paramList:        _paramList,
    formatValueForInput: _formatValueForInput,
    parseInputValue:  _parseInputValue,
    buildViewModel:   _buildViewModel,
    rgbaToHex:        _rgbaToHex,
    hexToRgba:        _hexToRgba
  };

})();
