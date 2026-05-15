// graph/nodes/nodeRegistry.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: graph/nodes/categories/**, graph/nodes/node.js

var nodeRegistry = (function() {

  var registry = {};

  var CATEGORY_COLORS = {
    'core':       '#5b8dd9',
    'Core':       '#5b8dd9',
    'layers':     '#7ec98f',
    'Layers':     '#7ec98f',
    'effects':    '#d4a04a',
    'Effects':    '#d4a04a',
    'generators': '#7ec98f',
    'Generators': '#7ec98f',
    'utility':    '#b07ed4',
    'Utility':    '#b07ed4',
    'Special':    '#d46e6e'
  };

  function getCategoryColor(category) {
    return CATEGORY_COLORS[category] || '#888888';
  }

  // ── Registration ──────────────────────────────────────────────────
  // Accepts either register(typeKey, def) or register(def) where def.type is the key.

  function register(typeKeyOrDef, def) {
    var typeKey, definition;
    if (typeof typeKeyOrDef === 'string') {
      typeKey    = typeKeyOrDef;
      definition = def;
    } else {
      definition = typeKeyOrDef;
      typeKey    = definition && definition.type;
    }
    if (!typeKey || !definition) {
      console.warn('[nodeRegistry] register() called with invalid arguments');
      return;
    }
    if (registry[typeKey]) {
      console.warn('[nodeRegistry] Duplicate node type: "' + typeKey + '" — skipping');
      return;
    }
    if (!definition.type) definition.type = typeKey;
    registry[typeKey] = definition;
  }

  // ── Lookup ────────────────────────────────────────────────────────

  function lookup(typeKey) {
    return registry[typeKey] || null;
  }

  function getDefinition(typeKey) {
    return lookup(typeKey);
  }

  function getByType(typeKey) {
    return lookup(typeKey);
  }

  // ── Category queries ──────────────────────────────────────────────

  function getCategories() {
    var seen = {};
    var cats = [];
    for (var t in registry) {
      if (!registry.hasOwnProperty(t)) continue;
      var cat = registry[t].category;
      if (cat && !seen[cat]) {
        seen[cat] = true;
        cats.push(cat);
      }
    }
    return cats;
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

  // ── Bulk queries ──────────────────────────────────────────────────

  function getAllDefinitions() {
    return registry;
  }

  function getAll() {
    var arr = [];
    for (var t in registry) {
      if (registry.hasOwnProperty(t)) arr.push(registry[t]);
    }
    return arr;
  }

  function listTypes() {
    var types = [];
    for (var t in registry) {
      if (registry.hasOwnProperty(t)) types.push(t);
    }
    return types;
  }

  // ── Public API ────────────────────────────────────────────────────

  return {
    register:         register,
    lookup:           lookup,
    getDefinition:    getDefinition,
    getByType:        getByType,
    getCategories:    getCategories,
    getByCategory:    getByCategory,
    getAllDefinitions: getAllDefinitions,
    getAll:           getAll,
    listTypes:        listTypes,
    getCategoryColor: getCategoryColor
  };

}());
