/**
 * @file Flower shape node definition (shapes/flower).
 * A parametric flower shape layer with petals, radii, fill, stroke, transform.
 * Ports: output (layer), secondaryInput (data) for each param, child_of/parent_of (parent).
 * Params: label, petals, outerRadius, innerRadius, fill, stroke, position, rotation, scale, opacity.
 * Dispatches: createFlowerLayer, parkLayer, deleteParkedLayer, setLayerProperty.
 */

// graph/nodes/categories/Shapes/Flower.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var FlowerNode = {
  type:     'shapes/flower',
  label:    'Flower',
  category: 'Shapes',
  version:  '1.0.0',
  nodeKind: 'affected',
  dedicated: false,

  ports: [
    { id: 'output',        category: 'output',         type: 'layer', capacity: 'single' },
    { id: 'child_of',      category: 'parent',         role: 'child',  type: 'parent', capacity: 'single' },
    { id: 'parent_of',     category: 'parent',         role: 'parent', type: 'parent' },
    { id: 'petals',        category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Petals' },
    { id: 'outerRadius',   category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Outer Radius' },
    { id: 'innerRadius',   category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Inner Radius' },
    { id: 'fill',          category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Fill' },
    { id: 'stroke',        category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Stroke' },
    { id: 'position',      category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Position' },
    { id: 'rotation',      category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Rotation' },
    { id: 'scale',         category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Scale' },
    { id: 'opacity',       category: 'secondaryInput', type: 'data',   capacity: 'single', label: 'Opacity' }
  ],

  params: [
    { key: 'label',       type: 'string',  default: 'Flower',              label: 'Label' },
    { key: 'petals',      type: 'number',  default: 8,                     label: 'Petals',      min: 3, max: 32,       animatable: true },
    { key: 'outerRadius', type: 'number',  default: 100,                   label: 'Outer Radius', min: 1,                animatable: true },
    { key: 'innerRadius', type: 'number',  default: 40,                    label: 'Inner Radius', min: 1,                animatable: true },
    { key: 'fill',        type: 'color',   default: [1, 1, 1, 1],         label: 'Fill',                               animatable: true },
    { key: 'stroke',      type: 'color',   default: [0, 0, 0, 0],         label: 'Stroke',                             animatable: true },
    { key: 'position',    type: 'vector2', default: [960, 540],            label: 'Position',                           animatable: true },
    { key: 'rotation',    type: 'number',  default: 0,                     label: 'Rotation',                           animatable: true },
    { key: 'scale',       type: 'vector2', default: [100, 100],            label: 'Scale',                              animatable: true },
    { key: 'opacity',     type: 'number',  default: 100,                   label: 'Opacity', min: 0, max: 100,         animatable: true }
  ],

  getParams: function(nodeData) {
    return this.params;
  },

  onDrop: function(nodeData) { return null; },

  onAlive: function(nodeData, hostingCompUUID) {
    return {
      action: 'createFlowerLayer',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        petals:          nodeData.props.petals,
        outerRadius:     nodeData.props.outerRadius,
        innerRadius:     nodeData.props.innerRadius,
        fill:            nodeData.props.fill,
        stroke:          nodeData.props.stroke,
        position:        nodeData.props.position,
        rotation:        nodeData.props.rotation,
        scale:           nodeData.props.scale,
        opacity:         nodeData.props.opacity,
        label:           nodeData.props.label
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
    if (['position', 'rotation', 'scale', 'opacity'].indexOf(key) !== -1) {
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
    return {
      action: 'createFlowerLayer',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        petals:          nodeData.props.petals,
        outerRadius:     nodeData.props.outerRadius,
        innerRadius:     nodeData.props.innerRadius,
        fill:            nodeData.props.fill,
        stroke:          nodeData.props.stroke,
        label:           nodeData.props.label
      }
    };
  },

  onDisable: function(nodeData, hostingCompUUID) {
    if (!hostingCompUUID) return null;
    return {
      action: 'setLayerEnabled',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        enabled:         false
      }
    };
  },

  onEnable: function(nodeData, hostingCompUUID) {
    if (!hostingCompUUID) return null;
    return {
      action: 'setLayerEnabled',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        enabled:         true
      }
    };
  }
};

nodeRegistry.register(FlowerNode);
