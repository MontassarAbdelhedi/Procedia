/**
 * graph/autoLayout/estimateHeight.js
 *
 * Node height estimation helpers.
 * DEPENDS ON: nodeRegistry, autoLayoutInternals (constants)
 */
(function() {
  var C = autoLayoutInternals;

  function _estimateNodeHeight(nodeData) {
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def) return 120;

    var h = C.HEADER_H;

    if (def.params === 'dynamic') {
      if (nodeData.dynamicSchema && nodeData.dynamicSchema.properties) {
        h += nodeData.dynamicSchema.properties.length * C.PARAM_H;
      } else {
        h += C.PARAM_H;
      }
    } else if (def.params) {
      h += def.params.length * C.PARAM_H;
    }

    for (var i = 0; i < def.ports.length; i++) {
      if (def.ports[i].category === 'output') { h += C.OUTPUT_H; break; }
    }
    for (var j = 0; j < def.ports.length; j++) {
      if (def.ports[j].id === 'child_of') h += C.PARENT_H;
      if (def.ports[j].id === 'parent_of') h += C.PARENT_H;
    }

    return h + C.PAD;
  }

  function _getNodeHeight(nodeId, nodeData) {
    if (typeof renderer !== 'undefined' && renderer.getNodeElement) {
      var el = renderer.getNodeElement(nodeId);
      if (el) return el.offsetHeight;
    }
    return _estimateNodeHeight(nodeData);
  }

  C._estimateNodeHeight = _estimateNodeHeight;
  C._getNodeHeight = _getNodeHeight;
})();
