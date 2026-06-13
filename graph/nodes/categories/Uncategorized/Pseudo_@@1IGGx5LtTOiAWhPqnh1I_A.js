/**
 * @file Pseudo/@@1IGGx5LtTOiAWhPqnh1I/A Uncategorized node definition (uncategorized/pseudo-1iggx5lttoiawhpqnh1i-a).
 * An effector that applies the Pseudo/@@1IGGx5LtTOiAWhPqnh1I/A effect to a layer.
 * Ports: mainInput (layer, required), output (layer).
 * Params: dynamic (per AE effect definition).
 * Dispatches: applyDynamicEffect, removeEffect, setEffectProperty.
 */

// graph/nodes/categories/Uncategorized/Pseudo_@@1IGGx5LtTOiAWhPqnh1I_A.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var Pseudo1IGGx5LtTOiAWhPqnh1IANode = {
  type:      'uncategorized/pseudo-1iggx5lttoiawhpqnh1i-a',
  label:     'Pseudo/@@1IGGx5LtTOiAWhPqnh1I/A',
  category:  'Uncategorized',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,
  matchName: 'Pseudo/@@1IGGx5LtTOiAWhPqnh1I/A',
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
        matchName:       'Pseudo/@@1IGGx5LtTOiAWhPqnh1I/A',
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
        matchName:       'Pseudo/@@1IGGx5LtTOiAWhPqnh1I/A'
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
        effectMatchName: 'Pseudo/@@1IGGx5LtTOiAWhPqnh1I/A',
        propMatchName:   key,
        value:           value
      }
    };
  }
};

nodeRegistry.register(Pseudo1IGGx5LtTOiAWhPqnh1IANode);