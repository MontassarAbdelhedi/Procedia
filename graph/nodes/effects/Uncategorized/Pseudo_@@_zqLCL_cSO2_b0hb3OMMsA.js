/**
 * @file Pseudo/@@/zqLCL/cSO2/b0hb3OMMsA Uncategorized node definition (uncategorized/pseudo-zqlcl-cso2-b0hb3ommsa).
 * An effector that applies the Pseudo/@@/zqLCL/cSO2/b0hb3OMMsA effect to a layer.
 * Ports: mainInput (layer, required), output (layer).
 * Params: dynamic (per AE effect definition).
 * Dispatches: applyDynamicEffect, removeEffect, setEffectProperty.
 */

// graph/nodes/effects/Uncategorized/Pseudo_@@_zqLCL_cSO2_b0hb3OMMsA.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var PseudozqLCLcSO2b0hb3OMMsANode = {
  type:      'uncategorized/pseudo-zqlcl-cso2-b0hb3ommsa',
  label:     'Pseudo/@@/zqLCL/cSO2/b0hb3OMMsA',
  category:  'Uncategorized',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,
  matchName: 'Pseudo/@@/zqLCL/cSO2/b0hb3OMMsA',
  params:    'dynamic',

  ports: [
    { id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true },
    { id: 'output',     category: 'output',    type: 'layer', capacity: 'single' }
  ],

  getParams: function(nodeData) {
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
  },

  onDrop: function(nodeData) { return null; },

  onAlive: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'applyDynamicEffect',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,
        matchName:       'Pseudo/@@/zqLCL/cSO2/b0hb3OMMsA',
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
        matchName:       'Pseudo/@@/zqLCL/cSO2/b0hb3OMMsA'
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
        effectMatchName: 'Pseudo/@@/zqLCL/cSO2/b0hb3OMMsA',
        propMatchName:   key,
        value:           value
      }
    };
  }
};

nodeRegistry.register(PseudozqLCLcSO2b0hb3OMMsANode);