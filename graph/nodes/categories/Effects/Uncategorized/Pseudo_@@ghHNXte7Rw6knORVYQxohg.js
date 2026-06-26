/**
 * @file Pseudo/@@ghHNXte7Rw6knORVYQxohg Uncategorized node definition (uncategorized/pseudo-ghhnxte7rw6knorvyqxohg).
 * An effector that applies the Pseudo/@@ghHNXte7Rw6knORVYQxohg effect to a layer.
 * Ports: mainInput (layer, required), output (layer).
 * Params: dynamic (per AE effect definition).
 * Dispatches: applyDynamicEffect, removeEffect, setEffectProperty.
 */

// graph/nodes/categories/Effects/Uncategorized/Pseudo_@@ghHNXte7Rw6knORVYQxohg.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var PseudoghHNXte7Rw6knORVYQxohgNode = {
  type:      'uncategorized/pseudo-ghhnxte7rw6knorvyqxohg',
  label:     'Pseudo/@@ghHNXte7Rw6knORVYQxohg',
  category:  'Uncategorized',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,
  matchName: 'Pseudo/@@ghHNXte7Rw6knORVYQxohg',
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
        matchName:       'Pseudo/@@ghHNXte7Rw6knORVYQxohg',
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
        matchName:       'Pseudo/@@ghHNXte7Rw6knORVYQxohg'
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
        effectMatchName: 'Pseudo/@@ghHNXte7Rw6knORVYQxohg',
        propMatchName:   key,
        value:           value
      }
    };
  }
};

nodeRegistry.register(PseudoghHNXte7Rw6knORVYQxohgNode);
