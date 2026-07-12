var LightNode = {
  type:      'layers/light',
  label:     'Light',
  category:  'Layers',
  version:   '1.0.0',
  nodeKind:  'affected',
  dedicated: false,

  ports: [
    { id: 'output',    category: 'output', type: 'layer', capacity: 'single' },
    { id: 'child_of',  category: 'parent', role: 'child',  type: 'parent', capacity: 'single'  },
    { id: 'parent_of', category: 'parent', role: 'parent', type: 'parent'  }
  ],

  params: [
    { key: 'label',          type: 'string',  default: 'Light',                            label: 'Label'                       },
    { key: 'lightType',      type: 'enum',    default: 'point',                            label: 'Light Type', options: ['point', 'spot', 'parallel', 'ambient'] },
    { key: 'intensity',      type: 'number',  default: 100,            min: 0, max: 1000,  label: 'Intensity',                   animatable: true },
    { key: 'color',          type: 'color',   default: [1, 1, 1, 1],                      label: 'Color'                       },
    { key: 'coneAngle',      type: 'number',  default: 90,             min: 0, max: 180,   label: 'Cone Angle',                  animatable: true },
    { key: 'coneFeather',    type: 'number',  default: 50,             min: 0, max: 100,   label: 'Cone Feather',                 animatable: true },
    { key: 'castsShadows',   type: 'boolean', default: false,                               label: 'Casts Shadows'               },
    { key: 'shadowDarkness', type: 'number',  default: 100,            min: 0, max: 100,   label: 'Shadow Darkness',              animatable: true },
    { key: 'shadowDiffusion',type: 'number',  default: 0,              min: 0, max: 100,   label: 'Shadow Diffusion',             animatable: true },
    { key: 'position',       type: 'vector3', default: [0, 0, 0],                          label: 'Position',                    animatable: true },
    { key: 'rotation',       type: 'number',  default: 0,                                  label: 'Rotation',                    animatable: true },
    { key: 'opacity',        type: 'number',  default: 100,            min: 0, max: 100,   label: 'Opacity',                     animatable: true }
  ],

  getParams: function(nodeData) {
    return this.params;
  },

  onDrop: function(nodeData) {
    return null;
  },

  onAlive: function(nodeData, hostingCompUUID) {
    return {
      action: 'createLightLayer',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        label:           nodeData.props.label,
        lightType:       nodeData.props.lightType,
        intensity:       nodeData.props.intensity,
        color:           nodeData.props.color,
        coneAngle:       nodeData.props.coneAngle,
        coneFeather:     nodeData.props.coneFeather,
        castsShadows:    nodeData.props.castsShadows,
        shadowDarkness:  nodeData.props.shadowDarkness,
        shadowDiffusion: nodeData.props.shadowDiffusion,
        position:        nodeData.props.position,
        rotation:        nodeData.props.rotation,
        opacity:         nodeData.props.opacity
      }
    };
  },

  onGhost: function(nodeData, hostingCompUUID) {
    return {
      action: 'parkLayer',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID
      }
    };
  },

  onDelete: function(nodeData) {
    return {
      action: 'deleteParkedLayer',
      params: {
        nodeUUID: nodeData.id
      }
    };
  },

  onPropertyChange: function(key, value, nodeData, hostingCompUUID) {
    return {
      action: 'setLayerProperty',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        key:             key,
        value:           value
      }
    };
  }
};

nodeRegistry.register(LightNode);
