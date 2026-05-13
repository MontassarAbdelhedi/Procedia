var nodeRegistry = (function() {

  var registry = {};

  var CATEGORY_COLORS = {
    'Core':       '#5b8dd9',
    'Layers':     '#7ec98f',
    'Effects':    '#d4a04a',
    'Generators': '#7ec98f',
    'Utility':    '#b07ed4',
    'Special':    '#d46e6e'
  };

  function getCategoryColor(category) {
    return CATEGORY_COLORS[category] || '#888888';
  }

  // ── Registration ─────────────────────────────────────────────────

  function register(def) {
    if (!def || !def.type) {
      console.warn('[Registry] register() called with invalid definition — missing type');
      return;
    }
    if (registry[def.type]) {
      console.warn('[Registry] Duplicate node type: "' + def.type + '" — skipping');
      return;
    }
    registry[def.type] = def;
  }

  // ── Public API ───────────────────────────────────────────────────

  function getDefinition(type) {
    return registry[type] || null;
  }

  function getAllDefinitions() {
    return registry;
  }

  function getByCategory(category) {
    var result = [];
    for (var t in registry) {
      if (registry.hasOwnProperty(t) && registry[t].category === category) {
        result.push(registry[t]);
      }
    }
    return result;
  }

  function listTypes() {
    var types = [];
    for (var t in registry) {
      if (registry.hasOwnProperty(t)) types.push(t);
    }
    return types;
  }

  // ── Backward-compat aliases (used by index.js drag logic) ────────

  function getByType(type) {
    return getDefinition(type);
  }

  function getAll() {
    var arr = [];
    for (var t in registry) {
      if (registry.hasOwnProperty(t)) arr.push(registry[t]);
    }
    return arr;
  }

  return {
    register:         register,
    getDefinition:    getDefinition,
    getAllDefinitions: getAllDefinitions,
    getByCategory:    getByCategory,
    listTypes:        listTypes,
    getByType:        getByType,
    getAll:           getAll,
    getCategoryColor: getCategoryColor
  };

}());
