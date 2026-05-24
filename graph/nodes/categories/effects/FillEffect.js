// graph/nodes/categories/effects/FillEffect.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: graph/cycleChecker.js

var FillEffectNode = {
  type:      'effects/fill',
  label:     'Fill',
  category:  'Effects',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,

  ports: [
    { id: 'layer_in', category: 'input',  type: 'layer', extendable: true,  required: true  },
    { id: 'output',   category: 'output', type: 'layer', extendable: false }
  ],

  params: [
    { key: 'label',        type: 'string', default: 'Fill',       label: 'Label'                       },
    { key: 'color',        type: 'color',  default: [1, 0, 0, 1], label: 'Color'                       },
    { key: 'opacity',      type: 'number', default: 100,          label: 'Opacity',    min: 0, max: 100 },
    { key: 'blendingMode', type: 'number', default: 0,            label: 'Blend Mode', min: 0, max: 21  }
  ],

  onDrop: function(nodeData) {
    return null;
  },

  onAlive: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'applyEffect',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,
        matchName:       'ADBE Fill',
        props: {
          color:        nodeData.props.color,
          opacity:      nodeData.props.opacity,
          blendingMode: nodeData.props.blendingMode
        }
      }
    };
  },

  onGhost: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'removeEffect',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID
      }
    };
  },

  onDelete: function(nodeData) {
    if (nodeData.state === 'ghost') return null;
    return {
      action: 'removeEffect',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: nodeData.hostingComps[0] || null,
        layerNodeUUID:   null
      }
    };
  },

  onPropertyChange: function(key, value, nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'setEffectProperty',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,
        matchName:       'ADBE Fill',
        key:             key,
        value:           value
      }
    };
  }
};

nodeRegistry.register(FillEffectNode);
