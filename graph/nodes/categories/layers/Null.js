/**
 * @file Null layer node definition (layers/null).
 * A null object layer used as a parent/controller for other layers.
 * Ports: output (layer), child_of/parent_of (parent).
 * Params: label, position, rotation, opacity, scale.
 * Dispatches: createNullLayer, parkLayer, deleteParkedLayer, setLayerProperty.
 */

// graph/nodes/categories/layers/Null.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var NullNode = {
  type:     'layers/null',
  label:    'Null',
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
    { key: 'label',    type: 'string',  default: 'Null',      label: 'Label'                       },
    { key: 'position', type: 'vector2', default: [0, 0],      label: 'Position'                    },
    { key: 'rotation', type: 'number',  default: 0,           label: 'Rotation'                    },
    { key: 'opacity',  type: 'number',  default: 100,         label: 'Opacity',  min: 0, max: 100  },
    { key: 'scale',    type: 'vector2', default: [100, 100],  label: 'Scale'                       }
  ],

  getParams: function(nodeData) {
    return this.params;
  },

  /** @return {null} No AE action on initial drop — layer is created onAlive. */
  onDrop: function(nodeData) {
    return null;
  },

  /**
   * Creates the null layer in the hosting composition.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @return {Object} Action to create a null layer in AE.
   */
  onAlive: function(nodeData, hostingCompUUID) {
    return {
      action: 'createNullLayer',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        position:        nodeData.props.position,
        rotation:        nodeData.props.rotation,
        opacity:         nodeData.props.opacity,
        scale:           nodeData.props.scale,
        label:           nodeData.props.label
      }
    };
  },

  /**
   * Parks (removes from comp but retains) the null layer.
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
   * Deletes the previously parked null layer.
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
   * Updates a property on the null layer in AE.
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

nodeRegistry.register(NullNode);
