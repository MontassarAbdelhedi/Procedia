/**
 * @file ADBE CM Spin Uncategorized node definition (uncategorized/adbe-cm-spin).
 * An effector that applies the ADBE CM Spin effect to a layer.
 * Ports: mainInput (layer, required), output (layer).
 * Params: dynamic (per AE effect definition).
 * Dispatches: applyDynamicEffect, removeEffect, setEffectProperty.
 */

// graph/nodes/categories/Effects/Uncategorized/ADBE CM Spin.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var ADBECMSpinNode = {
  type:      'uncategorized/adbe-cm-spin',
  label:     'ADBE CM Spin',
  category:  'Uncategorized',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,
  matchName: 'ADBE CM Spin',
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
        matchName:       'ADBE CM Spin',
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
        matchName:       'ADBE CM Spin'
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
        effectMatchName: 'ADBE CM Spin',
        propMatchName:   key,
        value:           value
      }
    };
  }
};

nodeRegistry.register(ADBECMSpinNode);
