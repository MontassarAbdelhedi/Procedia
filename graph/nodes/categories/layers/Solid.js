/**
 * @file Solid layer node definition (layers/solid).
 * A solid color layer with transform properties and a color.
 * Ports: output (layer), child_of/parent_of (parent).
 * Params: label, position, rotation, opacity, scale, color, width, height.
 * Dispatches: createSolidLayer, parkLayer, deleteParkedLayer, setLayerProperty.
 */

// graph/nodes/categories/Layers/Solid.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var SolidNode = {
  type:     'layers/solid',
  label:    'Solid',
  category: 'Layers',
  version:  '1.0.0',
  nodeKind: 'affected',
  dedicated: true,

  ports: [
    { id: 'output',    category: 'output', type: 'layer', capacity: 'single' },
    { id: 'child_of',  category: 'parent', role: 'child',  type: 'parent', capacity: 'single'  },
    { id: 'parent_of', category: 'parent', role: 'parent', type: 'parent'  }
  ],

  params: [
    { key: 'label',    type: 'string',  default: 'Solid',           label: 'Label'                       },
    { key: 'position', type: 'vector2', default: [0, 0],            label: 'Position',                    animatable: true },
    { key: 'rotation', type: 'number',  default: 0,                 label: 'Rotation',                    animatable: true },
    { key: 'opacity',  type: 'number',  default: 100,               label: 'Opacity',  min: 0, max: 100,  animatable: true },
    { key: 'scale',    type: 'vector2', default: [100, 100],        label: 'Scale',                       animatable: true },
    { key: 'color',    type: 'color',   default: [0.5, 0.5, 0.5, 1], label: 'Color',                    animatable: true },
    { key: 'width',    type: 'number',  default: 1920,              label: 'Width',   min: 1             },
    { key: 'height',   type: 'number',  default: 1080,              label: 'Height',  min: 1             }
  ],

  getParams: function(nodeData) {
    return this.params;
  },

  /** @return {null} No AE action on initial drop — layer is created onAlive. */
  onDrop: function(nodeData) { return null; },

  /**
   * Creates the solid layer in the hosting composition.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @return {Object} Action to create a solid layer in AE.
   */
  onAlive: function(nodeData, hostingCompUUID) {
    return {
      action: 'createSolidLayer',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        position:        nodeData.props.position,
        rotation:        nodeData.props.rotation,
        opacity:         nodeData.props.opacity,
        scale:           nodeData.props.scale,
        color:           nodeData.props.color,
        width:           nodeData.props.width,
        height:          nodeData.props.height,
        label:           nodeData.props.label
      }
    };
  },

  /**
   * Parks (removes from comp but retains) the solid layer.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @return {Object} Action to park a layer in AE.
   */
  onGhost: function(nodeData, hostingCompUUID) {
    return {
      action: 'parkLayer',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID
      }
    };
  },

  /**
   * Deletes the previously parked solid layer.
   * @param {Object} nodeData - The full node data object.
   * @return {Object} Action to delete a parked layer in AE.
   */
  onDelete: function(nodeData) {
    return {
      action: 'deleteParkedLayer',
      params: {
        nodeUUID: nodeData.id
      }
    };
  },

  /**
   * Updates a property on the solid layer in AE.
   * @param {string} key - The property key to update.
   * @param {*} value - The new property value.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @return {Object} Action to set a layer property in AE.
   */
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

nodeRegistry.register(SolidNode);
