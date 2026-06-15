/**
 * @file Pseudo/@@EeRiMJ7dQESJSVWkVSXqoQ Uncategorized node definition (uncategorized/pseudo-eerimj7dqesjsvwkvsxqoq).
 * An effector that applies the Pseudo/@@EeRiMJ7dQESJSVWkVSXqoQ effect to a layer.
 * Ports: mainInput (layer, required), output (layer).
 * Params: dynamic (per AE effect definition).
 * Dispatches: applyDynamicEffect, removeEffect, setEffectProperty.
 */

// graph/nodes/effects/Uncategorized/Pseudo_@@EeRiMJ7dQESJSVWkVSXqoQ.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var PseudoEeRiMJ7dQESJSVWkVSXqoQNode = {
  type:      'uncategorized/pseudo-eerimj7dqesjsvwkvsxqoq',
  label:     'Pseudo/@@EeRiMJ7dQESJSVWkVSXqoQ',
  category:  'Uncategorized',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,
  matchName: 'Pseudo/@@EeRiMJ7dQESJSVWkVSXqoQ',
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
        matchName:       'Pseudo/@@EeRiMJ7dQESJSVWkVSXqoQ',
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
        matchName:       'Pseudo/@@EeRiMJ7dQESJSVWkVSXqoQ'
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
        effectMatchName: 'Pseudo/@@EeRiMJ7dQESJSVWkVSXqoQ',
        propMatchName:   key,
        value:           value
      }
    };
  }
};

nodeRegistry.register(PseudoEeRiMJ7dQESJSVWkVSXqoQNode);