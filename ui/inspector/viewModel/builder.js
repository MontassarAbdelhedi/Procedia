/**
 * @fileoverview Inspector view model builder. Transforms raw node data and
 * node definition into a structured view model for the inspector renderer.
 * Depends on: graphState, nodeRegistry, __ins_vm_wire, __ins_vm_fmt (globals).
 * Exports: __ins_vm_builder.stateLabel, .paramList, .buildViewModel
 */
// ui/inspector/viewModel/builder.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js,
//             ui/inspector/viewModel/wiring.js, ui/inspector/viewModel/format.js
// MUST LOAD BEFORE: ui/inspector/index.js

var __ins_vm_builder = (function() {

  /**
   * Builds a combined state label (e.g. "alive · comp").
   * @param {Object} nodeData The node data.
   * @param {Object} def The node definition.
   * @return {string} The state label string.
   */
  function stateLabel(nodeData, def) {
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
  function paramList(nodeData, def) {
    if (typeof def.getParams === 'function') {
      return def.getParams(nodeData);
    }
    return null;
  }

  /**
   * Builds a complete view model for the inspector from node data and definition.
   * @param {Object} nodeData The node data object.
   * @param {Object} def The node type definition.
   * @return {Object} The view model with .loading, .name, .state, .groups, etc.
   */
  function buildViewModel(nodeData, def) {
    var params = paramList(nodeData, def);
    if (params === null) {
      return {
        loading: true,
        name:    def.label || nodeData.type,
        state:   stateLabel(nodeData, def),
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
        wired:      __ins_vm_wire.isParamWired(nodeData.id, key),
        display:    __ins_vm_fmt.formatValueForInput(param, nodeData.props[key]),
        animatable: param.animatable === true,
        keyframed:  typeof keyframeState !== 'undefined' && keyframeState.isParamKeyframed(nodeData.id, key)
      };
      if (param.options) row.options = param.options;
      row.disabled = param.disabled === true;
      if (param.enableWhen) {
        var ew = param.enableWhen;
        var ctrlVal = nodeData.props[ew.key];
        row.disabled = row.disabled || (ctrlVal === undefined || ctrlVal === null || ctrlVal != ew.value);
      }
      rows.push(row);
    }

    return {
      loading:          false,
      nodeId:           nodeData.id,
      name:             def.label || nodeData.type,
      state:            stateLabel(nodeData, def),
      nodeType:         nodeData.type,
      hostingCompUUID:  nodeData.hostingComps && nodeData.hostingComps.length > 0 ? nodeData.hostingComps[0] : null,
      groups:           [{ label: 'Properties', params: rows }]
    };
  }

  return {
    stateLabel:     stateLabel,
    paramList:      paramList,
    buildViewModel: buildViewModel
  };

})();
