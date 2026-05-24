// graph/nodes/categories/effects/GaussianBlur.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: graph/cycleChecker.js

var GaussianBlurNode = {
  type:      'effects/gaussian-blur',
  label:     'Gaussian Blur',
  category:  'Effects',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,

  ports: [
    { id: 'layer_in', category: 'input',  type: 'layer', extendable: true,  required: true  },
    { id: 'output',   category: 'output', type: 'layer', extendable: false }
  ],

  params: [
    { key: 'label',            type: 'string', default: 'Gaussian Blur', label: 'Label'                          },
    { key: 'blurriness',       type: 'number', default: 10,              label: 'Blurriness',  min: 0, max: 1000 },
    { key: 'blurDimensions',   type: 'number', default: 1,               label: 'Dimensions',  min: 1, max: 3    },
    { key: 'repeatEdgePixels', type: 'number', default: 0,               label: 'Repeat Edge', min: 0, max: 1    }
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
        matchName:       'ADBE Gaussian Blur 2',
        props: {
          blurriness:       nodeData.props.blurriness,
          blurDimensions:   nodeData.props.blurDimensions,
          repeatEdgePixels: nodeData.props.repeatEdgePixels
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
        matchName:       'ADBE Gaussian Blur 2',
        key:             key,
        value:           value
      }
    };
  }
};

nodeRegistry.register(GaussianBlurNode);
