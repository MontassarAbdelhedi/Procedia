/**
 * @file Pseudo/@@q15F38pIS32soS8QmMCQ0Q Uncategorized node definition (uncategorized/pseudo-q15f38pis32sos8qmmcq0q).
 * An effector that applies the Pseudo/@@q15F38pIS32soS8QmMCQ0Q effect to a layer.
 * Ports: mainInput (layer, required), output (layer).
 * Params: dynamic (per AE effect definition).
 * Dispatches: applyDynamicEffect, removeEffect, setEffectProperty.
 */

// graph/nodes/categories/Effects/Uncategorized/Pseudo_@@q15F38pIS32soS8QmMCQ0Q.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var Pseudoq15F38pIS32soS8QmMCQ0QNode = {
  type:      'uncategorized/pseudo-q15f38pis32sos8qmmcq0q',
  label:     'Pseudo/@@q15F38pIS32soS8QmMCQ0Q',
  category:  'Uncategorized',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,
  matchName: 'Pseudo/@@q15F38pIS32soS8QmMCQ0Q',
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
        matchName:       'Pseudo/@@q15F38pIS32soS8QmMCQ0Q',
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
        matchName:       'Pseudo/@@q15F38pIS32soS8QmMCQ0Q'
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
        effectMatchName: 'Pseudo/@@q15F38pIS32soS8QmMCQ0Q',
        propMatchName:   key,
        value:           value
      }
    };
  }
};

nodeRegistry.register(Pseudoq15F38pIS32soS8QmMCQ0QNode);
