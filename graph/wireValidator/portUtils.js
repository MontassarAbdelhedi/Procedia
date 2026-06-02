/**
 * Port lookup and category validation utilities for wire connection checking.
 * @module wireValidator/portUtils
 * @dependencies (none)
 * @exports __wv._findPortDef, __wv._isValidFromCategory, __wv._isValidToCategory
 */
// graph/wireValidator/portUtils.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: graph/wireValidator/canConnect.js, graph/wireValidator/matteValidator.js,
//                   graph/wireValidator/filterPickerList.js, graph/wireValidator/index.js

(function() {
  var wv = window.__wv = window.__wv || {};

  /**
   * Looks up a port definition by ID, first from the node type definition,
   * then from the node's secondaryPorts.
   * @param {Object} def - Node type definition (may have ports array)
   * @param {Object} nodeData - Runtime node data (may have secondaryPorts)
   * @param {string} portId - Port identifier to find
   * @returns {Object|null} The port definition, or null if not found
   */
  wv._findPortDef = function(def, nodeData, portId) {
    if (def && def.ports) {
      for (var i = 0; i < def.ports.length; i++) {
        if (def.ports[i].id === portId) return def.ports[i];
      }
    }
    if (nodeData && nodeData.secondaryPorts) {
      for (var s = 0; s < nodeData.secondaryPorts.length; s++) {
        if (nodeData.secondaryPorts[s].id === portId) return nodeData.secondaryPorts[s];
      }
    }
    return null;
  };

  /**
   * Checks whether a port category is valid as a wire source.
   * @param {string} category - Port category string
   * @returns {boolean} True if category is 'output' or 'parent'
   */
  wv._isValidFromCategory = function(category) {
    return category === 'output' || category === 'parent';
  };

  /**
   * Checks whether a port category is valid as a wire target.
   * @param {string} category - Port category string
   * @returns {boolean} True if category is 'mainInput', 'secondaryInput', or 'parent'
   */
  wv._isValidToCategory = function(category) {
    return category === 'mainInput' || category === 'secondaryInput' || category === 'parent';
  };
})();
