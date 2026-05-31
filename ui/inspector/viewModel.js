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
   * Extracts the parameter list from a node's definition or dynamic schema.
   * @param {Object} nodeData The node data.
   * @param {Object} def The node definition.
   * @return {Array|null} Array of param objects, or null if loading.
   */
  function _paramList(nodeData, def) {
    if (def.params === 'dynamic') {
      if (!nodeData.dynamicSchema || !nodeData.dynamicSchema.properties) return null;
      var dyn = [];
      var props = nodeData.dynamicSchema.properties;
      for (var i = 0; i < props.length; i++) {
        dyn.push({
          key:   props[i].matchName,
          label: props[i].label || props[i].matchName,
          type:  props[i].type
        });
      }
      return dyn;
    }
    if (!def.params || !def.params.length) return [];
    var list = [];
    for (var j = 0; j < def.params.length; j++) {
      list.push(def.params[j]);
    }
    return list;
  }

  /**
   * Formats a node property value as a string for display in an input.
   * @param {Object} param The parameter definition.
   * @param {*} value The raw value.
   * @return {string} The formatted display string.
   */
  function _formatValueForInput(param, value) {
    if (value === undefined || value === null) {
      if (param.default !== undefined) return String(param.default);
      return '';
    }
    if (param.type === 'color' && Array.isArray(value)) {
      return value.join(', ');
    }
    if ((param.type === 'vector2' || param.type === 'vector3') && Array.isArray(value)) {
      return value.join(', ');
    }
    if (param.type === 'boolean') return value ? 'true' : 'false';
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
      var parts = String(raw).split(',');
      var out = [];
      for (var i = 0; i < parts.length; i++) {
        var n = parseFloat(parts[i]);
        out.push(isNaN(n) ? 0 : n);
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
      rows.push({
        key:     key,
        label:   param.label || key,
        type:    param.type,
        value:   nodeData.props[key],
        wired:   _isParamWired(nodeData.id, key),
        display: _formatValueForInput(param, nodeData.props[key])
      });
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

  return {
    isParamWired:     _isParamWired,
    stateLabel:       _stateLabel,
    paramList:        _paramList,
    formatValueForInput: _formatValueForInput,
    parseInputValue:  _parseInputValue,
    buildViewModel:   _buildViewModel
  };

})();
