/**
 * Capability/entitlement gate for version-control features.
 * Centralized module — core versioning code never checks plan names directly.
 * UI and command entry points gate access through this module.
 * @module capabilities
 * @dependencies (none)
 */
// versioning/capabilities.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: ui/versioning/*

var capabilities = (function() {

  /**
   * Feature availability map. In production, this would be configured
   * from a license service. For now, version-control is available to all.
   */
  var _features = {
    'version-control': true,
    'version-control-branches': true,
    'version-control-merge': true,
    'version-control-history': true
  };

  /**
   * Checks whether a named feature/capability is available.
   * @param {string} featureName
   * @returns {boolean}
   */
  function canUse(featureName) {
    return _features[featureName] === true;
  }

  /**
   * Returns the full feature map.
   * @returns {Object}
   */
  function getAllFeatures() {
    return _features;
  }

  return {
    canUse: canUse,
    getAllFeatures: getAllFeatures
  };

})();
