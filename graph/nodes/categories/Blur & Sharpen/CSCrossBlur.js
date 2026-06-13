/**
 * @file CS CrossBlur blur node definition (blur-sharpen/cs-cross-blur).
 * An effector that applies the CS CrossBlur effect to a layer.
 * Ports: mainInput (layer, required), output (layer).
 * Params: dynamic (per AE effect definition).
 * Dispatches: applyDynamicEffect, removeEffect, setEffectProperty.
 */

// graph/nodes/categories/Blur & Sharpen/CSCrossBlur.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

var CSCrossBlurNode = {
  type:      'blur-sharpen/cs-cross-blur',
  label:     'CS CrossBlur',
  category:  'Blur & Sharpen',
  version:   '1.0.0',
  nodeKind:  'effector',
  dedicated: false,
  matchName: 'CS CrossBlur',
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

  /** @return {null} No AE action on initial drop — effect is applied onAlive. */
  onDrop: function(nodeData) { return null; },

  /**
   * Applies the CS CrossBlur effect to the upstream layer.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @param {string} upstreamNodeUUID - UUID of the layer to apply the effect to.
   * @return {Object} Action to apply a dynamic effect in AE.
   */
  onAlive: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'applyDynamicEffect',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,
        matchName:       'CS CrossBlur',
        props:           nodeData.props
      }
    };
  },

  /**
   * Removes the CS CrossBlur effect from the upstream layer.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @param {string} upstreamNodeUUID - UUID of the layer to remove the effect from.
   * @return {Object} Action to remove an effect in AE.
   */
  onGhost: function(nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'removeEffect',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,
        matchName:       'CS CrossBlur'
      }
    };
  },

  /** @return {null} No AE action on delete — effect is removed via onGhost first. */
  onDelete: function(nodeData) { return null; },

  /**
   * Updates a single property on the CS CrossBlur effect in AE.
   * @param {string} key - The AE effect property match name.
   * @param {*} value - The new value for the property.
   * @param {Object} nodeData - The full node data object.
   * @param {string} hostingCompUUID - UUID of the hosting composition.
   * @param {string} upstreamNodeUUID - UUID of the layer owning the effect.
   * @return {Object} Action to set an effect property in AE.
   */
  onPropertyChange: function(key, value, nodeData, hostingCompUUID, upstreamNodeUUID) {
    return {
      action: 'setEffectProperty',
      params: {
        nodeUUID:        nodeData.id,
        hostingCompUUID: hostingCompUUID,
        layerNodeUUID:   upstreamNodeUUID,
        effectMatchName: 'CS CrossBlur',
        propMatchName:   key,
        value:           value
      }
    };
  }
};

nodeRegistry.register(CSCrossBlurNode);
