/**
 * @file Comp node definition (core/comp).
 * Represents a composition (comp) – the top-level container for layers.
 * Ports: mainInput (layer, infinite), output (layer), child_of/parent_of (parent).
 * Params: label, width, height, frameRate, duration.
 * Dispatches: createComp, deleteComp, setCompProperty.
 */

// graph/nodes/categories/core/Comp.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var CompNode = {
  type:     'core/comp',
  label:    'Comp',
  category: 'Core',
  version:  '1.0.0',
  nodeKind: 'affected',
  dedicated: true,

  ports: [
    { id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'infinite' },
    { id: 'output',    category: 'output',    type: 'layer', capacity: 'single' },
    { id: 'child_of',  category: 'parent',    role: 'child',  type: 'parent', capacity: 'single'  },
    { id: 'parent_of', category: 'parent',    role: 'parent', type: 'parent'  }
  ],

  params: [
    { key: 'label',     type: 'string', default: 'Comp', label: 'Label' },
    { key: 'width',     type: 'number', default: 1920,   label: 'Width',  min: 4, max: 16384 },
    { key: 'height',    type: 'number', default: 1080,   label: 'Height', min: 4, max: 16384 },
    { key: 'frameRate', type: 'number', default: 30,     label: 'Frame Rate', min: 1, max: 999 },
    { key: 'duration',  type: 'number', default: 10,     label: 'Duration (s)', min: 0.1, max: 3600 },
  ],

  getParams: function(nodeData) {
    return this.params;
  },

  /** @return {Object} Action to create a new composition in the AE project. */
  onDrop: function(nodeData) {
    return {
      action: 'createComp',
      params: {
        nodeUUID:  nodeData.id,
        label:     nodeData.props.label,
        width:     nodeData.props.width,
        height:    nodeData.props.height,
        frameRate: nodeData.props.frameRate,
        duration:  nodeData.props.duration,
      }
    };
  },

  /** @return {Object} Action to delete the composition identified by node UUID. */
  onDelete: function(nodeData) {
    return {
      action: 'deleteComp',
      params: {
        nodeUUID: nodeData.id
      }
    };
  },

  /**
   * Re-creates the composition in AE after an external deletion.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - Unused for comps (comps are self-hosting).
   * @return {Object} Action to create a new composition in the AE project.
   */
  onAlive: function(nodeData, hostingCompUUID) {
    if (hostingCompUUID) {
      return {
        action: 'addCompAsLayer',
        params: {
          nodeUUID:        nodeData.id,
          hostingCompUUID: hostingCompUUID
        }
      };
    }
    return {
      action: 'createComp',
      params: {
        nodeUUID:  nodeData.id,
        label:     nodeData.props.label,
        width:     nodeData.props.width,
        height:    nodeData.props.height,
        frameRate: nodeData.props.frameRate,
        duration:  nodeData.props.duration,
      }
    };
  },

  /**
   * @param {string} key - The property key that changed.
   * @param {*} value - The new property value.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @return {Object} Action to update a composition property in AE.
   */
  onPropertyChange: function(key, value, nodeData, hostingCompUUID) {
    return {
      action: 'setCompProperty',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        key:             key,
        value:           value
      }
    };
  },

  /**
   * When a comp is disabled, hide its layer in the hosting comp (if nested).
   * @param {Object} nodeData
   * @param {string} hostingCompUUID
   * @return {Object|null} Action to disable the layer, or null if root comp.
   */
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

  /**
   * When a comp is re-enabled, show its layer in the hosting comp (if nested).
   * @param {Object} nodeData
   * @param {string} hostingCompUUID
   * @return {Object|null} Action to enable the layer, or null if root comp.
   */
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

nodeRegistry.register(CompNode);
