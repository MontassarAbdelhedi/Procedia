/**
 * @file Shape layer node definition (layers/shape).
 * A shape layer with transform properties and a fill color.
 * Ports: output (layer), child_of/parent_of (parent).
 * Params: label, position, rotation, opacity, scale, fillColor.
 * Dispatches: createShapeLayer, parkLayer, deleteParkedLayer, setLayerProperty.
 */

// graph/nodes/categories/Layers/Shape.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var ShapeNode = {
  type:     'layers/shape',
  label:    'Shape',
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
    { key: 'label',    type: 'string',  default: 'Shape',            label: 'Label'                       },
    { key: 'position', type: 'vector2', default: [0, 0],            label: 'Position'                    },
    { key: 'rotation', type: 'number',  default: 0,                 label: 'Rotation'                    },
    { key: 'opacity',  type: 'number',  default: 100,               label: 'Opacity',  min: 0, max: 100  },
    { key: 'scale',    type: 'vector2', default: [100, 100],        label: 'Scale'                       },
    { key: 'fillColor',type: 'color',   default: [1, 0, 1, 1],     label: 'Fill Color'                  }
  ],

  getParams: function(nodeData) {
    return this.params;
  },

  /** @return {null} No AE action on initial drop — layer is created onAlive. */
  onDrop: function(nodeData) { return null; },

  /**
   * Creates the shape layer in the hosting composition.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @return {Object} Action to create a shape layer in AE.
   */
  onAlive: function(nodeData, hostingCompUUID) {
    return {
      action: 'createShapeLayer',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        position:        nodeData.props.position,
        rotation:        nodeData.props.rotation,
        opacity:         nodeData.props.opacity,
        scale:           nodeData.props.scale,
        fillColor:       nodeData.props.fillColor,
        label:           nodeData.props.label
      }
    };
  },

  /**
   * Parks (removes from comp but retains) the shape layer.
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
   * Deletes the previously parked shape layer.
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
   * Updates a property on the shape layer in AE.
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

nodeRegistry.register(ShapeNode);
