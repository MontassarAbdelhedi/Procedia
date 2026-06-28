/**
 * @file Fill Generate node definition (generate/fill).
 * An effector that applies the ADBE Fill effect to a layer.
 * Ports: mainInput (layer, required), output (layer).
 * Params: dynamic (per AE effect definition).
 * Dispatches: applyDynamicEffect, removeEffect, setEffectProperty.
 * Mask query: fillMaskKey is exposed for external mask-refresh triggers.
 */

// graph/nodes/categories/Effects/Generate/Fill.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var FillNode = {
  type:      'generate/fill',
  label:     'Fill',
  category:  'Generate',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,
  matchName: 'ADBE Fill',
  params:    'dynamic',

  // The matchName for Fill Mask property — used by mask-refresh logic
  fillMaskKey: 'ADBE Fill-0001',

  ports: [
    { id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true },
    { id: 'output',     category: 'output',    type: 'layer', capacity: 'single' }
  ],

  getParams: function(nodeData) {
    if (!nodeData.dynamicSchema || !nodeData.dynamicSchema.properties) return null;
    var dyn = [];
    var props = nodeData.dynamicSchema.properties;
    var maskNames = nodeData._maskNames;
    for (var i = 0; i < props.length; i++) {
      var p = props[i];
      var param = {
        key:   p.matchName,
        label: p.label || p.matchName,
        type:  p.type
      };
      if (p.options) param.options = p.options;
      if (p.enableWhen) param.enableWhen = p.enableWhen;
      if (param.key === this.fillMaskKey && maskNames) {
        param.options = maskNames.slice();
        param.options.unshift('None');
      }
      dyn.push(param);
    }
    return dyn;
  },

  onDrop: function(nodeData) { return null; },

  onAlive: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'applyDynamicEffect',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,
        matchName:       'ADBE Fill',
        props:           nodeData.props
      }
    };
  },

  onGhost: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'removeEffect',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,
        matchName:       'ADBE Fill'
      }
    };
  },

  onDelete: function(nodeData) { return null; },

  onPropertyChange: function(key, value, nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'setEffectProperty',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,
        effectMatchName: 'ADBE Fill',
        propMatchName:   key,
        value:           value
      }
    };
  }
};

nodeRegistry.register(FillNode);
