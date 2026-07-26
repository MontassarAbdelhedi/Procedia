/**
 * graph/import/graphBuilder/helpers.js
 *
 * Shared helpers for the import graph builder.
 * DEPENDS ON: nodeRegistry
 * MUST LOAD BEFORE: graph/import/graphBuilder/build.js
 */
// graph/import/graphBuilder/helpers.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: graph/import/graphBuilder/build.js

var __importGraphInternals = (function() {

  var _START_X = 200;
  var _START_Y = 200;
  var _COL_SPACING = 400;
  var _ROW_SPACING = 250;

  /**
   * Gets a node definition from the registry, returning null if not found.
   */
  function _getDef(type) {
    if (typeof nodeRegistry !== 'undefined' && nodeRegistry.getDefinition) {
      return nodeRegistry.getDefinition(type);
    }
    return null;
  }

  /**
   * Builds initial props with defaults from a node definition's params,
   * then overrides with actual values.
   */
  function _buildProps(def, actualProps) {
    var props = {};
    if (def && def.params && def.params !== 'dynamic' && Array.isArray(def.params)) {
      for (var i = 0; i < def.params.length; i++) {
        var p = def.params[i];
        props[p.key] = p['default'];
      }
    }
    // Override with actual values
    for (var key in actualProps) {
      if (actualProps.hasOwnProperty(key)) {
        props[key] = actualProps[key];
      }
    }
    return props;
  }

  return {
    START_X:     _START_X,
    START_Y:     _START_Y,
    COL_SPACING: _COL_SPACING,
    ROW_SPACING: _ROW_SPACING,
    getDef:      _getDef,
    buildProps:  _buildProps
  };

})();
