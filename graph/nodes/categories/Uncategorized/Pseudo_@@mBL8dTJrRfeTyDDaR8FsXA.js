/**
 * @file Pseudo/@@mBL8dTJrRfeTyDDaR8FsXA Uncategorized node definition (uncategorized/pseudo-mbl8dtjrrfetyddar8fsxa).
 * An effector that applies the Pseudo/@@mBL8dTJrRfeTyDDaR8FsXA effect to a layer.
 * Ports: mainInput (layer, required), output (layer).
 * Params: dynamic (per AE effect definition).
 * Dispatches: applyDynamicEffect, removeEffect, setEffectProperty.
 */

// graph/nodes/categories/Uncategorized/Pseudo_@@mBL8dTJrRfeTyDDaR8FsXA.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var PseudomBL8dTJrRfeTyDDaR8FsXANode = {
  type:      'uncategorized/pseudo-mbl8dtjrrfetyddar8fsxa',
  label:     'Pseudo/@@mBL8dTJrRfeTyDDaR8FsXA',
  category:  'Uncategorized',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,
  matchName: 'Pseudo/@@mBL8dTJrRfeTyDDaR8FsXA',
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
        matchName:       'Pseudo/@@mBL8dTJrRfeTyDDaR8FsXA',
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
        matchName:       'Pseudo/@@mBL8dTJrRfeTyDDaR8FsXA'
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
        effectMatchName: 'Pseudo/@@mBL8dTJrRfeTyDDaR8FsXA',
        propMatchName:   key,
        value:           value
      }
    };
  }
};

nodeRegistry.register(PseudomBL8dTJrRfeTyDDaR8FsXANode);