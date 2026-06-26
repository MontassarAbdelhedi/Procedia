/**
 * @file Pseudo/@@2hZuoGrWQN+dsjuooGXnsg Uncategorized node definition (uncategorized/pseudo-2hzuogrwqndsjuoogxnsg).
 * An effector that applies the Pseudo/@@2hZuoGrWQN+dsjuooGXnsg effect to a layer.
 * Ports: mainInput (layer, required), output (layer).
 * Params: dynamic (per AE effect definition).
 * Dispatches: applyDynamicEffect, removeEffect, setEffectProperty.
 */

// graph/nodes/categories/Effects/Uncategorized/Pseudo_@@2hZuoGrWQN+dsjuooGXnsg.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var Pseudo2hZuoGrWQNdsjuooGXnsgNode = {
  type:      'uncategorized/pseudo-2hzuogrwqndsjuoogxnsg',
  label:     'Pseudo/@@2hZuoGrWQN+dsjuooGXnsg',
  category:  'Uncategorized',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,
  matchName: 'Pseudo/@@2hZuoGrWQN+dsjuooGXnsg',
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
        matchName:       'Pseudo/@@2hZuoGrWQN+dsjuooGXnsg',
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
        matchName:       'Pseudo/@@2hZuoGrWQN+dsjuooGXnsg'
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
        effectMatchName: 'Pseudo/@@2hZuoGrWQN+dsjuooGXnsg',
        propMatchName:   key,
        value:           value
      }
    };
  }
};

nodeRegistry.register(Pseudo2hZuoGrWQNdsjuooGXnsgNode);
