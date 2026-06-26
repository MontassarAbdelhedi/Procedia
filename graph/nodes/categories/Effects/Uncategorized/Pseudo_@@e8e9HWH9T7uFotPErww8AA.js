/**
 * @file Pseudo/@@e8e9HWH9T7uFotPErww8AA Uncategorized node definition (uncategorized/pseudo-e8e9hwh9t7ufotperww8aa).
 * An effector that applies the Pseudo/@@e8e9HWH9T7uFotPErww8AA effect to a layer.
 * Ports: mainInput (layer, required), output (layer).
 * Params: dynamic (per AE effect definition).
 * Dispatches: applyDynamicEffect, removeEffect, setEffectProperty.
 */

// graph/nodes/categories/Effects/Uncategorized/Pseudo_@@e8e9HWH9T7uFotPErww8AA.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var Pseudoe8e9HWH9T7uFotPErww8AANode = {
  type:      'uncategorized/pseudo-e8e9hwh9t7ufotperww8aa',
  label:     'Pseudo/@@e8e9HWH9T7uFotPErww8AA',
  category:  'Uncategorized',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,
  matchName: 'Pseudo/@@e8e9HWH9T7uFotPErww8AA',
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
        matchName:       'Pseudo/@@e8e9HWH9T7uFotPErww8AA',
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
        matchName:       'Pseudo/@@e8e9HWH9T7uFotPErww8AA'
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
        effectMatchName: 'Pseudo/@@e8e9HWH9T7uFotPErww8AA',
        propMatchName:   key,
        value:           value
      }
    };
  }
};

nodeRegistry.register(Pseudoe8e9HWH9T7uFotPErww8AANode);
